ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS workspace_chosen BOOLEAN NOT NULL DEFAULT false;
