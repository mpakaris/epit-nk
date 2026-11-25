-- Migration 147: allow amount_huf = 0 on quote_entries
-- Required by: import-survey flow — items copied from surveys have no price yet
ALTER TABLE public.quote_entries
  DROP CONSTRAINT IF EXISTS quote_entries_amount_huf_check,
  ALTER COLUMN amount_huf SET DEFAULT 0,
  ADD CONSTRAINT quote_entries_amount_huf_check CHECK (amount_huf >= 0);
