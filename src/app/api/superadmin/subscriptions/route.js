import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: caller } = await admin.from('profiles').select('role, display_name').eq('id', user.id).single();
  if (caller?.role !== 'superadmin') return { error: 'Forbidden', status: 403 };
  return { admin, user, caller };
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const [profilesRes, authRes, membersRes] = await Promise.all([
    admin.from('profiles')
      .select('id, display_name, email, role, is_subscription_premium, subscription_tier, trial_ends_at, created_at')
      .order('display_name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('collective_members')
      .select('user_id, role, collective_id, collectives(id, name, collective_tier, status, subscription_status, is_inclusive)')
      .eq('role', 'owner'),
  ]);

  if (profilesRes.error) return Response.json({ error: profilesRes.error.message }, { status: 500 });
  if (membersRes.error) return Response.json({ error: membersRes.error.message }, { status: 500 });

  const authMap = {};
  for (const u of (authRes.data?.users ?? [])) {
    authMap[u.id] = u.last_sign_in_at ?? null;
  }

  // Map owned collectives per user
  const ownedCollectives = {};
  for (const m of (membersRes.data ?? [])) {
    if (!ownedCollectives[m.user_id]) ownedCollectives[m.user_id] = [];
    if (m.collectives) ownedCollectives[m.user_id].push(m.collectives);
  }

  const users = profilesRes.data.map(p => ({
    ...p,
    last_sign_in_at: authMap[p.id] ?? null,
    owned_collectives: ownedCollectives[p.id] ?? [],
  }));

  return Response.json({ users });
}

export async function PATCH(request) {
  const auth = await requireSuperadmin();
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const body = await request.json();
  const now = new Date().toISOString();

  // Personal subscription update — accepts { userId, tier: 'basic' | 'trial' | 'premium' }
  if (body.userId !== undefined) {
    const { userId, tier } = body;
    if (!userId || !['basic', 'trial', 'premium'].includes(tier)) {
      return Response.json({ error: "userId and tier ('basic'|'trial'|'premium') are required" }, { status: 400 });
    }

    const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
      ? 'https://test-api.creem.io'
      : 'https://api.creem.io';

    // Build profile update based on target tier
    let profileUpdate;
    if (tier === 'premium') {
      profileUpdate = {
        subscription_tier:    'premium',
        is_subscription_premium: true,
        trial_started_at:     null,
        trial_ends_at:        null,
      };
    } else if (tier === 'trial') {
      const trialStart = new Date();
      const trialEnd   = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);
      profileUpdate = {
        subscription_tier:    'trial',
        is_subscription_premium: false,
        trial_started_at:     trialStart.toISOString(),
        trial_ends_at:        trialEnd.toISOString(),
      };
    } else {
      // basic
      profileUpdate = {
        subscription_tier:    'basic',
        is_subscription_premium: false,
        trial_started_at:     null,
        trial_ends_at:        null,
      };
    }

    const { error: profileErr } = await admin.from('profiles').update(profileUpdate).eq('id', userId);
    if (profileErr) return Response.json({ error: profileErr.message }, { status: 500 });

    // Keep subscriptions table in sync
    if (tier === 'premium') {
      await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);
      await admin.from('subscriptions').insert({
        user_id: userId, creem_subscription_id: null,
        product_family: 'premium', status: 'active', updated_at: now,
      });
    } else {
      // For basic/trial: cancel any active Creem subscriptions
      const { data: activeSubs } = await admin.from('subscriptions')
        .select('creem_subscription_id')
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'])
        .not('creem_subscription_id', 'is', null);

      await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);

      for (const { creem_subscription_id } of (activeSubs ?? [])) {
        if (!creem_subscription_id) continue;
        fetch(`${CREEM_BASE}/v1/subscriptions/${creem_subscription_id}/cancel`, {
          method: 'POST',
          headers: { 'x-api-key': process.env.CREEM_API_KEY, 'Content-Type': 'application/json' },
        }).catch(e => console.error('[sa/subscriptions] Creem cancel error:', e.message));
      }
    }

    logAudit({ userId: auth.user.id, userName: auth.caller.display_name || '', action: `Subscription set to ${tier} by superadmin`, targetType: 'subscription', targetId: userId, details: { tier } });
    return Response.json({ ok: true });
  }

  // Collective update — set tier and/or status
  if (body.collectiveId !== undefined) {
    const { collectiveId, collective_tier, status } = body;
    if (!collectiveId) return Response.json({ error: 'collectiveId required' }, { status: 400 });
    const update = {};
    if (collective_tier && ['xs', 's', 'm', 'l'].includes(collective_tier)) update.collective_tier = collective_tier;
    if (status && ['not_activated', 'active', 'frozen'].includes(status)) update.status = status;
    if (!Object.keys(update).length) return Response.json({ error: 'collective_tier or status required' }, { status: 400 });
    const { error } = await admin.from('collectives').update(update).eq('id', collectiveId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    logAudit({ userId: auth.user.id, userName: auth.caller.display_name || '', action: 'Collective updated by superadmin', targetType: 'collective', targetId: collectiveId, details: update });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Invalid request body' }, { status: 400 });
}
