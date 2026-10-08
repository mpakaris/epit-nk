import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/quotes/[id]/import-survey
// Copies survey_entries from the quote's linked survey into quote_sections.
// Safe to call multiple times — skips if sections already exist.
export async function POST(request, { params }) {
  const { id: quoteId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: quote } = await admin.from('quotes').select('id, entity_id, survey_id').eq('id', quoteId).single();
  if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404 });
  if (profile.role !== 'superadmin' && quote.entity_id !== profile.entity_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
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
    entity_id: quote.entity_id,
    name: e.name,
    description: e.description || null,
    size_m2: e.size_m2 || null,
    sort_order: e.sort_order,
    survey_entry_id: e.id,
  }));

  const { data: sections, error } = await admin.from('quote_sections').insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ sections: sections || [] }, { status: 201 });
}
