-- Migration 018 — Link quote entries to survey room entries
ALTER TABLE public.quote_entries
  ADD COLUMN IF NOT EXISTS survey_entry_id UUID REFERENCES public.survey_entries(id) ON DELETE SET NULL;
