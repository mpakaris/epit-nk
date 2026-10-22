import { createAdminClient } from '@/lib/supabase/admin';

const BLANK_STATE = (phoneNumber) => ({
  phone_number:             phoneNumber,
  active_project_id:        null,
  active_survey_id:         null,
  active_collective_id:     null,
  workspace_chosen:         false,
  session_mode:             null,
  pending_clarification:    null,
  last_action:              null,
  context_window:           [],
  expires_at:               null,
  // Current working context — persists across messages
  current_document_id:      null,
  current_document_type:    null,
  current_document_name:    null,
  current_area:             null,
  current_area_id:          null,
  current_context_set_at:   null,
});

export async function loadConversation(phoneNumber) {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from('wa_conversations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (!row) return BLANK_STATE(phoneNumber);

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await expireConversation(phoneNumber);
    return BLANK_STATE(phoneNumber);
  }

  return row;
}

export async function saveConversation(phoneNumber, updates) {
  const admin = createAdminClient();

  const now = new Date();
  await admin.from('wa_conversations').upsert(
    {
      phone_number: phoneNumber,
      ...updates,
      last_message_at: now.toISOString(),
      expires_at:      new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      updated_at:      now.toISOString(),
    },
    { onConflict: 'phone_number' }
  );
}

export async function expireConversation(phoneNumber) {
  const admin = createAdminClient();

  await admin.from('wa_conversations').update({
    active_project_id:      null,
    active_survey_id:       null,
    active_collective_id:   null,
    workspace_chosen:       false,
    session_mode:           null,
    pending_clarification:  null,
    last_action:            null,
    context_window:         [],
    current_document_id:    null,
    current_document_type:  null,
    current_document_name:  null,
    current_area:           null,
    current_area_id:        null,
    current_context_set_at: null,
    updated_at:             new Date().toISOString(),
  }).eq('phone_number', phoneNumber);
}

// Call after every successful write action. Clears any previous revertable action.
export async function saveLastAction(phoneNumber, type, table, id) {
  await saveConversation(phoneNumber, {
    last_action: { type, table, id, timestamp: new Date().toISOString() },
  });
}

// Returns the last action if it is still within the 120-minute revert window.
export function getRevertableAction(conversation) {
  const a = conversation.last_action;
  if (!a) return null;
  const ageMinutes = (Date.now() - new Date(a.timestamp).getTime()) / 60000;
  if (ageMinutes > 120) return null;
  return a;
}

export async function appendToContextWindow(phoneNumber, role, content) {
  const conversation = await loadConversation(phoneNumber);
  const window = Array.isArray(conversation.context_window) ? conversation.context_window : [];

  const updated = [...window, { role, content }].slice(-12);

  await saveConversation(phoneNumber, { context_window: updated });
}
