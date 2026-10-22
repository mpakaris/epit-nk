import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const isOwner  = survey.owner_id === user.id || survey.created_by === user.id;
    const isShared = (survey.shared_with || []).includes(user.id);
    if (!isOwner && !isShared) {
      if (!survey.collective_id) return { err: 'Forbidden', status: 403 };
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', survey.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return { err: 'Forbidden', status: 403 };
    }
  }
  return { user, profile, admin };
}

export async function GET(request, { params }) {
  const { id: surveyId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: items, error } = await ctx.admin.from('survey_entry_items')
    .select('*')
    .eq('survey_id', surveyId)
    .order('sort_order')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items });
}

export async function POST(request, { params }) {
  const { id: surveyId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const { entry_id, description, quantity, unit, notes, entry_type = 'material', source = 'manual', is_confirmed = true, catalogue_item_id, sort_order = 0 } = body;

  if (!entry_id) return Response.json({ error: 'entry_id kötelező' }, { status: 400 });
  if (!description?.trim()) return Response.json({ error: 'A tétel leírása kötelező' }, { status: 400 });

  const { data: entryCheck } = await ctx.admin.from('survey_entries').select('id').eq('id', entry_id).eq('survey_id', surveyId).maybeSingle();
  if (!entryCheck) return Response.json({ error: 'Helyiség nem található' }, { status: 404 });

  const { data: item, error } = await ctx.admin.from('survey_entry_items').insert([{
    survey_id: surveyId,
    entry_id,
    owner_id: ctx.user.id,
    created_by: ctx.user.id,
    description: description.trim(),
    quantity: quantity != null ? Number(quantity) : null,
    unit: unit?.trim() || null,
    notes: notes?.trim() || null,
    entry_type: ['material', 'labour', 'equipment', 'transport', 'other'].includes(entry_type) ? entry_type : 'material',
    source,
    is_confirmed,
    catalogue_item_id: catalogue_item_id || null,
    sort_order,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item }, { status: 201 });
}
