-- Migration 019 — Quote sections (rooms/areas owned by the quote itself)
-- Quotes get their own section structure, independent from the survey.
-- When created from a survey, sections are copied from survey_entries.

CREATE TABLE IF NOT EXISTS public.quote_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID        NOT NULL REFERENCES public.quotes(id)   ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  size_m2     NUMERIC,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_sections_quote_id ON public.quote_sections(quote_id);

ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_sections: no direct access" ON public.quote_sections;
CREATE POLICY "quote_sections: no direct access"
  ON public.quote_sections FOR ALL TO authenticated USING (false);

-- Link quote entries to a section (nullable — null means ungrouped)
ALTER TABLE public.quote_entries
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.quote_sections(id) ON DELETE SET NULL;
