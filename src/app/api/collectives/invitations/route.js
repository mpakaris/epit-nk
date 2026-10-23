import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectiveUserId } from '@/lib/godMode';

export const dynamic = 'force-dynamic';

// GET — pending invitations for collectives owned by the caller
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const userId = await resolveEffectiveUserId(request, user, admin);

  // Get collectives where caller is owner/admin
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
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
