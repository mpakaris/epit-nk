import { createAdminClient } from '@/lib/supabase/admin';

// Fetch rates for a call type. Returns { metric → cost_usd } map + resolved model name.
async function fetchRatesAndModel(admin, provider, callType) {
  const isVision = callType === 'classify_image' || callType === 'invoice_ocr';
  const metricSuffix = isVision ? '_vision' : '';

  const { data } = await admin
    .from('wa_ai_rates')
    .select('metric, cost_usd, model')
    .eq('provider', provider)
    .in('metric', [`input_tokens${metricSuffix}`, `output_tokens${metricSuffix}`]);

  const rates = Object.fromEntries((data || []).map(r => [r.metric, Number(r.cost_usd)]));
  // Get model from the first row (all rows for same task should share the same model)
  const model = data?.[0]?.model || (isVision ? 'gpt-4o' : 'gpt-4o-mini');

  return { rates, model };
}

export async function logOpenAiUsage({ phoneNumber, userId, model, callType, usage }) {
  if (!usage) return;

  const admin = createAdminClient();
  const { rates, model: resolvedModel } = await fetchRatesAndModel(admin, 'openai', callType);

  const isVision = callType === 'classify_image' || callType === 'invoice_ocr';
  const inKey  = isVision ? 'input_tokens_vision'  : 'input_tokens';
  const outKey = isVision ? 'output_tokens_vision' : 'output_tokens';

  const inRate  = rates[inKey]  ?? (isVision ? 0.0000025 : 0.00000015);
  const outRate = rates[outKey] ?? (isVision ? 0.00001   : 0.0000006);

  const costUsd   = usage.prompt_tokens * inRate + usage.completion_tokens * outRate;
  const costMicro = Math.round(costUsd * 1_000_000);

  await admin.from('wa_ai_usage').insert({
    phone_number:   phoneNumber,
    user_id:        userId || null,
    provider:       'openai',
    model:          resolvedModel,
    call_type:      callType,
    tokens_in:      usage.prompt_tokens,
    tokens_out:     usage.completion_tokens,
    tokens_total:   usage.total_tokens,
    cost_usd_micro: costMicro,
    rate_snapshot: {
      [inKey]:   inRate,
      [outKey]:  outRate,
      fetched_at: new Date().toISOString(),
    },
  });
}

// Export resolved model for a given call type — used by the AI callers
export async function resolveModel(callType) {
  const admin = createAdminClient();
  const { model } = await fetchRatesAndModel(admin, 'openai', callType);
  return model;
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
