import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH /api/threads/[id]/read — mark all client messages in a thread as read (by contractor)
export async function PATCH(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: thread } = await admin.from('threads').select('type, owner_id, recipient_user_id').eq('id', id).single();
  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner     = thread.owner_id === user.id;
  const isRecipient = thread.recipient_user_id === user.id;
  if (!isOwner && !isRecipient) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date().toISOString();
  if (thread.type === 'direct') {
    // Mark messages from the other user as read
    await admin.from('messages')
      .update({ read_at: now })
      .eq('thread_id', id)
      .neq('sender_user_id', user.id)
      .is('read_at', null);
  } else {
    await admin.from('messages')
      .update({ read_at: now })
      .eq('thread_id', id)
      .eq('sender_type', 'client')
      .is('read_at', null);
  }

  return Response.json({ ok: true });
}
