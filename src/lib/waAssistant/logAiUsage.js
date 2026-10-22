import { createAdminClient } from '@/lib/supabase/admin';

// Fetch all rates for a provider+model. Returns { metric → cost_usd } map.
async function fetchRates(admin, provider, model) {
  const { data } = await admin
    .from('wa_ai_rates')
    .select('metric, cost_usd')
    .eq('provider', provider)
    .eq('model', model);

  return Object.fromEntries((data || []).map(r => [r.metric, Number(r.cost_usd)]));
}

export async function logOpenAiUsage({ phoneNumber, userId, model, callType, usage }) {
  if (!usage) return;

  const admin = createAdminClient();
  const rates = await fetchRates(admin, 'openai', model);

  // Fallback rates if DB lookup fails (migration not yet applied)
  const inRate  = rates['input_tokens']  ?? 0.0000025;
  const outRate = rates['output_tokens'] ?? 0.000010;

  const costUsd   = usage.prompt_tokens * inRate + usage.completion_tokens * outRate;
  const costMicro = Math.round(costUsd * 1_000_000);

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
    rate_snapshot: {
      input_tokens:  inRate,
      output_tokens: outRate,
      fetched_at:    new Date().toISOString(),
    },
  });
}

export async function logElevenLabsUsage({ phoneNumber, userId, audioSeconds }) {
  const admin = createAdminClient();
  const rates = await fetchRates(admin, 'elevenlabs', 'scribe_v2');

  const secRate = rates['audio_seconds'] ?? 0.0000611111;
  const costMicro = Math.round(audioSeconds * secRate * 1_000_000);

  await admin.from('wa_ai_usage').insert({
    phone_number:   phoneNumber,
    user_id:        userId || null,
    provider:       'elevenlabs',
    model:          'scribe_v2',
    call_type:      'transcribe',
    audio_seconds:  audioSeconds,
    cost_usd_micro: costMicro,
    rate_snapshot: {
      audio_seconds: secRate,
      fetched_at:    new Date().toISOString(),
    },
  });
}
