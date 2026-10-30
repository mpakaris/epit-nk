-- profiles: default payment + warranty settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_deadline_days INT     DEFAULT 8,
  ADD COLUMN IF NOT EXISTS payment_method        TEXT    DEFAULT 'banki átutalás',
  ADD COLUMN IF NOT EXISTS deposit_percent       INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_months       INT     DEFAULT 0;

-- quotes: per-offer overrides (pre-filled from profile at creation)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_deadline_days INT,
  ADD COLUMN IF NOT EXISTS payment_method        TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent       INT,
  ADD COLUMN IF NOT EXISTS warranty_months       INT;
