-- Migration 058 — GDPR consent tracking on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gdpr_consented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_consented_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
