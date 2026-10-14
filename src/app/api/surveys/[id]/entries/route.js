import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(surveyId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: survey } = await admin.from('surveys').select('*').eq('id', surveyId).single();
  if (!survey) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin') {
    const { data: mem } = await admin.from('memberships').select('id').eq('user_id', profile.id).eq('entity_id', survey.entity_id).eq('status', 'active').maybeSingle();
    if (!mem) return { err: 'Forbidden', status: 403 };
  }
  const isAdmin = ['admin', 'superadmin'].includes(profile.role);
  // shared_with may be absent if migration 028 hasn't been applied yet
  const isSharedMember = Array.isArray(survey.shared_with) && survey.shared_with.includes(profile.id);
  if (!isAdmin && !isSharedMember) return { err: 'Forbidden', status: 403 };
  return { profile, admin, entityId: survey.entity_id };
}

export async function POST(request, { params }) {
  const { id: surveyId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { name, description, size_m2, height_m, perimeter_m, window_count, door_count, sort_order } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A hely neve kötelező' }, { status: 400 });

  const entryInsert = {
    survey_id: surveyId,
    entity_id: ctx.entityId,
    name: name.trim(),
    description: description?.trim() || null,
    size_m2:      size_m2      != null && size_m2      !== '' ? Number(size_m2)      : null,
    height_m:     height_m     != null && height_m     !== '' ? Number(height_m)     : null,
    perimeter_m:  perimeter_m  != null && perimeter_m  !== '' ? Number(perimeter_m)  : null,
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
