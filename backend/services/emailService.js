import nodemailer from 'nodemailer';

let cachedTransporter = null;

function getMailMode() {
  return String(process.env.MAIL_MODE || 'demo').trim().toLowerCase();
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        }
      : undefined,
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || '').trim().toLowerCase();

  if (!recipient) {
    return { sent: false, reason: 'missing_recipient' };
  }

  const mode = getMailMode();
  const useSmtp = mode === 'production' && isSmtpConfigured();

  if (!useSmtp) {
    console.log('[email:demo]', {
      to: recipient,
      subject,
      text,
    });
    return { sent: true, demo: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject,
      text,
      html,
    });

    return {
      sent: true,
      demo: false,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('sendEmail error:', error.message);
    return {
      sent: false,
      reason: error.message || 'Failed to send email',
    };
  }
}

export default sendEmail;
