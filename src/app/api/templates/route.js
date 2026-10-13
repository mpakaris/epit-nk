import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getAdminCtx() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id, display_name').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  if (!['admin', 'superadmin'].includes(profile.role)) return { err: 'Admin only', status: 403 };
  if (!profile.entity_id && profile.role !== 'superadmin') return { err: 'No entity', status: 400 };
  return { profile, admin };
}

export async function GET(request) {
  const ctx = await getAdminCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  let entityId = ctx.profile.entity_id;
  if (ctx.profile.role === 'superadmin') {
    const { searchParams } = new URL(request.url);
    entityId = searchParams.get('entity_id');
    if (!entityId) return Response.json({ error: 'entity_id required' }, { status: 400 });
  }

  const { data: templates, error } = await ctx.admin
    .from('quote_templates')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ templates: templates || [] });
}

export async function POST(request) {
  const ctx = await getAdminCtx();
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const { name, title, location, work_type, description, tax_percent, sections = [], entity_id: bodyEntityId } = body;

  if (!name?.trim()) return Response.json({ error: 'A sablon neve kötelező' }, { status: 400 });

  let entityId = ctx.profile.entity_id;
  if (ctx.profile.role === 'superadmin' && bodyEntityId) entityId = bodyEntityId;
  if (!entityId) return Response.json({ error: 'Nincs entitás' }, { status: 400 });

  const { data: template, error: tErr } = await ctx.admin.from('quote_templates').insert([{
    entity_id: entityId,
    name: name.trim(),
    title: title?.trim() || null,
    location: location?.trim() || null,
    work_type: work_type?.trim() || null,
    description: description?.trim() || null,
    tax_percent: Number(tax_percent) || 27,
    created_by: ctx.profile.id,
  }]).select().single();

  if (tErr) return Response.json({ error: tErr.message }, { status: 500 });

  // Insert sections and their entries
  const sectionResults = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (!s.name?.trim()) continue;

    const { data: section, error: sErr } = await ctx.admin.from('template_sections').insert([{
      template_id: template.id,
      name: s.name.trim(),
      description: s.description?.trim() || null,
      size_m2: s.size_m2 != null ? Number(s.size_m2) : null,
      sort_order: i,
      start_date: s.start_date || null,
      end_date: s.end_date || null,
    }]).select().single();

    if (sErr) continue;

    const entries = s.entries || [];
    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      if (!e.work_description?.trim()) continue;
      await ctx.admin.from('template_entries').insert([{
        template_id: template.id,
        section_id: section.id,
        entry_type: e.entry_type || 'material',
        work_description: e.work_description.trim(),
        quantity: e.quantity != null ? Number(e.quantity) : null,
        unit: e.unit || null,
        unit_price: e.unit_price != null ? Number(e.unit_price) : null,
        amount_huf: Number(e.amount_huf) || 0,
        notes: e.notes?.trim() || null,
        sort_order: j,
      }]);
    }
    sectionResults.push(section);
  }

  return Response.json({ template }, { status: 201 });
}
