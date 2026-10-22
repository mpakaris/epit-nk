import { createAdminClient } from '@/lib/supabase/admin';

const BLANK_STATE = (phoneNumber) => ({
  phone_number:          phoneNumber,
  active_project_id:     null,
  active_survey_id:      null,
  pending_clarification: null,
  context_window:        [],
  expires_at:            null,
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
    active_project_id:     null,
    active_survey_id:      null,
    pending_clarification: null,
    context_window:        [],
    updated_at:            new Date().toISOString(),
  }).eq('phone_number', phoneNumber);
}

export async function appendToContextWindow(phoneNumber, role, content) {
  const conversation = await loadConversation(phoneNumber);
  const window = Array.isArray(conversation.context_window) ? conversation.context_window : [];

  const updated = [...window, { role, content }].slice(-12);

  await saveConversation(phoneNumber, { context_window: updated });
}
