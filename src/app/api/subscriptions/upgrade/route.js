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

  const { subscriptionId, collectiveId, targetTier, productId } = await request.json();
  if (!subscriptionId || !collectiveId || !targetTier || !productId) {
    return NextResponse.json({ error: 'subscriptionId, collectiveId, targetTier és productId kötelező' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: member } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('user_id', user.id)
    .single();
  if (member?.role !== 'owner') {
    return NextResponse.json({ error: 'Csak a tulajdonos bővítheti a csomagot.' }, { status: 403 });
  }

  console.log('[subscriptions/upgrade] target product:', productId);

  // Call Creem upgrade
  const upgradeRes = await fetch(`${CREEM_BASE}/v1/subscriptions/${subscriptionId}/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify({
      product_id: productId,
      update_behavior: 'proration-charge-immediately',
    }),
  });

  if (!upgradeRes.ok) {
    const err = await upgradeRes.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Bővítés sikertelen');
    console.error('[subscriptions/upgrade] Creem error', upgradeRes.status, msg);
    return NextResponse.json({ error: msg }, { status: upgradeRes.status });
  }

  // Update collective tier in DB
  const { error: dbErr } = await admin
    .from('collectives')
    .update({ collective_tier: targetTier })
    .eq('id', collectiveId);

  if (dbErr) console.warn('[subscriptions/upgrade] DB update skipped:', dbErr.message);

  return NextResponse.json({ ok: true, collective_tier: targetTier });
}
