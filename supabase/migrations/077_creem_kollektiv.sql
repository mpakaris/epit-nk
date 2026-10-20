ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS collective_tier TEXT CHECK (collective_tier IN ('small','medium','large','enterprise'));
