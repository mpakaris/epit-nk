-- Migration 144: index for collective threads queries
-- Required by: messageFeature.md Phase 3 (US-MSG-020 through US-MSG-023)
-- Apply via Supabase SQL Editor

CREATE INDEX IF NOT EXISTS threads_collective_general_idx
  ON public.threads (collective_id, created_at)
  WHERE collective_id IS NOT NULL AND project_id IS NULL AND quote_id IS NULL;

CREATE INDEX IF NOT EXISTS threads_collective_project_idx
  ON public.threads (collective_id, project_id)
  WHERE collective_id IS NOT NULL AND project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS threads_collective_quote_idx
  ON public.threads (collective_id, quote_id)
  WHERE collective_id IS NOT NULL AND quote_id IS NOT NULL;
