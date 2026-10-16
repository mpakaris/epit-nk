-- Letterhead / billing info on the user's profile.
-- These appear as the "From:" block on offers.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name         TEXT,
  ADD COLUMN IF NOT EXISTS last_name          TEXT,
  ADD COLUMN IF NOT EXISTS company_name       TEXT,
  ADD COLUMN IF NOT EXISTS street             TEXT,
  ADD COLUMN IF NOT EXISTS street_number      TEXT,
  ADD COLUMN IF NOT EXISTS zip                TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS tax_number         TEXT,
  ADD COLUMN IF NOT EXISTS default_tax_percent NUMERIC DEFAULT 27;
