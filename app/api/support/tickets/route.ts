import { connectDB } from '@/lib/db';
import { getAuthUser, canAccessSupport, canManageSupportTickets } from '@/lib/auth';
import { paginationMeta } from '@/lib/utils';
import { createWithTicketNo, escapeRegex, getActiveDropdownLabels } from '@/lib/support';
import { SUPPORT_REASON_GROUP, SUPPORT_OPEN_STATUS } from '@/lib/supportConstants';
import { resolveAssignee, sanitizeUrls } from '@/lib/supportValidation';
import SupportTicket from '@/models/SupportTicket';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

void User;

const MAX_LIMIT = 100;
const SORTABLE_FIELDS = new Set(['createdAt', 'ticketNo', 'status', 'closedAt']);

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessSupport(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const reason = searchParams.get('reason') || '';
    const assignedTo = searchParams.get('assignedTo') || '';
    const doctor = searchParams.get('doctor') || '';
    const sortParam = searchParams.get('sort') || '-createdAt';

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (reason) query.reason = reason;
    if (assignedTo === 'me') query.assignedTo = user.userId;
    else if (assignedTo === 'unassigned') query.assignedTo = { $exists: false };
    else if (mongoose.isValidObjectId(assignedTo)) query.assignedTo = assignedTo;
    if (mongoose.isValidObjectId(doctor)) query.doctor = doctor;

    if (search) {
      const pattern = escapeRegex(search);
      const doctorIds = await Doctor.find({ name: { $regex: pattern, $options: 'i' } }).distinct('_id');
      query.$or = [
        { ticketNo: { $regex: pattern, $options: 'i' } },
        { patientId: { $regex: pattern, $options: 'i' } },
        { doctor: { $in: doctorIds } },
      ];
    }

    const sortField = sortParam.replace(/^-/, '');
    const sort: Record<string, 1 | -1> = SORTABLE_FIELDS.has(sortField)
      ? { [sortField]: sortParam.startsWith('-') ? -1 : 1 }
      : { createdAt: -1 };

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .select('-statusHistory')
        .populate('doctor', 'name slug city area speciality')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    return Response.json({ data: tickets, ...paginationMeta(total, page, limit) });
  } catch (error) {
    console.error('GET /api/support/tickets error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageSupportTickets(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const doctorId = String(body.doctor || '').trim();
    const patientId = String(body.patientId || '').trim();
    const reason = String(body.reason || '').trim();
    const concern = String(body.concern || '').trim();
    const actionTaken = String(body.actionTaken || '').trim();

    if (!doctorId) return Response.json({ error: 'Please select a doctor' }, { status: 400 });
    if (!patientId) return Response.json({ error: 'Patient ID is required' }, { status: 400 });
    if (!reason) return Response.json({ error: 'Please select a reason for support' }, { status: 400 });
    if (!concern) return Response.json({ error: 'Please describe the doctor concern' }, { status: 400 });

    const doctor = mongoose.isValidObjectId(doctorId)
      ? await Doctor.findById(doctorId).select('name').lean()
      : null;
    if (!doctor) return Response.json({ error: 'Selected doctor was not found' }, { status: 400 });

    const reasons = await getActiveDropdownLabels(SUPPORT_REASON_GROUP);
    if (!reasons.includes(reason)) {
      return Response.json({ error: 'Please select a reason from the list' }, { status: 400 });
    }

    const assignee = await resolveAssignee(body.assignedTo);
    if (assignee.error) return Response.json({ error: assignee.error }, { status: 400 });

    const now = new Date();
    const ticket = await createWithTicketNo((ticketNo) =>
      SupportTicket.create({
        ticketNo,
        doctor: doctor._id,
        patientId,
        reason,
        concern,
        actionTaken: actionTaken || undefined,
        images: sanitizeUrls(body.images),
        videos: sanitizeUrls(body.videos),
        assignedTo: assignee.user?._id,
        assignedToName: assignee.user?.name,
        status: SUPPORT_OPEN_STATUS,
        statusHistory: [
          {
            status: SUPPORT_OPEN_STATUS,
            assignedToName: assignee.user?.name,
            note: 'Ticket created',
            changedAt: now,
            changedBy: user.userId,
            changedByName: user.name,
            changedByRole: user.role,
          },
        ],
        createdBy: user.userId,
        createdByName: user.name,
      })
    );

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'CREATE',
      entity: 'SupportTicket',
      entityId: ticket._id.toString(),
      entityLabel: `${ticket.ticketNo} · ${doctor.name}`,
      after: { ticketNo: ticket.ticketNo, patientId, reason, assignedTo: assignee.user?.name },
    });

    return Response.json({ data: ticket }, { status: 201 });
  } catch (error) {
    console.error('POST /api/support/tickets error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
