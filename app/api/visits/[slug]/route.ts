import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import { isVisitOwnedBySalesPerson, resolveSalesPersonFromAudit } from '@/lib/resolveRep';
import Visit from '@/models/Visit';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';

// Force model registration for populate() refs
void User;
void Doctor;

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { slug } = await ctx.params;
    const visitDoc = await Visit.findOne({ slug }).select('_id salesPerson').lean();
    if (!visitDoc) return Response.json({ error: 'Visit not found' }, { status: 404 });

    if (user.role === 'salesPerson') {
      const ownsVisit = await isVisitOwnedBySalesPerson(visitDoc, user.userId, user.name);
      if (!ownsVisit) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const visit = await Visit.findOne({ slug })
      .populate('doctor', 'name slug speciality city area category status')
      .populate('salesPerson', 'name email slug')
      .lean();

    if (!visit) return Response.json({ error: 'Visit not found' }, { status: 404 });

    if (!visit.salesPerson) {
      const rep = await resolveSalesPersonFromAudit(visit._id.toString());
      if (rep) visit.salesPerson = rep as unknown as typeof visit.salesPerson;
    }

    const history = (visit as { rescheduleHistory?: unknown[] }).rescheduleHistory;
    if (!Array.isArray(history) || history.length === 0) {
      const rescheduleLogs = await AuditLog.find({
        entity: 'Visit',
        entityId: visit._id.toString(),
        action: 'UPDATE',
      })
        .sort({ createdAt: 1 })
        .lean();

      const reconstructedHistory = rescheduleLogs
        .map((log) => (log.after as { rescheduleHistoryEntry?: unknown } | undefined)?.rescheduleHistoryEntry)
        .filter(Boolean);

      if (reconstructedHistory.length > 0) {
        (
          visit as unknown as {
            rescheduleHistory: unknown[];
          }
        ).rescheduleHistory = reconstructedHistory;
      }
    }

    return Response.json({ data: visit });
  } catch (error) {
    console.error('GET /api/visits/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { slug } = await ctx.params;
    const visit = await Visit.findOne({ slug });
    if (!visit) return Response.json({ error: 'Visit not found' }, { status: 404 });

    const payload = await request.json();
    Object.keys(payload).forEach((key: string) => {
      if (payload[key] === '') delete payload[key];
    });

    delete payload.isFlagged;
    delete payload.flagNote;
    delete payload.flaggedAt;
    delete payload.flaggedBy;
    delete payload.flaggedByName;

    // Date changes must go through the reschedule endpoint (with mandatory remarks).
    if (canWrite(user)) {
      delete payload.visitDate;
      delete payload.followUpDate;
      delete payload.rescheduleHistory;
    }

    // Sales person can edit own visits within 24 hours, or update status anytime
    if (user.role === 'salesPerson') {
      const ownsVisit = await isVisitOwnedBySalesPerson(visit, user.userId, user.name);
      if (!ownsVisit) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const allowedStatusUpdates = ['Completed', 'Cancelled'];
      const isStatusOnlyUpdate =
        Object.keys(payload).length > 0 &&
        Object.keys(payload).every((key) => key === 'status' || key === 'statusUpdatedAt');

      if (!isStatusOnlyUpdate || !allowedStatusUpdates.includes(payload.status)) {
        const hoursSinceCreation =
          (Date.now() - new Date(visit.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
          return Response.json(
            { error: 'Visits can only be edited within 24 hours of submission' },
            { status: 403 }
          );
        }
      }
    } else if (!canWrite(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const before = visit.toObject() as unknown as Record<string, unknown>;
    if (payload.status && payload.status !== before.status) {
      payload.statusUpdatedAt = new Date();
    }
    Object.assign(visit, payload);
    await visit.save();

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE',
      entity: 'Visit',
      entityId: visit._id.toString(),
      entityLabel: slug,
      before,
      after: payload,
    });

    return Response.json({ data: visit });
  } catch (error) {
    console.error('PUT /api/visits/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = await ctx.params;
    const visit = await Visit.findOneAndDelete({ slug });
    if (!visit) return Response.json({ error: 'Visit not found' }, { status: 404 });

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'DELETE',
      entity: 'Visit',
      entityId: visit._id.toString(),
      entityLabel: slug,
      before: visit.toObject() as unknown as Record<string, unknown>,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/visits/[slug] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
