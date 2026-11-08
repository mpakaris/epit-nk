import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH /api/threads/[id]/read — mark all client messages in a thread as read (by contractor)
export async function PATCH(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: thread } = await admin.from('threads').select('owner_id').eq('id', id).single();
  if (!thread) return Response.json({ error: 'Not found' }, { status: 404 });
  if (thread.owner_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await admin.from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', id)
    .eq('sender_type', 'client')
    .is('read_at', null);

  return Response.json({ ok: true });
}
