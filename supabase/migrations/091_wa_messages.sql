-- Every inbound and outbound WhatsApp message logged here, with full processing context
DROP TABLE IF EXISTS public.wa_messages CASCADE;
CREATE TABLE public.wa_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id       TEXT        UNIQUE,           -- Whinself message ID (null for outbound)
  phone_number        TEXT        NOT NULL,
  direction           TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content_type        TEXT        NOT NULL CHECK (content_type IN ('text', 'voice', 'image', 'video', 'document')),
  content             TEXT,                         -- text body or caption

  -- Media
  media_url           TEXT,
  transcript          TEXT,                         -- Whisper transcript for voice notes
  r2_key              TEXT,                         -- R2 key of downloaded/stored media

  -- Processing result (inbound only)
  intent              TEXT,                         -- resolveIntent() result e.g. 'create_labour_entry'
  intent_confidence   NUMERIC(4,3),                 -- 0.000–1.000
  extracted_data      JSONB,                        -- structured fields extracted by GPT
  action_taken        TEXT,                         -- e.g. 'created_labour_entry', 'rate_limited', 'unregistered'
  action_result       JSONB,                        -- details of what was written (IDs, amounts, etc.)

  -- Errors
  error_code          TEXT,                         -- short error identifier e.g. 'WHISPER_FAILED'
  error_details       JSONB,                        -- full error context for debugging

  -- Timing
  processing_started_at   TIMESTAMPTZ,
  processing_finished_at  TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_messages_phone       ON public.wa_messages(phone_number);
CREATE INDEX idx_wa_messages_message_id  ON public.wa_messages(wa_message_id);
CREATE INDEX idx_wa_messages_created     ON public.wa_messages(created_at DESC);
CREATE INDEX idx_wa_messages_intent      ON public.wa_messages(intent) WHERE intent IS NOT NULL;
CREATE INDEX idx_wa_messages_error       ON public.wa_messages(error_code) WHERE error_code IS NOT NULL;
