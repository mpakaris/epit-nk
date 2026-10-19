-- Migration 072: Store creator display name on projects (mirrors updated_by_name pattern)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT NULL;

-- Backfill from profiles for existing rows
UPDATE public.projects p
SET    created_by_name = pr.display_name
FROM   public.profiles pr
WHERE  pr.id = p.created_by
AND    p.created_by_name IS NULL;
