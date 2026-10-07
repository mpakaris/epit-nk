import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerAndQuote(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: quote } = await admin.from('quotes').select('*').eq('id', id).single();
  if (!quote) return { err: 'Not found', status: 404 };

  const isAdmin = ['admin', 'superadmin'].includes(profile.role);
  const isCreator = quote.created_by === user.id;
  if (!isAdmin && !isCreator) return { err: 'Forbidden', status: 403 };
  if (profile.role !== 'superadmin' && quote.entity_id !== profile.entity_id)
    return { err: 'Forbidden', status: 403 };

  return { user, profile, admin, quote };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndQuote(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const allowed = ['title', 'location', 'work_type', 'description', 'start_date', 'end_date',
                   'status', 'client_id', 'shared_with', 'tax_percent'];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  if (Array.isArray(update.shared_with) && update.shared_with.length > 0) {
    const { data: validUsers } = await ctx.admin
      .from('profiles').select('id').in('id', update.shared_with).eq('entity_id', ctx.quote.entity_id);
    const validIds = new Set((validUsers || []).map(u => u.id));
    update.shared_with = update.shared_with.filter(uid => validIds.has(uid));
  }

  const { data, error } = await ctx.admin.from('quotes').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const actionLabel = update.status
    ? `Ajánlat státusza módosítva: ${update.status}`
    : 'Ajánlat módosítva';
  logAudit({
    entityId: ctx.quote.entity_id,
    userId: ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action: actionLabel,
    targetType: 'quote',
    targetId: id,
    targetName: ctx.quote.title,
    details: update.status ? { status: update.status } : null,
  });

  return Response.json({ quote: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndQuote(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const quoteTitle = ctx.quote.title;
  await ctx.admin.from('quote_entries').delete().eq('quote_id', id);
  const { error } = await ctx.admin.from('quotes').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId: ctx.quote.entity_id,
    userId: ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action: 'Ajánlat törölve',
    targetType: 'quote',
    targetId: id,
    targetName: quoteTitle,
  });

  return Response.json({ success: true });
}
