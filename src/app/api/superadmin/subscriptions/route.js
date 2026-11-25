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

  // Personal subscription update
  if (body.userId !== undefined) {
    const { userId, is_subscription_premium } = body;
    if (!userId || typeof is_subscription_premium !== 'boolean') {
      return Response.json({ error: 'userId and is_subscription_premium are required' }, { status: 400 });
    }

    const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
      ? 'https://test-api.creem.io'
      : 'https://api.creem.io';

    // 1. Update profile flags + clear trial fields when revoking
    const profileUpdate = {
      is_subscription_premium,
      subscription_tier: is_subscription_premium ? 'premium' : 'basic',
    };
    if (!is_subscription_premium) {
      profileUpdate.trial_started_at = null;
      profileUpdate.trial_ends_at    = null;
    }
    const { error: profileErr } = await admin.from('profiles').update(profileUpdate).eq('id', userId);
    if (profileErr) return Response.json({ error: profileErr.message }, { status: 500 });

    // 2. Keep subscriptions table in sync
    if (is_subscription_premium) {
      // Cancel any stale active rows first, then insert an admin-granted row
      const { error: cancelErr } = await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);
      if (cancelErr) console.error('[sa/subscriptions] cancel stale rows failed:', cancelErr.message);

      const { error: insertErr } = await admin.from('subscriptions').insert({
        user_id:               userId,
        creem_subscription_id: null, // admin-granted, no Creem billing attached
        product_family:        'premium',
        status:                'active',
        updated_at:            now,
      });
      if (insertErr) console.error('[sa/subscriptions] insert admin-grant failed:', insertErr.message);
    } else {
      // Fetch active Creem subscription IDs before canceling so we can also cancel in Creem
      const { data: activeSubs } = await admin.from('subscriptions')
        .select('creem_subscription_id')
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'])
        .not('creem_subscription_id', 'is', null);

      // Cancel all active premium rows in our DB first
      const { error: cancelErr } = await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);
      if (cancelErr) console.error('[sa/subscriptions] cancel rows failed:', cancelErr.message);

      // Also cancel in Creem so webhooks don't re-activate the user
      for (const { creem_subscription_id } of (activeSubs ?? [])) {
        if (!creem_subscription_id) continue;
        try {
          const r = await fetch(`${CREEM_BASE}/v1/subscriptions/${creem_subscription_id}/cancel`, {
            method: 'POST',
            headers: { 'x-api-key': process.env.CREEM_API_KEY, 'Content-Type': 'application/json' },
          });
          if (!r.ok) console.error('[sa/subscriptions] Creem cancel failed for', creem_subscription_id, r.status);
          else console.log('[sa/subscriptions] Creem subscription canceled:', creem_subscription_id);
        } catch (e) {
          console.error('[sa/subscriptions] Creem cancel error for', creem_subscription_id, e.message);
        }
      }
    }

    logAudit({ userId: auth.user.id, userName: auth.caller.display_name || '', action: `Subscription ${is_subscription_premium ? 'granted' : 'revoked'} by superadmin`, targetType: 'subscription', targetId: userId, details: { is_subscription_premium, tier: is_subscription_premium ? 'premium' : 'basic' } });
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
