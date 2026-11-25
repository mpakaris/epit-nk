import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';
import { getPortalSession } from '@/lib/portalSession';
import { createNotification, quoteNotifTitle, quoteEmailSubject, quoteEmailIntro, quoteEmailLabels } from '@/lib/notificationService';
import { findOrCreateClientThread, insertMessage } from '@/lib/messageService';

export async function POST(request, { params }) {
  const { id } = await params;

  const session = await getPortalSession();
  if (!session) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action, comment = '' } = body;
  // action: 'accepted' | 'rejected' | 'question'
  if (!['accepted', 'rejected', 'question'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: quote } = await admin
    .from('quotes')
    .select('id, client_id, owner_id, status, title')
    .eq('id', id)
    .is('deleted_at', null).single();

  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });
  if (quote.status !== 'sent') return Response.json({ error: 'Ez az ajánlat nem módosítható' }, { status: 400 });

  // Verify the quote belongs to a client with this portal user's email
  const { data: client } = await admin
    .from('clients')
    .select('id, name')
    .eq('id', quote.client_id)
    .ilike('email', session.email)
    .is('deleted_at', null).single();

  if (!client) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch contractor profile (locale determines notification language)
  const { data: contractor } = await admin
    .from('profiles')
    .select('display_name, company_name, email, locale')
    .eq('id', quote.owner_id)
    .single();

  const contractorEmail  = contractor?.email;
  const contractorName   = contractor?.company_name || contractor?.display_name || 'Vállalkozó';
  const contractorLocale = contractor?.locale || 'hu';

  // Update quote status (not for 'question' — that keeps it as 'sent')
  if (action !== 'question') {
    const { error: updateErr } = await admin
      .from('quotes')
      .update({ status: action })
      .eq('id', id);
    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });
  }

  // Persist comment to history
  // Supabase builders don't have .catch() — errors are in the error field, never rejections
  await admin.from('quote_client_comments').insert({
    quote_id:     id,
    action,
    comment:      comment.trim() || null,
    client_email: session.email,
    client_name:  client.name,
  });

  // For 'question': find or create a thread, then insert the client's message
  if (action === 'question' && comment.trim()) {
    try {
      const threadId = await findOrCreateClientThread(admin, { ownerId: quote.owner_id, clientId: quote.client_id, quoteId: id });
      await insertMessage(admin, { threadId, senderClientId: client.id, senderType: 'client', body: comment.trim() });
    } catch { /* non-fatal — notification still fires */ }
  }

  // Map action → notification type
  const notifTypeMap = { accepted: 'quote_accepted', rejected: 'quote_rejected', question: 'client_question' };

  // Write in-app notification in the contractor's language
  try {
    await createNotification(admin, {
      userId:     quote.owner_id,
      type:       notifTypeMap[action],
      title:      quoteNotifTitle(notifTypeMap[action], contractorLocale, quote.title),
      body:       comment.trim() ? `${client.name}: ${comment.trim().slice(0, 120)}` : client.name,
      link:       `/ajanlatok/${id}`,
      sourceType: 'quote',
      sourceId:   id,
    });
  } catch { /* non-fatal */ }

  // Send email notification to contractor (in contractor's language)
  if (contractorEmail) {
    try {
      const subject  = quoteEmailSubject(action, contractorLocale, quote.title);
      const labels   = quoteEmailLabels(contractorLocale);
      const bodyHtml = `
        <p>${labels.greeting(contractorName)}</p>
        ${quoteEmailIntro(action, contractorLocale)}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;width:120px;">${labels.quoteRow}</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${quote.title}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:700;">${labels.clientRow}</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${client.name} (${session.email})</td></tr>
        </table>
        ${comment.trim() ? `
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#0369a1;">
              ${action === 'question' ? labels.msgLabel : labels.reasonLabel}
            </p>
            <p style="margin:0;color:#0c4a6e;white-space:pre-wrap;">${comment.trim()}</p>
          </div>` : ''}
        <p style="color:#64748b;font-size:14px;">${labels.footer}</p>
      `;
      await sendEmail({ to: contractorEmail, replyTo: session.email, subject, html: wrapEmail(bodyHtml, subject) });
    } catch { /* email failure is non-fatal */ }
  }

  const actionLabels = {
    accepted: 'Client accepted the quote',
    rejected: 'Client rejected the quote',
    question: 'Client sent a question',
  };
  logAudit({
    entityId:   quote.owner_id,
    userId:     quote.owner_id,
    userName:   client.name || session.email,
    action:     actionLabels[action],
    targetType: 'quote',
    targetId:   id,
    targetName: quote.title,
    details:    comment.trim() ? { comment: comment.trim() } : null,
  });

  return Response.json({ ok: true, status: action !== 'question' ? action : 'sent' });
}
