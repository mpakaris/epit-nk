import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Resolve which collective_id should be used for membership checks on a survey
 * that may be personal (collective_id = NULL) but referenced by a collective quote.
 */
async function resolveEffectiveCollectiveId(admin, surveyId, surveyCollectiveId) {
  if (surveyCollectiveId) return surveyCollectiveId;
  const { data } = await admin
    .from('quotes')
    .select('collective_id')
    .eq('survey_id', surveyId)
    .not('collective_id', 'is', null)
    .maybeSingle();
  return data?.collective_id || null;
}

/**
 * Check whether a user may access a survey.
 *
 * Covers three scenarios:
 *   1. Direct ownership (owner_id / created_by) or shared_with
 *   2. Survey itself belongs to a collective the user is a member of
 *   3. Personal survey linked to a collective quote (post-transfer scenario)
 *
 * @param {object} admin   — Supabase admin client
 * @param {object} survey  — survey row (needs: id, owner_id, created_by, collective_id, shared_with)
 * @param {string} userId
 * @returns {{ allowed: boolean, isOwner: boolean, memberRole: string|null }}
 */
export async function checkSurveyAccess(admin, survey, userId, surveyId) {
  const isOwner  = survey.owner_id === userId || survey.created_by === userId;
  const isShared = (survey.shared_with || []).includes(userId);
  if (isOwner || isShared) return { allowed: true, isOwner, memberRole: null };

  // surveyId may be passed explicitly when the survey row was fetched without the id column
  const effectiveSurveyId = surveyId || survey.id;
  const collectiveId = await resolveEffectiveCollectiveId(admin, effectiveSurveyId, survey.collective_id);
  if (!collectiveId) return { allowed: false, isOwner: false, memberRole: null };

  const { data: mem } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!mem) return { allowed: false, isOwner: false, memberRole: null };
  return { allowed: true, isOwner: false, memberRole: mem.role };
}
