-- 1. Soft-delete for clients
--    Hard-delete meant project/quote/survey client_id went NULL and the
--    client name was lost permanently. Soft-delete preserves the row so
--    historical references keep working.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
  ON public.clients(deleted_at)
  WHERE deleted_at IS NULL;

-- 2. Store author name on diary entries at write time
--    diary_entries.created_by uses ON DELETE SET NULL, so once a user
--    profile is deleted the name is unrecoverable. Storing it explicitly
--    (same pattern as invoices.uploader_name) preserves display.
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS author_name TEXT;
