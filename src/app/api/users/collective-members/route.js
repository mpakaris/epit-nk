import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/users/collective-members
// Returns all active members across all of the caller's collectives, excluding the caller.
// Used by the message compose picker to list messageable team members.
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // All collectives the caller is an active member of
  const { data: myMemberships } = await admin.from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (!myMemberships?.length) return Response.json({ members: [] });

  const collectiveIds = myMemberships.map(m => m.collective_id);

  // All other active members in those collectives
  const { data: rows } = await admin.from('collective_members')
    .select('user_id, role, collective_id, collectives(name)')
    .in('collective_id', collectiveIds)
    .eq('status', 'active')
    .neq('user_id', user.id);

  if (!rows?.length) return Response.json({ members: [] });

  // Fetch profiles
  const userIds = [...new Set(rows.map(r => r.user_id))];
  const { data: profiles } = await admin.from('profiles')
    .select('id, display_name, company_name')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  // Deduplicate by user_id, attach collective name for display
  const seen = new Set();
  const members = [];
  for (const row of rows) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    const profile = profileMap[row.user_id];
    if (!profile) continue;
    members.push({
      id:             row.user_id,
      display_name:   profile.company_name || profile.display_name || '—',
      collective_name: row.collectives?.name || '',
    });
  }

  return Response.json({ members });
}
