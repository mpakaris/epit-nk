import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET  — list collectives the caller belongs to (with members)
// POST — create a new collective (Premium required, always paid)

async function sendInclusiveFreezeEmails(admin, collective, memberUserIds) {
  if (!memberUserIds?.length) return;
  const { data: profileRows } = await admin
    .from('profiles')
    .select('email, display_name')
    .in('id', memberUserIds);

  const subject = `${collective.name} — kollektívád felfüggesztve`;
  for (const p of (profileRows || [])) {
    if (!p.email) continue;
    sendEmail({
      to: p.email,
      subject,
      html: wrapEmail(`
        <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">Kollektíva felfüggesztve</h2>
        <p style="color:#334155;font-size:14px;line-height:1.6;">
          A(z) <strong>${collective.name}</strong> inkluzív kollektíva felfüggesztésre került,
          mivel az előfizetés / próbaidőszak lejárt.
        </p>
        <p style="color:#334155;font-size:14px;line-height:1.6;">
          Az összes adat megmarad — a Prémium megújításával a kollektíva azonnal aktív lesz ismét.
        </p>
        <a href="${APP_URL}/elofizetes"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
          Prémium visszaállítása →
        </a>
      `, subject),
    }).catch(err => console.error('[inclusive freeze email]', err.message));
  }
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Fetch profile for subscription checks
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, role, is_subscription_premium, subscription_tier, trial_ends_at')
    .eq('id', user.id)
    .single();

  // God mode: superadmin impersonating another user
  let userId = user.id;
  if (profile?.role === 'superadmin') {
    const cookieHeader = request.headers.get('cookie') || '';
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const raw = cookieHeader.match(/god_mode_user=([a-f0-9-]+)/)?.[1];
    if (raw && UUID_RE.test(raw)) userId = raw;
  }

  // Don't include is_inclusive in the embedded join — fetch it separately so a
  // missing column (migration 087 not yet applied) doesn't break the whole query.
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, status, collectives(id, name, created_at, collective_tier, creem_subscription_id, subscription_status, subscription_period_end)')
    .eq('user_id', userId)
    .eq('status', 'active');

  const collectiveIds = (memberships || []).map(m => m.collective_id);

  // Fetch members for all these collectives
  const allMembersData = collectiveIds.length > 0
    ? await admin.from('collective_members').select('collective_id, user_id, role, status, created_at').in('collective_id', collectiveIds)
    : { data: [] };

  const allMembers = allMembersData.data || [];

  // Fetch profiles for all member user_ids
  const userIds = [...new Set(allMembers.map(m => m.user_id))];
  const { data: profileRows } = userIds.length > 0
    ? await admin.from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] };

  const profileMap = {};
  for (const p of (profileRows || [])) profileMap[p.id] = p;

  // Fetch is_inclusive separately — tolerates migration 087 not yet applied
  const inclusiveMap = {};
  if (collectiveIds.length > 0) {
    const { data: inclusiveRows } = await admin
      .from('collectives')
      .select('id, is_inclusive')
      .in('id', collectiveIds);
    for (const r of (inclusiveRows || [])) inclusiveMap[r.id] = r.is_inclusive ?? false;
  }

  const collectives = (memberships || []).map(m => ({
    id:                    m.collective_id,
    name:                  m.collectives?.name,
    created_at:            m.collectives?.created_at,
    collective_tier:          m.collectives?.collective_tier ?? null,
    creem_subscription_id:    m.collectives?.creem_subscription_id ?? null,
    subscription_status:      m.collectives?.subscription_status ?? 'active',
    subscription_period_end:  m.collectives?.subscription_period_end ?? null,
    is_inclusive:             inclusiveMap[m.collective_id] ?? false,
    my_role:               m.role,
    members:  allMembers
      .filter(mb => mb.collective_id === m.collective_id)
      .map(mb => {
        const p = profileMap[mb.user_id] || {};
        return {
          user_id:      mb.user_id,
          role:         mb.role,
          status:       mb.status,
          joined_at:    mb.created_at,
          display_name: p.display_name || p.email || mb.user_id,
          email:        p.email || null,
        };
      }),
  }));

  // === Inclusive collective lazy-creation ===
  // Skip entirely during god-mode impersonation — don't auto-create on behalf of another user.
  const isImpersonating = userId !== user.id;
  const isSuperAdmin    = profile?.role === 'superadmin';
  const isEffPremium    = isSuperAdmin || isEffectivePremium(profile ?? {});
  const hasInclusiveOwned = collectives.some(c => c.is_inclusive && c.my_role === 'owner');

  if (!isImpersonating && isEffPremium && !hasInclusiveOwned) {
    const displayName = profile?.display_name || 'Felhasználó';
    const newId = globalThis.crypto.randomUUID();
    const now = new Date().toISOString();
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
    collectives.push({
      id:                    newId,
      name:                  `${displayName} Csapata`,
      created_at:            now,
      collective_tier:          null,
      creem_subscription_id:    null,
      subscription_status:      'active',
      subscription_period_end:  null,
      is_inclusive:             true,
      my_role:               'owner',
      members: [{
        user_id:      userId,
        role:         'owner',
        status:       'active',
        joined_at:    now,
        display_name: profile?.display_name || user.email || '',
        email:        user.email || null,
      }],
    });
  }

  // === Trial expiry freeze ===
  const trialExpired = profile?.subscription_tier === 'trial'
    && profile?.trial_ends_at
    && new Date(profile.trial_ends_at) <= new Date();
  const shouldFreezeInclusive = trialExpired && !profile?.is_subscription_premium;

  if (shouldFreezeInclusive) {
    const activeInclusive = collectives.find(
      c => c.is_inclusive && c.my_role === 'owner' && c.subscription_status === 'active',
    );
    if (activeInclusive) {
      await admin.from('collectives')
        .update({ subscription_status: 'canceled' })
        .eq('id', activeInclusive.id);
      activeInclusive.subscription_status = 'canceled';

      // Notify all active members (fire-and-forget)
      const memberIds = (activeInclusive.members || [])
        .filter(m => m.status === 'active')
        .map(m => m.user_id);
      sendInclusiveFreezeEmails(admin, activeInclusive, memberIds);
    }
  }

  return Response.json({ collectives }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_subscription_premium, subscription_tier, trial_ends_at, role, display_name')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.role === 'superadmin';

  if (!isSuperAdmin && !isEffectivePremium(profile ?? {})) {
    return Response.json({ error: 'PREMIUM_REQUIRED' }, { status: 403 });
  }

  const { name, creem_subscription_id, collective_tier } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A kollektíva neve kötelező' }, { status: 400 });

  const insertData = { id: crypto.randomUUID(), name: name.trim() };
  if (creem_subscription_id) insertData.creem_subscription_id = creem_subscription_id;
  if (collective_tier) insertData.collective_tier = collective_tier;

  const { data: collective, error: createErr } = await admin
    .from('collectives')
    .insert(insertData)
    .select()
    .single();

  if (createErr) return Response.json({ error: createErr.message }, { status: 500 });

  await admin.from('collective_members').insert({
    collective_id: collective.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
  });

  logAudit({
    entityId:   collective.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Kollektíva létrehozva',
    targetType: 'collective',
    targetId:   collective.id,
    targetName: collective.name,
  });

  return Response.json({ collective });
}
