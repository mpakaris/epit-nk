import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notificationService';
import { findOrCreateDirectThread, insertMessage, truncateForNotif } from '@/lib/messageService';

// POST /api/superadmin/send-message
// Body: { recipient_user_id, message }
// Creates a direct thread (SA → user) and inserts the message.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { recipient_user_id, message } = await request.json().catch(() => ({}));
  if (!recipient_user_id || !message?.trim())
    return Response.json({ error: 'recipient_user_id and message are required' }, { status: 400 });
  if (recipient_user_id === user.id)
    return Response.json({ error: 'Cannot message yourself' }, { status: 400 });

  const senderName = profile.display_name || 'Superadmin';

  let threadId;
  try {
    threadId = await findOrCreateDirectThread(admin, user.id, recipient_user_id);
  } catch (e) {
    logAudit({ entityId: user.id, userId: user.id, userName: senderName, action: 'SA direct thread creation failed', targetType: 'thread', details: { error: e.message, recipient_user_id } });
    return Response.json({ error: e.message }, { status: 500 });
  }

  let msg;
  try {
    msg = await insertMessage(admin, { threadId, senderUserId: user.id, senderType: 'user', body: message.trim() });
  } catch (e) {
    logAudit({ entityId: user.id, userId: user.id, userName: senderName, action: 'SA direct message send failed', targetType: 'thread', targetId: threadId, details: { error: e.message } });
    return Response.json({ error: e.message }, { status: 500 });
  }

  // In-app notification to recipient (non-fatal)
  try {
    await createNotification(admin, {
      userId: recipient_user_id, type: 'direct_message',
      title: senderName, body: truncateForNotif(message.trim()),
      link: '/uzenetek', sourceType: 'thread', sourceId: threadId,
    });
  } catch { /* non-fatal */ }

  logAudit({ entityId: user.id, userId: user.id, userName: senderName, action: 'SA direct message sent', targetType: 'thread', targetId: threadId, details: { recipient_user_id } });
  return Response.json({ ok: true, thread_id: threadId, message: msg });
}
