-- Migration 032 — Ideas
-- Simple idea-box per entity: any member can post and delete their own ideas;
-- admins can delete anyone's idea.

CREATE TABLE IF NOT EXISTS public.ideas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_id   UUID        NOT NULL REFERENCES public.entities(id)  ON DELETE CASCADE,
  author_id   UUID        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  author_name TEXT        NOT NULL,
  idea        TEXT        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_entity_id ON public.ideas(entity_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON public.ideas(created_at DESC);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ideas: no direct access" ON public.ideas;
CREATE POLICY "ideas: no direct access" ON public.ideas FOR ALL USING (false);
