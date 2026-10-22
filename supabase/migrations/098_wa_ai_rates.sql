-- Superadmin-editable AI cost rates.
-- One row per (provider, model, metric). Updated in-place; wa_ai_usage.rate_snapshot
-- captures the values that were in effect at call time, so history is preserved.
CREATE TABLE IF NOT EXISTS public.wa_ai_rates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT        NOT NULL,              -- 'openai' | 'elevenlabs'
  model         TEXT        NOT NULL,              -- 'gpt-4o' | 'scribe_v2' | ...
  metric        TEXT        NOT NULL,              -- 'input_tokens' | 'output_tokens' | 'audio_seconds'
  cost_usd      NUMERIC(20, 12) NOT NULL,          -- USD per single unit (1 token, 1 second)
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (provider, model, metric)
);

-- Seed current rates (Oct 2026)
INSERT INTO public.wa_ai_rates (provider, model, metric, cost_usd, notes) VALUES
  -- GPT-4o: $2.50 per 1M input tokens  = $0.0000025 per token
  ('openai',     'gpt-4o',    'input_tokens',   0.0000025000,  '$2.50 / 1M input tokens'),
  -- GPT-4o: $10.00 per 1M output tokens = $0.00001 per token
  ('openai',     'gpt-4o',    'output_tokens',  0.0000100000,  '$10.00 / 1M output tokens'),
  -- ElevenLabs Scribe v2: $0.22 / hour = $0.000061111... per second
  ('elevenlabs', 'scribe_v2', 'audio_seconds',  0.0000611111,  '$0.22 / hour')
ON CONFLICT (provider, model, metric) DO NOTHING;

-- Add rate_snapshot to wa_ai_usage so each row is fully self-contained
ALTER TABLE public.wa_ai_usage
  ADD COLUMN IF NOT EXISTS rate_snapshot JSONB DEFAULT NULL;
