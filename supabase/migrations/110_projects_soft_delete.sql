-- Ensure soft-delete columns exist on projects and index is in place.
-- All other user-owned tables (quotes, surveys, clients) already have these.
-- Required by: DELETE /api/projects/[id] route + entity/data deleted_at filter.
--
-- Note: columns may already exist if added outside migrations.
-- IF NOT EXISTS makes this idempotent.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by  UUID        REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS projects_deleted_at_idx ON projects (deleted_at)
  WHERE deleted_at IS NULL;

-- Flush the PostgREST schema cache so the columns are visible immediately.
NOTIFY pgrst, 'reload schema';
