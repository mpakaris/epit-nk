import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET — pending invitations for collectives owned by the caller
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Get collectives where caller is owner/admin
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  const ids = (memberships || []).map(m => m.collective_id);
  if (ids.length === 0) return Response.json({ invitations: [] });

  const { data: invitations } = await admin
    .from('collective_invitations')
    .select('id, collective_id, email, status, created_at')
    .in('collective_id', ids)
    .in('status', ['pending', 'declined'])
    .order('created_at', { ascending: false });

  return Response.json({ invitations: invitations || [] });
}
