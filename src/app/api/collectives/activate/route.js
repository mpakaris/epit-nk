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

  const { subscriptionId, collectiveName, collectiveTier } = await request.json();

  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId kötelező' }, { status: 400 });
  if (!collectiveName?.trim()) return NextResponse.json({ error: 'A kollektíva neve kötelező' }, { status: 400 });

  // Verify subscription with Creem
  const creemRes = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${subscriptionId}`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY },
  });

  if (!creemRes.ok) {
    const errBody = await creemRes.json().catch(() => ({}));
    console.error('[collectives/activate] Creem lookup failed', creemRes.status, JSON.stringify(errBody));
    console.warn('[collectives/activate] proceeding with collective creation despite Creem lookup failure');
  } else {
    const sub = await creemRes.json();
    const status = sub?.status;
    console.log('[collectives/activate] subscription status:', status, 'for user:', user.id);
    if (!['active', 'trialing', 'paid'].includes(status)) {
      return NextResponse.json({ error: `Az előfizetés nem aktív (${status})` }, { status: 402 });
    }
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();

  // Create the collective — try with new columns first, fall back to base insert if migration not applied
  let collective, createErr;

  ({ data: collective, error: createErr } = await admin
    .from('collectives')
    .insert({ id: crypto.randomUUID(), name: collectiveName.trim(), creem_subscription_id: subscriptionId, collective_tier: collectiveTier || null })
    .select().single());

  if (createErr) {
    // Migration 077 may not be applied yet — retry without the new columns
    console.warn('[collectives/activate] DB insert with new columns failed, retrying without:', createErr.message);
    ({ data: collective, error: createErr } = await admin
      .from('collectives')
      .insert({ id: crypto.randomUUID(), name: collectiveName.trim() })
      .select().single());
  }

  if (createErr) {
    console.error('[collectives/activate] DB insert failed:', createErr.message);
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  // Add creator as owner
  const { error: memberErr } = await admin.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
  });

  if (memberErr) {
    console.error('[collectives/activate] member insert failed:', memberErr.message);
  }

  logAudit({
    entityId:   collective.id,
    userId:     user.id,
    userName:   profile?.display_name || user.email,
    action:     'Kollektíva aktiválva (Creem)',
    targetType: 'collective',
    targetId:   collective.id,
    targetName: collective.name,
  });

  return NextResponse.json({ collective });
}
