-- Migration 151: add iban and bic columns to profiles
-- Required by: invoice header sheet — EU banking fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iban VARCHAR(34) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bic  VARCHAR(11) DEFAULT NULL;
