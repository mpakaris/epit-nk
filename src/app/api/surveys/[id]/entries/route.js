import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSurveyAccess } from '@/lib/surveyAccess';

async function getCtx(surveyId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: survey } = await admin.from('surveys').select('*').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin') {
    const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
    if (!access.allowed) return { err: 'Forbidden', status: 403 };
  }
  return { profile, admin };
}

export async function POST(request, { params }) {
  const { id: surveyId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { name, description, width_m, length_m, height_m, window_count, door_count, sort_order } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A hely neve kötelező' }, { status: 400 });

  const { count } = await ctx.admin.from('survey_entries').select('id', { count: 'exact', head: true }).eq('survey_id', surveyId);
  if (count >= 30) return Response.json({ error: 'Egy felméréshez maximum 30 helyiség adható hozzá.' }, { status: 400 });

  const wNum = width_m  != null && width_m  !== '' ? Number(width_m)  : null;
  const lNum = length_m != null && length_m !== '' ? Number(length_m) : null;

  const entryInsert = {
    survey_id: surveyId,
    name: name.trim(),
    description: description?.trim() || null,
    width_m:      wNum,
    length_m:     lNum,
    size_m2:      wNum > 0 && lNum > 0 ? wNum * lNum : null,
    height_m:     height_m     != null && height_m     !== '' ? Number(height_m)     : null,
    window_count: window_count != null && window_count !== '' ? Number(window_count) : 0,
    door_count:   door_count   != null && door_count   !== '' ? Number(door_count)   : 0,
    sort_order: sort_order ?? 0,
  };

  let data, error;
  // Try with authorship fields (requires migration 028); fall back without them
  ({ data, error } = await ctx.admin.from('survey_entries').insert([{
    ...entryInsert,
    created_by: ctx.profile.id,
    created_by_name: ctx.profile.display_name || null,
  }]).select().single());
  if (error?.message?.includes('column') && error.message.includes('created_by')) {
    ({ data, error } = await ctx.admin.from('survey_entries').insert([entryInsert]).select().single());
  }
  const entry = data;

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ entry: { ...entry, media: [] } }, { status: 201 });
}
