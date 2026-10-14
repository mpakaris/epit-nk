-- Migration 038: Add wall perimeter to survey entries
-- Needed to calculate gross wall area (perimeter × height)

ALTER TABLE public.survey_entries
  ADD COLUMN IF NOT EXISTS perimeter_m DECIMAL(5,2);
