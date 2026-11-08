import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/notifications — returns unread count + 20 most recent notifications
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const [{ count }, { data: notifications }] = await Promise.all([
    admin.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
    admin.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return Response.json({ unreadCount: count ?? 0, notifications: notifications ?? [] });
}

// PATCH /api/notifications — mark notifications as read
// Body: { ids: ['uuid', ...] } to mark specific ones, or { all: true } to mark all
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.all) {
    await admin.from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    return Response.json({ ok: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await admin.from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .in('id', body.ids)
      .is('read_at', null);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Provide ids[] or all:true' }, { status: 400 });
}
