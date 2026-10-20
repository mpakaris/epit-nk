import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

/**
 * Calculate the next billing date from the subscription start date.
 * Billing day = same day-of-month as the start date, every month.
 * If that day has already passed this month, the next billing is next month.
 */
function calcNextBillingDate(subscriptionStartIso) {
  const start = new Date(subscriptionStartIso);
  const billingDay = start.getDate();
  const now = new Date();

  const clampedDay = (year, month) =>
    Math.min(billingDay, new Date(year, month + 1, 0).getDate());

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = clampedDay(year, month);
  let candidate = new Date(year, month, day, 0, 0, 0);

  // If today is on or after the billing date, next billing is next month
  if (candidate <= now) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    day = clampedDay(year, month);
    candidate = new Date(year, month, day, 0, 0, 0);
  }

  return candidate;
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { subscriptionId, collectiveId } = await request.json();
  if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId kötelező' }, { status: 400 });

  const admin = createAdminClient();

  // Verify ownership + fetch collective created_at for billing-date calculation
  let collectiveCreatedAt = null;
  if (collectiveId) {
    const { data: member } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', collectiveId)
      .eq('user_id', user.id)
      .single();
    if (member?.role !== 'owner') {
      return NextResponse.json({ error: 'Csak a kollektíva tulajdonosa mondhatja le az előfizetést.' }, { status: 403 });
    }

    const { data: col } = await admin
      .from('collectives')
      .select('created_at')
      .eq('id', collectiveId)
      .single();
    collectiveCreatedAt = col?.created_at ?? null;
  }

  // Cancel at end of current billing period
  const res = await fetch(`${CREEM_BASE}/v1/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY,
    },
    body: JSON.stringify({ mode: 'scheduled' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || 'Lemondás sikertelen');
    console.error('[subscriptions/cancel] Creem error', res.status, msg);
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const sub = await res.json().catch(() => ({}));

  // Try Creem response fields first
  let periodEnd =
    sub?.currentPeriodEnd ??
    sub?.current_period_end ??
    sub?.periodEnd ??
    sub?.period_end ??
    sub?.cancelAt ??
    sub?.cancel_at ??
    null;

  // If Creem didn't include it, try fetching the subscription
  if (!periodEnd) {
    const subRes = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${subscriptionId}`, {
      headers: { 'x-api-key': process.env.CREEM_API_KEY },
    });
    if (subRes.ok) {
      const subData = await subRes.json();
      periodEnd =
        subData?.currentPeriodEnd ??
        subData?.current_period_end ??
        subData?.periodEnd ??
        subData?.period_end ??
        subData?.cancelAt ??
        subData?.cancel_at ??
        null;
    }
  }

  // Last resort: calculate from subscription start date (billing day repeats monthly)
  let periodEndIso = null;
  if (periodEnd) {
    periodEndIso = new Date(typeof periodEnd === 'number' ? periodEnd * 1000 : periodEnd).toISOString();
    console.log('[subscriptions/cancel] period end from Creem:', periodEndIso);
  } else if (collectiveCreatedAt) {
    const calculated = calcNextBillingDate(collectiveCreatedAt);
    periodEndIso = calculated.toISOString();
    console.log('[subscriptions/cancel] period end calculated from start date:', periodEndIso, '(billing day:', new Date(collectiveCreatedAt).getDate(), ')');
  }

  if (collectiveId) {
    const update = { subscription_status: 'scheduled_cancel' };
    if (periodEndIso) update.subscription_period_end = periodEndIso;
    const { error: dbErr } = await admin.from('collectives').update(update).eq('id', collectiveId);
    if (dbErr) console.warn('[subscriptions/cancel] collective DB update skipped:', dbErr.message);
  } else {
    // Premium subscription cancel — update subscriptions table
    const update = { status: 'scheduled_cancel', updated_at: new Date().toISOString() };
    if (periodEndIso) update.period_end = periodEndIso;
    const { error: dbErr } = await admin.from('subscriptions').update(update).eq('creem_subscription_id', subscriptionId);
    if (dbErr) console.warn('[subscriptions/cancel] subscriptions DB update skipped:', dbErr.message);
    // is_subscription_premium stays true — user retains access until period_end

    // Cascade: cancel all active collective subscriptions owned by this user
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const ownerName = ownerProfile?.display_name || 'A tulajdonos';

    // Find collectives owned by this user via collective_members
    const { data: ownedMemberships } = await admin
      .from('collective_members')
      .select('collective_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('status', 'active');

    const ownedIds = (ownedMemberships || []).map(m => m.collective_id);

    const { data: activeCollectives } = ownedIds.length > 0
      ? await admin
          .from('collectives')
          .select('id, name, creem_subscription_id, created_at')
          .in('id', ownedIds)
          .in('subscription_status', ['active', 'trialing'])
          .not('creem_subscription_id', 'is', null)
      : { data: [] };

    const canceledCollectives = [];

    for (const col of (activeCollectives || [])) {
      try {
        const colRes = await fetch(`${CREEM_BASE}/v1/subscriptions/${col.creem_subscription_id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CREEM_API_KEY },
          body: JSON.stringify({ mode: 'scheduled' }),
        });

        let colPeriodEnd = null;
        if (colRes.ok) {
          const colSub = await colRes.json().catch(() => ({}));
          const raw = colSub?.currentPeriodEnd ?? colSub?.current_period_end ?? colSub?.periodEnd ?? colSub?.period_end ?? null;
          colPeriodEnd = raw ? new Date(typeof raw === 'number' ? raw * 1000 : raw).toISOString() : null;
        } else {
          console.warn('[subscriptions/cancel] collective cancel failed:', col.id, colRes.status);
        }

        if (!colPeriodEnd && col.created_at) {
          colPeriodEnd = calcNextBillingDate(col.created_at).toISOString();
        }

        const colUpdate = { subscription_status: 'scheduled_cancel' };
        if (colPeriodEnd) colUpdate.subscription_period_end = colPeriodEnd;
        await admin.from('collectives').update(colUpdate).eq('id', col.id);

        canceledCollectives.push({ name: col.name, period_end: colPeriodEnd });

        // Notify active members (non-owner)
        const { data: members } = await admin
          .from('collective_members')
          .select('profiles(email)')
          .eq('collective_id', col.id)
          .eq('status', 'active')
          .neq('role', 'owner');

        const periodStr = colPeriodEnd
          ? new Date(colPeriodEnd).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
          : null;

        for (const m of (members || [])) {
          const memberEmail = m.profiles?.email;
          if (!memberEmail) continue;
          sendEmail({
            to: memberEmail,
            subject: `${col.name} — előfizetés lemondva`,
            html: wrapEmail(`
              <h2 style="margin:0 0 12px;font-size:18px;color:#1e293b;">Kollektíva előfizetés lemondva</h2>
              <p style="color:#334155;font-size:14px;line-height:1.6;">
                <strong>${ownerName}</strong> lemondta a(z) <strong>${col.name}</strong> kollektíva előfizetését.
              </p>
              ${periodStr
                ? `<p style="color:#334155;font-size:14px;line-height:1.6;">A hozzáférés <strong>${periodStr}</strong>-ig aktív marad.</p>`
                : `<p style="color:#334155;font-size:14px;line-height:1.6;">Az előfizetés a számlázási időszak végén szűnik meg.</p>`
              }
              <p style="color:#64748b;font-size:13px;margin-top:16px;">Ha kérdésed van, vedd fel a kapcsolatot a kollektíva tulajdonosával.</p>
            `),
          }).catch(e => console.error('[subscriptions/cancel] member email failed:', memberEmail, e.message));
        }
      } catch (e) {
        console.error('[subscriptions/cancel] collective cascade error:', col.id, e.message);
      }
    }

    return NextResponse.json({
      ok: true,
      subscription_status: 'scheduled_cancel',
      subscription_period_end: periodEndIso,
      canceled_collectives: canceledCollectives,
    });
  }

  return NextResponse.json({
    ok: true,
    subscription_status: 'scheduled_cancel',
    subscription_period_end: periodEndIso,
  });
}
