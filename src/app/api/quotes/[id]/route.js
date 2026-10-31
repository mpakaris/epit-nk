import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { hasPendingTransfer, canUnlockToPersonal } from '@/lib/transferLock';

async function getCallerAndQuote(id) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, active_collective_id, display_name, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };

  const { data: quote } = await admin.from('quotes').select('*').eq('id', id).single();
  if (!quote) return { err: 'Not found', status: 404 };

  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner      = quote.owner_id === user.id || quote.created_by === user.id;
  if (isSuperAdmin) return { user, profile, admin, quote };
  if (isOwner)      return { user, profile, admin, quote };

  if (quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    if (mem) return { user, profile, admin, quote, memberRole: mem.role };
  }

  return { err: 'Forbidden', status: 403 };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndQuote(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const [sectionsRes, entriesRes, mediaItemsRes] = await Promise.all([
    ctx.admin.from('quote_sections').select('*').eq('quote_id', id).order('created_at'),
    ctx.admin.from('quote_entries').select('*').eq('quote_id', id).order('created_at'),
    ctx.admin.from('media_items').select('*').eq('document_type', 'quote').eq('document_id', id).order('sort_order'),
  ]);

  return Response.json({
    quote:      ctx.quote,
    sections:   sectionsRes.data    || [],
    entries:    entriesRes.data     || [],
    mediaItems: mediaItemsRes.data  || [],
  });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndQuote(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const fields = await request.json();
  const isOwner          = ctx.quote.owner_id === ctx.user.id || ctx.quote.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';

  if (!isOwner && !isSuperAdmin && !isKollektivOwner)
    return Response.json({ error: 'Csak a tulajdonos módosíthatja az ajánlatot.' }, { status: 403 });

  // Unlock action
  if (fields._action === 'unlock') {
    if (!isOwner && !isSuperAdmin)
      return Response.json({ error: 'Csak a dokumentum tulajdonosa oldhatja fel a zárolást.' }, { status: 403 });
    const check = await canUnlockToPersonal('quote', ctx.user.id, ctx.profile);
    if (!check.allowed)
      return Response.json({ error: 'Nincs szabad hely az előfizetésedben.', reason: check.reason, limit: check.limit }, { status: 402 });
    const { data, error } = await ctx.admin.from('quotes')
      .update({ locked_reason: null, locked_at: null })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ quote: data });
  }

  // Block edits if document is locked
  if (!isSuperAdmin && ctx.quote.locked_reason)
    return Response.json({ error: 'Ez a dokumentum csak olvasható.', locked_reason: ctx.quote.locked_reason }, { status: 423 });

  if (!isSuperAdmin && !isOwner && await hasPendingTransfer('quote', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  const allowed = ['title', 'location', 'work_type', 'description', 'start_date', 'end_date',
                   'status', 'client_id', 'shared_with', 'tax_percent', 'survey_id',
                   'valid_until', 'offer_number', 'offer_terms_text',
                   'payment_deadline_days', 'payment_method', 'deposit_percent', 'warranty_months',
                   'updated_at', 'updated_by_name',
                   ...(isOwner || isSuperAdmin || isKollektivOwner ? ['collective_id'] : [])];
  const update = {};
  for (const k of allowed) if (k in fields) update[k] = fields[k];

  // Validate shared_with users are in the same collective
  if (Array.isArray(update.shared_with) && update.shared_with.length > 0 && ctx.quote.collective_id) {
    const { data: validUsers } = await ctx.admin
      .from('collective_members')
      .select('user_id')
      .eq('collective_id', ctx.quote.collective_id)
      .in('user_id', update.shared_with)
      .eq('status', 'active');
    const validIds = new Set((validUsers || []).map(u => u.user_id));
    update.shared_with = update.shared_with.filter(uid => validIds.has(uid));
  }

  const { data, error } = await ctx.admin.from('quotes').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const FIELD_LABELS = {
    title: 'Ajánlat neve', location: 'Helyszín', work_type: 'Munka típusa',
    description: 'Leírás', start_date: 'Kezdés', end_date: 'Befejezés',
    client_id: 'Ügyfél', tax_percent: 'ÁFA kulcs', offer_number: 'Ajánlat száma',
    valid_until: 'Érvényesség', offer_terms_text: 'Feltételek',
    payment_deadline_days: 'Fizetési határidő', payment_method: 'Fizetési mód',
    deposit_percent: 'Előleg', warranty_months: 'Garancia',
  };
  const changedFields = update.status ? null : Object.keys(update)
    .filter(k => !['updated_at', 'updated_by_name'].includes(k) && update[k] !== ctx.quote[k])
    .map(k => FIELD_LABELS[k])
    .filter(Boolean);

  const statusLabels = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };

  logAudit({
    entityId: ctx.quote.collective_id || ctx.user.id,
    userId:   ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action:   update.status
      ? `Státusz: ${statusLabels[update.status] || update.status}`
      : 'Ajánlat módosítva',
    targetType: 'quote',
    targetId:   id,
    targetName: ctx.quote.title,
    details: update.status
      ? { status: update.status }
      : (changedFields?.length ? { changed_fields: changedFields } : null),
  });

  return Response.json({ quote: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCallerAndQuote(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const isOwner          = ctx.quote.owner_id === ctx.user.id || ctx.quote.created_by === ctx.user.id;
  const isSuperAdmin     = ctx.profile.role === 'superadmin';
  const isKollektivOwner = ctx.memberRole === 'owner' || ctx.memberRole === 'admin';
  if (!isOwner && !isSuperAdmin && !isKollektivOwner)
    return Response.json({ error: 'Csak a tulajdonos törölheti az ajánlatot.' }, { status: 403 });

  if (!isSuperAdmin && await hasPendingTransfer('quote', id))
    return Response.json({ error: 'Ez a dokumentum átadás alatt áll, ezért nem módosítható.' }, { status: 423 });

  const { error } = await ctx.admin.from('quotes').update({ deleted_at: new Date().toISOString(), deleted_by: ctx.user.id }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId: ctx.quote.collective_id || ctx.user.id,
    userId:   ctx.user.id,
    userName: ctx.profile.display_name || ctx.user.email,
    action:   'Ajánlat törölve',
    targetType: 'quote',
    targetId:   id,
    targetName: ctx.quote.title,
  });

  return Response.json({ success: true });
}
