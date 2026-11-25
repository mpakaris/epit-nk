-- Migration 159: Collective status + tier lifecycle columns
-- Required by: BK-01 (docs/kollektiva-subscription-tickets.md)
-- Apply via Supabase SQL Editor before deploying any BK-02+ code.

-- 1. Add lifecycle status column (not_activated → active → frozen → deleted)
ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_activated'
    CHECK (status IN ('not_activated', 'active', 'frozen', 'deleted'));

-- 2. Backfill existing rows from subscription_status:
--    canceled/paused/expired → frozen; everything else (active, null) → active
UPDATE public.collectives
SET status = CASE
  WHEN subscription_status IN ('canceled', 'paused', 'expired') THEN 'frozen'
  ELSE 'active'
END;

-- 3. Migrate old collective_tier values to new short codes:
--    small → s, medium → m, large → l, enterprise → xl
--    First we must drop the old CHECK constraint (if any), then add the new one.
ALTER TABLE public.collectives
  DROP CONSTRAINT IF EXISTS collectives_collective_tier_check;

UPDATE public.collectives
SET collective_tier = CASE collective_tier
  WHEN 'small'      THEN 's'
  WHEN 'medium'     THEN 'm'
  WHEN 'large'      THEN 'l'
  WHEN 'enterprise' THEN 'xl'
  ELSE collective_tier
END
WHERE collective_tier IN ('small', 'medium', 'large', 'enterprise');

ALTER TABLE public.collectives
  ADD CONSTRAINT collectives_collective_tier_check
    CHECK (collective_tier IN ('xs', 's', 'm', 'l', 'xl'));

-- 4. Inclusive collectives are always xs tier
UPDATE public.collectives
SET collective_tier = 'xs'
WHERE is_inclusive = true AND collective_tier IS NULL;

-- 5. Add deleted_at for soft-delete support on frozen collectives
ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 6. Performance index for status-based queries
CREATE INDEX IF NOT EXISTS collectives_status_idx
  ON public.collectives (status)
  WHERE deleted_at IS NULL;
