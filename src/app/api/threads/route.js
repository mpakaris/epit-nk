import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';

// GET /api/threads?client_id=X              — threads with messages for a client
// GET /api/threads?all=1                    — summary of all threads with unread + last message
// GET /api/threads?collective_id=X          — collective general chat thread + messages
// GET /api/threads?collective_id=X&project_id=Y  — project-specific collective thread
// GET /api/threads?collective_id=X&quote_id=Z    — quote-specific collective thread
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const clientId      = searchParams.get('client_id');
  const all           = searchParams.get('all');
  const collectiveId  = searchParams.get('collective_id');
  const projectId     = searchParams.get('project_id');
  const quoteId       = searchParams.get('quote_id');

  if (clientId) {
    // Verify this client belongs to the requesting user
    const { data: client } = await admin.from('clients')
      .select('id, name, email').eq('id', clientId).eq('owner_id', user.id).is('deleted_at', null).single();
    if (!client) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: threads } = await admin.from('threads')
      .select('id, type, quote_id, project_id, created_at')
      .eq('owner_id', user.id)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (!threads?.length) return Response.json({ threads: [] });

    const threadIds = threads.map(t => t.id);
    const { data: messages } = await admin.from('messages')
      .select('id, thread_id, sender_type, sender_user_id, body, read_at, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });

    const enriched = threads.map(t => ({
      ...t,
      messages: (messages || []).filter(m => m.thread_id === t.id),
      unread_count: (messages || []).filter(m => m.thread_id === t.id && m.sender_type === 'client' && !m.read_at).length,
    }));

    return Response.json({ threads: enriched });
  }

  if (all) {
    // Summary: all threads for this user, with unread count + last message
    const { data: threads } = await admin.from('threads')
      .select('id, type, client_id, quote_id, created_at')
      .eq('owner_id', user.id)
      .eq('type', 'client')
      .order('created_at', { ascending: false });

    if (!threads?.length) return Response.json({ threads: [], totalUnread: 0 });

    const threadIds = threads.map(t => t.id);
    const clientIds = [...new Set(threads.map(t => t.client_id).filter(Boolean))];

    const [{ data: messages }, { data: clients }, { data: quoteNames }] = await Promise.all([
      admin.from('messages')
        .select('id, thread_id, sender_type, body, read_at, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: true }),
      clientIds.length
        ? admin.from('clients').select('id, name').in('id', clientIds).is('deleted_at', null)
        : { data: [] },
      threads.filter(t => t.quote_id).length
        ? admin.from('quotes').select('id, title').in('id', threads.filter(t => t.quote_id).map(t => t.quote_id))
        : { data: [] },
    ]);

    const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c]));
    const quoteMap  = Object.fromEntries((quoteNames || []).map(q => [q.id, q]));

    const enriched = threads
      .filter(t => (messages || []).some(m => m.thread_id === t.id))
      .map(t => {
        const threadMessages = (messages || []).filter(m => m.thread_id === t.id);
        const lastMsg = threadMessages[threadMessages.length - 1] || null;
        const unread  = threadMessages.filter(m => m.sender_type === 'client' && !m.read_at).length;
        return {
          id:           t.id,
          client_id:    t.client_id,
          quote_id:     t.quote_id,
          client_name:  clientMap[t.client_id]?.name || null,
          quote_title:  quoteMap[t.quote_id]?.title || null,
          last_message: lastMsg ? { body: lastMsg.body, sender_type: lastMsg.sender_type, created_at: lastMsg.created_at } : null,
          unread_count: unread,
          created_at:   t.created_at,
        };
      })
      .sort((a, b) => new Date(b.last_message?.created_at || b.created_at) - new Date(a.last_message?.created_at || a.created_at));

    const totalUnread = enriched.reduce((s, t) => s + t.unread_count, 0);
    return Response.json({ threads: enriched, totalUnread });
  }

  if (collectiveId) {
    // Validate sender is active member of this collective (US-MSG-023)
    const { data: membership } = await admin.from('collective_members')
      .select('role').eq('collective_id', collectiveId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let query = admin.from('threads')
      .select('id, type, collective_id, project_id, quote_id, created_at')
      .eq('type', 'collective')
      .eq('collective_id', collectiveId);

    if (projectId)      query = query.eq('project_id', projectId);
    else if (quoteId)   query = query.eq('quote_id', quoteId);
    else {
      query = query.is('project_id', null).is('quote_id', null);
    }

    const { data: threads } = await query.order('created_at', { ascending: false });

    if (!threads?.length) return Response.json({ thread: null, messages: [] });

    const thread = threads[0];
    const { data: messages } = await admin.from('messages')
      .select('id, thread_id, sender_type, sender_user_id, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    // Fetch sender display names
    const userIds = [...new Set((messages || []).map(m => m.sender_user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await admin.from('profiles').select('id, display_name, company_name').in('id', userIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.company_name || p.display_name || 'Ismeretlen']));

    const enrichedMessages = (messages || []).map(m => ({
      ...m,
      sender_name: m.sender_user_id ? (profileMap[m.sender_user_id] || 'Ismeretlen') : null,
    }));

    return Response.json({ thread, messages: enrichedMessages });
  }

  return Response.json({ error: 'Provide client_id, all=1, or collective_id' }, { status: 400 });
}

// POST /api/threads
//   Client thread: { type: 'client', client_id, message }
//   Collective thread (find-or-create + send): { type: 'collective', collective_id, message, project_id?, quote_id? }
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  // ── Collective chat branch ──────────────────────────────────────────────────
  if (body.type === 'collective') {
    const { collective_id, message, project_id, quote_id } = body;
    if (!collective_id || !message?.trim()) {
      return Response.json({ error: 'collective_id and message are required' }, { status: 400 });
    }

    // Validate sender is active member (US-MSG-023)
    const { data: membership } = await admin.from('collective_members')
      .select('role').eq('collective_id', collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: senderProfile } = await admin.from('profiles')
      .select('display_name, company_name').eq('id', user.id).single();
    const senderName = senderProfile?.company_name || senderProfile?.display_name || 'Ismeretlen';

    // Find or create the thread
    let threadQuery = admin.from('threads')
      .select('id').eq('type', 'collective').eq('collective_id', collective_id);
    if (project_id) threadQuery = threadQuery.eq('project_id', project_id);
    else            threadQuery = threadQuery.is('project_id', null);
    if (quote_id)   threadQuery = threadQuery.eq('quote_id', quote_id);
    else            threadQuery = threadQuery.is('quote_id', null);

    let { data: existingThread } = await threadQuery.maybeSingle();

    if (!existingThread) {
      const insertPayload = { type: 'collective', collective_id };
      if (project_id) insertPayload.project_id = project_id;
      if (quote_id)   insertPayload.quote_id = quote_id;
      const { data: newThread, error: threadErr } = await admin.from('threads')
        .insert(insertPayload).select('id').single();
      if (threadErr) {
        logAudit({ entityId: collective_id, userId: user.id, userName: senderName, action: 'Collective thread creation failed', targetType: 'thread', details: { error: threadErr.message } });
        return Response.json({ error: threadErr.message }, { status: 500 });
      }
      existingThread = newThread;
    }

    // Insert message
    const { data: msg, error: msgErr } = await admin.from('messages')
      .insert({ thread_id: existingThread.id, sender_type: 'user', sender_user_id: user.id, body: message.trim() })
      .select('id, body, created_at, sender_type').single();
    if (msgErr) {
      logAudit({ entityId: collective_id, userId: user.id, userName: senderName, action: 'Collective message send failed', targetType: 'thread', targetId: existingThread.id, details: { error: msgErr.message } });
      return Response.json({ error: msgErr.message }, { status: 500 });
    }

    // Notify all other active members (US-MSG-021) — no email, in-app only
    const { data: otherMembers } = await admin.from('collective_members')
      .select('user_id').eq('collective_id', collective_id).eq('status', 'active').neq('user_id', user.id);

    if (otherMembers?.length) {
      const notifLink = project_id ? `/projektek/${project_id}` : quote_id ? `/ajanlatok/${quote_id}` : `/uzenetek`;
      const truncated = message.trim().length > 80 ? message.trim().substring(0, 80) + '…' : message.trim();
      const notifs = otherMembers.map(m => ({
        user_id: m.user_id,
        type: 'collective_message',
        title: senderName,
        body: truncated,
        link: notifLink,
        source_type: 'thread',
        source_id: existingThread.id,
      }));
      await admin.from('notifications').insert(notifs);
    }

    logAudit({
      entityId: collective_id, userId: user.id, userName: senderName,
      action: 'Collective message sent', targetType: 'thread', targetId: existingThread.id,
      details: { collective_id, project_id: project_id || null, quote_id: quote_id || null },
    });

    return Response.json({ ok: true, thread_id: existingThread.id, message: { ...msg, sender_name: senderName, sender_user_id: user.id } });
  }

  // ── Client thread branch ────────────────────────────────────────────────────
  const { client_id, message } = body;
  if (!client_id || !message?.trim()) {
    return Response.json({ error: 'client_id and message are required' }, { status: 400 });
  }

  const { data: client } = await admin.from('clients')
    .select('id, name, email').eq('id', client_id).eq('owner_id', user.id).is('deleted_at', null).single();
  if (!client) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: contractor } = await admin.from('profiles')
    .select('display_name, company_name, email').eq('id', user.id).single();
  const contractorName = contractor?.company_name || contractor?.display_name || 'Vállalkozó';

  // Create thread
  const { data: thread, error: threadErr } = await admin.from('threads')
    .insert({ type: 'client', owner_id: user.id, client_id })
    .select('id').single();
  if (threadErr) return Response.json({ error: threadErr.message }, { status: 500 });

  // Insert message
  const { data: msg, error: msgErr } = await admin.from('messages')
    .insert({ thread_id: thread.id, sender_type: 'user', sender_user_id: user.id, body: message.trim() })
    .select('id, body, created_at').single();
  if (msgErr) return Response.json({ error: msgErr.message }, { status: 500 });

  // Email to client
  if (client.email) {
    try {
      const subject = `Üzenet: ${contractorName}`;
      const html = `
        <p>Kedves ${client.name}!</p>
        <p><strong>${contractorName}</strong> üzenetet küldött neked:</p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;white-space:pre-wrap;">${message.trim()}</p>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/portal" style="color:#2563eb;">Válaszolj a portálon</a></p>
      `;
      await sendEmail({ to: client.email, replyTo: contractor?.email, subject, html: wrapEmail(html, subject) });
    } catch { /* non-fatal */ }
  }

  logAudit({
    entityId: user.id, userId: user.id, userName: contractorName,
    action: 'Thread created', targetType: 'thread', targetId: thread.id,
    details: { client_id, client_name: client.name },
  });

  return Response.json({ ok: true, thread_id: thread.id, message: msg });
}
