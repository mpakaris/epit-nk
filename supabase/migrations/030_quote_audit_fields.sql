-- Track last update on quotes for the read view
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_name  TEXT        DEFAULT NULL;
