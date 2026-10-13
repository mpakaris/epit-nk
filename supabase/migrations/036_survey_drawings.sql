-- Migration 036: Survey drawings (freehand sketches)
-- entry_id = NULL means the drawing belongs to the survey itself (top-level)
-- entry_id set means the drawing belongs to a specific room/entry

CREATE TABLE public.survey_drawings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  entry_id    UUID        REFERENCES public.survey_entries(id) ON DELETE SET NULL,
  svg_data    TEXT        NOT NULL,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_drawings_survey ON public.survey_drawings(survey_id);
CREATE INDEX idx_survey_drawings_entry  ON public.survey_drawings(entry_id);

ALTER TABLE public.survey_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_drawings: superadmin all"
  ON public.survey_drawings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));
