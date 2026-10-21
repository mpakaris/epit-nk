import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';

function verifySignature(payload, signature, secret) {
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// ── Product family detection ─────────────────────────────────────────────────

const ADDON_PRODUCT_IDS = [
  process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
  process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
  process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
].filter(Boolean);

function getProductFamily(productId) {
  if (!productId) return 'unknown';
  if (productId === process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID) return 'premium';
  if (ADDON_PRODUCT_IDS.includes(productId)) return 'addon';
  return 'unknown';
}

// ── Subscription helpers ─────────────────────────────────────────────────────

async function upsertSubscription(admin, { userId, creemSubId, family, status, periodEnd = null }) {
  if (!creemSubId) return;
  const { error } = await admin.from('subscriptions').upsert({
    user_id:               userId,
    creem_subscription_id: creemSubId,
    product_family:        family,
    status,
    period_end:            periodEnd,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'creem_subscription_id' });
  if (error) console.error('[creem webhook] upsertSubscription error:', error.message);
}

async function grantPremium(admin, userId, subscriptionId, family = 'premium') {
  await upsertSubscription(admin, { userId, creemSubId: subscriptionId, family, status: 'active' });
  const { error } = await admin.from('profiles')
    .update({ is_subscription_premium: true, subscription_tier: 'premium' })
    .eq('id', userId);
  if (error) {
    console.error('[creem webhook] grantPremium error:', error.message);
    return;
  }
  console.log('[creem webhook] grantPremium OK for userId:', userId);

  // Ensure inclusive collective is active (create it if missing, reactivate if frozen)
  const { data: ownedMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active');

  const ownedIds = (ownedMemberships || []).map(m => m.collective_id);
  if (ownedIds.length > 0) {
    const { data: inclusive } = await admin
      .from('collectives')
      .select('id, subscription_status')
      .in('id', ownedIds)
      .eq('is_inclusive', true)
      .maybeSingle();

    if (inclusive) {
      if (inclusive.subscription_status !== 'active') {
        await admin.from('collectives')
          .update({ subscription_status: 'active' })
          .eq('id', inclusive.id);
      }
    } else {
      // No inclusive collective yet — create one
      const profile = await getProfile(admin, userId);
      const displayName = profile?.display_name || 'Felhasználó';
      const newId = globalThis.crypto.randomUUID();
      await admin.from('collectives').insert({
        id:                  newId,
        name:                `${displayName} Csapata`,
        is_inclusive:        true,
        subscription_status: 'active',
      });
      await admin.from('collective_members').insert({
        collective_id: newId,
        user_id:       userId,
        role:          'owner',
        status:        'active',
      });
    }
  } else {
    // User owns no collectives yet — create inclusive one
    const profile = await getProfile(admin, userId);
    const displayName = profile?.display_name || 'Felhasználó';
    const newId = globalThis.crypto.randomUUID();
    await admin.from('collectives').insert({
      id:                  newId,
      name:                `${displayName} Csapata`,
      is_inclusive:        true,
      subscription_status: 'active',
    });
    await admin.from('collective_members').insert({
      collective_id: newId,
      user_id:       userId,
      role:          'owner',
      status:        'active',
    });
  }
}

async function revokePremium(admin, userId, subscriptionId) {
  // Update the specific subscription row, or all active premium rows if no ID
  if (subscriptionId) {
    await admin.from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('creem_subscription_id', subscriptionId);
  } else {
    await admin.from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('product_family', ['premium'])
      .in('status', ['active', 'trialing', 'scheduled_cancel']);
  }

  await admin.from('profiles')
    .update({ is_subscription_premium: false, subscription_tier: 'basic' })
    .eq('id', userId);

  // Collective addons require premium as their basis — freeze them all
  const { data: ownedMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active');

  const ownedIds = (ownedMemberships || []).map(m => m.collective_id);
  if (ownedIds.length > 0) {
    await admin.from('collectives')
      .update({ subscription_status: 'canceled' })
      .in('id', ownedIds)
      .in('subscription_status', ['active', 'trialing']);
  }
}

function parsePeriodEnd(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') return new Date(raw * 1000).toISOString();
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return new Date(Number(raw) * 1000).toISOString();
  return new Date(raw).toISOString(); // ISO string from Creem (e.g. currentPeriodEndDate)
}

async function updateCollectiveStatus(admin, subscriptionId, status, periodEnd) {
  const update = { subscription_status: status };
  const iso = parsePeriodEnd(periodEnd);
  if (iso) update.subscription_period_end = iso;
  const { error } = await admin.from('collectives').update(update).eq('creem_subscription_id', subscriptionId);
  if (error) console.error('[creem webhook] updateCollectiveStatus error:', error.message);
}

async function getProfile(admin, userId) {
  const { data } = await admin.from('profiles').select('display_name, email').eq('id', userId).single();
  return data;
}

async function notifyAdmin({ subject, bodyHtml }) {
  const to = process.env.SMTP_FROM_EMAIL;
  if (!to) return;
  await sendEmail({ to, subject, html: wrapEmail(bodyHtml) }).catch(err =>
    console.error('[webhook] email notification failed:', err.message)
  );
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('creem-signature');
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    if (!verifySignature(body, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let event;
  try { event = JSON.parse(body); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const admin = createAdminClient();
  const { eventType, object: payload } = event;

  console.log('[creem webhook] eventType:', eventType);

  const userId =
    payload?.metadata?.userId ||
    payload?.checkout?.metadata?.userId ||
    payload?.metadata?.user_id ||
    payload?.checkout?.metadata?.user_id;

  const productId =
    payload?.product_id ||
    payload?.product?.id ||
    payload?.checkout?.product_id;

  const subscriptionId =
    payload?.id ||
    payload?.subscription_id;

  // Creem sends period end as ISO string (currentPeriodEndDate / nextTransactionDate)
  // or as a Unix timestamp in seconds (current_period_end / period_end).
  const periodEnd =
    payload?.currentPeriodEndDate ||
    payload?.nextTransactionDate  ||
    payload?.current_period_end   ||
    payload?.period_end           ||
    null;

  const family = getProductFamily(productId);

  console.log('[creem webhook] userId:', userId, '| productId:', productId, '| family:', family, '| subscriptionId:', subscriptionId);

  switch (eventType) {

    case 'checkout.completed': {
      if ((family === 'premium') && userId) {
        await grantPremium(admin, userId, subscriptionId, family);
      }
      if (userId) {
        const profile = await getProfile(admin, userId);
        await notifyAdmin({
          subject: `🎉 Új előfizetés (${family}) — OkosSzaki`,
          bodyHtml: `
            <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Új előfizetés érkezett</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
              <tr><td style="padding:6px 0;color:#64748b;width:140px;">Felhasználó</td><td style="padding:6px 0;font-weight:700;">${profile?.display_name || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">E-mail</td><td style="padding:6px 0;">${profile?.email || payload?.customer?.email || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Csomag</td><td style="padding:6px 0;">${family} · ${productId || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Időpont</td><td style="padding:6px 0;">${new Date().toLocaleString('hu-HU')}</td></tr>
            </table>`,
        });
      }
      break;
    }

    case 'subscription.active':
    case 'subscription.paid': {
      if ((family === 'premium') && userId) {
        await grantPremium(admin, userId, subscriptionId, family);
        // Reactivation — clear any pending account deletion
        await admin.from('profiles').update({ scheduled_deletion_at: null }).eq('id', userId);
        // Save renewal date to subscriptions table
        const premiumPeriodIso = parsePeriodEnd(periodEnd);
        if (subscriptionId && premiumPeriodIso) {
          await admin.from('subscriptions')
            .update({ period_end: premiumPeriodIso, status: 'active', updated_at: new Date().toISOString() })
            .eq('creem_subscription_id', subscriptionId);
        }
      }
      if ((family === 'addon') && subscriptionId) {
        await updateCollectiveStatus(admin, subscriptionId, 'active', periodEnd);
      }
      break;
    }

    case 'subscription.canceled': {
      if (family === 'addon') {
        if (subscriptionId) await updateCollectiveStatus(admin, subscriptionId, 'canceled', periodEnd);
      } else {
        if (userId) await revokePremium(admin, userId, subscriptionId);
      }
      if (userId) {
        const profile = await getProfile(admin, userId);
        await notifyAdmin({
          subject: `⚠️ Lemondott előfizetés (${family}) — OkosSzaki`,
          bodyHtml: `
            <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Előfizetés lemondva</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
              <tr><td style="padding:6px 0;color:#64748b;width:140px;">Felhasználó</td><td style="padding:6px 0;font-weight:700;">${profile?.display_name || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">E-mail</td><td style="padding:6px 0;">${profile?.email || payload?.customer?.email || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Csomag</td><td style="padding:6px 0;">${family} · ${productId || '—'}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Időpont</td><td style="padding:6px 0;">${new Date().toLocaleString('hu-HU')}</td></tr>
            </table>`,
        });
      }
      break;
    }

    case 'subscription.expired':
    case 'subscription.paused': {
      if (family === 'addon') {
        if (subscriptionId) await updateCollectiveStatus(admin, subscriptionId, eventType === 'subscription.paused' ? 'paused' : 'expired', periodEnd);
      } else {
        if (userId) await revokePremium(admin, userId, subscriptionId);
      }
      break;
    }

    case 'subscription.updated': {
      console.log('[creem webhook] subscription.updated — no DB action required');
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
