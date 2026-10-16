import nodemailer from 'nodemailer';

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const APP_PASSWORD = process.env.GOOGLE_SMTP_APP_PASSWORD;

function createTransporter() {
  if (!FROM_EMAIL || !APP_PASSWORD) {
    throw new Error('SMTP_FROM_EMAIL or GOOGLE_SMTP_APP_PASSWORD env var is missing');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS via STARTTLS
    auth: {
      user: FROM_EMAIL,
      pass: APP_PASSWORD,
    },
  });
}

/**
 * Verify SMTP connection without sending a message.
 * Returns { ok: true } or throws.
 */
export async function pingSmtp() {
  const transporter = createTransporter();
  await transporter.verify();
  return { ok: true, from: FROM_EMAIL };
}

/**
 * Send an email.
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]  plain-text fallback
 * @param {string} [opts.replyTo]
 * @param {Array<{filename: string, content: Buffer, contentType: string}>} [opts.attachments]
 */
export async function sendEmail({ to, cc, subject, html, text, replyTo, attachments }) {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `${process.env.GOOGLE_APP_NAME || 'Epitek'} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
    replyTo: replyTo || FROM_EMAIL,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
    attachments: attachments || [],
  });
  return { messageId: info.messageId, accepted: info.accepted };
}
