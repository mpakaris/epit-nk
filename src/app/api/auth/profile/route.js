import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { resolveEffectiveUserId } from '@/lib/godMode';
import { applyDowngradeLock } from '@/lib/downgradeLock';

const SEED_TITLES = {
  hu: {
    survey:            'Első felmérésem',
    quote:             'Első ajánlatom',
    project:           'Első projektem',
    collectiveSurvey:  'Első közös felmérés',
    collectiveQuote:   'Első közös ajánlat',
    collectiveProject: 'Első közös projekt',
    collective:        (name) => `${name} Csapata`,
    sectionMaterials:  'Anyagok',
    sectionLabour:     'Munkadíj',
    roomLiving:        'Nappali',
    roomKitchen:       'Konyha',
  },
  de: {
    survey:            'Meine erste Aufnahme',
    quote:             'Mein erstes Angebot',
    project:           'Mein erstes Projekt',
    collectiveSurvey:  'Erste Team-Aufnahme',
    collectiveQuote:   'Erstes Team-Angebot',
    collectiveProject: 'Erstes Team-Projekt',
    collective:        (name) => `Team ${name}`,
    sectionMaterials:  'Materialien',
    sectionLabour:     'Arbeitskosten',
    roomLiving:        'Wohnzimmer',
    roomKitchen:       'Küche',
  },
  en: {
    survey:            'My First Survey',
    quote:             'My First Quote',
    project:           'My First Project',
    collectiveSurvey:  'My First Collective Survey',
    collectiveQuote:   'My First Collective Quote',
    collectiveProject: 'My First Collective Project',
    collective:        (name) => `${name}'s Team`,
    sectionMaterials:  'Materials',
    sectionLabour:     'Labour',
    roomLiving:        'Living Room',
    roomKitchen:       'Kitchen',
  },
};

