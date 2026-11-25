-- Migration 153: add custom_trade to user_websites
-- Allows users to type a custom profession instead of picking from the trades list
ALTER TABLE public.user_websites
  ADD COLUMN IF NOT EXISTS custom_trade VARCHAR(120) DEFAULT NULL;
