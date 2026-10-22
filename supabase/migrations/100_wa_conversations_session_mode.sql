-- Per-document mode choice (guided / free) — set fresh on every new document creation
ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS session_mode TEXT DEFAULT NULL
    CHECK (session_mode IN ('guided', 'free', NULL));
