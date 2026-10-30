-- profiles: contact + bank details for offer letterhead, plus offer defaults
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone               TEXT,
  ADD COLUMN IF NOT EXISTS bank_account        TEXT,
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS offer_validity_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS offer_terms_text    TEXT;

-- quotes: sequential offer number + per-offer terms override
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS offer_number     TEXT,
  ADD COLUMN IF NOT EXISTS offer_terms_text TEXT;
