-- Add date ranges to quote sections and project rooms so each room/trade
-- can have its own scheduled period (e.g. Bathroom 21-23 Oct, Kitchen 30 Oct-4 Nov).
ALTER TABLE public.quote_sections
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;

ALTER TABLE public.project_rooms
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE;
