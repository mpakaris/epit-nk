-- Migration 130: Create survey_items table
-- Referenced in code at /api/surveys/[id]/items but missing from DB (causes 500 errors)
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS public.survey_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  entry_id    UUID REFERENCES public.survey_entries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    DECIMAL(10, 2),
  unit        TEXT,
  unit_price  INTEGER,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_items_survey_id ON public.survey_items(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_items_entry_id  ON public.survey_items(entry_id);

ALTER TABLE public.survey_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_direct_access" ON public.survey_items;
CREATE POLICY "deny_all_direct_access"
  ON public.survey_items
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
