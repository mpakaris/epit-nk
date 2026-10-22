-- Allow WhatsApp labour entries without a known hourly rate / value.
-- The web app always provides these; WhatsApp entries may omit them.
ALTER TABLE public.labour_entries
  ALTER COLUMN hourly_rate DROP NOT NULL,
  ALTER COLUMN value_huf   DROP NOT NULL;

-- Drop overly strict CHECK constraints that prevent 0 / null
ALTER TABLE public.labour_entries
  DROP CONSTRAINT IF EXISTS labour_entries_hourly_rate_check,
  DROP CONSTRAINT IF EXISTS labour_entries_value_huf_check;

-- Allow identifying the uploader by name (used when uploaded_by is a wa_account.id, not a profile UUID)
ALTER TABLE public.labour_entries
  ADD COLUMN IF NOT EXISTS uploader_name TEXT DEFAULT NULL;
