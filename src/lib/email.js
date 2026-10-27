import { Resend } from 'resend';

const FROM = 'OkosSzaki <noreply@okosszaki.hu>';

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY env var is missing');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Verify Resend is configured.
 * Returns { ok: true, from: string } or throws.
 */
export async function pingSmtp() {
  const resend = getClient();
  // Lightweight check — list domains to confirm the key works
  const { error } = await resend.domains.list();
  if (error) throw new Error(error.message);
  return { ok: true, from: FROM };
}

/**
 * Send an email via Resend.
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
  const resend = getClient();

  const { data, error } = await resend.emails.send({
    from:        FROM,
    to:          Array.isArray(to) ? to : [to],
    cc:          cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
    reply_to:    replyTo || undefined,
    subject,
    html,
    text:        text || html.replace(/<[^>]+>/g, ''),
    attachments: attachments || [],
  });

  if (error) throw new Error(error.message);
  return { messageId: data.id };
}
