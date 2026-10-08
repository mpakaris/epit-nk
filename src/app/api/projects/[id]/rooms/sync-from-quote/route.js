import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project } = await admin.from('projects').select('id, entity_id').eq('id', projectId).single();
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  if (profile.role !== 'superadmin' && project.entity_id !== profile.entity_id)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Find the linked quote
  const { data: linkedQuote } = await admin
    .from('quotes')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!linkedQuote) return Response.json({ created: 0, message: 'Nincs kapcsolt ajánlat' });

  // Get quote sections
  const { data: sections } = await admin
    .from('quote_sections')
    .select('*')
    .eq('quote_id', linkedQuote.id)
    .order('sort_order')
    .order('created_at');

  if (!sections || sections.length === 0) return Response.json({ created: 0, message: 'Az ajánlatnak nincsenek szekciói' });

  // Get already-imported section IDs
  const { data: existingRooms } = await admin
    .from('project_rooms')
    .select('source_section_id')
    .eq('project_id', projectId)
    .not('source_section_id', 'is', null);

  const importedIds = new Set((existingRooms || []).map(r => r.source_section_id));

  // Calculate quoted amount per section from quote entries
  const sectionIds = sections.map(s => s.id);
  const { data: entries } = await admin
    .from('quote_entries')
    .select('section_id, amount_huf')
    .in('section_id', sectionIds);

  const amountBySectionId = {};
  for (const entry of (entries || [])) {
    amountBySectionId[entry.section_id] = (amountBySectionId[entry.section_id] || 0) + Number(entry.amount_huf || 0);
  }

  // Import sections that haven't been imported yet
  const toInsert = sections
    .filter(s => !importedIds.has(s.id))
    .map((s, i) => ({
      project_id: projectId,
      entity_id: project.entity_id,
      name: s.name,
      size_m2: s.size_m2 || null,
      work_types: [],
      description: s.description || null,
      quoted_amount_net: amountBySectionId[s.id] || null,
      sort_order: s.sort_order ?? i,
      source_section_id: s.id,
      start_date: s.start_date || null,
      end_date: s.end_date || null,
    }));

  if (toInsert.length === 0) return Response.json({ created: 0, message: 'Minden szekció már be van importálva' });

  const { data: created, error: insertErr } = await admin
    .from('project_rooms')
    .insert(toInsert)
    .select();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });
  return Response.json({ created: created.length, rooms: created });
}
