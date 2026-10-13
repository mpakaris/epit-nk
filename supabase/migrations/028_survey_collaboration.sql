-- Collaborative surveys: shared members + per-entry authorship
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

ALTER TABLE public.survey_entries
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;
