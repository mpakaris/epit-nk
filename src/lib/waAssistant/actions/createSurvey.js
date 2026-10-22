import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { saveConversation } from '../conversation';
import { saveClarification } from '../clarification';
import { resolveProject } from '../resolveProject';

export async function createSurvey({ waAccount, conversation, extracted, phoneNumber }) {
  const admin = createAdminClient();

  // Resolve which project this survey belongs to
  const projectResult = await resolveProject(
    extracted?.project_hint || '',
    waAccount,
    conversation
  );

  if (projectResult.needsClarification) {
    return {
      reply: null,
      needsClarification: true,
      clarificationType: 'project_choice',
      clarificationOptions: projectResult.clarificationOptions,
      originalIntent: 'create_survey',
      originalPayload: extracted,
    };
  }

  const { projectId, projectName } = projectResult;

  // If no survey title extracted, ask for one
  if (!extracted?.surveyTitle) {
    await saveClarification(phoneNumber, 'survey_title_needed', [], 'create_survey', { projectId });
    return {
      reply: `Milyen nevű legyen a felmérés? (pl. "Fürdőszoba felmérés")`,
      needsClarification: false,
    };
  }

  const title = extracted.surveyTitle.trim();

  const { data: survey, error } = await admin.from('surveys').insert({
    owner_id:      waAccount.userId || null,
    collective_id: waAccount.collectiveId || null,
    title,
    created_by:    waAccount.userId || null,
  }).select('id').single();

  if (error) {
    console.error('[wa createSurvey] insert error:', error.message);
    return { reply: 'Sajnos nem sikerült létrehozni a felmérést. Kérlek próbáld újra.', needsClarification: false };
  }

  await saveConversation(phoneNumber, {
    active_survey_id:  survey.id,
    active_project_id: projectId,
  });

  await logAudit({
    userId:     waAccount.userId,
    userName:   waAccount.displayName,
    action:     'Felmérés létrehozva (WhatsApp)',
    targetType: 'survey',
    targetId:   survey.id,
    targetName: title,
    details:    { channel: 'whatsapp', project_id: projectId },
  });

  return {
    reply: `✓ Felmérés létrehozva: *${title}* — ${projectName} projekt.\n\nMondj helyiségeket és méreteket, én rögzítem. Pl: _Konyha, 3,5 × 4,2 m_`,
    needsClarification: false,
  };
}
