import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: quote } = await admin
    .from('quotes').select('id, survey_id, owner_id, created_by, collective_id, is_read_only').eq('id', quoteId).is('deleted_at', null).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  if (!isOwner) {
    if (!quote.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', quote.collective_id)
      .eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (quote.is_read_only)
    return Response.json({ error: 'Ez a dokumentum csak olvasható.', read_only: true }, { status: 403 });

  if (!quote.survey_id) return Response.json({ copied: 0 });

  const { data: surveyDrawings } = await admin
    .from('survey_drawings')
    .select('id, svg_data, entry_id')
    .eq('survey_id', quote.survey_id);

  if (!surveyDrawings?.length) return Response.json({ copied: 0 });

  // Map survey_entry_id → quote_section.id
  const { data: sections } = await admin
    .from('quote_sections')
    .select('id, survey_entry_id')
    .eq('quote_id', quoteId)
    .not('survey_entry_id', 'is', null);

  const sectionByEntryId = {};
  for (const s of (sections || [])) sectionByEntryId[s.survey_entry_id] = s.id;

  // Idempotency: check existing quote_drawings for this quote
  const { data: existing } = await admin
    .from('quote_drawings')
    .select('section_id, svg_data')
    .eq('quote_id', quoteId);

  // Use a fingerprint of first 64 chars to detect duplicates
  const existingSet = new Set((existing || []).map(d => `${d.section_id ?? 'doc'}::${d.svg_data.slice(0, 64)}`));

  const toInsert = [];
  for (const d of surveyDrawings) {
    const sectionId = d.entry_id ? (sectionByEntryId[d.entry_id] ?? null) : null;
    const key = `${sectionId ?? 'doc'}::${d.svg_data.slice(0, 64)}`;
    if (existingSet.has(key)) continue;
    toInsert.push({ quote_id: quoteId, section_id: sectionId, svg_data: d.svg_data, created_by: user.id });
  }

  if (!toInsert.length) return Response.json({ copied: 0 });

  const { error } = await admin.from('quote_drawings').insert(toInsert);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ copied: toInsert.length });
}
