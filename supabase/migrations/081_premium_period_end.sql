-- Migration 081: Store premium subscription period end for scheduled cancellation display
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_period_end TIMESTAMPTZ;
