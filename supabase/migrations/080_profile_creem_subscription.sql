-- Migration 080: Store premium subscription ID on profile for billing lookups
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT;
