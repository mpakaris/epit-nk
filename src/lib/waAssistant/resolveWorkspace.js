import { createAdminClient } from '@/lib/supabase/admin';
import { saveClarification } from './clarification';

// Returns { collectiveId, workspaceName, needsClarification, clarificationOptions }
// collectiveId = null means personal workspace.
export async function resolveWorkspace(waAccount, conversation, phoneNumber) {
  // Workspace already chosen for this session
  if (conversation.active_collective_id !== undefined && 'active_collective_id' in conversation) {
    // null means personal — still a valid resolved choice if it was explicitly set
    if (conversation._workspace_chosen) {
      return { collectiveId: conversation.active_collective_id, needsClarification: false };
    }
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
    // Personal only — no question needed
    return { collectiveId: null, workspaceName: 'Személyes', needsClarification: false };
  }

  // Multiple workspaces — ask once per session
  if (conversation._workspace_chosen) {
    return { collectiveId: conversation.active_collective_id, needsClarification: false };
  }

  const options = [
    { id: '__personal__', name: 'Személyes munkaterület' },
    ...collectives.map(c => ({ id: c.id, name: c.name })),
  ];

  await saveClarification(phoneNumber, 'workspace_choice', options, null, null);

  return {
    needsClarification: true,
    clarificationOptions: options,
  };
}
