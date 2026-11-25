-- Migration 150: Add end_date and counts_as_expense to labour_entries
-- Required by: labour entry date range (Start-End) and Eigenleistung tracking

ALTER TABLE public.labour_entries
  ADD COLUMN IF NOT EXISTS end_date           DATE          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS counts_as_expense  BOOLEAN       NOT NULL DEFAULT TRUE;
