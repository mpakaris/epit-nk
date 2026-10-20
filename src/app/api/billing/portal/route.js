import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

async function creemGet(path) {
  const res = await fetch(`${CREEM_BASE}${path}`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('email').eq('id', user.id).single();

  // Get creem_subscription_id from the subscriptions table
  const { data: sub } = await admin
    .from('subscriptions')
    .select('creem_subscription_id')
    .eq('user_id', user.id)
    .in('product_family', ['premium', 'bundle'])
    .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const email = profile?.email || user.email;
  let customerId = null;

  // Strategy 1: derive customer ID from stored subscription ID (most reliable)
  if (sub?.creem_subscription_id) {
    const { ok, body } = await creemGet(`/v1/subscriptions?subscription_id=${sub.creem_subscription_id}`);
    if (ok) {
      customerId = body?.customer_id ?? body?.customer?.id ?? body?.customerId;
      console.log('[billing/portal] customer from subscription:', customerId);
    } else {
      console.warn('[billing/portal] subscription lookup failed', body);
    }
  }

  // Strategy 2: fall back to email lookup
  if (!customerId) {
    const { ok, body } = await creemGet(`/v1/customers?email=${encodeURIComponent(email)}`);
    console.log('[billing/portal] email lookup response:', JSON.stringify(body));
    if (ok) {
      customerId = body?.data?.[0]?.id ?? body?.customers?.[0]?.id ?? body?.[0]?.id;
    }
  }

  if (!customerId) {
    console.error('[billing/portal] no Creem customer found for user', user.id, email);
    return NextResponse.json({ error: 'Nincs aktív előfizetés ehhez a fiókhoz.' }, { status: 404 });
  }

  // Generate billing portal session
  const portalRes = await fetch(`${CREEM_BASE}/v1/customers/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify({ customer_id: customerId }),
  });

  const portalData = await portalRes.json().catch(() => ({}));

  if (!portalRes.ok) {
    console.error('[billing/portal] portal creation failed', portalRes.status, portalData);
    return NextResponse.json({ error: 'Nem sikerült megnyitni az előfizetés-kezelő felületet.' }, { status: 502 });
  }

  const portalUrl = portalData.customer_portal_link || portalData.portalUrl || portalData.portal_url || portalData.url;

  if (!portalUrl) {
    console.error('[billing/portal] no portalUrl in response', portalData);
    return NextResponse.json({ error: 'Nem sikerült megnyitni az előfizetés-kezelő felületet.' }, { status: 502 });
  }

  return NextResponse.json({ portalUrl });
}
