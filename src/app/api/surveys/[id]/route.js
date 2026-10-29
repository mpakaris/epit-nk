import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { hasPendingTransfer, canUnlockToPersonal } from '@/lib/transferLock';

async function getCallerAndSurvey(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: survey } = await admin.from('surveys').select('*').eq('id', id).single();
  if (!survey) return { err: 'Not found', status: 404 };

  if (profile.role === 'superadmin') {
    return { user, profile, admin, survey, isOwner: true };
  }

  const isOwner   = survey.owner_id === user.id || survey.created_by === user.id;
  const isShared  = (survey.shared_with || []).includes(user.id);

  if (isOwner || isShared) return { user, profile, admin, survey, isOwner };

  if (survey.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', survey.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (mem) return { user, profile, admin, survey, isOwner: false, memberRole: mem.role };
  }

  return { err: 'Forbidden', status: 403 };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const [{ data: allMedia }, { data: entries }, { data: drawings }] = await Promise.all([
    ctx.admin.from('survey_media').select('*').eq('survey_id', id).order('created_at'),
    ctx.admin.from('survey_entries').select('*').eq('survey_id', id).order('sort_order').order('created_at'),
    ctx.admin.from('survey_drawings').select('*').eq('survey_id', id).order('created_at'),
  ]);

  const media = allMedia || [];
  const entriesWithMedia = (entries || []).map(e => ({
    ...e,
    media: media.filter(m => m.entry_id === e.id),
  }));

  return Response.json({
    survey: ctx.survey,
    entries: entriesWithMedia,
    media: media.filter(m => m.entry_id === null),
    layouts: media.filter(m => m.entry_id === null && m.media_type === 'layout'),
    photos: media.filter(m => m.entry_id === null && m.media_type === 'photo'),
    drawings: drawings || [],
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const isOwner          = ctx.isOwner || ctx.survey.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
  const isContributor    = ctx.memberRole === 'contributor';

  // Contributors may only update property info fields — all other mutations require owner/admin
  if (!isOwner && !isSuperAdmin && !isKollektivOwner && !isContributor)
    return Response.json({ error: 'Csak a tulajdonos módosíthatja a felmérést.' }, { status: 403 });

  // Unlock action — clears locked_reason after quota check
  if (fields._action === 'unlock') {
    if (!isOwner && !isSuperAdmin)
      return Response.json({ error: 'Csak a dokumentum tulajdonosa oldhatja fel a zárolást.' }, { status: 403 });
    const check = await canUnlockToPersonal('survey', ctx.user.id, ctx.profile);
    if (!check.allowed)
      return Response.json({ error: 'Nincs szabad hely az előfizetésedben.', reason: check.reason, limit: check.limit }, { status: 402 });
    const { data, error } = await ctx.admin.from('surveys')
      .update({ locked_reason: null, locked_at: null })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ survey: data });
  }

  // Block edits if document is locked (rejected/expired transfer)
  if (!isSuperAdmin && ctx.survey.locked_reason)
    return Response.json({ error: 'Ez a dokumentum csak olvasható. Nyisd meg a dokumentumot a feloldáshoz.', locked_reason: ctx.survey.locked_reason }, { status: 423 });

  if (!isSuperAdmin && !isOwner && await hasPendingTransfer('survey', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  // Contributors are restricted to property info fields only
  const PROPERTY_FIELDS = ['plot_size_m2', 'garden_size_m2', 'electrical_phases', 'electrical_ampere', 'electrical_voltage', 'heating_type', 'property_notes'];
  const ALL_FIELDS = ['title', 'notes', 'date', 'location', 'client_id', 'shared_with', 'collective_id', 'status', 'done_at', 'reopened_at', ...PROPERTY_FIELDS];
  const allowedFields = (isContributor && !isKollektivOwner && !isOwner && !isSuperAdmin) ? PROPERTY_FIELDS : ALL_FIELDS;

  const update = {};
  for (const k of allowedFields) if (k in fields) update[k] = fields[k];

  const { data, error } = await ctx.admin.from('surveys').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   ctx.survey.collective_id || ctx.user.id,
    userId:     ctx.user.id,
    userName:   ctx.profile.display_name || ctx.user.email,
    action:     'Felmérés módosítva',
    targetType: 'survey',
    targetId:   id,
    targetName: ctx.survey.title,
  });

  return Response.json({ survey: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const isOwner          = ctx.isOwner || ctx.survey.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
  if (!isOwner && !isSuperAdmin && !isKollektivOwner)
    return Response.json({ error: 'Csak a tulajdonos törölheti a felmérést.' }, { status: 403 });

  if (!isSuperAdmin && await hasPendingTransfer('survey', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  const { error } = await ctx.admin.from('surveys').update({ deleted_at: new Date().toISOString(), deleted_by: ctx.user.id }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   ctx.survey.collective_id || ctx.user.id,
    userId:     ctx.user.id,
    userName:   ctx.profile.display_name || ctx.user.email,
    action:     'Felmérés törölve',
    targetType: 'survey',
    targetId:   id,
    targetName: ctx.survey.title,
  });

  return Response.json({ success: true });
}
