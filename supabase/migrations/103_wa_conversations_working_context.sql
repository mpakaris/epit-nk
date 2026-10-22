-- Add working context columns to wa_conversations
-- Tracks which document/area the user is currently working on
-- so captionless media can be attached without an LLM call.

ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS current_document_id      UUID,
  ADD COLUMN IF NOT EXISTS current_document_type    TEXT,
  ADD COLUMN IF NOT EXISTS current_document_name    TEXT,
  ADD COLUMN IF NOT EXISTS current_area             TEXT,
  ADD COLUMN IF NOT EXISTS current_area_id          UUID,
  ADD COLUMN IF NOT EXISTS current_context_set_at   TIMESTAMPTZ;
