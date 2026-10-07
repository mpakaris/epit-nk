-- ==============================================================================
-- Migration 014 — Diary Entry Extended Fields
-- Adds:
--   • work_type, internal_note, client_note columns on diary_entries
--   • mime_type column on diary_photos (for video vs image detection)
--   • Makes diary_photos.entry_id nullable (upload-then-link flow)
-- ==============================================================================

-- ── 1. Extended diary entry fields ───────────────────────────────────────────
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS work_type     TEXT,
  ADD COLUMN IF NOT EXISTS internal_note TEXT,
  ADD COLUMN IF NOT EXISTS client_note   TEXT;

-- ── 2. Media type tracking ────────────────────────────────────────────────────
ALTER TABLE public.diary_photos
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ── 3. Allow null entry_id during upload-before-entry flow ───────────────────
ALTER TABLE public.diary_photos
  ALTER COLUMN entry_id DROP NOT NULL;
