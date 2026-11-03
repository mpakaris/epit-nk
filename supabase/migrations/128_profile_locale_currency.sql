-- Add locale and currency preferences to profiles
-- locale: drives both UI language and document output (e.g. 'hu', 'de', 'en')
-- currency: working currency, write-once (e.g. 'HUF', 'EUR', 'GBP', 'USD')
-- Both NULL for existing users → triggers OnboardingModal on next login

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale   VARCHAR(5),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
