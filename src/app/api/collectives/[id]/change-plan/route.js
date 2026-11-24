import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

const TIER_PRODUCT_IDS = {
  s: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
  m: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
  l: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
};

const TIER_SEATS = { xs: 1, s: 3, m: 6, l: 9 };

// POST /api/collectives/[id]/change-plan
// Body: { tier: 's' | 'm' | 'l' }
export async function POST(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerMembership } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (callerMembership?.role !== 'owner') {
    return Response.json({ error: 'Csak a kollektíva tulajdonosa módosíthatja a csomagot.' }, { status: 403 });
  }

  const { data: collective, error: colErr } = await admin
    .from('collectives')
    .select('id, name, status, collective_tier, is_inclusive, creem_subscription_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (colErr || !collective) {
    return Response.json({ error: 'Kollektíva nem található.' }, { status: 404 });
  }

  if (collective.status !== 'active') {
    return Response.json({ error: 'Csak aktív kollektíva csomagja módosítható.' }, { status: 403 });
  }

  if (collective.is_inclusive) {
    return Response.json({ error: 'Az inkluzív kollektíva csomagja nem módosítható.' }, { status: 403 });
  }

  const body = await req.json();
  const { tier } = body;

  if (!['s', 'm', 'l'].includes(tier)) {
    return Response.json({ error: 'Érvénytelen csomag.' }, { status: 400 });
  }

  const productId = TIER_PRODUCT_IDS[tier];
  if (!productId) {
    return Response.json({ error: `${tier.toUpperCase()} csomag termékidentifikátora nincs konfigurálva.` }, { status: 500 });
  }

  // Downgrade check: count active + invited members (excluding owner)
  const newSeatLimit = TIER_SEATS[tier] ?? 0;
  const currentSeatLimit = TIER_SEATS[collective.collective_tier ?? 's'] ?? 0;

  if (newSeatLimit < currentSeatLimit) {
    const { count } = await admin
      .from('collective_members')
      .select('*', { count: 'exact', head: true })
      .eq('collective_id', id)
      .neq('role', 'owner')
      .in('status', ['active', 'invited']);

    if ((count ?? 0) > newSeatLimit) {
      logAudit({
        entityId:   id,
        userId:     user.id,
        action:     'Csomag csökkentése megtagadva — túl sok tag',
        targetType: 'collective',
        targetId:   id,
        targetName: collective.name,
        details:    { current_members: count, allowed: newSeatLimit },
      });
      return Response.json({
        error: 'too_many_members',
        current: count,
        allowed: newSeatLimit,
      }, { status: 422 });
    }
  }

  // Initiate Creem subscription update
  if (!process.env.CREEM_API_KEY) {
    logAudit({ entityId: id, userId: user.id, action: 'Csomag módosítás sikertelen — CREEM_API_KEY hiányzik', targetType: 'collective', targetId: id, details: { tier } });
    return Response.json({ error: 'Fizetési rendszer nincs konfigurálva.' }, { status: 500 });
  }

  if (!collective.creem_subscription_id) {
    return Response.json({ error: 'Ehhez a kollektívához nem tartozik Creem előfizetés.' }, { status: 400 });
  }

  const creemRes = await fetch(`${CREEM_BASE}/v1/subscriptions/${collective.creem_subscription_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CREEM_API_KEY },
    body: JSON.stringify({ product_id: productId }),
  });

  if (!creemRes.ok) {
    const errText = await creemRes.text().catch(() => '');
    logAudit({ entityId: id, userId: user.id, action: 'Csomag módosítás sikertelen (Creem hiba)', targetType: 'collective', targetId: id, details: { tier, creem_status: creemRes.status, error: errText } });
    return Response.json({ error: 'Creem API hiba. Kérjük, próbáld újra.' }, { status: 502 });
  }

  // Update collective_tier optimistically; webhook will confirm
  await admin.from('collectives').update({ collective_tier: tier }).eq('id', id);

  logAudit({
    entityId:   id,
    userId:     user.id,
    action:     'Kollektíva csomag módosítva',
    targetType: 'collective',
    targetId:   id,
    targetName: collective.name,
    details:    { from_tier: collective.collective_tier, to_tier: tier, subscription_id: collective.creem_subscription_id },
  });

  return Response.json({ ok: true, tier });
}
