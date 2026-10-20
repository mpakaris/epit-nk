import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

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

  const data = await res.json();
  return NextResponse.json({ status: data?.status ?? 'unknown' });
}
