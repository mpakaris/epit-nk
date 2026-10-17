-- Migration 068 — Add last-edit audit fields to projects (mirrors quotes.030)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_name  TEXT        DEFAULT NULL;
