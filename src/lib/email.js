import nodemailer from 'nodemailer';

const FROM = `OkosSzaki <${process.env.SMTP_FROM_EMAIL || 'noreply@okosszaki.hu'}>`;

function createTransporter() {
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;
  if (!user || !pass) {
    throw new Error('BREVO_SMTP_USER or BREVO_SMTP_PASS env var is missing');
  }
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

/**
 * Verify SMTP connection is working.
 * Returns { ok: true, from: string } or throws.
 */
export async function pingSmtp() {
  const transporter = createTransporter();
  await transporter.verify();
  return { ok: true, from: FROM };
}

/**
 * Send an email via SendPulse SMTP.
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} [opts.cc]
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {string} [opts.replyTo]
 * @param {Array<{filename: string, content: Buffer|string, contentType?: string}>} [opts.attachments]
 */
export async function sendEmail({ to, cc, subject, html, text, replyTo, attachments }) {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from:        FROM,
    to:          Array.isArray(to) ? to.join(', ') : to,
    cc:          cc || undefined,
    replyTo:     replyTo || undefined,
    subject,
    html,
    text:        text || html.replace(/<[^>]+>/g, ''),
    attachments: attachments?.map(a => ({
      filename:    a.filename,
      content:     a.content,
      contentType: a.contentType,
    })) || [],
  });

  return { messageId: info.messageId };
}
