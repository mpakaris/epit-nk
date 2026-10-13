-- Migration 037: Room dimension fields for survey entries
-- Used for wall area calculations (drywall, painting) where openings must be deducted

ALTER TABLE public.survey_entries
  ADD COLUMN IF NOT EXISTS height_m      DECIMAL(4,2),  -- ceiling height in metres
  ADD COLUMN IF NOT EXISTS window_count  SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS door_count    SMALLINT DEFAULT 0;
