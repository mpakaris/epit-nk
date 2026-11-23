-- Migration 156: per-quote T&C attachments
-- Replaces single custom_terms_pdf_url/name with a multi-doc array + profile-default toggle

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS terms_attachments    JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attach_profile_terms BOOLEAN DEFAULT true;
