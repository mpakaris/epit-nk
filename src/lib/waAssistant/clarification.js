import { loadConversation, saveConversation } from './conversation';

export function formatClarificationMessage(question, options) {
  const list = options.map((o, i) => `${i + 1}. ${o.name}`).join('\n');
  return `${question}\n\n${list}\n\nVálaszolj egy számmal, vagy írd: mégse`;
}

export async function saveClarification(phoneNumber, type, options, originalIntent, originalPayload) {
  await saveConversation(phoneNumber, {
    pending_clarification: {
      type,
      options,
      original_intent:  originalIntent,
      original_payload: originalPayload,
      asked_at:         new Date().toISOString(),
      attempts:         0,
    },
  });
}

export async function resolveClarification(phoneNumber, replyText, conversation) {
  const pending = conversation.pending_clarification;

  if (!pending) return { resolved: false, invalid: true };

  // Expire after 10 minutes
  if (pending.asked_at && new Date() - new Date(pending.asked_at) > 10 * 60 * 1000) {
    await saveConversation(phoneNumber, { pending_clarification: null });
    return { resolved: false, invalid: true };
  }

  const normalised = (replyText || '').trim().toLowerCase();

  if (['mégse', 'megse', 'nem', 'cancel'].includes(normalised)) {
    await saveConversation(phoneNumber, { pending_clarification: null });
    return { resolved: false, cancel: true };
  }

  const options = pending.options || [];

  // Free-text clarification (no numbered options) — resolve immediately with raw content
  if (options.length === 0) {
    await saveConversation(phoneNumber, { pending_clarification: null });
    return { resolved: true, chosenOption: null, originalIntent: pending.original_intent, originalPayload: pending.original_payload };
  }

  const choice = parseInt(normalised, 10);

  // Numeric match
  if (!isNaN(choice) && choice >= 1 && choice <= options.length) {
    await saveConversation(phoneNumber, { pending_clarification: null });
    return { resolved: true, chosenOption: options[choice - 1], originalIntent: pending.original_intent, originalPayload: pending.original_payload };
  }

  // Text/fuzzy match — accent-insensitive, partial
  const slug = s => s.toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óòöő]/g, 'o').replace(/[úùüű]/g, 'u')
    .replace(/[^a-z0-9 ]/g, '');

  const replySlug = slug(replyText || '');
  const matches = options.filter(o => {
    const optSlug = slug(o.name);
    return optSlug.includes(replySlug) || replySlug.includes(optSlug.split(' ')[0]);
  });

  if (matches.length === 1) {
    await saveConversation(phoneNumber, { pending_clarification: null });
    return { resolved: true, chosenOption: matches[0], originalIntent: pending.original_intent, originalPayload: pending.original_payload };
  }

  // No match — re-ask
  const attempts = (pending.attempts || 0) + 1;
  if (attempts >= 2) {
    await saveConversation(phoneNumber, { pending_clarification: null });
  } else {
    await saveConversation(phoneNumber, { pending_clarification: { ...pending, attempts } });
  }
  return { resolved: false, invalid: true };
}
