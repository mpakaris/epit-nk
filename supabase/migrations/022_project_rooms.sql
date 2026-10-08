-- Migration 022 — Project rooms
-- Adds project_rooms table for room-by-room cost tracking.
-- Adds optional room_id FK to invoices and labour_entries.

CREATE TABLE IF NOT EXISTS public.project_rooms (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID        NOT NULL REFERENCES public.projects(id)        ON DELETE CASCADE,
  entity_id          UUID        NOT NULL REFERENCES public.entities(id)        ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  size_m2            NUMERIC,
  work_types         TEXT[]      NOT NULL DEFAULT '{}',
  description        TEXT,
  quoted_amount_net  NUMERIC,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  source_section_id  UUID        REFERENCES public.quote_sections(id)          ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_rooms_project_id ON public.project_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rooms_entity_id  ON public.project_rooms(entity_id);

ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_rooms: no direct access" ON public.project_rooms;
CREATE POLICY "project_rooms: no direct access"
  ON public.project_rooms FOR ALL TO authenticated USING (false);

-- Add optional room assignment to invoices and labour_entries
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

ALTER TABLE public.labour_entries
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;
