import { connectDB } from '@/lib/db';
import { getAuthUser, canAccessSupport, canManageSupportTickets } from '@/lib/auth';
import { getActiveDropdownLabels, supportTicketScope } from '@/lib/support';
import { SUPPORT_STATUS_GROUP, SUPPORT_CLOSED_STATUS } from '@/lib/supportConstants';
import { resolveAssignee, sanitizeUrls } from '@/lib/supportValidation';
import SupportTicket from '@/models/SupportTicket';
import Doctor from '@/models/Doctor';
import AuditLog from '@/models/AuditLog';
import { NextRequest, after } from 'next/server';
import { sendTicketStatusEmail } from '@/lib/supportNotifications';
import { Types } from 'mongoose';

void Doctor;

type Ctx = { params: Promise<{ ticketNo: string }> };

const SUPPORT_LOCKED_FIELDS = ['status', 'assignedTo', 'images', 'videos'] as const;

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessSupport(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { ticketNo } = await ctx.params;
    const ticket = await SupportTicket.findOne({ ticketNo, ...supportTicketScope(user) })
      .populate('doctor', 'name slug city area speciality phone clinicName')
      .lean();
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    return Response.json({ data: ticket });
  } catch (error) {
    console.error('GET /api/support/tickets/[ticketNo] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    await connectDB();
    const user = await getAuthUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageSupportTickets(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (user.role === 'support' && SUPPORT_LOCKED_FIELDS.some((field) => body[field] !== undefined)) {
      return Response.json({ error: 'Support staff can only update the action taken and notes' }, { status: 403 });
    }

    const { ticketNo } = await ctx.params;
    const ticket = await SupportTicket.findOne({ ticketNo, ...supportTicketScope(user) });
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const before = {
      status: ticket.status,
      assignedTo: ticket.assignedToName,
      actionTaken: ticket.actionTaken,
    };
    const note = String(body.note || '').trim();
    const now = new Date();
    const actorId = new Types.ObjectId(user.userId);
    const changedBy = { changedAt: now, changedBy: actorId, changedByName: user.name, changedByRole: user.role };

    let assignmentChanged = false;
    if (body.assignedTo !== undefined) {
      const assignee = await resolveAssignee(body.assignedTo);
      if (assignee.error) return Response.json({ error: assignee.error }, { status: 400 });
      const nextId = assignee.user?._id.toString();
      if (nextId !== ticket.assignedTo?.toString()) {
        ticket.assignedTo = assignee.user?._id;
        ticket.assignedToName = assignee.user?.name;
        assignmentChanged = true;
      }
    }

    let statusChanged = false;
    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim();
      const statuses = await getActiveDropdownLabels(SUPPORT_STATUS_GROUP);
      if (!statuses.includes(nextStatus)) {
        return Response.json({ error: 'Please select a status from the list' }, { status: 400 });
      }
      if (nextStatus !== ticket.status) {
        const previousStatus = ticket.status;
        ticket.status = nextStatus;
        statusChanged = true;
        ticket.statusHistory.push({
          status: nextStatus,
          previousStatus,
          assignedToName: ticket.assignedToName,
          note: note || undefined,
          ...changedBy,
        });

        if (nextStatus === SUPPORT_CLOSED_STATUS) {
          ticket.closedAt = now;
          ticket.closedBy = actorId;
          ticket.closedByName = user.name;
        } else if (previousStatus === SUPPORT_CLOSED_STATUS) {
          ticket.closedAt = undefined;
          ticket.closedBy = undefined;
          ticket.closedByName = undefined;
        }
      }
    }

    if (note && !assignmentChanged && !statusChanged) {
      ticket.statusHistory.push({ status: ticket.status, assignedToName: ticket.assignedToName, note, ...changedBy });
    }

    if (assignmentChanged && !statusChanged) {
      ticket.statusHistory.push({
        status: ticket.status,
        assignedToName: ticket.assignedToName,
        note: note || (ticket.assignedToName ? `Assigned to ${ticket.assignedToName}` : 'Unassigned'),
        ...changedBy,
      });
    }

    if (body.actionTaken !== undefined) ticket.actionTaken = String(body.actionTaken).trim() || undefined;
    if (body.images !== undefined) ticket.images = sanitizeUrls(body.images);
    if (body.videos !== undefined) ticket.videos = sanitizeUrls(body.videos);

    if (!ticket.isModified()) {
      return Response.json({ error: 'No changes to save' }, { status: 400 });
    }

    await ticket.save();

    await AuditLog.create({
      actor: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE',
      entity: 'SupportTicket',
      entityId: ticket._id.toString(),
      entityLabel: ticket.ticketNo,
      before,
      after: { status: ticket.status, assignedTo: ticket.assignedToName, actionTaken: ticket.actionTaken },
    });

    if (statusChanged) {
      const ticketId = ticket._id.toString();
      const previousStatus = before.status;
      after(() => sendTicketStatusEmail(ticketId, previousStatus));
    }

    const updated = await SupportTicket.findById(ticket._id)
      .populate('doctor', 'name slug city area speciality phone clinicName')
      .lean();
    return Response.json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/support/tickets/[ticketNo] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
