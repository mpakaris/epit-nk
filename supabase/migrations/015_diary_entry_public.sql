-- Migration 015 — Diary entry public visibility flag
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_diary_entries_is_public ON public.diary_entries(is_public) WHERE is_public = true;
