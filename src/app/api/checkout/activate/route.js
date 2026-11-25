import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscriptionId, customerId } = await request.json();
  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

  const admin = createAdminClient();

  // Resolve the real subscription ID — Creem's success URL may pass a checkout session ID
  // (ch_...) under subscription_id rather than the actual subscription ID (sub_...).
  // We look up by subscription_id first; if that fails we fall back to customer_id lookup.
  let realSubscriptionId = null;

  const res = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${subscriptionId}`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY },
  });

  if (res.ok) {
    const sub = await res.json();
    const status = sub?.status;
    console.log('[activate] subscription status:', status, 'id:', sub?.id, 'for user:', user.id);
    if (!['active', 'trialing', 'paid'].includes(status)) {
      logAudit({ userId: user.id, userName: user.email, action: 'Activation blocked — subscription not active', targetType: 'payment', targetId: subscriptionId, details: { creem_status: status } });
      return NextResponse.json({ error: `Subscription not active (${status})` }, { status: 402 });
    }
    realSubscriptionId = sub?.id || subscriptionId;
  } else {
    // Likely a checkout session ID — resolve via customer
    console.warn('[activate] subscription_id lookup failed (checkout ID?), trying customer lookup', subscriptionId);
    if (customerId) {
      const custRes = await fetch(`${CREEM_BASE}/v1/subscriptions?customer_id=${customerId}`, {
        headers: { 'x-api-key': process.env.CREEM_API_KEY },
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        const subs = Array.isArray(custData) ? custData : (custData?.items ?? [custData]);
        const activeSub = subs.find(s => s?.id && ['active', 'trialing'].includes(s?.status));
        if (activeSub?.id) {
          realSubscriptionId = activeSub.id;
          console.log('[activate] resolved real subscription via customer:', realSubscriptionId);
        }
      }
    }
    if (!realSubscriptionId) {
      console.warn('[activate] could not resolve subscription ID — granting premium without sub row');
      logAudit({ userId: user.id, userName: user.email, action: 'Activation — subscription ID unresolved (granting anyway)', targetType: 'payment', targetId: subscriptionId, details: { customerId } });
    }
  }

  // Upsert subscription row only when we have a confirmed subscription ID (not a checkout ID)
  if (realSubscriptionId) {
    await admin.from('subscriptions').upsert({
      user_id:               user.id,
      creem_subscription_id: realSubscriptionId,
      product_family:        'premium',
      status:                'active',
      period_end:            null,
      updated_at:            new Date().toISOString(),
    }, { onConflict: 'creem_subscription_id' });
  }

  const profileUpdate = { is_subscription_premium: true, subscription_tier: 'premium' };
  if (customerId) profileUpdate.creem_customer_id = customerId;

  const { error } = await admin.from('profiles')
    .update(profileUpdate)
    .eq('id', user.id);

  if (error) {
    console.error('[activate] DB update failed:', error.message);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  // Write our user.id as external_id on the Creem customer — enables bidirectional lookup
  if (customerId) {
    fetch(`${CREEM_BASE}/v1/customers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CREEM_API_KEY },
      body: JSON.stringify({ customer_id: customerId, external_id: user.id }),
    }).catch(err => console.error('[activate] failed to set Creem external_id:', err.message));
  }

  console.log('[activate] premium granted for user:', user.id);

  logAudit({
    entityId: null,
    userId: user.id,
    userName: user.email,
    action: 'Premium subscription activated',
    targetType: 'subscription',
    targetId: subscriptionId || null,
    targetName: user.email,
  });

  return NextResponse.json({ ok: true });
}
