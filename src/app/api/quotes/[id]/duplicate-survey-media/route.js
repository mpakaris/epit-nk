import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { copyR2Object, r2PublicUrl, diaryMediaKey } from '@/lib/r2';

// POST /api/quotes/[id]/duplicate-survey-media
// Clones all media from the source survey into a new survey owned by this offer.
// Each quote section's survey_entry_id is re-pointed to the new entry.
// Called once at offer-creation time when the offer is built from a survey template.
export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('id, title, owner_id, created_by, client_id').eq('id', quoteId).single();
  if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });
  if (quote.owner_id !== user.id && quote.created_by !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { source_survey_id } = await request.json();
  if (!source_survey_id) return Response.json({ error: 'source_survey_id required' }, { status: 400 });

  // Create a new survey as the offer's own photo storage
  const { data: newSurvey, error: surveyErr } = await admin.from('surveys').insert([{
    owner_id:   quote.owner_id,
    created_by: user.id,
    title:      quote.title || 'Ajánlat felmérés',
    client_id:  quote.client_id || null,
  }]).select().single();
  if (surveyErr) return Response.json({ error: surveyErr.message }, { status: 500 });

  // Fetch source survey entries + their media
  const { data: sourceEntries } = await admin
    .from('survey_entries').select('*').eq('survey_id', source_survey_id);
  const { data: sourceMedia } = await admin
    .from('survey_media').select('*').eq('survey_id', source_survey_id);

  const mediaByEntry = {};
  for (const m of (sourceMedia || [])) {
    const key = m.entry_id || '_survey';
    if (!mediaByEntry[key]) mediaByEntry[key] = [];
    mediaByEntry[key].push(m);
  }

  // For each source entry, create a new entry + copy media files
  const entryIdMap = {}; // oldEntryId → newEntryId
  for (const src of (sourceEntries || [])) {
    const { data: newEntry } = await admin.from('survey_entries').insert([{
      survey_id:    newSurvey.id,
      name:         src.name,
      description:  src.description,
      size_m2:      src.size_m2,
      height_m:     src.height_m,
      perimeter_m:  src.perimeter_m,
      window_count: src.window_count,
      door_count:   src.door_count,
      sort_order:   src.sort_order ?? 0,
    }]).select().single();
    if (!newEntry) continue;
    entryIdMap[src.id] = newEntry.id;

    for (const m of (mediaByEntry[src.id] || [])) {
      const newKey = diaryMediaKey(newSurvey.owner_id, m.mime_type, m.file_name || 'file');
      try {
        await copyR2Object(m.drive_file_id, newKey);
        const newUrl = r2PublicUrl(newKey);
        await admin.from('survey_media').insert([{
          survey_id:     newSurvey.id,
          entry_id:      newEntry.id,
          media_type:    m.media_type,
          drive_file_id: newKey,
          drive_view_url: newUrl,
          thumbnail_url:  m.mime_type?.startsWith('image/') ? newUrl : null,
          mime_type:     m.mime_type,
          file_name:     m.file_name,
        }]);
      } catch { /* skip failed copies silently */ }
    }
  }

  // Also copy survey-level media (layouts etc.)
  for (const m of (mediaByEntry['_survey'] || [])) {
    const newKey = diaryMediaKey(newSurvey.owner_id, m.mime_type, m.file_name || 'file');
    try {
      await copyR2Object(m.drive_file_id, newKey);
      const newUrl = r2PublicUrl(newKey);
      await admin.from('survey_media').insert([{
        survey_id:     newSurvey.id,
        entry_id:      null,
        media_type:    m.media_type,
        drive_file_id: newKey,
        drive_view_url: newUrl,
        thumbnail_url:  m.mime_type?.startsWith('image/') ? newUrl : null,
        mime_type:     m.mime_type,
        file_name:     m.file_name,
      }]);
    } catch { }
  }

  // Update each quote section's survey_entry_id to the new entry
  const { data: sections } = await admin
    .from('quote_sections').select('id, survey_entry_id').eq('quote_id', quoteId);
  for (const s of (sections || [])) {
    if (!s.survey_entry_id || !entryIdMap[s.survey_entry_id]) continue;
    await admin.from('quote_sections')
      .update({ survey_entry_id: entryIdMap[s.survey_entry_id] })
      .eq('id', s.id);
  }

  // Point the quote to the new survey
  await admin.from('quotes').update({ survey_id: newSurvey.id }).eq('id', quoteId);

  return Response.json({ survey_id: newSurvey.id, entry_map: entryIdMap }, { status: 200 });
}
