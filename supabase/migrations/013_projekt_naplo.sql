-- ==============================================================================
-- Migration 013 — Projekt Napló (Project Diary)
-- Adds:
--   • google_drive_folder_id column on entities
--   • diary_entries table
--   • diary_photos table
--   • diary_share_tokens table
-- Entity isolation is enforced in API routes (admin client + explicit entity_id
-- filter), not RLS. RLS is enabled but blocks all direct client access.
-- Safe to re-run.
-- ==============================================================================

-- ── 1. Google Drive folder per entity ────────────────────────────────────────
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;

-- ── 2. Diary entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id)  ON DELETE CASCADE,
  created_by  UUID        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  entry_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_entity_id  ON public.diary_entries(entity_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_project_id ON public.diary_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_entry_date ON public.diary_entries(entry_date DESC);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Block all direct client access — reads/writes go through service role only
DROP POLICY IF EXISTS "diary_entries: no direct access" ON public.diary_entries;
CREATE POLICY "diary_entries: no direct access"
  ON public.diary_entries FOR ALL TO authenticated
  USING (false);

-- ── 3. Diary photos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diary_photos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID        NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  entity_id       UUID        NOT NULL REFERENCES public.entities(id)      ON DELETE CASCADE,
  drive_file_id   TEXT        NOT NULL,
  drive_view_url  TEXT        NOT NULL,
  thumbnail_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diary_photos_entry_id  ON public.diary_photos(entry_id);
CREATE INDEX IF NOT EXISTS idx_diary_photos_entity_id ON public.diary_photos(entity_id);

ALTER TABLE public.diary_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diary_photos: no direct access" ON public.diary_photos;
CREATE POLICY "diary_photos: no direct access"
  ON public.diary_photos FOR ALL TO authenticated
  USING (false);

-- ── 4. Diary share tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diary_share_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id)  ON DELETE CASCADE,
  entity_id   UUID        NOT NULL REFERENCES public.entities(id)  ON DELETE CASCADE,
  token       TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  label       TEXT,
  created_by  UUID        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_diary_share_tokens_entity_id  ON public.diary_share_tokens(entity_id);
CREATE INDEX IF NOT EXISTS idx_diary_share_tokens_project_id ON public.diary_share_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_diary_share_tokens_token      ON public.diary_share_tokens(token);

ALTER TABLE public.diary_share_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diary_share_tokens: no direct access" ON public.diary_share_tokens;
CREATE POLICY "diary_share_tokens: no direct access"
  ON public.diary_share_tokens FOR ALL TO authenticated
  USING (false);
