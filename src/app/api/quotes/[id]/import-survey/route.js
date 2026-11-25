import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

// POST /api/quotes/[id]/import-survey
// Copies survey_entries from the quote's linked survey into quote_sections.
// Safe to call multiple times — skips if sections already exist.
export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, display_name').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quote } = await admin.from('quotes').select('id, owner_id, created_by, collective_id, shared_with, survey_id, is_read_only').eq('id', quoteId).is('deleted_at', null).single();
  if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });
  const isSuperAdmin = profile.role === 'superadmin';
  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const isShared = (quote.shared_with || []).includes(user.id);
  if (!isSuperAdmin && !isOwner && !isShared) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (!isSuperAdmin && quote.is_read_only)
    return Response.json({ error: 'Ez a dokumentum csak olvasható.', read_only: true }, { status: 403 });
  if (!quote.survey_id) return Response.json({ sections: [] });

  // Skip if sections already exist
  const { data: existing } = await admin.from('quote_sections').select('id').eq('quote_id', quoteId).limit(1);
  if (existing?.length > 0) {
    const { data: all } = await admin.from('quote_sections').select('*').eq('quote_id', quoteId).order('sort_order');
    return Response.json({ sections: all || [] });
  }

  // Fetch survey entries
  const { data: surveyEntries } = await admin
    .from('survey_entries')
    .select('*')
    .eq('survey_id', quote.survey_id)
    .order('sort_order')
    .order('created_at');

  if (!surveyEntries?.length) return Response.json({ sections: [] });

  // Copy into quote_sections
  const rows = surveyEntries.map(e => ({
    quote_id: quoteId,
    name: e.name,
    description: e.description || null,
    size_m2: e.size_m2 || null,
    sort_order: e.sort_order,
    survey_entry_id: e.id,
  }));

  const { data: sections, error } = await admin.from('quote_sections').insert(rows).select();
  if (error) {
    logAudit({ entityId: quote.collective_id || user.id, userId: user.id, userName: profile.display_name || user.email || '', action: 'Survey import failed', targetType: 'quote', targetId: quoteId, details: { error: error.message, survey_id: quote.survey_id } });
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Build a map: survey_entry_id → quote_section_id
  const sectionMap = {};
  for (const s of sections) if (s.survey_entry_id) sectionMap[s.survey_entry_id] = s.id;

  // Fetch survey items for all entries
  const entryIds = surveyEntries.map(e => e.id);
  const { data: surveyItems } = await admin
    .from('survey_entry_items')
    .select('*')
    .in('entry_id', entryIds)
    .order('sort_order')
    .order('created_at');

  let entriesCreated = 0;
  if (surveyItems?.length) {
    const entryRows = surveyItems
      .filter(item => sectionMap[item.entry_id])
      .map(item => ({
        quote_id:         quoteId,
        section_id:       sectionMap[item.entry_id],
        survey_entry_id:  item.entry_id,
        work_description: item.description,
        entry_type:       item.entry_type || 'material',
        quantity:         item.quantity   || null,
        unit:             item.unit       || null,
        unit_price:       null,
        amount_huf:       0,
        user_id:          user.id,
        created_by_name:  profile.display_name || '',
      }));

    if (entryRows.length) {
      const sourceItems = surveyItems.filter(item => sectionMap[item.entry_id]);
      const { data: createdEntries, error: entriesErr } = await admin
        .from('quote_entries')
        .insert(entryRows)
        .select('id');

      if (!entriesErr && createdEntries?.length) {
        entriesCreated = createdEntries.length;
        // Back-link each survey item to its new quote entry (positional match)
        await Promise.all(
          createdEntries.map((qe, i) =>
            sourceItems[i]
              ? admin.from('survey_entry_items').update({ quote_entry_id: qe.id }).eq('id', sourceItems[i].id)
              : Promise.resolve()
          )
        );
      }
    }
  }

  logAudit({ entityId: quote.collective_id || user.id, userId: user.id, userName: profile.display_name || user.email || '', action: 'Survey imported to quote', targetType: 'quote', targetId: quoteId, targetName: quote.id, details: { survey_id: quote.survey_id, sections_created: sections?.length || 0, entries_created: entriesCreated } });

  // Copy survey media and drawings into the quote (fire-and-forget — non-fatal)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await Promise.allSettled([
    fetch(`${baseUrl}/api/quotes/${quoteId}/copy-survey-media`,    { method: 'POST', headers: { cookie: request.headers.get('cookie') || '' } }),
    fetch(`${baseUrl}/api/quotes/${quoteId}/copy-survey-drawings`, { method: 'POST', headers: { cookie: request.headers.get('cookie') || '' } }),
  ]);

  // Flip survey to done on first import (only if still active)
  const { data: survey } = await admin.from('surveys').select('status').eq('id', quote.survey_id).is('deleted_at', null).single();
  if (survey?.status === 'active') {
    await admin.from('surveys')
      .update({ status: 'done', done_at: new Date().toISOString() })
      .eq('id', quote.survey_id);
  }

  return Response.json({ sections: sections || [] }, { status: 201 });
}
