import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/audit';

const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
  ? 'https://test-api.creem.io'
  : 'https://api.creem.io';

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

const PRODUCT_TO_TIER = {
  [process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID]:  's',
  [process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID]: 'm',
  [process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID]:  'l',
};

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
    logAudit({ userId, action: 'Premium grant failed', targetType: 'subscription', targetId: subscriptionId, details: { error: error.message, family } });
    return;
  }
  console.log('[creem webhook] grantPremium OK for userId:', userId);
  logAudit({ userId, action: 'Premium granted', targetType: 'subscription', targetId: subscriptionId, details: { family } });

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
      .select('id, status, subscription_status')
      .in('id', ownedIds)
      .eq('is_inclusive', true)
      .maybeSingle();

    if (inclusive) {
      // BK-05: unfreeze inclusive collective on Premium grant
      if (inclusive.subscription_status !== 'active' || inclusive.status !== 'active') {
        await admin.from('collectives')
          .update({ subscription_status: 'active', status: 'active' })
          .eq('id', inclusive.id);
        logAudit({ userId, action: 'Inclusive collective unfrozen', targetType: 'collective', targetId: inclusive.id, details: { reason: 'premium_granted' } });
      }
      // Paid collectives remain frozen — owner must reactivate manually via Creem
    } else {
      // No inclusive collective yet — create one
      const profile = await getProfile(admin, userId);
      const displayName = profile?.display_name || 'Felhasználó';
      const newId = globalThis.crypto.randomUUID();
      await admin.from('collectives').insert({
        id:                  newId,
        name:                `${displayName} Csapata`,
        is_inclusive:        true,
        status:              'active',
        collective_tier:     'xs',
        subscription_status: 'active',
        owner_id:            userId,
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
      status:              'active',
      collective_tier:     'xs',
      subscription_status: 'active',
      owner_id:            userId,
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

  const { error } = await admin.from('profiles')
    .update({ is_subscription_premium: false, subscription_tier: 'basic' })
    .eq('id', userId);
  logAudit({ userId, action: error ? 'Premium revoke failed' : 'Premium revoked', targetType: 'subscription', targetId: subscriptionId, details: error ? { error: error.message } : undefined });

  // Fetch all collectives owned by this user
  const { data: ownedMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active');

  const ownedIds = (ownedMemberships || []).map(m => m.collective_id);
  if (!ownedIds.length) return;

  const { data: ownedCollectives } = await admin
    .from('collectives')
    .select('id, status, is_inclusive')
    .in('id', ownedIds)
    .is('deleted_at', null);

  const toDelete   = (ownedCollectives || []).filter(c => c.status === 'not_activated').map(c => c.id);
  const toFreeze   = (ownedCollectives || []).filter(c => c.status === 'active').map(c => c.id);

  // BK-04: hard-delete not_activated collectives (no data exists, cannot be activated without premium)
  if (toDelete.length > 0) {
    await admin.from('collectives').delete().in('id', toDelete);
    for (const id of toDelete) {
      logAudit({ userId, action: 'Collective auto-deleted (premium revoked)', targetType: 'collective', targetId: id, details: { reason: 'premium_revoked' } });
    }
  }

  // BK-05: freeze all active collectives (both inclusive and paid)
  if (toFreeze.length > 0) {
    await admin.from('collectives')
      .update({ subscription_status: 'canceled', status: 'frozen' })
      .in('id', toFreeze);
    // Auto-retract pending invitations
    await admin.from('collective_members')
      .update({ status: 'retracted' })
      .in('collective_id', toFreeze)
      .eq('status', 'invited');
    for (const id of toFreeze) {
      logAudit({ userId, action: 'Collective frozen (premium revoked)', targetType: 'collective', targetId: id, details: { reason: 'premium_revoked' } });
    }
  }
}

function parsePeriodEnd(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') return new Date(raw * 1000).toISOString();
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return new Date(Number(raw) * 1000).toISOString();
  return new Date(raw).toISOString(); // ISO string from Creem (e.g. currentPeriodEndDate)
}

async function updateCollectiveStatus(admin, subscriptionId, subscriptionStatus, periodEnd) {
  // Map Creem subscription_status → collective lifecycle status
  const lifecycleStatus = subscriptionStatus === 'active' ? 'active' : 'frozen';
  const update = { subscription_status: subscriptionStatus, status: lifecycleStatus };
  const iso = parsePeriodEnd(periodEnd);
  if (iso) update.subscription_period_end = iso;
  if (lifecycleStatus === 'active') {
    // On activation: also retract any stale invitations that were retracted on freeze
    // (members must be re-invited manually per PRICING.md §5)
  }
  const { error } = await admin.from('collectives').update(update).eq('creem_subscription_id', subscriptionId);
  if (error) console.error('[creem webhook] updateCollectiveStatus error:', error.message);
}

async function getProfile(admin, userId) {
  const { data } = await admin.from('profiles').select('display_name, email').eq('id', userId).single();
  return data;
}

async function notifyAdmin({ subject, bodyHtml }) {
  const to = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL;
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

  if (!webhookSecret) {
    console.error('[creem webhook] CREEM_WEBHOOK_SECRET is not configured — rejecting request');
    logAudit({ action: 'Webhook config error', targetType: 'payment', details: { error: 'CREEM_WEBHOOK_SECRET not configured' } });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (!signature || !verifySignature(body, signature, webhookSecret)) {
    logAudit({ action: 'Webhook signature invalid', targetType: 'payment', details: { error: 'Invalid or missing creem-signature header', has_signature: !!signature } });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try { event = JSON.parse(body); }
  catch {
    logAudit({ action: 'Webhook parse error', targetType: 'payment', details: { error: 'Invalid JSON body' } });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { eventType, object: payload } = event;

  console.log('[creem webhook] eventType:', eventType);

  let userId =
    payload?.metadata?.userId ||
    payload?.checkout?.metadata?.userId ||
    payload?.metadata?.user_id ||
    payload?.checkout?.metadata?.user_id;

  const collectiveId =
    payload?.metadata?.collectiveId ||
    payload?.checkout?.metadata?.collectiveId ||
    null;

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

  const creemCustomerId =
    payload?.customer?.id ||
    payload?.customer_id  ||
    payload?.customerId   ||
    payload?.checkout?.customer?.id ||
    null;

  const customerEmail =
    payload?.customer?.email ||
    payload?.checkout?.customer?.email ||
    null;

  const family = getProductFamily(productId);

  // Fallback: resolve userId from stored creem_customer_id or email when metadata is missing
  let resolvedViaFallback = false;
  if (!userId && creemCustomerId) {
    const { data: p } = await admin.from('profiles').select('id').eq('creem_customer_id', creemCustomerId).maybeSingle();
    if (p) { userId = p.id; resolvedViaFallback = true; console.log('[creem webhook] userId resolved via creem_customer_id'); }
  }
  if (!userId && customerEmail) {
    const { data: p } = await admin.from('profiles').select('id').eq('email', customerEmail).maybeSingle();
    if (p) { userId = p.id; resolvedViaFallback = true; console.log('[creem webhook] userId resolved via customer email'); }
  }

  // Persist creem_customer_id the first time we see it (only writes when column is NULL)
  if (userId && creemCustomerId) {
    await admin.from('profiles')
      .update({ creem_customer_id: creemCustomerId })
      .eq('id', userId)
      .is('creem_customer_id', null);
  }

  // If we resolved via fallback, backfill external_id on Creem so future webhooks carry metadata.userId
  if (resolvedViaFallback && userId && creemCustomerId) {
    fetch(`${CREEM_BASE}/v1/customers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CREEM_API_KEY },
      body: JSON.stringify({ customer_id: creemCustomerId, external_id: userId }),
    }).catch(err => console.error('[creem webhook] failed to backfill Creem external_id:', err.message));
  }

  console.log('[creem webhook] userId:', userId, '| productId:', productId, '| family:', family, '| subscriptionId:', subscriptionId);

  // Log every incoming webhook event with full context for support/troubleshooting
  logAudit({
    userId:     userId || null,
    action:     `Webhook received: ${eventType}`,
    targetType: 'payment',
    targetId:   subscriptionId || null,
    details: {
      event_type:      eventType,
      product_family:  family,
      product_id:      productId || null,
      subscription_id: subscriptionId || null,
      user_id:         userId || null,
      period_end:      periodEnd || null,
      has_userId:      !!userId,
    },
  });

  if (!userId && eventType !== 'subscription.updated') {
    logAudit({
      action:     'Webhook userId missing',
      targetType: 'payment',
      targetId:   subscriptionId || null,
      details: {
        event_type:      eventType,
        product_family:  family,
        subscription_id: subscriptionId || null,
        error:           'userId not found in payload metadata — cannot process event',
      },
    });
  }

  switch (eventType) {

    case 'checkout.completed': {
      if ((family === 'premium') && userId) {
        await grantPremium(admin, userId, subscriptionId, family);
      } else if (family === 'premium' && !userId) {
        logAudit({ action: 'Checkout completed — premium not granted: userId missing', targetType: 'payment', targetId: subscriptionId, details: { event_type: eventType, product_id: productId } });
      }
      if (family === 'addon' && collectiveId && subscriptionId) {
        const tierCode = PRODUCT_TO_TIER[productId] || null;
        const updateData = { creem_subscription_id: subscriptionId, status: 'active' };
        if (tierCode) updateData.collective_tier = tierCode;
        const { error: colErr } = await admin.from('collectives')
          .update(updateData)
          .eq('id', collectiveId);
        if (colErr) {
          logAudit({ userId: userId || null, action: 'Collective activation failed (checkout.completed)', targetType: 'collective', targetId: collectiveId, details: { error: colErr.message, subscription_id: subscriptionId, tier: tierCode } });
        } else {
          logAudit({ userId: userId || null, action: 'Collective activated', targetType: 'collective', targetId: collectiveId, details: { subscription_id: subscriptionId, tier: tierCode } });
        }
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
        logAudit({ userId, action: `Subscription ${eventType}`, targetType: 'payment', targetId: subscriptionId, details: { family, period_end: premiumPeriodIso || null } });
      } else if (family === 'premium' && !userId) {
        logAudit({ action: `Subscription ${eventType} — userId missing`, targetType: 'payment', targetId: subscriptionId, details: { family, error: 'Cannot grant premium: userId not in payload' } });
      }
      if ((family === 'addon') && subscriptionId) {
        // checkout.completed stored the checkout ID (ch_xxx) in creem_subscription_id;
        // subscription.active carries the real subscription ID (sub_xxx).
        // If collectiveId is in the metadata, update by collective.id so the correct
        // subscription ID is written and cancel/resume calls work against the right resource.
        if (collectiveId) {
          const addonPeriodIso = parsePeriodEnd(periodEnd);
          const addonUpdate = { creem_subscription_id: subscriptionId, status: 'active', subscription_status: 'active' };
          if (addonPeriodIso) addonUpdate.subscription_period_end = addonPeriodIso;
          const { error: addonErr } = await admin.from('collectives').update(addonUpdate).eq('id', collectiveId);
          if (addonErr) console.error('[creem webhook] addon activation by collectiveId error:', addonErr.message);
          // Store in subscriptions table so cancel/resume can look up by collective_id
          if (userId) {
            const addonRow = { user_id: userId, creem_subscription_id: subscriptionId, product_family: 'addon', status: 'active', collective_id: collectiveId, updated_at: new Date().toISOString() };
            if (addonPeriodIso) addonRow.period_end = addonPeriodIso;
            await admin.from('subscriptions').upsert(addonRow, { onConflict: 'creem_subscription_id' });
          }
        } else {
          await updateCollectiveStatus(admin, subscriptionId, 'active', periodEnd);
        }
        logAudit({ userId: userId || null, action: 'Addon subscription activated', targetType: 'payment', targetId: subscriptionId, details: { family, collective_id: collectiveId || null, period_end: periodEnd || null } });
      }
      break;
    }

    case 'subscription.canceled': {
      if (family === 'addon') {
        if (subscriptionId) {
          await updateCollectiveStatus(admin, subscriptionId, 'canceled', periodEnd);
          // Auto-retract pending invitations on freeze (BK-05)
          const { data: frozenCollective } = await admin
            .from('collectives').select('id').eq('creem_subscription_id', subscriptionId).maybeSingle();
          if (frozenCollective?.id) {
            await admin.from('collective_members')
              .update({ status: 'retracted' })
              .eq('collective_id', frozenCollective.id)
              .eq('status', 'invited');
            logAudit({ userId: userId || null, action: 'Collective invitations retracted (addon canceled)', targetType: 'collective', targetId: frozenCollective.id, details: { subscription_id: subscriptionId } });
          }
          logAudit({ userId: userId || null, action: 'Addon subscription canceled', targetType: 'payment', targetId: subscriptionId, details: { family } });
        }
      } else {
        if (userId) await revokePremium(admin, userId, subscriptionId);
        else logAudit({ action: 'Subscription canceled — userId missing', targetType: 'payment', targetId: subscriptionId, details: { error: 'Cannot revoke premium: userId not in payload' } });
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
      const newStatus = eventType === 'subscription.paused' ? 'paused' : 'expired';
      if (family === 'addon') {
        if (subscriptionId) {
          await updateCollectiveStatus(admin, subscriptionId, newStatus, periodEnd);
          logAudit({ userId: userId || null, action: `Addon subscription ${newStatus}`, targetType: 'payment', targetId: subscriptionId, details: { family } });
        }
      } else {
        if (userId) {
          await revokePremium(admin, userId, subscriptionId);
          logAudit({ userId, action: `Premium subscription ${newStatus}`, targetType: 'payment', targetId: subscriptionId, details: { family } });
        } else {
          logAudit({ action: `Subscription ${newStatus} — userId missing`, targetType: 'payment', targetId: subscriptionId, details: { error: 'Cannot revoke premium: userId not in payload' } });
        }
      }
      break;
    }

    case 'subscription.updated': {
      console.log('[creem webhook] subscription.updated — no DB action required');
      logAudit({ userId: userId || null, action: 'Subscription updated (no DB action)', targetType: 'payment', targetId: subscriptionId, details: { family } });
      break;
    }

    default:
      logAudit({ userId: userId || null, action: `Webhook unhandled event: ${eventType}`, targetType: 'payment', targetId: subscriptionId, details: { event_type: eventType, family } });
      break;
  }

  return NextResponse.json({ received: true });
}
