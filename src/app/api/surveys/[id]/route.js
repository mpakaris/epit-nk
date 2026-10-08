import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

async function getCallerAndSurvey(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: survey } = await admin.from('surveys').select('*').eq('id', id).single();
  if (!survey) return { err: 'Not found', status: 404 };

  if (profile.role !== 'superadmin' && survey.entity_id !== profile.entity_id) {
    return { err: 'Forbidden', status: 403 };
  }

  return { user, profile, admin, survey };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const [{ data: allMedia }, { data: entries }] = await Promise.all([
    ctx.admin.from('survey_media').select('*').eq('survey_id', id).order('created_at'),
    ctx.admin.from('survey_entries').select('*').eq('survey_id', id).order('sort_order').order('created_at'),
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
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  if (!['admin', 'superadmin'].includes(ctx.profile.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fields = await request.json();
  const allowed = ['title', 'notes', 'date', 'location', 'client_id'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  const { data, error } = await ctx.admin.from('surveys').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ survey: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndSurvey(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  if (!['admin', 'superadmin'].includes(ctx.profile.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: media } = await ctx.admin.from('survey_media').select('drive_file_id').eq('survey_id', id);
  if (media?.length) {
    await Promise.allSettled(media.map(m => deleteFromR2(m.drive_file_id)));
  }

  const { error } = await ctx.admin.from('surveys').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
