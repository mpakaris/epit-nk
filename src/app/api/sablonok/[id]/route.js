import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { logAudit } from '@/lib/audit';

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function PATCH(request, { params }) {
  const { user } = await getAuth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles')
    .select('display_name, is_subscription_premium, subscription_tier, trial_ends_at')
    .eq('id', user.id).single();

  if (!isEffectivePremium(profile))
    return Response.json({ error: 'Premium required.' }, { status: 403 });

  const { data: tmpl } = await admin.from('templates')
    .select('id, owner_id, is_platform').eq('id', id).single();

  if (!tmpl || tmpl.is_platform || tmpl.owner_id !== user.id)
    return Response.json({ error: 'Nem található vagy nincs jogosultságod.' }, { status: 404 });

  const body = await request.json();
  const { name, trade, description, entries = [] } = body;
  if (!name?.trim())
    return Response.json({ error: 'A sablon neve kötelező.' }, { status: 400 });

  const { error: updErr } = await admin.from('templates').update({
    name: name.trim(),
    trade: (trade || 'általános').trim(),
    description: description?.trim() || null,
  }).eq('id', id);

  if (updErr) {
    logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
      action: 'Template update failed', targetType: 'template', targetId: id, details: { error: updErr.message } });
    return Response.json({ error: updErr.message }, { status: 400 });
  }

  // Replace all entries
  await admin.from('template_entries').delete().eq('template_id', id);
  if (entries.length > 0) {
    const rows = entries.map((e, i) => ({
      template_id: id,
      sort_order: i + 1,
      name: e.name,
      entry_type: e.entry_type || 'other',
      unit: e.unit || '',
      qty_formula: 'fixed',
      qty_rate: 1,
      suggested_price_huf: e.suggested_price_huf ?? null,
    }));
    await admin.from('template_entries').insert(rows);
  }

  const { data: full } = await admin.from('templates')
    .select('id, trade, name, description, sort_order, template_entries(*)')
    .eq('id', id).single();

  logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
    action: 'Template updated', targetType: 'template', targetId: id, targetName: name.trim() });

  return Response.json({ template: full });
}

export async function DELETE(request, { params }) {
  const { user } = await getAuth();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles')
    .select('display_name').eq('id', user.id).single();

  const { data: tmpl } = await admin.from('templates')
    .select('id, owner_id, is_platform, name').eq('id', id).single();

  if (!tmpl || tmpl.is_platform || tmpl.owner_id !== user.id)
    return Response.json({ error: 'Nem található vagy nincs jogosultságod.' }, { status: 404 });

  await admin.from('template_entries').delete().eq('template_id', id);
  await admin.from('templates').delete().eq('id', id);

  logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
    action: 'Template deleted', targetType: 'template', targetId: id, targetName: tmpl.name });

  return Response.json({ ok: true });
}
