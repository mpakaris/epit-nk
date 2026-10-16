import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

async function getCtx(surveyId, entryId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin') {
    const isOwner  = survey.owner_id === user.id || survey.created_by === user.id;
    const isShared = (survey.shared_with || []).includes(user.id);
    if (!isOwner && !isShared) {
      if (!survey.collective_id) return { err: 'Forbidden', status: 403 };
      const { data: mem } = await admin.from('collective_members').select('collective_id').eq('collective_id', survey.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return { err: 'Forbidden', status: 403 };
    }
  }
  return { profile, admin, entityId: null };
}

export async function PATCH(request, { params }) {
  const { id: surveyId, entryId } = await params;
  const ctx = await getCtx(surveyId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['name', 'description', 'width_m', 'length_m', 'height_m', 'window_count', 'door_count', 'sort_order'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];
  if (update.name !== undefined) update.name = update.name?.trim();
  if (!update.name) return Response.json({ error: 'A hely neve kötelező' }, { status: 400 });
  for (const f of ['width_m', 'length_m', 'height_m']) {
    if (f in update) update[f] = update[f] != null && update[f] !== '' ? Number(update[f]) : null;
  }
  // Recompute size_m2 from stored dimensions
  if ('width_m' in update || 'length_m' in update) {
    const w = update.width_m  ?? null;
    const l = update.length_m ?? null;
    update.size_m2 = w > 0 && l > 0 ? w * l : null;
  }

  const { data, error } = await ctx.admin.from('survey_entries').update(update).eq('id', entryId).eq('survey_id', surveyId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ entry: data });
}

export async function DELETE(request, { params }) {
  const { id: surveyId, entryId } = await params;
  const ctx = await getCtx(surveyId, entryId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: media } = await ctx.admin.from('survey_media').select('id, drive_file_id').eq('entry_id', entryId);
  if (media?.length) {
    await Promise.allSettled(media.map(m => deleteFromR2(m.drive_file_id)));
    await ctx.admin.from('survey_media').delete().eq('entry_id', entryId);
  }

  await ctx.admin.from('survey_drawings').delete().eq('entry_id', entryId);

  const { error } = await ctx.admin.from('survey_entries').delete().eq('id', entryId).eq('survey_id', surveyId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
