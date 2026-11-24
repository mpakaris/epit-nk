import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { logAudit } from '@/lib/audit';

function resolveTemplates(templates, locale) {
  return (templates || []).map(tmpl => ({
    ...tmpl,
    trade_key:   tmpl.trade,                                       // HU key — used for colour lookup in UI
    trade:       tmpl.trade_i18n?.[locale]       || tmpl.trade,
    name:        tmpl.name_i18n?.[locale]        || tmpl.name,
    description: tmpl.description_i18n?.[locale] || tmpl.description,
    template_entries: (tmpl.template_entries || []).map(e => ({
      ...e,
      name: e.name_i18n?.[locale] || e.name,
    })),
  }));
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('active_collective_id, locale, is_subscription_premium, subscription_tier, trial_ends_at')
    .eq('id', user.id).single();

  const locale = profile?.locale || 'hu';

  const { data: platform } = await admin.from('templates')
    .select('id, trade, trade_i18n, name, name_i18n, description, description_i18n, sort_order, template_entries(id, sort_order, name, name_i18n, entry_type, unit, qty_formula, qty_rate, suggested_price_huf)')
    .eq('is_platform', true)
    .order('sort_order');

  let userTemplates = [];
  if (isEffectivePremium(profile)) {
    const { data } = await admin.from('templates')
      .select('id, trade, trade_i18n, name, name_i18n, description, description_i18n, sort_order, template_entries(id, sort_order, name, name_i18n, entry_type, unit, qty_formula, qty_rate, suggested_price_huf)')
      .eq('is_platform', false)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    userTemplates = data || [];
  }

  return Response.json({
    platform: resolveTemplates(platform, locale),
    user:     resolveTemplates(userTemplates, locale),
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('display_name, active_collective_id, is_subscription_premium, subscription_tier, trial_ends_at').eq('id', user.id).single();

  if (!isEffectivePremium(profile)) {
    logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
      action: 'Template creation denied', targetType: 'template', details: { error: 'Premium required' } });
    return Response.json({ error: 'Saját sablon létrehozásához Premium előfizetés szükséges.' }, { status: 403 });
  }

  const body = await request.json();
  const { trade, name, description, entries = [] } = body;
  if (!trade?.trim() || !name?.trim())
    return Response.json({ error: 'A szakma és a sablon neve kötelező.' }, { status: 400 });

  const { data: tmpl, error: tmplErr } = await admin.from('templates').insert([{
    owner_id: user.id,
    collective_id: profile.active_collective_id || null,
    trade: trade.trim(),
    name: name.trim(),
    description: description?.trim() || null,
    is_platform: false,
  }]).select().single();

  if (tmplErr) {
    logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
      action: 'Template creation failed', targetType: 'template', details: { error: tmplErr.message } });
    return Response.json({ error: tmplErr.message }, { status: 400 });
  }

  if (entries.length > 0) {
    const rows = entries.map((e, i) => ({
      template_id: tmpl.id,
      sort_order: i + 1,
      name: e.name,
      entry_type: e.entry_type,
      unit: e.unit,
      qty_formula: e.qty_formula || 'area',
      qty_rate: e.qty_rate ?? 1,
      suggested_price_huf: e.suggested_price_huf ?? null,
    }));
    await admin.from('template_entries').insert(rows);
  }

  const { data: full } = await admin.from('templates')
    .select('id, trade, name, description, sort_order, template_entries(*)')
    .eq('id', tmpl.id).single();

  logAudit({ entityId: user.id, userId: user.id, userName: profile?.display_name || user.email,
    action: 'Template created', targetType: 'template', targetId: tmpl.id, targetName: tmpl.name });

  return Response.json({ template: full }, { status: 201 });
}
