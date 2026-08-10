import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getEmailConfig() {
  const from = process.env.EMAIL_FROM;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!from) {
    throw new Error('EMAIL_FROM environment variable is not set');
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      'SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables are required'
    );
  }

  return { from, smtpHost, smtpUser, smtpPass };
}

async function sendViaSmtp(
  options: SendEmailOptions,
  config: { from: string; smtpHost: string; smtpUser: string; smtpPass: string }
) {
  const port = Number(process.env.SMTP_PORT || 587);

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port,
    secure: port === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });

  await transporter.sendMail({
    from: config.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const config = getEmailConfig();
  await sendViaSmtp(options, config);
}
