import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  return NextResponse.json({
    status:               d?.status ?? 'unknown',
    created_at:           toIso(pick(d, 'created_at', 'createdAt')),
    current_period_start: toIso(pick(d, 'current_period_start_date', 'currentPeriodStartDate', 'currentPeriodStart', 'current_period_start')),
    current_period_end:   toIso(pick(d, 'current_period_end_date', 'currentPeriodEndDate', 'currentPeriodEnd', 'current_period_end')),
    // next_transaction_date is Creem's confirmed next billing date (more accurate than period_end for active subs)
    next_billing_date:    toIso(pick(d, 'next_transaction_date', 'nextTransactionDate')),
    canceled_at:          toIso(pick(d, 'canceled_at', 'canceledAt', 'cancel_at', 'cancelAt')),
    billing_cycle_count:  pick(d, 'billingCycleCount', 'billing_cycle_count', 'cycleCount', 'cycle_count'),
  });
}
