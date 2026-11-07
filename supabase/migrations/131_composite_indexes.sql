-- Migration 131: Composite indexes for main workspace query patterns
-- Prevents sequential scans on projects/quotes/surveys as user data grows
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- projects
CREATE INDEX IF NOT EXISTS projects_personal_idx
  ON public.projects (owner_id, deleted_at)
  WHERE collective_id IS NULL;

CREATE INDEX IF NOT EXISTS projects_collective_idx
  ON public.projects (collective_id, deleted_at)
  WHERE collective_id IS NOT NULL;

-- quotes
CREATE INDEX IF NOT EXISTS quotes_personal_idx
  ON public.quotes (owner_id, deleted_at)
  WHERE collective_id IS NULL;

CREATE INDEX IF NOT EXISTS quotes_collective_idx
  ON public.quotes (collective_id, deleted_at)
  WHERE collective_id IS NOT NULL;

-- surveys
CREATE INDEX IF NOT EXISTS surveys_personal_idx
  ON public.surveys (owner_id, deleted_at)
  WHERE collective_id IS NULL;

CREATE INDEX IF NOT EXISTS surveys_collective_idx
  ON public.surveys (collective_id, deleted_at)
  WHERE collective_id IS NOT NULL;

-- invoices: always fetched by project_id
CREATE INDEX IF NOT EXISTS invoices_project_id_idx
  ON public.invoices (project_id)
  WHERE deleted_at IS NULL;

-- labour_entries: always fetched by project_id
CREATE INDEX IF NOT EXISTS labour_entries_project_id_idx
  ON public.labour_entries (project_id);

-- quote_entries: always fetched by quote_id
CREATE INDEX IF NOT EXISTS quote_entries_quote_id_idx
  ON public.quote_entries (quote_id);

-- quote_sections: always fetched by quote_id
CREATE INDEX IF NOT EXISTS quote_sections_quote_id_idx
  ON public.quote_sections (quote_id);
