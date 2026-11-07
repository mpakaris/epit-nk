-- Migration 129: Add deleted_at to diary_entries and ideas
-- Required by CLAUDE.md §4 (soft-delete rule)
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- diary_entries
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_diary_entries_deleted_at ON public.diary_entries(deleted_at) WHERE deleted_at IS NULL;

-- ideas
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_deleted_at ON public.ideas(deleted_at) WHERE deleted_at IS NULL;
