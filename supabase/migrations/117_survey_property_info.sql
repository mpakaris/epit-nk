-- Migration 117: Survey property / utility info fields
-- Adds general property data fields to surveys table.
-- New media_type values (electrical_box, heating_system, ac_unit, boiler, floor_heating)
-- are stored in the existing survey_media table — no schema change needed there.

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS plot_size_m2       NUMERIC,
  ADD COLUMN IF NOT EXISTS garden_size_m2     NUMERIC,
  ADD COLUMN IF NOT EXISTS electrical_phases  SMALLINT CHECK (electrical_phases IN (1, 3)),
  ADD COLUMN IF NOT EXISTS electrical_ampere  SMALLINT,
  ADD COLUMN IF NOT EXISTS electrical_voltage SMALLINT,
  ADD COLUMN IF NOT EXISTS heating_type       TEXT,
  ADD COLUMN IF NOT EXISTS property_notes     TEXT;
