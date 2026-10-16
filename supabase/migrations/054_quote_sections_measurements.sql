-- Add measurement columns to quote_sections so offers are self-contained
-- and do not depend on a linked survey entry for their room data.

ALTER TABLE quote_sections
  ADD COLUMN IF NOT EXISTS height_m     NUMERIC,
  ADD COLUMN IF NOT EXISTS perimeter_m  NUMERIC,
  ADD COLUMN IF NOT EXISTS window_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS door_count   INTEGER DEFAULT 0;
