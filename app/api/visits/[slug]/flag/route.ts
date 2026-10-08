import { connectDB } from '@/lib/db';
import { getAuthUser, canWrite } from '@/lib/auth';
import Visit from '@/models/Visit';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

const MIN_FLAG_NOTE_LENGTH = 10;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canWrite(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { slug } = await ctx.params;
    const visit = await Visit.findOne({ slug });
    if (!visit) return Response.json({ error: 'Visit not found' }, { status: 404 });

    const body = await request.json();
    const flagged = Boolean(body.flagged);
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (flagged && note.length < MIN_FLAG_NOTE_LENGTH) {
      return Response.json(
        { error: `A note is required when flagging a visit (minimum ${MIN_FLAG_NOTE_LENGTH} characters)` },
        { status: 400 }
      );
    }

    const before = visit.toObject() as unknown as Record<string, unknown>;
    if (flagged) {
      visit.isFlagged = true;
      visit.flagNote = note;
      visit.flaggedAt = new Date();
      visit.flaggedBy = new mongoose.Types.ObjectId(user.userId);
      visit.flaggedByName = user.name;
      await visit.save();
    } else {
      await Visit.updateOne(
        { _id: visit._id },
        {
          $set: { isFlagged: false },
          $unset: { flagNote: 1, flaggedAt: 1, flaggedBy: 1, flaggedByName: 1 },
        }
      );
    }

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE',
      entity: 'Visit',
      entityId: visit._id.toString(),
      entityLabel: slug,
      before,
      after: flagged
        ? {
            isFlagged: true,
            flagNote: note,
            flaggedByName: user.name,
          }
        : {
            isFlagged: false,
            flagNote: null,
            flaggedByName: null,
          },
    });

    const updated = await Visit.findById(visit._id)
      .populate('doctor', 'name slug speciality city area category status')
      .populate('salesPerson', 'name email slug')
      .lean();

    return Response.json({ data: updated });
  } catch (error) {
    console.error('POST /api/visits/[slug]/flag error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
