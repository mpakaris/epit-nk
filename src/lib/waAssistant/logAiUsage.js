import { createAdminClient } from '@/lib/supabase/admin';

// Cost per 1M tokens in micro-USD (1 micro-USD = $0.000001)
const OPENAI_COST = {
  'gpt-4o':       { in: 2_500_000, out: 10_000_000 },  // $2.50 in / $10.00 out per 1M
  'gpt-4o-mini':  { in:   150_000, out:    600_000 },
};

// ElevenLabs Scribe v2: $0.22 per hour = $0.000061111... per second
const ELEVENLABS_SCRIBE_COST_PER_SEC = 61; // micro-USD per second ($0.22/3600 ≈ $0.0000611)

export async function logOpenAiUsage({ phoneNumber, userId, model, callType, usage }) {
  if (!usage) return;
  const rates = OPENAI_COST[model] || OPENAI_COST['gpt-4o'];
  const costMicro = Math.round(
    (usage.prompt_tokens     / 1_000_000) * rates.in +
    (usage.completion_tokens / 1_000_000) * rates.out
  );

  const admin = createAdminClient();
  await admin.from('wa_ai_usage').insert({
    phone_number:   phoneNumber,
    user_id:        userId || null,
    provider:       'openai',
    model,
    call_type:      callType,
    tokens_in:      usage.prompt_tokens,
    tokens_out:     usage.completion_tokens,
    tokens_total:   usage.total_tokens,
    cost_usd_micro: costMicro,
  });
}

export async function logElevenLabsUsage({ phoneNumber, userId, audioSeconds }) {
  const costMicro = Math.round(audioSeconds * ELEVENLABS_SCRIBE_COST_PER_SEC);

  const admin = createAdminClient();
  await admin.from('wa_ai_usage').insert({
    phone_number:   phoneNumber,
    user_id:        userId || null,
    provider:       'elevenlabs',
    model:          'scribe_v2',
    call_type:      'transcribe',
    audio_seconds:  audioSeconds,
    cost_usd_micro: costMicro,
  });
}
