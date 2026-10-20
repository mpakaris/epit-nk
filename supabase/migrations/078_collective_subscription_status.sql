ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS subscription_status      TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_period_end  TIMESTAMPTZ;
