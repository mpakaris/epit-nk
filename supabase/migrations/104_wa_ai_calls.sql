-- Audit trail for every AI call made by the WhatsApp assistant.
-- One row per user turn — captures the full chain:
--   user input → what we sent to AI → what AI returned → what user received.

CREATE TABLE IF NOT EXISTS wa_ai_calls (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL    DEFAULT now(),

  -- Source
  phone_number    TEXT        NOT NULL,
  wa_message_id   UUID        REFERENCES wa_messages(id) ON DELETE SET NULL,

  -- AI provider details
  provider        TEXT        NOT NULL,   -- 'openai' | 'elevenlabs'
  call_type       TEXT        NOT NULL,   -- 'agent' | 'transcribe' | 'classify_image'
  model           TEXT,
  media_type      TEXT,                   -- input media: 'text' | 'image/jpeg' | 'image/webp' | 'audio/ogg' | 'video/mp4' | 'application/pdf'

  -- The four audit elements
  user_input      TEXT,                   -- what the user sent (text / transcript)
  ai_input        JSONB,                  -- sanitised context sent to AI (no full system prompt)
  tool_calls      JSONB,                  -- [{name, args_summary, result_summary, success}]
  ai_output       TEXT,                   -- final reply from AI
  user_reply      TEXT,                   -- text actually delivered back to user

  -- Performance & cost
  tokens_in       INT,
  tokens_out      INT,
  duration_ms     INT,
  cost_usd_micro  INT
);

CREATE INDEX IF NOT EXISTS wa_ai_calls_phone_idx   ON wa_ai_calls (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS wa_ai_calls_message_idx ON wa_ai_calls (wa_message_id);
