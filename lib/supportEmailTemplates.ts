import { escapeHtml } from '@/lib/cron/emailTemplates';
import { SUPPORT_CLOSED_STATUS } from '@/lib/supportConstants';

export interface TicketEmailData {
  ticketNo: string;
  doctorName: string;
  patientId: string;
  reason: string;
  concern: string;
  actionTaken?: string;
  status: string;
  assignedToName?: string;
  createdAt: Date;
  closedAt?: Date;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const EMAIL_TIMEZONE = 'Asia/Kolkata';
const BRAND = 'DSR CMS';

/** Email clients ignore classes and CSS variables, so status colours are inlined as hex. */
const STATUS_THEME: Record<string, { bg: string; fg: string; gradient: string }> = {
  Open: { bg: '#e0f2fe', fg: '#0369a1', gradient: 'linear-gradient(135deg,#0284c7 0%,#0ea5e9 55%,#38bdf8 100%)' },
  'In Progress': { bg: '#e0e7ff', fg: '#4338ca', gradient: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 55%,#818cf8 100%)' },
  Pending: { bg: '#fef3c7', fg: '#b45309', gradient: 'linear-gradient(135deg,#d97706 0%,#f59e0b 55%,#fbbf24 100%)' },
  Resolved: { bg: '#dcfce7', fg: '#15803d', gradient: 'linear-gradient(135deg,#059669 0%,#10b981 55%,#34d399 100%)' },
  Closed: { bg: '#f1f5f9', fg: '#475569', gradient: 'linear-gradient(135deg,#334155 0%,#475569 55%,#64748b 100%)' },
};
const FALLBACK_THEME = { bg: '#ede9fe', fg: '#6d28d9', gradient: 'linear-gradient(135deg,#7c3aed 0%,#8b5cf6 55%,#a78bfa 100%)' };
const themeFor = (status: string) => STATUS_THEME[status] ?? FALLBACK_THEME;

/** Progress tracker stages; Pending sits on the In Progress stage. Admin-added statuses hide the tracker. */
const TRACKER_STEPS = ['Open', 'In Progress', 'Resolved', 'Closed'];
const TRACKER_INDEX: Record<string, number> = { Open: 0, 'In Progress': 1, Pending: 1, Resolved: 2, Closed: 3 };

const STATUS_MESSAGES: Record<string, string> = {
  Open: 'Your request is in our queue and will be picked up by our support team shortly.',
  'In Progress': 'Our support team is actively working on your request.',
  Pending: 'We are waiting on an update before we can proceed. Our team may reach out to you for more details.',
  Resolved: 'We believe your issue has been resolved. If anything still needs attention, just let us know.',
  Closed: 'This ticket is now closed. Thank you for your patience — it remains on record for future reference.',
};

export function formatEmailDate(date: Date): string {
  return `${date.toLocaleString('en-IN', { timeZone: EMAIL_TIMEZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST`;
}

/** Doctor names are often saved with a "Dr." prefix; strip it so the greeting doesn't double up. */
const salutation = (name: string) => `Dr. ${name.replace(/^dr\.?\s*/i, '')}`;
const multiline = (value: string) => escapeHtml(value).replace(/\n/g, '<br />');

function badge(status: string): string {
  const t = themeFor(status);
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${t.bg};color:${t.fg};">${escapeHtml(status)}</span>`;
}

function tracker(status: string): string {
  const current = TRACKER_INDEX[status];
  if (current === undefined) return '';
  const accent = themeFor(status).fg;
  const cells = TRACKER_STEPS.map((step, i) => {
    const done = i <= current;
    const label = i === current && status === 'Pending' ? 'Pending' : step;
    return `<td width="25%" align="center" valign="top" style="padding:0 4px;">
      <div style="width:28px;height:28px;line-height:28px;margin:0 auto 8px;border-radius:50%;font-size:13px;font-weight:700;background:${done ? accent : '#e5e7eb'};color:${done ? '#ffffff' : '#9ca3af'};">${done ? '&#10003;' : i + 1}</div>
      <div style="height:4px;border-radius:4px;background:${done ? accent : '#e5e7eb'};margin-bottom:8px;"></div>
      <div style="font-size:11px;font-weight:${i === current ? 800 : 600};color:${i === current ? '#111827' : '#9ca3af'};">${escapeHtml(label)}</div>
    </td>`;
  }).join('');
  return `<tr><td style="padding:4px 32px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table></td></tr>`;
}

function detailRows(t: TicketEmailData): string {
  const rows: Array<[string, string]> = [
    ['Ticket No.', `<span style="font-family:'SFMono-Regular',Consolas,monospace;font-weight:700;color:#111827;">${escapeHtml(t.ticketNo)}</span>`],
    ['Patient ID', escapeHtml(t.patientId)],
    ['Reason', escapeHtml(t.reason)],
    ['Raised On', escapeHtml(formatEmailDate(t.createdAt))],
    ['Handled By', escapeHtml(t.assignedToName || 'Our support team')],
    ['Current Status', badge(t.status)],
  ];
  if (t.closedAt) rows.push(['Closed On', escapeHtml(formatEmailDate(t.closedAt))]);
  return rows.map(([label, value], i) => `<tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;${i ? 'border-top:1px solid #f1f5f9;' : ''}width:40%;">${label}</td>
      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1f2937;${i ? 'border-top:1px solid #f1f5f9;' : ''}" align="right">${value}</td>
    </tr>`).join('');
}

function textBlock(title: string, body: string, accent: string): string {
  return `<tr><td style="padding:0 32px 20px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">${title}</div>
    <div style="border-left:4px solid ${accent};background:#f9fafb;border-radius:0 12px 12px 0;padding:14px 16px;font-size:14px;line-height:1.65;color:#374151;">${multiline(body)}</div>
  </td></tr>`;
}

interface LayoutOptions {
  preheader: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  ticket: TicketEmailData;
  statusChange?: { from: string; to: string };
}

function buildLayout(o: LayoutOptions): string {
  const theme = themeFor(o.ticket.status);
  const change = o.statusChange
    ? `<tr><td style="padding:0 32px 24px;" align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;"><tr>
          <td style="padding:14px 18px;">${badge(o.statusChange.from)}</td>
          <td style="padding:14px 4px;font-size:18px;color:#94a3b8;">&#8594;</td>
          <td style="padding:14px 18px;">${badge(o.statusChange.to)}</td>
        </tr></table>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(o.title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.10);">
        <tr><td style="background:${theme.fg};background-image:${theme.gradient};padding:36px 32px 32px;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;opacity:0.92;">${BRAND} &middot; Doctor Support</td>
            <td align="right"><span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.18);font-size:11px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(o.eyebrow)}</span></td>
          </tr></table>
          <div style="font-size:26px;font-weight:800;line-height:1.25;margin:18px 0 8px;">${escapeHtml(o.title)}</div>
          <div style="font-size:14px;line-height:1.55;opacity:0.94;">${escapeHtml(o.subtitle)}</div>
        </td></tr>

        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#111827;">Dear <strong>${escapeHtml(salutation(o.ticket.doctorName))}</strong>,</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563;">${o.intro}</p>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.bg};border-radius:16px;">
            <tr><td style="padding:20px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${theme.fg};margin-bottom:6px;">Your Ticket Number</div>
              <div style="font-size:28px;font-weight:800;letter-spacing:0.04em;color:#111827;font-family:'SFMono-Regular',Consolas,monospace;">${escapeHtml(o.ticket.ticketNo)}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:6px;">Please quote this number in any follow-up</div>
            </td></tr>
          </table>
        </td></tr>

        ${change}
        ${tracker(o.ticket.status)}

        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">${detailRows(o.ticket)}</table>
        </td></tr>

        ${textBlock('Your Concern', o.ticket.concern, '#cbd5e1')}
        ${o.ticket.actionTaken ? textBlock('Support Provided', o.ticket.actionTaken, theme.fg) : ''}

        <tr><td style="padding:4px 32px 28px;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">Warm regards,<br /><strong style="color:#111827;">${BRAND} Support Team</strong></p>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #eef2f7;text-align:center;">
          <div style="font-size:12px;line-height:1.6;color:#94a3b8;">This is an automated update about ticket ${escapeHtml(o.ticket.ticketNo)}.<br />&copy; ${new Date().getFullYear()} ${BRAND}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildTicketCreatedEmail(ticket: TicketEmailData): EmailContent {
  const subject = `Support ticket ${ticket.ticketNo} received — ${ticket.reason}`;
  const html = buildLayout({
    preheader: `We've received your request for patient ${ticket.patientId}. Ticket ${ticket.ticketNo}.`,
    eyebrow: 'New Ticket',
    title: "We've received your request",
    subtitle: `Ticket ${ticket.ticketNo} has been created for patient ${ticket.patientId}.`,
    intro: `Thank you for reaching out. Your support request has been logged and ${ticket.assignedToName ? `assigned to <strong>${escapeHtml(ticket.assignedToName)}</strong>` : 'shared with our support team'}. ${STATUS_MESSAGES.Open}`,
    ticket,
  });
  const text = [
    `Dear ${salutation(ticket.doctorName)},`,
    `We've received your support request. Ticket: ${ticket.ticketNo}`,
    `Patient ID: ${ticket.patientId}`,
    `Reason: ${ticket.reason}`,
    `Status: ${ticket.status}`,
    `Raised on: ${formatEmailDate(ticket.createdAt)}`,
    '',
    `— ${BRAND} Support Team`,
  ].join('\n');
  return { subject, html, text };
}

