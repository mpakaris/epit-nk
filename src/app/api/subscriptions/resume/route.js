import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { subscriptionId, collectiveId } = await request.json();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId kötelező' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (collectiveId) {
    const { data: member } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', collectiveId)
      .eq('user_id', user.id)
      .single();
    if (member?.role !== 'owner') {
      return NextResponse.json({ error: 'Csak a tulajdonos állíthatja vissza az előfizetést.' }, { status: 403 });
    }

    // Collective addons require an active premium subscription
    const { data: activePremium } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('product_family', ['premium', 'bundle'])
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle();

    if (!activePremium) {
      return NextResponse.json({
        error: 'A kollektíva visszaállításához aktív Prémium előfizetés szükséges. Először állítsd vissza a Prémium előfizetésedet.',
      }, { status: 403 });
    }
  }

  const res = await fetch(`${CREEM_BASE}/v1/subscriptions/${subscriptionId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Visszaállítás sikertelen');
    console.error('[subscriptions/resume] Creem error', res.status, msg);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  if (collectiveId) {
    await admin.from('collectives').update({ subscription_status: 'active', subscription_period_end: null }).eq('id', collectiveId);
  } else {
    await admin.from('subscriptions')
      .update({ status: 'active', period_end: null, updated_at: new Date().toISOString() })
      .eq('creem_subscription_id', subscriptionId);
  }

  return NextResponse.json({ ok: true });
}
