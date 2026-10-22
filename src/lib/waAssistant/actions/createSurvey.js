import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { saveConversation, saveLastAction } from '../conversation';
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
  await saveLastAction(phoneNumber, 'survey', 'surveys', survey.id);

  await logAudit({
    userId:     waAccount.userId,
    userName:   waAccount.displayName,
    action:     'Felmérés létrehozva (WhatsApp)',
    targetType: 'survey',
    targetId:   survey.id,
    targetName: title,
    details:    { channel: 'whatsapp', project_id: projectId },
  });

  const mode = waAccount.permissions?.mode || 'free';

  if (mode === 'guided') {
    await saveClarification(phoneNumber, 'guided_next_step', [
      { id: 'rooms',  name: 'Helyiségek és méretek' },
      { id: 'media',  name: 'Fotó / alaprajz feltöltése' },
      { id: 'client', name: 'Ügyfél hozzárendelése' },
      { id: 'done',   name: 'Kész így' },
    ], null, null);

    return {
      reply: `✓ Felmérés létrehozva: *${title}* — ${projectName}\n\nMit adunk hozzá most?\n\n1. Helyiségek és méretek\n2. Fotó / alaprajz\n3. Ügyfél hozzárendelése\n4. Kész\n\n_Visszavonáshoz: vissza_`,
      needsClarification: false,
    };
  }

  // Free mode — one soft line listing what's still missing
  return {
    reply: `✓ Felmérés létrehozva: *${title}* — ${projectName}\n_Hiányzik még: helyiségek, ügyfél, fotók — add hozzá most vagy hagyd későbbre._\n\n_Visszavonáshoz: vissza_`,
    needsClarification: false,
  };
}
