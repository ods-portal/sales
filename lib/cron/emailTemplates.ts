function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status: string): string {
  const styles: Record<string, { bg: string; color: string }> = {
    Pending: { bg: '#fef3c7', color: '#b45309' },
    Overdue: { bg: '#fee2e2', color: '#dc2626' },
    Completed: { bg: '#dcfce7', color: '#15803d' },
    Cancelled: { bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = styles[status] || styles.Cancelled;
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};">${escapeHtml(status)}</span>`;
}

interface VisitCard {
  doctorName: string;
  doctorCity: string;
  visitType: string;
  followUpDate: string;
  status: string;
}

interface EmailTemplateOptions {
  recipientName: string;
  title: string;
  subtitle: string;
  accent: 'indigo' | 'rose';
  intro: string;
  highlight?: { label: string; value: string };
  visits?: VisitCard[];
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}

const ACCENTS = {
  indigo: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
    button: '#4f46e5',
    buttonHover: '#4338ca',
    light: '#eef2ff',
    ring: '#c7d2fe',
  },
  rose: {
    gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)',
    button: '#e11d48',
    buttonHover: '#be123c',
    light: '#fff1f2',
    ring: '#fecdd3',
  },
};

export function buildCronEmailHtml(options: EmailTemplateOptions): string {
  const accent = ACCENTS[options.accent];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const visitCards =
    options.visits && options.visits.length > 0
      ? options.visits
          .map(
            (v) => `
        <tr>
          <td style="padding:0 0 12px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
              <tr>
                <td style="padding:16px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px;">${escapeHtml(v.doctorName)}</div>
                        <div style="font-size:12px;color:#6b7280;">${escapeHtml(v.doctorCity)} · ${escapeHtml(v.visitType)}</div>
                      </td>
                      <td align="right" valign="top">${statusBadge(v.status)}</td>
                    </tr>
                  </table>
                  <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f3f4f6;font-size:12px;color:#4b5563;">
                    <strong style="color:#374151;">Follow-up:</strong> ${escapeHtml(v.followUpDate)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
          )
          .join('')
      : '';

  const highlightBlock = options.highlight
    ? `
      <tr>
        <td style="padding:0 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${accent.light};border:1px solid ${accent.ring};border-radius:14px;">
            <tr>
              <td style="padding:18px 20px;text-align:center;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">${escapeHtml(options.highlight.label)}</div>
                <div style="font-size:28px;font-weight:800;color:#111827;line-height:1.2;">${escapeHtml(options.highlight.value)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const actionBlock = options.actionLabel
    ? `
      <tr>
        <td style="padding:8px 32px 28px;text-align:center;">
          <a href="${escapeHtml(options.actionUrl || `${appUrl}/visits`)}" style="display:inline-block;background:${accent.button};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
            ${escapeHtml(options.actionLabel)}
          </a>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${accent.gradient};padding:32px 32px 28px;color:#ffffff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;margin-bottom:10px;">DSR CMS</div>
              <div style="font-size:26px;font-weight:800;line-height:1.25;margin-bottom:8px;">${escapeHtml(options.title)}</div>
              <div style="font-size:14px;opacity:0.92;line-height:1.5;">${escapeHtml(options.subtitle)}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hi <strong>${escapeHtml(options.recipientName)}</strong>,</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">${options.intro}</p>
            </td>
          </tr>

          ${highlightBlock}

          ${
            visitCards
              ? `<tr><td style="padding:8px 32px 8px;"><div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Visits Due Today</div><table width="100%" cellpadding="0" cellspacing="0">${visitCards}</table></td></tr>`
              : ''
          }

          ${actionBlock}

          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;text-align:center;">
                ${escapeHtml(options.footerNote || 'This is an automated reminder from DSR CMS.')}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:18px 32px;border-top:1px solid #f3f4f6;text-align:center;">
              <div style="font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} DSR CMS · Daily Sales Report System</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildTodayReminderEmail(
  recipientName: string,
  todayLabel: string,
  visits: VisitCard[]
): { subject: string; html: string; text: string } {
  const subject = `Reminder: ${visits.length} visit(s) due today — ${todayLabel}`;
  const html = buildCronEmailHtml({
    recipientName,
    title: "Today's Visit Reminder",
    subtitle: `You have scheduled follow-ups for ${todayLabel}`,
    accent: 'indigo',
    intro: `You have <strong>${visits.length}</strong> visit(s) that need your attention today. Please review the list below and update each visit once completed.`,
    highlight: { label: 'Visits Due Today', value: String(visits.length) },
    visits,
    actionLabel: 'Open Visits Dashboard',
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/visits?status=Pending`,
    footerNote: 'Complete your visits and mark them as done in DSR CMS.',
  });

  const text = `Hi ${recipientName}, you have ${visits.length} visit(s) due today (${todayLabel}). Open DSR CMS to review and update them.`;

  return { subject, html, text };
}

export function buildMissingYesterdayEmail(
  recipientName: string,
  yesterdayLabel: string,
  checkedAt: string
): { subject: string; html: string; text: string } {
  const subject = `Action required: No visit logged for ${yesterdayLabel}`;
  const html = buildCronEmailHtml({
    recipientName,
    title: 'Missing Visit Entry',
    subtitle: `No visit was logged for ${yesterdayLabel}`,
    accent: 'rose',
    intro: `Our records show that you have <strong>not logged any visit</strong> with visit date <strong>${escapeHtml(yesterdayLabel)}</strong>. Please log your visit(s) in DSR CMS as soon as possible.`,
    highlight: { label: 'Missing Date', value: yesterdayLabel },
    actionLabel: 'Log Visit Now',
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/visits/new`,
    footerNote: `Checked on ${checkedAt} IST. If you were on leave, please inform your manager.`,
  });

  const text = `Hi ${recipientName}, no visit was logged for ${yesterdayLabel}. Please update DSR CMS.`;

  return { subject, html, text };
}
