import { createAdminClient } from '@/lib/supabase/admin';
import { saveClarification } from './clarification';

// Returns { collectiveId, workspaceName, needsClarification, clarificationOptions }
// collectiveId = null means personal workspace.
export async function resolveWorkspace(waAccount, conversation, phoneNumber, messageText = '') {
  // Workspace already chosen for this session (real DB column)
  if (conversation.workspace_chosen) {
    return { collectiveId: conversation.active_collective_id, needsClarification: false };
  }

  // If wa_account is tied to a specific collective, use that — no choice needed
  if (waAccount.collectiveId) {
    return { collectiveId: waAccount.collectiveId, needsClarification: false };
  }

  // Personal account — check if user belongs to any collectives
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, collective:collectives(id, name)')
    .eq('user_id', waAccount.userId)
    .eq('status', 'active');

  const collectives = (memberships || []).map(m => m.collective).filter(Boolean);

  if (!collectives.length) {
    // Personal only — no choice needed, mark as chosen
    await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: null });
    return { collectiveId: null, needsClarification: false };
  }

  // Try to resolve workspace from message text before asking
  const msg = (messageText || '').toLowerCase();
  if (msg.includes('personal') || msg.includes('személyes') || msg.includes('saját')) {
    await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: null });
    return { collectiveId: null, needsClarification: false };
  }
  for (const c of collectives) {
    if (c.name && msg.includes(c.name.toLowerCase())) {
      await saveConversation(phoneNumber, { workspace_chosen: true, active_collective_id: c.id });
      return { collectiveId: c.id, needsClarification: false };
    }
  }

  // Still ambiguous — ask
  const options = [
    { id: '__personal__', name: 'Személyes munkaterület' },
    ...collectives.map(c => ({ id: c.id, name: c.name })),
  ];

  await saveClarification(phoneNumber, 'workspace_choice', options, null, { originalContent: messageText });

  return { needsClarification: true, clarificationOptions: options };
}
