import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/portal/threads — returns all threads with messages for the OTP-authenticated client
// Polled every 30s by the portal dashboard for live updates
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const email = user.email.toLowerCase();

  // Find all client records with this email
  const { data: clientRecords } = await admin.from('clients')
    .select('id').ilike('email', email).is('deleted_at', null);

  if (!clientRecords?.length) return Response.json({ threads: [] });

  const clientIds = clientRecords.map(c => c.id);

  const { data: threads } = await admin.from('threads')
    .select('id, type, client_id, quote_id, owner_id, created_at')
    .in('client_id', clientIds)
    .eq('type', 'client')
    .order('created_at', { ascending: false });

  if (!threads?.length) return Response.json({ threads: [] });

  const threadIds = threads.map(t => t.id);
  const { data: messages } = await admin.from('messages')
    .select('id, thread_id, sender_type, body, read_at, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true });

  const enriched = threads.map(t => ({
    ...t,
    messages: (messages || []).filter(m => m.thread_id === t.id),
  }));

  return Response.json({ threads: enriched });
}
