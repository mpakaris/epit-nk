-- Conversation state per phone number; expires after 4h of inactivity
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number            TEXT        NOT NULL UNIQUE,
  active_project_id       UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  active_survey_id        UUID        REFERENCES public.surveys(id) ON DELETE SET NULL,
  pending_clarification   JSONB,
  context_window          JSONB       NOT NULL DEFAULT '[]',
  last_message_at         TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone    ON public.wa_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_expires  ON public.wa_conversations(expires_at);
