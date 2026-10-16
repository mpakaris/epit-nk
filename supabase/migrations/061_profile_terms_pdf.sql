ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_pdf_url         TEXT,
  ADD COLUMN IF NOT EXISTS terms_pdf_name        TEXT,
  ADD COLUMN IF NOT EXISTS terms_pdf_uploaded_at TIMESTAMPTZ;
