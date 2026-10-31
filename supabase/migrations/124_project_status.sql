-- Migration 124: Add status column to projects
-- Values: 'active' (default) | 'paused' | 'closed'
-- Replaces the dual closed_at / archived_at status model with a single explicit field.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'closed'));

-- Backfill: existing projects with closed_at set → 'closed'
UPDATE projects
  SET status = 'closed'
  WHERE closed_at IS NOT NULL AND status = 'active';
