import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSurveyAccess } from '@/lib/surveyAccess';

async function getCtx(surveyId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };

  if (profile.role !== 'superadmin') {
    const access = await checkSurveyAccess(admin, survey, user.id, surveyId);
    if (!access.allowed) return { err: 'Forbidden', status: 403 };
  }

  return { user, profile, admin, survey };
}

export async function POST(request, { params }) {
  const { id } = await params;
  const ctx = await getCtx(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { svg_data, entry_id } = await request.json();
  if (!svg_data?.trim()) return Response.json({ error: 'svg_data required' }, { status: 400 });

  const { data, error } = await ctx.admin
    .from('survey_drawings')
    .insert({ survey_id: id, entry_id: entry_id || null, svg_data, created_by: ctx.user.id })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ drawing: data });
}
