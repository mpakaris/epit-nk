import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Fire-and-forget audit log for one AI call.
 * Captures the full chain: user input → AI → reply to user.
 */
export function logAiCall({
  phoneNumber,
  waMessageId     = null,
  provider,                   // 'openai' | 'elevenlabs'
  callType,                   // 'agent' | 'transcribe' | 'classify_image'
  model           = null,
  mediaType       = null,     // input media: 'text' | 'image/jpeg' | 'audio/ogg' | 'video/mp4' | 'application/pdf'
  userInput       = null,     // raw text or transcript the user sent
  aiInput         = null,     // sanitised JSONB: {messageCount, toolCount, ...}
  toolCalls       = null,     // [{name, argsSummary, resultSummary, success}]
  aiOutput        = null,     // final text from AI
  userReply       = null,     // text sent back to user
  tokensIn        = null,
  tokensOut       = null,
  durationMs      = null,
  costUsdMicro    = null,
}) {
  const admin = createAdminClient();
  admin.from('wa_ai_calls').insert({
    phone_number:   phoneNumber || 'web',
    wa_message_id:  waMessageId  || null,
    provider,
    call_type:      callType,
    model,
    media_type:     mediaType    || null,
    user_input:     userInput    ? String(userInput).slice(0, 4000) : null,
    ai_input:       aiInput      || null,
    tool_calls:     toolCalls    || null,
    ai_output:      aiOutput     ? String(aiOutput).slice(0, 4000)  : null,
    user_reply:     userReply    ? String(userReply).slice(0, 2000) : null,
    tokens_in:      tokensIn     || null,
    tokens_out:     tokensOut    || null,
    duration_ms:    durationMs   || null,
    cost_usd_micro: costUsdMicro || null,
  }).then(({ error }) => {
    if (error) console.error('[logAiCall] insert error:', error.message);
  });
}
