import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/notificationService';

const ALLOWED_TYPES = ['info', 'warning', 'success', 'announcement', 'system'];

// POST /api/superadmin/send-notification
// Body: { user_id, type, title, body?, link? }
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json().catch(() => ({}));
  const { user_id, type, title, body: notifBody, link } = payload;

  if (!user_id)                               return Response.json({ error: 'user_id is required' }, { status: 400 });
  if (!type || !ALLOWED_TYPES.includes(type)) return Response.json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 });
  if (!title?.trim())                         return Response.json({ error: 'title is required' }, { status: 400 });

  const senderName = profile.display_name || 'Superadmin';

  try {
    await createNotification(admin, {
      userId:     user_id,
      type,
      title:      title.trim(),
      body:       notifBody?.trim() || undefined,
      link:       link?.trim()      || undefined,
      sourceType: 'admin',
    });
  } catch (e) {
    logAudit({ entityId: user.id, userId: user.id, userName: senderName, action: 'SA notification send failed', targetType: 'notification', details: { error: e.message, user_id, type, title } });
    return Response.json({ error: e.message }, { status: 500 });
  }

  logAudit({ entityId: user.id, userId: user.id, userName: senderName, action: 'SA notification sent', targetType: 'notification', details: { user_id, type, title: title.trim() } });
  return Response.json({ ok: true });
}
