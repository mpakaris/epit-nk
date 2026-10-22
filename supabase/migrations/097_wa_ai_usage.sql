-- Tracks every AI API call made by the WhatsApp bot per user
CREATE TABLE IF NOT EXISTS public.wa_ai_usage (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    TEXT        NOT NULL,
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider        TEXT        NOT NULL CHECK (provider IN ('openai', 'elevenlabs')),
  model           TEXT        NOT NULL,
  call_type       TEXT        NOT NULL,  -- 'intent', 'classify_image', 'invoice_ocr', 'transcribe'
  tokens_in       INTEGER,               -- OpenAI prompt tokens
  tokens_out      INTEGER,               -- OpenAI completion tokens
  tokens_total    INTEGER,               -- OpenAI total tokens
  audio_seconds   NUMERIC(10,3),         -- ElevenLabs: audio duration billed
  cost_usd_micro  INTEGER,               -- cost in millionths of a USD (e.g. 1500 = $0.0015)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_ai_usage_phone   ON public.wa_ai_usage(phone_number);
CREATE INDEX idx_wa_ai_usage_user    ON public.wa_ai_usage(user_id);
CREATE INDEX idx_wa_ai_usage_created ON public.wa_ai_usage(created_at DESC);
