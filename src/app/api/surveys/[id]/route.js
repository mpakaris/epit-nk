import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndSurvey(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
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
  const isOwner      = ctx.isOwner || ctx.survey.created_by === ctx.user.id;
  const isSuperAdmin = ctx.profile.role === 'superadmin';

  if ('collective_id' in fields && !isOwner && !isSuperAdmin)
    return Response.json({ error: 'Csak a tulajdonos helyezhet át felmérést.' }, { status: 403 });

  const allowed = (isOwner || isSuperAdmin)
    ? ['title', 'notes', 'date', 'location', 'client_id', 'shared_with', 'collective_id']
    : ['shared_with'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

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

  const isOwner      = ctx.isOwner || ctx.survey.created_by === ctx.user.id;
  const isSuperAdmin = ctx.profile.role === 'superadmin';
  if (!isOwner && !isSuperAdmin)
    return Response.json({ error: 'Csak a tulajdonos törölheti a felmérést.' }, { status: 403 });

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
