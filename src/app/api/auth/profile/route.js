import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  let { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Trigger may have failed silently — auto-create a basic profile so the user isn't locked out
  if (!profile) {
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
    const { data: created, error: createErr } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        role: 'user',
        must_change_password: false,
        subscription_tier: 'trial',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();
    if (createErr) return Response.json({ error: createErr.message }, { status: 500 });
    profile = created;
  }

  // Return collective memberships for the context switcher
  const { data: membershipsRaw } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name, collective_tier, creem_subscription_id, subscription_status, subscription_period_end, is_inclusive)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const collectives = (membershipsRaw || []).map(m => ({
    collective_id: m.collective_id,
    role:          m.role,
    name:          m.collectives?.name || null,
  }));

  // Return owned paid collective subscriptions for the subscription management panel
  const ownedCollectiveSubs = (membershipsRaw || [])
    .filter(m => m.role === 'owner' && m.collectives?.creem_subscription_id && !m.collectives?.is_inclusive)
    .map(m => ({
      collective_id:             m.collective_id,
      name:                      m.collectives.name,
      collective_tier:           m.collectives.collective_tier,
      creem_subscription_id:     m.collectives.creem_subscription_id,
      subscription_status:       m.collectives.subscription_status ?? 'active',
      subscription_period_end:   m.collectives.subscription_period_end ?? null,
    }));

  // Return the active premium subscription (for status display in /profil)
  const { data: premiumSub } = await admin
    .from('subscriptions')
    .select('creem_subscription_id, product_family, status, period_end, created_at')
    .eq('user_id', user.id)
    .in('product_family', ['premium', 'bundle'])
    .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: subscriptions table may be out-of-sync (e.g. manually reset to 'canceled').
  // If profile shows premium but no active sub row found, look for any sub row regardless of status.
  let resolvedPremiumSub = premiumSub;
  if (!resolvedPremiumSub && profile?.is_subscription_premium) {
    const { data: anySub } = await admin
      .from('subscriptions')
      .select('creem_subscription_id, product_family, status, period_end, created_at')
      .eq('user_id', user.id)
      .in('product_family', ['premium', 'bundle'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anySub) resolvedPremiumSub = { ...anySub, status: 'active' };
  }

  return Response.json({ profile, collectives, premiumSub: resolvedPremiumSub, ownedCollectiveSubs });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  // Password-reset acknowledgement (internal flag)
  if (Object.keys(body).length === 1 && body.must_change_password === false) {
    const { error } = await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  // Letterhead / profile info update
  const allowed = ['display_name', 'first_name', 'last_name', 'company_name', 'street', 'street_number', 'zip', 'city', 'tax_number', 'default_tax_percent'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k] ?? null;
  if (Object.keys(update).length === 0)
    return Response.json({ error: 'No updatable fields' }, { status: 400 });

  const { data, error } = await admin.from('profiles').update(update).eq('id', user.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId: user.id,
    userId: user.id,
    userName: data.display_name || user.email,
    action: 'Profil módosítva',
    targetType: 'user',
    targetId: user.id,
    targetName: data.display_name || user.email,
    details: { fields: Object.keys(update) },
  });

  return Response.json({ profile: data });
}
