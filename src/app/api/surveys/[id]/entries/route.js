import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(surveyId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: survey } = await admin.from('surveys').select('entity_id').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin' && survey.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, entityId: survey.entity_id };
}

export async function POST(request, { params }) {
  const { id: surveyId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { name, description, size_m2, sort_order } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A hely neve kötelező' }, { status: 400 });

  const { data: entry, error } = await ctx.admin.from('survey_entries').insert([{
    survey_id: surveyId,
    entity_id: ctx.entityId,
    name: name.trim(),
    description: description?.trim() || null,
    size_m2: size_m2 != null && size_m2 !== '' ? Number(size_m2) : null,
    sort_order: sort_order ?? 0,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ entry: { ...entry, media: [] } }, { status: 201 });
}
