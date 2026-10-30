import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { isEffectivePremium, checkPersonalLimit } from '@/lib/subscriptionLimits';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name, active_collective_id, is_subscription_premium, subscription_tier, trial_ends_at, offer_validity_days, offer_terms_text, payment_deadline_days, payment_method, deposit_percent, warranty_months').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    title, location, work_type, description,
    start_date, end_date, status = 'draft',
    client_id, shared_with = [], tax_percent = 0,
    survey_id,
    collective_id: bodyCollectiveId,
  } = body;

  if (!title?.trim()) return Response.json({ error: 'Az ajánlat neve kötelező' }, { status: 400 });

  // Body's collective_id wins when explicitly provided (including null = personal).
  const collectiveId = bodyCollectiveId !== undefined
    ? (bodyCollectiveId || null)
    : (profile.active_collective_id || null);

  // Enforce Basic plan limit in personal context
  if (!collectiveId && profile.role !== 'superadmin' && !isEffectivePremium(profile)) {
    const check = await checkPersonalLimit(admin, user.id, 'quotes', 'basic_max_quotes');
    if (!check.allowed) {
      return Response.json(
        { error: `Bázis csomagban maximum ${check.limit} ajánlat hozható létre. Váltj Prémiumra a korlátlan használathoz.` },
        { status: 403 }
      );
    }
  }

  if (collectiveId && profile.role !== 'superadmin') {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('collective_id', collectiveId)
      .eq('status', 'active')
      .maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return Response.json({ error: 'Csak a kollektíva tulajdonosa hozhat létre ajánlatot.' }, { status: 403 });
  }

  // Validate shared_with — only include IDs that are real profile UUIDs
  let safeSharedWith = [];
  if (Array.isArray(shared_with) && shared_with.length > 0) {
    const { data: validProfiles } = await admin
      .from('profiles')
      .select('id')
      .in('id', shared_with.slice(0, 50));
    safeSharedWith = (validProfiles || []).map(p => p.id);
  }

  const validityDays = profile.offer_validity_days ?? 30;
  const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];

  const { data, error } = await admin.from('quotes').insert([{
    owner_id:         user.id,
    collective_id:    collectiveId,
    title:            title.trim(),
    location:         location      || null,
    work_type:        work_type     || null,
    description:      description   || null,
    start_date:       start_date    || null,
    end_date:         end_date      || null,
    status,
    client_id:        client_id     || null,
    created_by:       user.id,
    shared_with:      safeSharedWith,
    tax_percent:      Number(tax_percent) || 0,
    survey_id:        survey_id     || null,
    valid_until:           validUntil,
    offer_terms_text:      profile.offer_terms_text      || null,
    payment_deadline_days: profile.payment_deadline_days ?? 8,
    payment_method:        profile.payment_method        || 'banki átutalás',
    deposit_percent:       profile.deposit_percent       ?? 0,
    warranty_months:       profile.warranty_months       ?? 0,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   collectiveId || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Ajánlat létrehozva',
    targetType: 'quote',
    targetId:   data.id,
    targetName: data.title,
  });

  return Response.json({ quote: data }, { status: 201 });
}
