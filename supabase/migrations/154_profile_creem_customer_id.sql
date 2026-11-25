-- Migration 154: Store Creem customer ID on profiles
-- Allows direct portal redirects without a Creem API lookup,
-- and provides a fallback match for webhook events missing metadata.userId.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;

CREATE INDEX IF NOT EXISTS profiles_creem_customer_id_idx
  ON public.profiles (creem_customer_id)
  WHERE creem_customer_id IS NOT NULL;
