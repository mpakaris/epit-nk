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

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner  = survey.owner_id === user.id || survey.created_by === user.id;
  const isShared = (survey.shared_with || []).includes(user.id);
  let memberRole = null;

  if (!isSuperAdmin && !isOwner && !isShared) {
    if (!survey.collective_id) return { err: 'Forbidden', status: 403 };
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', survey.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem) return { err: 'Forbidden', status: 403 };
    memberRole = mem.role;
  } else if (isOwner) {
    memberRole = 'owner';
  }

  const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
  return { user, profile, admin, isSuperAdmin, isKollektivOwner };
}

export async function PUT(request, { params }) {
  const { id: surveyId, itemId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: existing } = await ctx.admin.from('survey_entry_items')
    .select('created_by').eq('id', itemId).eq('survey_id', surveyId).maybeSingle();
  if (!existing) return Response.json({ error: 'Tétel nem található' }, { status: 404 });

  const canEdit = ctx.isSuperAdmin || ctx.isKollektivOwner || existing.created_by === ctx.user.id;
  if (!canEdit) return Response.json({ error: 'Nincs jogosultság a módosításhoz' }, { status: 403 });

  const body = await request.json();
  const allowed = ['description', 'quantity', 'unit', 'notes', 'entry_type', 'is_confirmed', 'sort_order'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('description' in update) {
    update.description = update.description?.trim();
    if (!update.description) return Response.json({ error: 'A tétel leírása nem lehet üres' }, { status: 400 });
  }
  if ('quantity' in update && update.quantity != null) update.quantity = Number(update.quantity);

  const { data: item, error } = await ctx.admin.from('survey_entry_items')
    .update(update).eq('id', itemId).eq('survey_id', surveyId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ item });
}

export async function DELETE(request, { params }) {
  const { id: surveyId, itemId } = await params;
  const ctx = await getCtx(surveyId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: existing } = await ctx.admin.from('survey_entry_items')
    .select('created_by').eq('id', itemId).eq('survey_id', surveyId).maybeSingle();
  if (!existing) return Response.json({ error: 'Tétel nem található' }, { status: 404 });

  const canDelete = ctx.isSuperAdmin || ctx.isKollektivOwner || existing.created_by === ctx.user.id;
  if (!canDelete) return Response.json({ error: 'Nincs jogosultság a törléshez' }, { status: 403 });

  const { error } = await ctx.admin.from('survey_entry_items')
    .delete().eq('id', itemId).eq('survey_id', surveyId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
