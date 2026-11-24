import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

// POST /api/collectives/[id]/cancel
// Schedules a Creem subscription cancellation at period end.
// The collective remains active until the billing period ends;
// the subscription.canceled webhook will then set status = 'frozen'.
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
    return Response.json({ error: 'Csak a kollektíva tulajdonosa mondhatja le az előfizetést.' }, { status: 403 });
  }

  const { data: collective, error: colErr } = await admin
    .from('collectives')
    .select('id, name, status, is_inclusive, creem_subscription_id, subscription_period_end')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (colErr || !collective) {
    return Response.json({ error: 'Kollektíva nem található.' }, { status: 404 });
  }

  if (collective.is_inclusive) {
    return Response.json({ error: 'Az inkluzív kollektíva előfizetése nem mondható le — a Prémium tartalmazza.' }, { status: 403 });
  }

  if (collective.status !== 'active') {
    return Response.json({ error: 'Csak aktív kollektíva előfizetése mondható le.' }, { status: 403 });
  }

  if (!collective.creem_subscription_id) {
    return Response.json({ error: 'Ehhez a kollektívához nem tartozik Creem előfizetés.' }, { status: 400 });
  }

  if (!process.env.CREEM_API_KEY) {
    logAudit({ entityId: id, userId: user.id, action: 'Kollektíva előfizetés lemondás sikertelen — CREEM_API_KEY hiányzik', targetType: 'collective', targetId: id });
    return Response.json({ error: 'Fizetési rendszer nincs konfigurálva.' }, { status: 500 });
  }

  // Cancel at period end (not immediately)
  const creemRes = await fetch(`${CREEM_BASE}/v1/subscriptions/${collective.creem_subscription_id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CREEM_API_KEY },
    body: JSON.stringify({ cancel_at_period_end: true }),
  });

  if (!creemRes.ok) {
    const errText = await creemRes.text().catch(() => '');
    logAudit({
      entityId:   id,
      userId:     user.id,
      action:     'Kollektíva előfizetés lemondás sikertelen (Creem hiba)',
      targetType: 'collective',
      targetId:   id,
      targetName: collective.name,
      details:    { creem_status: creemRes.status, error: errText, subscription_id: collective.creem_subscription_id },
    });
    return Response.json({ error: 'Creem API hiba. Kérjük, próbáld újra.' }, { status: 502 });
  }

  logAudit({
    entityId:   id,
    userId:     user.id,
    action:     'Kollektíva előfizetés lemondva (időszak végén érvényes)',
    targetType: 'collective',
    targetId:   id,
    targetName: collective.name,
    details:    { subscription_id: collective.creem_subscription_id, cancel_at: collective.subscription_period_end },
  });

  return Response.json({ ok: true, cancel_at: collective.subscription_period_end });
}
