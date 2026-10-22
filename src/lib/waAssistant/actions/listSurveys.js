import { createAdminClient } from '@/lib/supabase/admin';
import { saveClarification } from '../clarification';
import { formatDate } from '@/lib/constants';

export async function listSurveys({ waAccount, conversation, phoneNumber }) {
  if (!conversation.active_project_id) {
    return { reply: 'Előbb válassz projektet. Írd: "mutasd a projektjeimet"' };
  }

  const admin = createAdminClient();

  const { data: surveys } = await admin
    .from('surveys')
    .select('id, title, created_at')
    .eq('owner_id', waAccount.userId || '')
    .or(waAccount.collectiveId ? `collective_id.eq.${waAccount.collectiveId}` : 'collective_id.is.null')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!surveys?.length) {
    return { reply: 'Még nincs felmérés ehhez a projekthez.\n\nÍrd: "új felmérés" hogy egyet létrehozz.' };
  }

  const lines = surveys.map((s, i) => {
    const d = s.created_at ? new Date(s.created_at).toLocaleDateString('hu-HU') : '';
    return `${i + 1}. ${s.title}${d ? ` (${d})` : ''}`;
  });

  const reply = `Felmérések:\n\n${lines.join('\n')}\n\nMelyiket folytassuk? Válaszolj egy számmal.`;

  await saveClarification(
    phoneNumber,
    'survey_choice',
    surveys.map(s => ({ id: s.id, name: s.title })),
    'set_active_survey',
    {}
  );

  return { reply };
}
