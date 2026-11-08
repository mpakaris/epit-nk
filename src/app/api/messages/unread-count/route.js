import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/messages/unread-count — total unread client messages for the contractor (sidebar badge)
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Client threads: unread messages from clients
  const { data: clientThreads } = await admin.from('threads')
    .select('id').eq('owner_id', user.id).eq('type', 'client');

  // Direct threads: threads where user is owner or recipient
  const { data: ownedDirect } = await admin.from('threads')
    .select('id').eq('owner_id', user.id).eq('type', 'direct');
  const { data: receivedDirect } = await admin.from('threads')
    .select('id').eq('recipient_user_id', user.id).eq('type', 'direct');

  const clientThreadIds = (clientThreads || []).map(t => t.id);
  const directThreadIds = [...new Set([
    ...(ownedDirect   || []).map(t => t.id),
    ...(receivedDirect || []).map(t => t.id),
  ])];

  let count = 0;

  if (clientThreadIds.length) {
    const { count: c } = await admin.from('messages')
      .select('*', { count: 'exact', head: true })
      .in('thread_id', clientThreadIds)
      .eq('sender_type', 'client')
      .is('read_at', null);
    count += c ?? 0;
  }

  if (directThreadIds.length) {
    const { count: c } = await admin.from('messages')
      .select('*', { count: 'exact', head: true })
      .in('thread_id', directThreadIds)
      .neq('sender_user_id', user.id)
      .is('read_at', null);
    count += c ?? 0;
  }

  return Response.json({ count });
}
