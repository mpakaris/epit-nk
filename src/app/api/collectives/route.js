import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

// GET  — list collectives the caller belongs to (with members)
// POST — create a new collective (Premium required)

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name, created_at, collective_tier, creem_subscription_id, subscription_status, subscription_period_end)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);
  if (collectiveIds.length === 0) return Response.json({ collectives: [] });

  // Fetch members without embedded join — separate profile lookup avoids PostgREST schema cache issues
  const { data: allMembers, error: membersErr } = await admin
    .from('collective_members')
    .select('collective_id, user_id, role, status, created_at')
    .in('collective_id', collectiveIds);

  if (membersErr) return Response.json({ error: membersErr.message }, { status: 500 });

  // Fetch profiles for all member user_ids in one query
  const userIds = [...new Set((allMembers || []).map(m => m.user_id))];
  const { data: profileRows } = userIds.length > 0
    ? await admin.from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] };

  const profileMap = {};
  for (const p of (profileRows || [])) profileMap[p.id] = p;

  const collectives = (memberships || []).map(m => ({
    id:                    m.collective_id,
    name:                  m.collectives?.name,
    created_at:            m.collectives?.created_at,
    collective_tier:          m.collectives?.collective_tier ?? null,
    creem_subscription_id:    m.collectives?.creem_subscription_id ?? null,
    subscription_status:      m.collectives?.subscription_status ?? 'active',
    subscription_period_end:  m.collectives?.subscription_period_end ?? null,
    my_role:               m.role,
    members:  (allMembers || [])
      .filter(mb => mb.collective_id === m.collective_id)
      .map(mb => {
        const p = profileMap[mb.user_id] || {};
        return {
          user_id:      mb.user_id,
          role:         mb.role,
          status:       mb.status,
          joined_at:    mb.created_at,
          display_name: p.display_name || p.email || mb.user_id,
          email:        p.email || null,
        };
      }),
  }));

  return Response.json({ collectives });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_subscription_premium, subscription_tier, trial_ends_at, role, display_name').eq('id', user.id).single();

  const isSuperAdmin = profile?.role === 'superadmin';
  const isTrialUser = !profile?.is_subscription_premium && profile?.subscription_tier === 'trial';

  if (!isSuperAdmin && !isEffectivePremium(profile ?? {})) {
    return Response.json({ error: 'PREMIUM_REQUIRED' }, { status: 403 });
  }

  // Trial users may create at most 1 free collective
  if (!isSuperAdmin && isTrialUser) {
    const { count } = await admin
      .from('collective_members')
      .select('collective_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('status', 'active');
    if ((count ?? 0) >= 1) {
      return Response.json({ error: 'TRIAL_COLLECTIVE_LIMIT' }, { status: 403 });
    }
  }

  const { name, creem_subscription_id, collective_tier } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A kollektíva neve kötelező' }, { status: 400 });

  const insertData = { id: crypto.randomUUID(), name: name.trim() };
  if (creem_subscription_id) insertData.creem_subscription_id = creem_subscription_id;
  if (collective_tier) insertData.collective_tier = collective_tier;

  const { data: collective, error: createErr } = await admin
    .from('collectives')
    .insert(insertData)
    .select()
    .single();

  if (createErr) return Response.json({ error: createErr.message }, { status: 500 });

  // Add creator as owner
  await admin.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
  });

  logAudit({
    entityId:   collective.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Kollektíva létrehozva',
    targetType: 'collective',
    targetId:   collective.id,
    targetName: collective.name,
  });

  return Response.json({ collective });
}
