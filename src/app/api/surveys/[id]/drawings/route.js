import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSurveyAccess } from '@/lib/surveyAccess';
import { logAudit } from '@/lib/audit';

async function getCtx(surveyId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: survey } = await admin.from('surveys').select('owner_id, collective_id, shared_with, created_by').eq('id', surveyId).is('deleted_at', null).single();
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

  if (error) {
    logAudit({ entityId: ctx.survey?.collective_id || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Survey drawing creation failed', targetType: 'survey_drawing', details: { error: error.message, survey_id: id } });
    return Response.json({ error: error.message }, { status: 400 });
  }
  logAudit({ entityId: ctx.survey?.collective_id || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Survey drawing created', targetType: 'survey_drawing', targetId: data.id });
  return Response.json({ drawing: data });
}
