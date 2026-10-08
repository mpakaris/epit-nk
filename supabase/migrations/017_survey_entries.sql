-- Migration 017 — Survey entries (rooms/areas) + layout media type

-- ── survey_entries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.survey_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID        NOT NULL REFERENCES public.surveys(id)  ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  size_m2     NUMERIC,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_entries_survey_id ON public.survey_entries(survey_id);

ALTER TABLE public.survey_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_entries: no direct access" ON public.survey_entries;
CREATE POLICY "survey_entries: no direct access"
  ON public.survey_entries FOR ALL TO authenticated USING (false);

-- ── Extend survey_media ───────────────────────────────────────────────────────
-- entry_id: null = survey-level media; set = belongs to that entry
-- media_type: 'photo' (default) | 'layout' (floor plan, general doc)
ALTER TABLE public.survey_media
  ADD COLUMN IF NOT EXISTS entry_id   UUID REFERENCES public.survey_entries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'photo';
