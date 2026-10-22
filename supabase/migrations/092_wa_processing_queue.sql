-- Inbound webhook payloads queued for async processing
CREATE TABLE IF NOT EXISTS public.wa_processing_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    TEXT        NOT NULL,
  payload         TEXT        NOT NULL,         -- raw webhook body JSON string
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  locked_until    TIMESTAMPTZ,                  -- processing lock expiry
  attempts        INTEGER     NOT NULL DEFAULT 0,
  last_error      TEXT,
  message_id      UUID        REFERENCES public.wa_messages(id) ON DELETE SET NULL,
  enqueued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

-- Partial index: only pending/processing items need fast lookup
CREATE INDEX IF NOT EXISTS idx_wa_queue_pending
  ON public.wa_processing_queue(status, enqueued_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_wa_queue_phone_time
  ON public.wa_processing_queue(phone_number, enqueued_at);
