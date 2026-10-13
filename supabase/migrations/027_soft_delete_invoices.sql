-- Soft-delete support for invoices
-- Deleted invoices keep their row for audit purposes.
-- deleted_by_name mirrors the uploader_name pattern (denormalised text).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_name  TEXT        DEFAULT NULL;
