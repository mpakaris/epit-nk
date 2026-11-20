import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/messages/unread-count
// Returns the number of CONVERSATIONS (threads) with at least one unread message.
// Badge semantics: "2 conversations with new messages", not "7 total unread messages".
// This matches what the user sees in the MessagesSheet and /uzenetek thread list.
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Client threads the user owns
  const { data: clientThreads } = await admin.from('threads')
    .select('id').eq('owner_id', user.id).eq('type', 'client');

  // Direct threads where user is owner or recipient
  const { data: ownedDirect }    = await admin.from('threads')
    .select('id').eq('owner_id', user.id).eq('type', 'direct');
  const { data: receivedDirect } = await admin.from('threads')
    .select('id').eq('recipient_user_id', user.id).eq('type', 'direct');

  const clientThreadIds = (clientThreads || []).map(t => t.id);
  const directThreadIds = [...new Set([
    ...(ownedDirect   || []).map(t => t.id),
    ...(receivedDirect || []).map(t => t.id),
  ])];

  const unreadThreadIds = new Set();

  // Client threads: any unread message from the client side
  if (clientThreadIds.length) {
    const { data: msgs } = await admin.from('messages')
      .select('thread_id')
      .in('thread_id', clientThreadIds)
      .eq('sender_type', 'client')
      .is('read_at', null);
    (msgs || []).forEach(m => unreadThreadIds.add(m.thread_id));
  }

  // Direct threads: any unread message not sent by the user themselves
  if (directThreadIds.length) {
    const { data: msgs } = await admin.from('messages')
      .select('thread_id')
      .in('thread_id', directThreadIds)
      .neq('sender_user_id', user.id)
      .is('read_at', null);
    (msgs || []).forEach(m => unreadThreadIds.add(m.thread_id));
  }

  return Response.json({ count: unreadThreadIds.size });
}
