/**
 * Centralised message / thread service.
 *
 * All thread creation and message insertion goes through this module so
 * that the logic is never duplicated across API routes.
 */

/**
 * Find or create a direct (user-to-user) thread.
 * Checks both owner→recipient and recipient→owner directions.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId1  The initiating user (becomes owner_id on creation)
 * @param {string} userId2  The other user (becomes recipient_user_id on creation)
 * @returns {Promise<string>} Thread UUID
 */
export async function findOrCreateDirectThread(admin, userId1, userId2) {
  const { data: existing } = await admin.from('threads')
    .select('id')
    .eq('type', 'direct')
    .or(
      `and(owner_id.eq.${userId1},recipient_user_id.eq.${userId2}),` +
      `and(owner_id.eq.${userId2},recipient_user_id.eq.${userId1})`
    )
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await admin.from('threads')
    .insert({ type: 'direct', owner_id: userId1, recipient_user_id: userId2 })
    .select('id').single();
  if (error) throw new Error(error.message);
  return created.id;
}

/**
 * Find or create a client thread, optionally scoped to a quote.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ ownerId: string, clientId: string, quoteId?: string }} opts
 * @returns {Promise<string>} Thread UUID
 */
export async function findOrCreateClientThread(admin, { ownerId, clientId, quoteId }) {
  let query = admin.from('threads')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('client_id', clientId);
  if (quoteId) query = query.eq('quote_id', quoteId);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const payload = { type: 'client', owner_id: ownerId, client_id: clientId };
  if (quoteId) payload.quote_id = quoteId;

  const { data: created, error } = await admin.from('threads')
    .insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return created.id;
}

/**
 * Insert a message into an existing thread.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ threadId: string, senderUserId?: string, senderClientId?: string, senderType: 'user'|'client', body: string }} opts
 * @returns {Promise<{ id: string, body: string, created_at: string, sender_type: string }>}
 */
export async function insertMessage(admin, { threadId, senderUserId, senderClientId, senderType, body }) {
  const { data: msg, error } = await admin.from('messages').insert({
    thread_id:        threadId,
    sender_type:      senderType,
    sender_user_id:   senderUserId   ?? null,
    sender_client_id: senderClientId ?? null,
    body:             body.trim(),
  }).select('id, body, created_at, sender_type').single();

  if (error) throw new Error(error.message);
  return msg;
}

/**
 * Truncate a message body to 80 chars for use in notification previews.
 */
export function truncateForNotif(text, maxLen = 80) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
}
