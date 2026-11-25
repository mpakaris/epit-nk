import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

function pick(obj, ...keys) {
  for (const k of keys) { if (obj[k] != null) return obj[k]; }
  return null;
}

function toIso(val) {
  if (!val) return null;
  const d = new Date(typeof val === 'number' ? val * 1000 : val);
  return isNaN(d) ? null : d.toISOString();
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { subscriptionId } = await request.json();
  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId kötelező' }, { status: 400 });

  const res = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${subscriptionId}`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY },
  });

  if (!res.ok) {
    console.error('[subscriptions/status] Creem lookup failed', res.status);
    return NextResponse.json({ status: 'unknown' });
  }

  const d = await res.json();
  const status = d?.status ?? 'unknown';

  // If the stored subscription ID is already canceled in Creem, the DB is stale.
  // Look up the customer's actual active subscription and return the corrected ID.
  let correctedSubscriptionId = null;
  if (status === 'canceled' || status === 'expired') {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('creem_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.creem_customer_id) {
      const activeRes = await fetch(
        `${CREEM_BASE}/v1/subscriptions?customer_id=${profile.creem_customer_id}`,
        { headers: { 'x-api-key': process.env.CREEM_API_KEY } }
      );
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        // Response may be a single object or an array; handle both
        const subs = Array.isArray(activeData) ? activeData : (activeData?.items ?? [activeData]);
        const activeSub = subs.find(s =>
          s?.id && s.id !== subscriptionId &&
          ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'].includes(s?.status)
        );
        if (activeSub?.id) {
          correctedSubscriptionId = activeSub.id;
          // Sync our DB: mark the stale row canceled, upsert the correct one
          await admin.from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('creem_subscription_id', subscriptionId);
          await admin.from('subscriptions').upsert({
            user_id:               user.id,
            creem_subscription_id: activeSub.id,
            product_family:        'premium',
            status:                activeSub.status,
            period_end:            toIso(pick(activeSub, 'current_period_end_date', 'currentPeriodEndDate', 'current_period_end')),
            updated_at:            new Date().toISOString(),
          }, { onConflict: 'creem_subscription_id' });
          console.log('[subscriptions/status] corrected stale sub ID →', correctedSubscriptionId);
        }
      }
    }
  }

  return NextResponse.json({
    status,
    created_at:           toIso(pick(d, 'created_at', 'createdAt')),
    current_period_start: toIso(pick(d, 'current_period_start_date', 'currentPeriodStartDate', 'currentPeriodStart', 'current_period_start')),
    current_period_end:   toIso(pick(d, 'current_period_end_date', 'currentPeriodEndDate', 'currentPeriodEnd', 'current_period_end')),
    next_billing_date:    toIso(pick(d, 'next_transaction_date', 'nextTransactionDate')),
    canceled_at:          toIso(pick(d, 'canceled_at', 'canceledAt', 'cancel_at', 'cancelAt')),
    billing_cycle_count:  pick(d, 'billingCycleCount', 'billing_cycle_count', 'cycleCount', 'cycle_count'),
    // If the subscription ID was stale, return the corrected one so the UI can update
    corrected_subscription_id: correctedSubscriptionId,
  });
}
