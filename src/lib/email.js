const FROM = `OkosSzaki <${process.env.SMTP_FROM_EMAIL || 'noreply@okosszaki.hu'}>`;

/**
 * Send an email via Resend (API-key auth, no IP restrictions).
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {string} [opts.replyTo]
 * @param {Array<{filename: string, content: string, contentType?: string}>} [opts.attachments]
 */
export async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY env var is missing');

  const body = {
    from:    FROM,
    to:      Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text     ? { text }                  : {}),
    ...(replyTo  ? { reply_to: replyTo }     : {}),
    ...(attachments?.length ? {
      attachments: attachments.map(a => ({
        filename:    a.filename,
        content:     Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        content_type: a.contentType,
      })),
    } : {}),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Resend error ${res.status}`);
  return { messageId: data.id };
}

export async function pingSmtp() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY nincs beállítva' };
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.message || `Resend API error ${res.status}` };
  }
  return { ok: true, provider: 'resend' };
}
