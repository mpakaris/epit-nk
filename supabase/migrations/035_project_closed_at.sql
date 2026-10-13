-- Migration 035: Manual project closure
-- Replaces automatic date-based "closed" status with an explicit closed_at timestamp.
-- When closed_at IS NULL: project is active (or overdue if end_date < now).
-- When closed_at IS NOT NULL: project was manually closed by an admin.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
