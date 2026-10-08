-- Migration 016 — Felmérés (Survey) feature
-- Adds surveys and survey_media tables.
-- Adds survey_id FK to quotes and projects.
-- Entity isolation enforced in API routes via admin client + explicit entity_id filter.
-- RLS blocks all direct browser-client access (same pattern as diary_entries).

-- ── surveys ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.surveys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID        NOT NULL REFERENCES public.entities(id)  ON DELETE CASCADE,
  client_id   UUID        REFERENCES public.clients(id)            ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  notes       TEXT,
  date        DATE,
  location    TEXT,
  created_by  UUID        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_entity_id ON public.surveys(entity_id);
CREATE INDEX IF NOT EXISTS idx_surveys_date      ON public.surveys(date DESC NULLS LAST);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surveys: no direct access" ON public.surveys;
CREATE POLICY "surveys: no direct access"
  ON public.surveys FOR ALL TO authenticated
  USING (false);

-- ── survey_media ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.survey_media (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID        NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  drive_file_id   TEXT        NOT NULL,  -- R2 object key
  drive_view_url  TEXT        NOT NULL,  -- R2 public URL
  thumbnail_url   TEXT,
  mime_type       TEXT,
  file_name       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_media_survey_id ON public.survey_media(survey_id);

ALTER TABLE public.survey_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_media: no direct access" ON public.survey_media;
CREATE POLICY "survey_media: no direct access"
  ON public.survey_media FOR ALL TO authenticated
  USING (false);

-- ── Add survey_id FK to quotes and projects ───────────────────────────────────

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL;
