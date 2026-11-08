import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/messages/unread-count — total unread client messages for the contractor (sidebar badge)
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Count messages in threads owned by user where sender is client and not yet read
  const { data: threads } = await admin.from('threads')
    .select('id')
    .eq('owner_id', user.id)
    .eq('type', 'client');

  if (!threads?.length) return Response.json({ count: 0 });

  const threadIds = threads.map(t => t.id);
  const { count } = await admin.from('messages')
    .select('*', { count: 'exact', head: true })
    .in('thread_id', threadIds)
    .eq('sender_type', 'client')
    .is('read_at', null);

  return Response.json({ count: count ?? 0 });
}
