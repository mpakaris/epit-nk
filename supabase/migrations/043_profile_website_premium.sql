-- 043_profile_website_premium.sql
-- Tracks whether a user has a premium subscription.
-- Managed exclusively by superadmin. Default: free (false).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_subscription_premium boolean DEFAULT false;
