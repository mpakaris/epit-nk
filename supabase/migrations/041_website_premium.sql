-- 041_website_premium.sql
-- Adds is_premium flag to user_websites so the public page can filter
-- premium-only sections for non-paying users.

ALTER TABLE public.user_websites
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
