import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCtx() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('id, role, active_collective_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  return { user, profile, admin };
}

export async function PUT(request, { params }) {
  const { itemId } = await params;
  const ctx = await getCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: existing } = await ctx.admin.from('catalogue_items').select('owner_id, collective_id').eq('id', itemId).maybeSingle();
  if (!existing) return Response.json({ error: 'Nem található' }, { status: 404 });

  const collectiveId = ctx.profile.active_collective_id;
  const canEdit = ctx.profile.role === 'superadmin'
    || existing.owner_id === ctx.user.id
    || (collectiveId && existing.collective_id === collectiveId);
  if (!canEdit) return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });

  const body = await request.json();
  const allowed = ['trade', 'name', 'unit', 'labour_price', 'materials', 'notes', 'is_active', 'sort_order'];
  const update = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ('name' in update) { update.name = update.name?.trim(); if (!update.name) return Response.json({ error: 'A tétel neve nem lehet üres' }, { status: 400 }); }
  if ('unit' in update) { update.unit = update.unit?.trim(); if (!update.unit) return Response.json({ error: 'A mértékegység nem lehet üres' }, { status: 400 }); }

  const { data: item, error } = await ctx.admin.from('catalogue_items').update(update).eq('id', itemId).select().single();
  if (error) {
    logAudit({ entityId: collectiveId || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Catalogue item update failed', targetType: 'catalogue', targetId: itemId, details: { error: error.message } });
    return Response.json({ error: error.message }, { status: 400 });
  }
  logAudit({ entityId: collectiveId || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Catalogue item updated', targetType: 'catalogue', targetId: itemId, targetName: item.name });
  return Response.json({ item });
}

export async function DELETE(request, { params }) {
  const { itemId } = await params;
  const ctx = await getCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { data: existing } = await ctx.admin.from('catalogue_items').select('owner_id, collective_id').eq('id', itemId).maybeSingle();
  if (!existing) return Response.json({ error: 'Nem található' }, { status: 404 });

  const collectiveId = ctx.profile.active_collective_id;
  const canDelete = ctx.profile.role === 'superadmin'
    || existing.owner_id === ctx.user.id
    || (collectiveId && existing.collective_id === collectiveId);
  if (!canDelete) {
    logAudit({ entityId: collectiveId || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Catalogue item delete denied', targetType: 'catalogue', targetId: itemId, details: { error: 'Nincs jogosultság' } });
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }

  const { error } = await ctx.admin.from('catalogue_items').delete().eq('id', itemId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  logAudit({ entityId: collectiveId || ctx.user.id, userId: ctx.user.id, userName: ctx.profile.display_name || '', action: 'Catalogue item deleted', targetType: 'catalogue', targetId: itemId });
  return Response.json({ success: true });
}
