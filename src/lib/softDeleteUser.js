import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Soft-deletes a user:
 * - Deletes their personal workspace (projects, quotes, surveys, clients)
 * - Removes them from all collectives
 * - Anonymizes their profile (UUID kept for FK integrity)
 * - Bans them in Supabase Auth (can't log in, UUID preserved)
 *
 * Collective contributions (diary entries, invoices, etc.) are kept intact,
 * attributed to "Törölt felhasználó".
 */
export async function softDeleteUser(userId) {
  const admin = createAdminClient();

  // ── 1. Delete personal workspace data ────────────────────────────────────────

  const { data: personalProjects } = await admin
    .from('projects').select('id').eq('owner_id', userId).is('collective_id', null);
  const projectIds = (personalProjects || []).map(p => p.id);

  if (projectIds.length) {
    await admin.from('invoice_section_splits').delete().in('project_id', projectIds);
    await admin.from('payment_plan_items').delete().in('project_id', projectIds);
    await admin.from('diary_entries').delete().in('project_id', projectIds);
    await admin.from('project_rooms').delete().in('project_id', projectIds);
    await admin.from('project_members').delete().in('project_id', projectIds);
    await admin.from('labour_entries').delete().in('project_id', projectIds);
    await admin.from('invoices').delete().in('project_id', projectIds);
    await admin.from('projects').delete().in('id', projectIds);
  }

  const { data: personalQuotes } = await admin
    .from('quotes').select('id').eq('owner_id', userId).is('collective_id', null);
  const quoteIds = (personalQuotes || []).map(q => q.id);

  if (quoteIds.length) {
    await admin.from('quote_entries').delete().in('quote_id', quoteIds);
    await admin.from('quote_sections').delete().in('quote_id', quoteIds);
    await admin.from('quotes').delete().in('id', quoteIds);
  }

  const { data: personalSurveys } = await admin
    .from('surveys').select('id').eq('owner_id', userId).is('collective_id', null);
  const surveyIds = (personalSurveys || []).map(s => s.id);

  if (surveyIds.length) {
    await admin.from('survey_entries').delete().in('survey_id', surveyIds);
    await admin.from('survey_media').delete().in('survey_id', surveyIds);
    await admin.from('survey_drawings').delete().in('survey_id', surveyIds);
    await admin.from('surveys').delete().in('id', surveyIds);
  }

  await admin.from('clients').delete().eq('owner_id', userId);

  // ── 2. Remove from all collectives ───────────────────────────────────────────
  await admin.from('collective_members').delete().eq('user_id', userId);

  // ── 3. Anonymize profile ─────────────────────────────────────────────────────
  await admin.from('profiles').update({
    display_name:          'Törölt felhasználó',
    email:                 null,
    first_name:            null,
    last_name:             null,
    company_name:          null,
    tax_number:            null,
    street:                null,
    street_number:         null,
    zip:                   null,
    city:                  null,
    terms_pdf_url:         null,
    terms_pdf_name:        null,
    terms_pdf_uploaded_at: null,
    active_collective_id:  null,
    scheduled_deletion_at: null,
    deleted_at:            new Date().toISOString(),
  }).eq('id', userId);

  // ── 4. Ban auth user (preserves UUID, blocks login) ──────────────────────────
  await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
}
