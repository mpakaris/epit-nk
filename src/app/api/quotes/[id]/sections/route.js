import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx(quoteId) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { err: 'Unauthenticated', status: 401 };
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role, entity_id').eq('id', user.id).single();
  if (!profile) return { err: 'Forbidden', status: 403 };
  const { data: quote } = await admin.from('quotes').select('id, entity_id, survey_id').eq('id', quoteId).single();
  if (!quote) return { err: 'Quote not found', status: 404 };
  if (profile.role !== 'superadmin' && quote.entity_id !== profile.entity_id) return { err: 'Forbidden', status: 403 };
  return { profile, admin, quote };
}

export async function POST(request, { params }) {
  const { id: quoteId } = await params;
  const ctx = await getCtx(quoteId);
  if (ctx.err) return Response.json({ error: ctx.err }, { status: ctx.status });

  const { name, description, size_m2, sort_order, survey_entry_id } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'Szekció neve kötelező' }, { status: 400 });

  // If the quote comes from a survey and no entry is linked yet, auto-create one
  let effectiveSurveyEntryId = survey_entry_id || null;
  if (!effectiveSurveyEntryId && ctx.quote.survey_id) {
    const { data: newEntry } = await ctx.admin.from('survey_entries').insert([{
      survey_id: ctx.quote.survey_id,
      entity_id: ctx.quote.entity_id,
      name: name.trim(),
      description: description?.trim() || null,
      size_m2: size_m2 != null && size_m2 !== '' ? Number(size_m2) : null,
      sort_order: sort_order ?? 0,
    }]).select().single();
    if (newEntry) effectiveSurveyEntryId = newEntry.id;
  }

  const { data: section, error } = await ctx.admin.from('quote_sections').insert([{
    quote_id: quoteId,
    entity_id: ctx.quote.entity_id,
    name: name.trim(),
    description: description?.trim() || null,
    size_m2: size_m2 != null && size_m2 !== '' ? Number(size_m2) : null,
    sort_order: sort_order ?? 0,
    survey_entry_id: effectiveSurveyEntryId,
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ section }, { status: 201 });
}
