import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

// Audit actions we surface in the history (excludes raw webhook noise)
const HISTORY_ACTIONS = [
  'Premium subscription activated',
  'Premium subscription cancelled',
  'Premium subscription resumed',
  'Subscription granted by superadmin',
  'Subscription revoked by superadmin',
  'Premium granted',
  'Premium revoked',
];

function toIso(val) {
  if (!val) return null;
  const d = new Date(typeof val === 'number' ? val * 1000 : val);
  return isNaN(d) ? null : d.toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const [profileRes, auditRes] = await Promise.all([
    admin.from('profiles').select('creem_customer_id, currency').eq('id', user.id).single(),
    admin.from('audit_logs')
      .select('id, action, details, created_at')
      .eq('user_id', user.id)
      .in('action', HISTORY_ACTIONS)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const events = [];

  // ── Audit log events ─────────────────────────────────────────────────────
  for (const row of (auditRes.data ?? [])) {
    let type = 'status';
    if (row.action.includes('activated') || row.action.includes('granted'))  type = 'activated';
    if (row.action.includes('cancelled') || row.action.includes('revoked'))  type = 'cancelled';
    if (row.action.includes('resumed'))                                       type = 'resumed';

    events.push({
      id:     row.id,
      source: 'audit',
      type,
      action: row.action,
      date:   row.created_at,
      details: row.details ?? null,
    });
  }

  // ── Creem transaction history ─────────────────────────────────────────────
  const customerId = profileRes.data?.creem_customer_id;
  if (customerId) {
    try {
      const txRes = await fetch(
        `${CREEM_BASE}/v1/transactions/search?customer_id=${customerId}&page_size=30`,
        { headers: { 'x-api-key': process.env.CREEM_API_KEY } }
      );
      if (txRes.ok) {
        const txData = await txRes.json();
        const items = txData?.items ?? txData?.result?.items ?? txData?.data ?? [];
        for (const tx of items) {
          if (tx.status !== 'paid') continue; // only show successful payments
          events.push({
            id:          tx.id,
            source:      'creem',
            type:        'payment',
            date:        toIso(tx.created_at),
            amount:      tx.amount_paid ?? tx.amount,
            currency:    tx.currency || profileRes.data?.currency || 'HUF',
            description: tx.description || null,
            period_start: toIso(tx.period_start),
            period_end:   toIso(tx.period_end),
          });
        }
      }
    } catch (err) {
      console.error('[subscriptions/history] Creem fetch error:', err.message);
    }
  }

  // Sort all events newest first, deduplicate by date+type (audit & webhook can overlap)
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return NextResponse.json({ events });
}
