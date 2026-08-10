import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import Visit from '@/models/Visit';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';
import { startOfDay } from 'date-fns';
import mongoose from 'mongoose';

const MIN_REMARKS_LENGTH = 10;
const RESCHEDULABLE_STATUSES = new Set(['Pending', 'Overdue']);

function parseDateInput(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function syncStatusAfterReschedule(
  visit: InstanceType<typeof Visit>,
  followUpDate: Date
): void {
  if (!RESCHEDULABLE_STATUSES.has(visit.status)) return;

  const today = startOfDay(new Date());
  const followUp = startOfDay(followUpDate);
  visit.status = followUp < today ? 'Overdue' : 'Pending';
  visit.statusUpdatedAt = new Date();
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { slug } = await ctx.params;
    const visit = await Visit.findOne({ slug });
    if (!visit) return Response.json({ error: 'Visit not found' }, { status: 404 });

    if (!RESCHEDULABLE_STATUSES.has(visit.status)) {
      return Response.json(
        { error: 'Only pending or overdue visits can be rescheduled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';

    if (!remarks || remarks.length < MIN_REMARKS_LENGTH) {
      return Response.json(
        { error: `Remarks are required (minimum ${MIN_REMARKS_LENGTH} characters)` },
        { status: 400 }
      );
    }

    const newFollowUpDate = body.followUpDate
      ? parseDateInput(body.followUpDate)
      : new Date(visit.followUpDate);

    if (!newFollowUpDate) {
      return Response.json({ error: 'Invalid follow-up date' }, { status: 400 });
    }

    const previousVisitDate = new Date(visit.visitDate);
    const previousFollowUpDate = new Date(visit.followUpDate);

    const followUpDateChanged = !sameCalendarDay(previousFollowUpDate, newFollowUpDate);

    if (!followUpDateChanged) {
      return Response.json(
        { error: 'Change follow-up date before rescheduling' },
        { status: 400 }
      );
    }

    const historyEntry = {
      rescheduledAt: new Date(),
      rescheduledBy: new mongoose.Types.ObjectId(user.userId),
      rescheduledByName: user.name,
      rescheduledByRole: user.role,
      previousVisitDate,
      newVisitDate: previousVisitDate,
      previousFollowUpDate,
      newFollowUpDate,
      remarks,
    };

    const before = visit.toObject() as unknown as Record<string, unknown>;

    visit.followUpDate = newFollowUpDate;
    if (!visit.rescheduleHistory) visit.rescheduleHistory = [];
    visit.rescheduleHistory.push(historyEntry);
    syncStatusAfterReschedule(visit, newFollowUpDate);

    await visit.save();

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE',
      entity: 'Visit',
      entityId: visit._id.toString(),
      entityLabel: `${slug} (rescheduled)`,
      before,
      after: {
        followUpDate: newFollowUpDate,
        status: visit.status,
        rescheduleHistoryEntry: historyEntry,
      },
    });

    const updated = await Visit.findOne({ slug })
      .populate('doctor', 'name slug speciality city category status')
      .populate('salesPerson', 'name email slug')
      .lean();

    return Response.json({ data: updated });
  } catch (error) {
    console.error('POST /api/visits/[slug]/reschedule error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
