-- Migration 152: add locale to user_websites
-- Required by: website language selection feature
ALTER TABLE public.user_websites
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'hu';
