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
      .select('user_id, role, collective_id, collectives(id, name, subscription_type, seat_count)')
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
      await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);
      await admin.from('subscriptions').insert({
        user_id:               userId,
        creem_subscription_id: null, // admin-granted, no Creem billing attached
        product_family:        'premium',
        status:                'active',
        updated_at:            now,
      });
    } else {
      // Cancel all active premium subscription rows
      await admin.from('subscriptions')
        .update({ status: 'canceled', updated_at: now })
        .eq('user_id', userId)
        .in('product_family', ['premium', 'bundle'])
        .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due']);
    }

    logAudit({ userId: auth.user.id, userName: auth.caller.display_name || '', action: `Subscription ${is_subscription_premium ? 'granted' : 'revoked'} by superadmin`, targetType: 'subscription', targetId: userId, details: { is_subscription_premium, tier: is_subscription_premium ? 'premium' : 'basic' } });
    return Response.json({ ok: true });
  }

  // Collective subscription update
  if (body.collectiveId !== undefined) {
    const { collectiveId, subscription_type, seat_count } = body;
    if (!collectiveId || !['premium', 'seats'].includes(subscription_type)) {
      return Response.json({ error: 'collectiveId and valid subscription_type required' }, { status: 400 });
    }
    const update = { subscription_type };
    if (subscription_type === 'seats') {
      const seats = parseInt(seat_count, 10);
      if (!seats || seats < 1) return Response.json({ error: 'seat_count must be >= 1' }, { status: 400 });
      update.seat_count = seats;
    }
    const { error } = await admin
      .from('collectives')
      .update(update)
      .eq('id', collectiveId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    logAudit({ userId: auth.user.id, userName: auth.caller.display_name || '', action: 'Collective subscription updated by admin', targetType: 'subscription', targetId: collectiveId, details: { subscription_type, seat_count } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Invalid request body' }, { status: 400 });
}
