import { createAdminClient } from '@/lib/supabase/admin';
import { getRevertableAction, saveConversation } from '../conversation';

const TABLE_MAP = {
  survey:        'surveys',
  survey_entry:  'survey_entries',
  labour_entry:  'labour_entries',
  invoice:       'invoices',
  survey_media:  'survey_media',
  diary_photo:   'diary_photos',
};

export async function revertLastAction({ conversation, phoneNumber }) {
  const action = getRevertableAction(conversation);

  if (!action) {
    return {
      reply: 'Sajnos már nem tudom visszavonni — több mint 2 óra telt el, vagy nem volt visszavonható művelet. Kérlek az alkalmazásban szerkeszd.',
    };
  }

  const table = TABLE_MAP[action.type];
  if (!table || !action.id) {
    return { reply: 'Ezt a műveletet nem lehet automatikusan visszavonni. Kérlek az alkalmazásban szerkeszd.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq('id', action.id);

  if (error) {
    console.error('[wa revert] delete error:', error.message);
    return { reply: 'Sajnos nem sikerült visszavonni. Kérlek az alkalmazásban szerkeszd.' };
  }

  // Clear last_action and any context that pointed to the deleted record
  const contextClear = {};
  if (action.type === 'survey')       contextClear.active_survey_id = null;
  if (action.type === 'labour_entry') contextClear.active_project_id = conversation.active_project_id; // keep

  await saveConversation(phoneNumber, { last_action: null, ...contextClear });

  const labels = {
    survey:       'Felmérés',
    survey_entry: 'Helyiség bejegyzés',
    labour_entry: 'Munkabejegyzés',
    invoice:      'Számla',
    survey_media: 'Média',
    diary_photo:  'Fotó',
  };

  return { reply: `✓ Visszavonva: ${labels[action.type] || 'bejegyzés'} törölve.` };
}
