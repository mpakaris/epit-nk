-- Universal "inactive" flag across the three main document types.
-- archived_at set  → document is inactive (reversible)
-- archived_at null → document is active
-- Surveys: "inactive" = shelved, not yet done (done already exists via status field)
ALTER TABLE public.surveys  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- Projects: "inactive" = on hold / shelved (distinct from closed_at which means completed)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- Quotes intentionally excluded: rejected status already serves as the inactive state
