-- Migration 157: quote_drawings — freehand SVG sketches attached to quotes
--
-- section_id = NULL  → document-level drawing (quote as a whole)
-- section_id = uuid  → section-level drawing (tied to a quote_section)
--
-- Mirror of survey_drawings (036) for the quote domain.

CREATE TABLE IF NOT EXISTS public.quote_drawings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID        NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  section_id  UUID        REFERENCES public.quote_sections(id) ON DELETE CASCADE,
  svg_data    TEXT        NOT NULL,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_drawings_quote    ON public.quote_drawings(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_drawings_section  ON public.quote_drawings(section_id);

ALTER TABLE public.quote_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_drawings: deny direct access"
  ON public.quote_drawings AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
