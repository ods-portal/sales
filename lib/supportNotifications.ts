import { connectDB } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { buildTicketCreatedEmail, buildTicketStatusEmail, type TicketEmailData } from '@/lib/supportEmailTemplates';
import SupportTicket from '@/models/SupportTicket';
import Doctor from '@/models/Doctor';

void Doctor;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PopulatedDoctor {
  name: string;
  email?: string;
}

async function loadTicketEmailData(ticketId: string): Promise<{ to: string; data: TicketEmailData } | null> {
  await connectDB();
  const ticket = await SupportTicket.findById(ticketId)
    .select('ticketNo patientId reason concern actionTaken status assignedToName createdAt closedAt doctor')
    .populate<{ doctor: PopulatedDoctor | null }>('doctor', 'name email')
    .lean();
  if (!ticket) return null;

  const to = ticket.doctor?.email?.trim() ?? '';
  if (!EMAIL_PATTERN.test(to)) {
    console.warn(`Support email skipped for ${ticket.ticketNo}: doctor has no valid email`);
    return null;
  }

  return {
    to,
    data: {
      ticketNo: ticket.ticketNo,
      doctorName: ticket.doctor?.name ?? 'Doctor',
      patientId: ticket.patientId,
      reason: ticket.reason,
      concern: ticket.concern,
      actionTaken: ticket.actionTaken ?? undefined,
      status: ticket.status,
      assignedToName: ticket.assignedToName ?? undefined,
      createdAt: new Date(ticket.createdAt),
      closedAt: ticket.closedAt ? new Date(ticket.closedAt) : undefined,
    },
  };
}

/** Runs after the response is sent, so failures are logged rather than surfaced to the user. */
async function deliver(ticketId: string, build: (data: TicketEmailData) => { subject: string; html: string; text: string }, label: string) {
  try {
    const payload = await loadTicketEmailData(ticketId);
    if (!payload) return;
    const email = build(payload.data);
    await sendEmail({ to: payload.to, ...email });
  } catch (error) {
    console.error(`Support ${label} email failed for ticket ${ticketId}:`, error);
  }
}

export function sendTicketCreatedEmail(ticketId: string) {
  return deliver(ticketId, buildTicketCreatedEmail, 'created');
}

export function sendTicketStatusEmail(ticketId: string, previousStatus: string) {
  return deliver(ticketId, (data) => buildTicketStatusEmail(data, previousStatus), 'status');
}
