import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

async function getCtx(surveyId, entryId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: survey } = await admin.from('surveys').select('entity_id').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin' && survey.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  if (!['admin', 'superadmin'].includes(profile.role)) return { err: 'Forbidden', status: 403 };
  return { profile, admin, entityId: survey.entity_id };
}

export async function PATCH(request, { params }) {
  const { id: surveyId, entryId } = await params;
  const ctx = await getCtx(surveyId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['name', 'description', 'size_m2', 'sort_order'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];
  if (update.name !== undefined) update.name = update.name?.trim();
  if (!update.name) return Response.json({ error: 'A hely neve kötelező' }, { status: 400 });
  if ('size_m2' in update) update.size_m2 = update.size_m2 != null && update.size_m2 !== '' ? Number(update.size_m2) : null;

  const { data, error } = await ctx.admin.from('survey_entries').update(update).eq('id', entryId).eq('survey_id', surveyId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ entry: data });
}

export async function DELETE(request, { params }) {
  const { id: surveyId, entryId } = await params;
  const ctx = await getCtx(surveyId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  // Delete R2 objects for this entry's media
  const { data: media } = await ctx.admin.from('survey_media').select('drive_file_id').eq('entry_id', entryId);
  if (media?.length) await Promise.allSettled(media.map(m => deleteFromR2(m.drive_file_id)));

  const { error } = await ctx.admin.from('survey_entries').delete().eq('id', entryId).eq('survey_id', surveyId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