async function createSeedDocuments(admin, userId, locale, displayName) {
  const T = SEED_TITLES[locale] || SEED_TITLES.hu;

  // Guard: skip if personal seed docs already exist (idempotent)
  const { count } = await admin.from('surveys')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId).is('collective_id', null).eq('is_seed', true);
  if (count > 0) return;

  // ── Personal workspace ────────────────────────────────────────────────────

  const { data: survey } = await admin.from('surveys')
    .insert({ owner_id: userId, collective_id: null, title: T.survey, is_seed: true, created_by: userId })
    .select('id').single();
  if (survey?.id) {
    await admin.from('survey_entries').insert([
      { survey_id: survey.id, name: T.roomLiving,  sort_order: 0 },
      { survey_id: survey.id, name: T.roomKitchen, sort_order: 1 },
    ]);
  }

  const { data: quote } = await admin.from('quotes')
    .insert({ owner_id: userId, collective_id: null, title: T.quote, status: 'draft', is_seed: true, created_by: userId })
    .select('id').single();
  if (quote?.id) {
    const { data: sec1 } = await admin.from('quote_sections')
      .insert({ quote_id: quote.id, name: T.sectionMaterials, sort_order: 0 }).select('id').single();
    if (sec1?.id) {
      await admin.from('quote_entries').insert([
        { quote_id: quote.id, section_id: sec1.id, work_description: 'Villanyszerelési anyagok', entry_type: 'material', quantity: 1, unit: 'tétel', unit_price: 25000 },
        { quote_id: quote.id, section_id: sec1.id, work_description: 'Festék és alapozó',       entry_type: 'material', quantity: 2, unit: 'vödör', unit_price: 8500  },
      ]);
    }
    const { data: sec2 } = await admin.from('quote_sections')
      .insert({ quote_id: quote.id, name: T.sectionLabour, sort_order: 1 }).select('id').single();
    if (sec2?.id) {
      await admin.from('quote_entries').insert(
        { quote_id: quote.id, section_id: sec2.id, work_description: 'Bontás és előkészítés', entry_type: 'labour', quantity: 8, unit: 'óra', unit_price: 6500 }
      );
    }
  }

  await admin.from('projects')
    .insert({ owner_id: userId, collective_id: null, name: T.project, is_seed: true, created_by: userId });

  // ── Inclusive collective workspace ────────────────────────────────────────

  const { data: membership } = await admin.from('collective_members')
    .select('collective_id')
    .eq('user_id', userId).eq('role', 'owner').eq('status', 'active')
    .limit(1).maybeSingle();

  if (!membership) return;
  const cid = membership.collective_id;

  // Update collective name to localized version
  await admin.from('collectives').update({ name: T.collective(displayName) }).eq('id', cid);

  const { data: cSurvey } = await admin.from('surveys')
    .insert({ owner_id: userId, collective_id: cid, title: T.collectiveSurvey, is_seed: true, created_by: userId })
    .select('id').single();
  if (cSurvey?.id) {
    await admin.from('survey_entries').insert([
      { survey_id: cSurvey.id, name: T.roomLiving,  sort_order: 0 },
      { survey_id: cSurvey.id, name: T.roomKitchen, sort_order: 1 },
    ]);
  }

  const { data: cQuote } = await admin.from('quotes')
    .insert({ owner_id: userId, collective_id: cid, title: T.collectiveQuote, status: 'draft', is_seed: true, created_by: userId })
    .select('id').single();
  if (cQuote?.id) {
    const { data: cs1 } = await admin.from('quote_sections')
      .insert({ quote_id: cQuote.id, name: T.sectionMaterials, sort_order: 0 }).select('id').single();
    if (cs1?.id) {
      await admin.from('quote_entries').insert(
        { quote_id: cQuote.id, section_id: cs1.id, work_description: 'Villanyszerelési anyagok', entry_type: 'material', quantity: 1, unit: 'tétel', unit_price: 25000 }
      );
    }
    const { data: cs2 } = await admin.from('quote_sections')
      .insert({ quote_id: cQuote.id, name: T.sectionLabour, sort_order: 1 }).select('id').single();
    if (cs2?.id) {
      await admin.from('quote_entries').insert(
        { quote_id: cQuote.id, section_id: cs2.id, work_description: 'Bontás és előkészítés', entry_type: 'labour', quantity: 8, unit: 'óra', unit_price: 6500 }
      );
    }
  }

  await admin.from('projects')
    .insert({ owner_id: userId, collective_id: cid, name: T.collectiveProject, is_seed: true, created_by: userId });
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  // ?real=1 → always return the caller's own profile (used by AppContext init
  // so SA's role is not overwritten by the impersonated user's role on reload).
  const url = new URL(request.url);
  const real = url.searchParams.get('real');
  const effectiveUserId = real ? user.id : await resolveEffectiveUserId(request, user, admin);

  let { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', effectiveUserId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Trigger may have failed silently — auto-create a basic profile (only for the real user, not impersonation)
  if (!profile && effectiveUserId === user.id) {
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
    const { data: created, error: createErr } = await admin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        role: 'user',
        must_change_password: false,
        subscription_tier: 'trial',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();
    if (createErr) return Response.json({ error: createErr.message }, { status: 500 });
    profile = created;
  }

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });

  // Lazy trial expiry: if still showing 'trial' but trial_ends_at has passed, apply downgrade lock now
  if (
    profile.subscription_tier === 'trial' &&
    profile.trial_ends_at &&
    new Date(profile.trial_ends_at) < new Date() &&
    effectiveUserId === user.id  // never auto-downgrade an impersonated user mid-session
  ) {
    await applyDowngradeLock(user.id, admin);
    // Re-fetch the updated profile so the response reflects the new tier
    const { data: updated } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (updated) profile = updated;
  }

  // Return collective memberships for the context switcher
  const { data: membershipsRaw } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name, status, collective_tier, is_inclusive, creem_subscription_id, subscription_status, subscription_period_end)')
    .eq('user_id', effectiveUserId)
    .eq('status', 'active');

  const collectives = (membershipsRaw || []).map(m => ({
    collective_id:  m.collective_id,
    role:           m.role,
    name:           m.collectives?.name || null,
    status:         m.collectives?.status ?? 'active',
    collective_tier: m.collectives?.collective_tier ?? null,
    is_inclusive:   m.collectives?.is_inclusive ?? false,
  }));

  // Return owned paid collective subscriptions for the subscription management panel
  const ownedCollectiveSubs = (membershipsRaw || [])
    .filter(m => m.role === 'owner' && m.collectives?.creem_subscription_id && !m.collectives?.is_inclusive)
    .map(m => ({
      collective_id:             m.collective_id,
      name:                      m.collectives.name,
      collective_tier:           m.collectives.collective_tier,
      creem_subscription_id:     m.collectives.creem_subscription_id,
      subscription_status:       m.collectives.subscription_status ?? 'active',
      subscription_period_end:   m.collectives.subscription_period_end ?? null,
    }));

  // Return the active premium subscription (for status display in /profil)
  const { data: premiumSub } = await admin
    .from('subscriptions')
    .select('creem_subscription_id, product_family, status, period_end, created_at')
    .eq('user_id', effectiveUserId)
    .in('product_family', ['premium', 'bundle'])
    .in('status', ['active', 'trialing', 'scheduled_cancel', 'paused', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: subscriptions table may be out-of-sync (e.g. manually reset to 'canceled').
  // If profile shows premium but no active sub row found, look for any sub row regardless of status.
  let resolvedPremiumSub = premiumSub;
  if (!resolvedPremiumSub && profile?.is_subscription_premium) {
    const { data: anySub } = await admin
      .from('subscriptions')
      .select('creem_subscription_id, product_family, status, period_end, created_at')
      .eq('user_id', effectiveUserId)
      .in('product_family', ['premium', 'bundle'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anySub) resolvedPremiumSub = { ...anySub, status: 'active' };
  }

  return Response.json({ profile, collectives, premiumSub: resolvedPremiumSub, ownedCollectiveSubs });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  // Password-reset acknowledgement (internal flag)
  if (Object.keys(body).length === 1 && body.must_change_password === false) {
    const { error } = await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  // Onboarding: locale (always writable) + currency (write-once)
  if ('locale' in body || 'currency' in body) {
    const { data: current } = await admin.from('profiles').select('currency, locale, display_name').eq('id', user.id).single();
    const onboardingUpdate = {};
    const VALID_LOCALES = ['hu', 'de', 'en'];
    const VALID_CURRENCIES = ['HUF', 'EUR', 'GBP', 'USD'];
    if ('locale' in body && VALID_LOCALES.includes(body.locale)) onboardingUpdate.locale = body.locale;
    if ('currency' in body && VALID_CURRENCIES.includes(body.currency) && !current?.currency) {
      onboardingUpdate.currency = body.currency;
    }
    if (Object.keys(onboardingUpdate).length > 0) {
      const { data, error } = await admin.from('profiles').update(onboardingUpdate).eq('id', user.id).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });

      // First-time locale set → create seed documents in the user's language
      const isFirstLocale = !current?.locale && onboardingUpdate.locale;
      if (isFirstLocale) {
        await createSeedDocuments(admin, user.id, onboardingUpdate.locale, current?.display_name || user.email.split('@')[0]);
      }

      return Response.json({ profile: data });
    }
    return Response.json({ success: true });
  }

  // Letterhead / profile info update
  const allowed = ['display_name', 'first_name', 'last_name', 'company_name', 'street', 'street_number', 'zip', 'city', 'tax_number', 'default_tax_percent',
                   'phone', 'bank_account', 'bank_name', 'iban', 'bic', 'offer_validity_days', 'offer_terms_text',
                   'payment_deadline_days', 'payment_method', 'deposit_percent', 'warranty_months'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k] ?? null;
  if (Object.keys(update).length === 0)
    return Response.json({ error: 'No updatable fields' }, { status: 400 });

  const { data, error } = await admin.from('profiles').update(update).eq('id', user.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId: user.id,
    userId: user.id,
    userName: data.display_name || user.email,
    action: 'Profil módosítva',
    targetType: 'user',
    targetId: user.id,
    targetName: data.display_name || user.email,
    details: { fields: Object.keys(update) },
  });

  return Response.json({ profile: data });
}
