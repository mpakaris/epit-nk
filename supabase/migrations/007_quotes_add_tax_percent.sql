-- Add tax percentage to quotes (default 27% Hungarian standard VAT)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) NOT NULL DEFAULT 27;
