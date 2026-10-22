import { createAdminClient } from '@/lib/supabase/admin';
import { saveConversation } from './conversation';

// Returns the projects a user can access given their wa_account context
async function fetchAccessibleProjects(waAccount, admin) {
  if (waAccount.accountType === 'subbie') {
    const { data } = await admin
      .from('subbie_project_assignments')
      .select('project:projects(id, name, closed_at)')
      .eq('wa_account_id', waAccount.waAccount.id)
      .eq('is_active', true);
    return (data || []).map(r => r.project).filter(Boolean);
  }

  const conditions = [];
  if (waAccount.collectiveId) conditions.push(`collective_id.eq.${waAccount.collectiveId}`);
  if (waAccount.userId) conditions.push(`and(owner_id.eq.${waAccount.userId},collective_id.is.null)`);

  if (conditions.length === 0) return [];

  const { data } = await admin
    .from('projects')
    .select('id, name, closed_at')
    .or(conditions.join(','))
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function resolveProject(messageText, waAccount, conversation) {
  const admin = createAdminClient();

  // Step 1 — explicit mention in message text
  const hints = [
    /a\s+(.+?)\s+projekt/i,
    /(.+?)\s+projekthez/i,
    /(.+?)\s+projektre/i,
    /(.+?)\s+-hoz\b/i,
    /(.+?)\s+-hez\b/i,
  ];

  for (const pattern of hints) {
    const match = messageText && messageText.match(pattern);
    if (!match) continue;

    const hint = match[1].trim();
    const all = await fetchAccessibleProjects(waAccount, admin);
    const matches = all.filter(p => p.name.toLowerCase().includes(hint.toLowerCase()));

    if (matches.length === 1) {
      await saveConversation(conversation.phone_number || waAccount.waAccount.phone_number, {
        active_project_id: matches[0].id,
      });
      return { projectId: matches[0].id, projectName: matches[0].name, source: 'explicit_text', needsClarification: false };
    }
    if (matches.length > 1) {
      return { needsClarification: true, clarificationOptions: matches.map(p => ({ id: p.id, name: p.name })) };
    }
    // 0 matches — fall through
  }

  // Step 2 — existing conversation context
  if (conversation.active_project_id) {
    const { data } = await admin
      .from('projects')
      .select('id, name')
      .eq('id', conversation.active_project_id)
      .maybeSingle();
    if (data) {
      return { projectId: data.id, projectName: data.name, source: 'conversation', needsClarification: false };
    }
  }

  // Step 3 — single project shortcut
  const all = await fetchAccessibleProjects(waAccount, admin);
  const open = all.filter(p => !p.closed_at);

  if (open.length === 1) {
    await saveConversation(conversation.phone_number || waAccount.waAccount.phone_number, {
      active_project_id: open[0].id,
    });
    return { projectId: open[0].id, projectName: open[0].name, source: 'auto_single', needsClarification: false };
  }

  // Step 4 — ambiguous, ask user to choose
  const options = all.slice(0, 10).map(p => ({ id: p.id, name: p.name }));
  return { needsClarification: true, clarificationOptions: options };
}
