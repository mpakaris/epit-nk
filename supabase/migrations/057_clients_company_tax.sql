-- Migration 057 — Add company_name and tax_number to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_number   TEXT;
