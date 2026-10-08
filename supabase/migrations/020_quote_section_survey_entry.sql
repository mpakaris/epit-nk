-- Migration 020 — Store original survey_entry_id on quote sections
-- Enables quote sections to reference survey entry photos.
ALTER TABLE public.quote_sections
  ADD COLUMN IF NOT EXISTS survey_entry_id UUID REFERENCES public.survey_entries(id) ON DELETE SET NULL;
