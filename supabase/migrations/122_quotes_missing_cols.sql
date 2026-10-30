-- Adds all offer-related columns that were missing from the quotes table.
-- Safe to run even if 120/121 have already been applied (IF NOT EXISTS).
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS valid_until           DATE,
  ADD COLUMN IF NOT EXISTS offer_number          TEXT,
  ADD COLUMN IF NOT EXISTS offer_terms_text      TEXT,
  ADD COLUMN IF NOT EXISTS payment_deadline_days INT,
  ADD COLUMN IF NOT EXISTS payment_method        TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent       INT,
  ADD COLUMN IF NOT EXISTS warranty_months       INT;
