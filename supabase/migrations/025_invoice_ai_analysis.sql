-- Add AI analysis fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS ai_line_items JSONB,
  ADD COLUMN IF NOT EXISTS ai_total INTEGER;
