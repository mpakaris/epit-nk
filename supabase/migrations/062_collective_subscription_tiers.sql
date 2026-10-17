-- Migration 062: Collective subscription tiers
-- Adds subscription_type and seat_count to collectives so superadmin
-- can assign premium vs seats-based plans per collective.

ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS subscription_type TEXT NOT NULL DEFAULT 'premium'
    CHECK (subscription_type IN ('premium', 'seats')),
  ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1;
