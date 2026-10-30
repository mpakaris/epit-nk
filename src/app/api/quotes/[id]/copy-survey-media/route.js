import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: quote } = await admin
    .from('quotes').select('id, survey_id, owner_id, created_by, collective_id').eq('id', quoteId).single();
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

  if (!quote.survey_id) return Response.json({ copied: 0 });

  const { data: sections } = await admin
    .from('quote_sections')
    .select('id, survey_entry_id')
    .eq('quote_id', quoteId)
    .not('survey_entry_id', 'is', null);

  if (!sections?.length) return Response.json({ copied: 0 });

  const entryIds = sections.map(s => s.survey_entry_id);
  const { data: surveyMediaRows } = await admin
    .from('survey_media')
    .select('id, drive_file_id, drive_view_url, thumbnail_url, mime_type, entry_id')
    .in('entry_id', entryIds);

  if (!surveyMediaRows?.length) return Response.json({ copied: 0 });

  // Load existing media_items for this quote to enable idempotency check
  const { data: existing } = await admin
    .from('media_items')
    .select('owner_id, r2_key')
    .eq('document_type', 'quote')
    .eq('document_id', quoteId);

  const existingKeys = new Set((existing || []).map(m => `${m.owner_id}::${m.r2_key}`));

  const sectionByEntryId = {};
  for (const s of sections) sectionByEntryId[s.survey_entry_id] = s.id;

  const toInsert = [];
  for (const m of surveyMediaRows) {
    const sectionId = sectionByEntryId[m.entry_id];
    if (!sectionId) continue;
    if (existingKeys.has(`${sectionId}::${m.drive_file_id}`)) continue;
    toInsert.push({
      r2_key:       m.drive_file_id,
      cdn_url:      m.drive_view_url,
      thumbnail_url: m.thumbnail_url || null,
      mime_type:    m.mime_type || null,
      owner_type:   'quote_section',
      owner_id:     sectionId,
      document_type: 'quote',
      document_id:  quoteId,
      created_by:   user.id,
      sort_order:   0,
    });
  }

  if (!toInsert.length) return Response.json({ copied: 0 });

  const { error } = await admin.from('media_items').insert(toInsert);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ copied: toInsert.length });
}
