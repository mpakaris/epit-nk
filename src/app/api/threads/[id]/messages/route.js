import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';

// POST /api/threads/[id]/messages — send a reply in a thread (client or collective)
export async function POST(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { message } = body;
  if (!message?.trim()) return Response.json({ error: 'message is required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: thread } = await admin.from('threads')
    .select('id, type, owner_id, client_id, quote_id, project_id, collective_id').eq('id', id).single();
  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 });

  // ── Collective thread branch ────────────────────────────────────────────────
  if (thread.type === 'collective') {
    const { data: membership } = await admin.from('collective_members')
      .select('role').eq('collective_id', thread.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: senderProfile } = await admin.from('profiles')
      .select('display_name, company_name').eq('id', user.id).single();
    const senderName = senderProfile?.company_name || senderProfile?.display_name || 'Ismeretlen';

    const { data: msg, error: msgErr } = await admin.from('messages')
      .insert({ thread_id: id, sender_type: 'user', sender_user_id: user.id, body: message.trim() })
      .select('id, body, created_at, sender_type').single();
    if (msgErr) {
      logAudit({ entityId: thread.collective_id, userId: user.id, userName: senderName, action: 'Collective message send failed', targetType: 'thread', targetId: id, details: { error: msgErr.message } });
      return Response.json({ error: msgErr.message }, { status: 500 });
    }

    // Notify all other active members (US-MSG-021)
    const { data: otherMembers } = await admin.from('collective_members')
      .select('user_id').eq('collective_id', thread.collective_id).eq('status', 'active').neq('user_id', user.id);

    if (otherMembers?.length) {
      const notifLink = thread.project_id ? `/projektek/${thread.project_id}` : thread.quote_id ? `/ajanlatok/${thread.quote_id}` : `/uzenetek`;
      const truncated = message.trim().length > 80 ? message.trim().substring(0, 80) + '…' : message.trim();
      const notifs = otherMembers.map(m => ({
        user_id: m.user_id,
        type: 'collective_message',
        title: senderName,
        body: truncated,
        link: notifLink,
        source_type: 'thread',
        source_id: id,
      }));
      await admin.from('notifications').insert(notifs);
    }

    logAudit({
      entityId: thread.collective_id, userId: user.id, userName: senderName,
      action: 'Collective message sent', targetType: 'thread', targetId: id,
      details: { collective_id: thread.collective_id },
    });

    return Response.json({ ok: true, message: { ...msg, sender_name: senderName, sender_user_id: user.id } });
  }

  // ── Client thread branch ────────────────────────────────────────────────────
  if (thread.owner_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch client for email
  const { data: client } = await admin.from('clients')
    .select('id, name, email').eq('id', thread.client_id).single();

  // Fetch quote title if thread is quote-linked
  let quoteTitle = null;
  if (thread.quote_id) {
    const { data: q } = await admin.from('quotes').select('title').eq('id', thread.quote_id).single();
    quoteTitle = q?.title || null;
  }

  // Fetch contractor name
  const { data: contractor } = await admin.from('profiles')
    .select('display_name, company_name, email').eq('id', user.id).single();
  const contractorName = contractor?.company_name || contractor?.display_name || 'Vállalkozó';

  // Insert message
  const { data: msg, error: msgErr } = await admin.from('messages')
    .insert({ thread_id: id, sender_type: 'user', sender_user_id: user.id, body: message.trim() })
    .select('id, body, created_at, sender_type').single();
  if (msgErr) {
    logAudit({ entityId: user.id, userId: user.id, userName: contractorName, action: 'Message send failed', targetType: 'thread', targetId: id, details: { error: msgErr.message } });
    return Response.json({ error: msgErr.message }, { status: 500 });
  }

  // Email to client
  if (client?.email) {
    try {
      const subject = quoteTitle
        ? `Válasz az ajánlatodra: ${quoteTitle}`
        : `Üzenet: ${contractorName}`;
      const html = `
        <p>Kedves ${client.name}!</p>
        <p><strong>${contractorName}</strong> válaszolt${quoteTitle ? ` az <em>${quoteTitle}</em> ajánlatodhoz kapcsolódó üzenetre` : ''}:</p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;white-space:pre-wrap;">${message.trim()}</p>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/portal" style="color:#2563eb;">Megtekintés és válasz a portálon</a></p>
      `;
      await sendEmail({ to: client.email, replyTo: contractor?.email, subject, html: wrapEmail(html, subject) });
    } catch { /* non-fatal */ }
  }

  logAudit({
    entityId: user.id, userId: user.id, userName: contractorName,
    action: 'Message sent', targetType: 'thread', targetId: id,
    details: { client_id: thread.client_id, client_name: client?.name },
  });

  return Response.json({ ok: true, message: msg });
}
