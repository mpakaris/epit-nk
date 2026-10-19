-- Migration 070 — Last-edit audit fields on invoices and labour_entries
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_name  TEXT        DEFAULT NULL;

ALTER TABLE public.labour_entries
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_name  TEXT        DEFAULT NULL;
