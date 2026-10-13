import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(templateId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  if (!['admin', 'superadmin'].includes(profile.role)) return { err: 'Admin only', status: 403 };
  const { data: template } = await admin.from('quote_templates').select('*').eq('id', templateId).single();
  if (!template) return { err: 'Not found', status: 404 };
  if (profile.role !== 'superadmin' && template.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, template };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const ctx = await getCtx(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const [{ data: sections }, { data: entries }] = await Promise.all([
    ctx.admin.from('template_sections').select('*').eq('template_id', id).order('sort_order').order('created_at'),
    ctx.admin.from('template_entries').select('*').eq('template_id', id).order('sort_order').order('created_at'),
  ]);

  const sectionsWithEntries = (sections || []).map(s => ({
    ...s,
    entries: (entries || []).filter(e => e.section_id === s.id),
  }));

  return Response.json({ template: ctx.template, sections: sectionsWithEntries, entries: entries || [] });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const ctx = await getCtx(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const body = await request.json();
  const { name, title, location, work_type, description, tax_percent, sections } = body;

  // Update header
  const headerUpdate = {};
  if (name !== undefined) headerUpdate.name = name?.trim();
  if (title !== undefined) headerUpdate.title = title?.trim() || null;
  if (location !== undefined) headerUpdate.location = location?.trim() || null;
  if (work_type !== undefined) headerUpdate.work_type = work_type?.trim() || null;
  if (description !== undefined) headerUpdate.description = description?.trim() || null;
  if (tax_percent !== undefined) headerUpdate.tax_percent = Number(tax_percent) || 27;

  if (headerUpdate.name === '') return Response.json({ error: 'A sablon neve kötelező' }, { status: 400 });

  let template = ctx.template;
  if (Object.keys(headerUpdate).length > 0) {
    const { data, error } = await ctx.admin.from('quote_templates').update(headerUpdate).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    template = data;
  }

  // If sections provided, replace all sections + entries
  if (Array.isArray(sections)) {
    // Delete existing
    await ctx.admin.from('template_entries').delete().eq('template_id', id);
    await ctx.admin.from('template_sections').delete().eq('template_id', id);

    // Re-insert
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.name?.trim()) continue;
      const { data: section } = await ctx.admin.from('template_sections').insert([{
        template_id: id,
        name: s.name.trim(),
        description: s.description?.trim() || null,
        size_m2: s.size_m2 != null ? Number(s.size_m2) : null,
        sort_order: i,
        start_date: s.start_date || null,
        end_date: s.end_date || null,
      }]).select().single();

      if (!section) continue;
      for (let j = 0; j < (s.entries || []).length; j++) {
        const e = s.entries[j];
        if (!e.work_description?.trim()) continue;
        await ctx.admin.from('template_entries').insert([{
          template_id: id,
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
    }
  }

  return Response.json({ template });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const ctx = await getCtx(id);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { error } = await ctx.admin.from('quote_templates').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
