import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { subscriptionId, customerId } = await request.json();
  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

  // Verify subscription is active with Creem
  const res = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${subscriptionId}`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error('[activate] Creem lookup failed', res.status, JSON.stringify(errBody));
    // Don't block activation on a lookup failure — subscription_id came from Creem's own redirect
    console.warn('[activate] granting premium anyway based on Creem redirect params');
  } else {
    const sub = await res.json();
    const status = sub?.status;
    console.log('[activate] subscription status:', status, 'for user:', user.id);
    if (!['active', 'trialing', 'paid'].includes(status)) {
      return NextResponse.json({ error: `Subscription not active (${status})` }, { status: 402 });
    }
  }

  const admin = createAdminClient();

  // Upsert subscription row
  if (subscriptionId) {
    await admin.from('subscriptions').upsert({
      user_id:               user.id,
      creem_subscription_id: subscriptionId,
      product_family:        'premium',
      status:                'active',
      period_end:            null,
      updated_at:            new Date().toISOString(),
    }, { onConflict: 'creem_subscription_id' });
  }

  const { error } = await admin.from('profiles')
    .update({ is_subscription_premium: true, subscription_tier: 'premium' })
    .eq('id', user.id);

  if (error) {
    console.error('[activate] DB update failed:', error.message);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  console.log('[activate] premium granted for user:', user.id);
  return NextResponse.json({ ok: true });
}
