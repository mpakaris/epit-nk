-- Migration 165: Add subscription_grace_until to collectives
-- Required by: US-19 (payment failure grace period for addon subscriptions)
-- Apply via Supabase SQL Editor before deploying webhook payment_failed handler.

ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS subscription_grace_until TIMESTAMPTZ DEFAULT NULL;
