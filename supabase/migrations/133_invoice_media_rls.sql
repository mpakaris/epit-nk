-- Migration 133: Create invoice_media table (if not yet applied) + enable RLS
-- Migration 126 created the table but was apparently never applied to this DB.
-- This migration is idempotent: safe to run even if the table already exists.
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS public.invoice_media (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID        NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  image_url    TEXT        NOT NULL,
  storage_path TEXT,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_media_invoice_id_idx ON public.invoice_media(invoice_id);

ALTER TABLE public.invoice_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_direct_access"
  ON public.invoice_media
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