export function buildTicketStatusEmail(ticket: TicketEmailData, previousStatus: string): EmailContent {
  const isClosed = ticket.status === SUPPORT_CLOSED_STATUS;
  const subject = `Ticket ${ticket.ticketNo} is now ${ticket.status}`;
  const html = buildLayout({
    preheader: `Status update for ticket ${ticket.ticketNo}: ${previousStatus} → ${ticket.status}.`,
    eyebrow: 'Status Update',
    title: isClosed ? 'Your ticket has been closed' : `Your ticket is now ${ticket.status}`,
    subtitle: `Ticket ${ticket.ticketNo} · Patient ${ticket.patientId}`,
    intro: STATUS_MESSAGES[ticket.status] ?? `The status of your support ticket has been updated to <strong>${escapeHtml(ticket.status)}</strong>.`,
    ticket,
    statusChange: { from: previousStatus, to: ticket.status },
  });
  const text = [
    `Dear ${salutation(ticket.doctorName)},`,
    `Your support ticket ${ticket.ticketNo} has moved from ${previousStatus} to ${ticket.status}.`,
    ticket.actionTaken ? `Support provided: ${ticket.actionTaken}` : '',
    ticket.closedAt ? `Closed on: ${formatEmailDate(ticket.closedAt)}` : '',
    '',
    `— ${BRAND} Support Team`,
  ].filter(Boolean).join('\n');
  return { subject, html, text };
}
