import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

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
    const rawMsg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || '');
    console.error('[subscriptions/upgrade] Creem error', upgradeRes.status, rawMsg);

    const msg = rawMsg.toLowerCase().includes('previous change')
      ? 'Az előző csomagváltás még feldolgozás alatt van. Kérjük, várj néhány percet, majd próbáld újra.'
      : rawMsg || 'Csomagváltás sikertelen. Kérjük, próbáld újra.';

    return NextResponse.json({ error: msg }, { status: upgradeRes.status });
  }

  // Update collective tier in DB
  const { error: dbErr } = await admin
    .from('collectives')
    .update({ collective_tier: targetTier })
    .eq('id', collectiveId);

  if (dbErr) console.warn('[subscriptions/upgrade] DB update skipped:', dbErr.message);

  const { data: colInfo } = await admin.from('collectives').select('name').eq('id', collectiveId).single();
  logAudit({
    entityId: collectiveId,
    userId: user.id,
    userName: user.email,
    action: `Collective tier upgraded to ${targetTier}`,
    targetType: 'collective',
    targetId: collectiveId,
    targetName: colInfo?.name || collectiveId,
    details: { target_tier: targetTier, subscription_id: subscriptionId },
  });

  return NextResponse.json({ ok: true, collective_tier: targetTier });
}
