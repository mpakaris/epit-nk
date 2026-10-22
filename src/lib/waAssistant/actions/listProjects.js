import { createAdminClient } from '@/lib/supabase/admin';
import { saveClarification } from '../clarification';
import { saveConversation } from '../conversation';

export async function listProjects({ waAccount, conversation, phoneNumber }) {
  const admin = createAdminClient();

  let projects;

  if (waAccount.accountType === 'subbie') {
    const { data } = await admin
      .from('subbie_project_assignments')
      .select('project:projects(id, name, closed_at)')
      .eq('wa_account_id', waAccount.waAccount.id)
      .eq('is_active', true);
    projects = (data || []).map(r => r.project).filter(Boolean);
  } else {
    const conditions = [];
    if (waAccount.collectiveId) conditions.push(`collective_id.eq.${waAccount.collectiveId}`);
    if (waAccount.userId) conditions.push(`and(owner_id.eq.${waAccount.userId},collective_id.is.null)`);

    if (conditions.length === 0) return { reply: 'Még nincs projekted. Hozz létre egyet az alkalmazásban.' };

    const { data } = await admin
      .from('projects')
      .select('id, name, closed_at')
      .or(conditions.join(','))
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    projects = data || [];
  }

  if (!projects.length) {
    return { reply: 'Még nincs projekted. Hozz létre egyet az alkalmazásban.' };
  }

  const active = projects.filter(p => !p.closed_at);
  const closed = projects.filter(p => p.closed_at);
  const all    = [...active, ...closed];

  const lines = [
    ...active.map((p, i) => `${i + 1}. ${p.name}`),
    ...closed.map((p, i) => `${active.length + i + 1}. ${p.name} _(lezárt)_`),
  ];

  const reply = `Projektjeid:\n\n${lines.join('\n')}\n\nMelyikkel dolgozzunk? Írj számot.`;

  await saveClarification(
    phoneNumber,
    'project_choice',
    all.map(p => ({ id: p.id, name: p.name })),
    'set_active_project',
    {}
  );

  return { reply };
}
