import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active_collective_id')
    .eq('id', user.id)
    .single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  const { name, description, memberIds = [], startDate, endDate, clientId, collectiveId: bodyCollectiveId } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A projekt neve kötelező!' }, { status: 400 });

  // Superadmin can pass explicit collectiveId; others use their active context
  const collectiveId = profile.role === 'superadmin'
    ? (bodyCollectiveId || null)
    : (profile.active_collective_id || null);

  // If targeting a collective, verify membership
  if (collectiveId && profile.role !== 'superadmin') {
    const { data: mem } = await admin
      .from('collective_members')
      .select('collective_id')
      .eq('user_id', user.id)
      .eq('collective_id', collectiveId)
      .eq('status', 'active')
      .single();
    if (!mem) return Response.json({ error: 'Nincs hozzáférés ehhez a csoporthoz!' }, { status: 403 });
  }

  const { data: proj, error: projErr } = await admin
    .from('projects')
    .insert([{
      owner_id:      user.id,
      collective_id: collectiveId,
      name:          name.trim(),
      description:   description || null,
      created_by:    user.id,
      start_date:    startDate || null,
      end_date:      endDate || null,
      client_id:     clientId || null,
    }])
    .select()
    .single();

  if (projErr) return Response.json({ error: projErr.message }, { status: 400 });

  if (memberIds.length > 0) {
    // Validate members are in the same collective
    if (collectiveId) {
      const { data: validMembers } = await admin
        .from('collective_members')
        .select('user_id')
        .eq('collective_id', collectiveId)
        .in('user_id', memberIds)
        .eq('status', 'active');
      const validIds = (validMembers || []).map(m => m.user_id);
      if (validIds.length > 0) {
        await admin.from('project_members').insert(
          validIds.map(uId => ({ project_id: proj.id, user_id: uId }))
        );
      }
    }
  }

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId: collectiveId || user.id,
    userId: user.id,
    userName: callerProfile?.display_name || user.email,
    action: 'Projekt létrehozva',
    targetType: 'project',
    targetId: proj.id,
    targetName: proj.name,
  });

  return Response.json({ project: { ...proj, members: memberIds } });
}
