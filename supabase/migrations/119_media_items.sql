-- Migration 119: media_items — unified media table for quotes and projects
--
-- survey_media stays untouched (live data, different column names).
-- media_items covers all non-survey document media: quotes, projects, future types.
-- Both tables store the same r2_key for shared R2 objects.
-- checkWhereImageIsUsed() queries both tables before any R2 delete.
--
-- owner_type values: 'quote_section' | 'project_room' | 'diary_entry' (extensible)
-- document_type values: 'quote' | 'project' (extensible)

CREATE TABLE IF NOT EXISTS public.media_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- R2 storage
  r2_key          TEXT        NOT NULL,          -- R2 object key, e.g. "media/abc123.webp"
  cdn_url         TEXT        NOT NULL,          -- public CDN URL
  thumbnail_url   TEXT,                          -- WebP thumbnail URL (optional)
  mime_type       TEXT,
  file_size_kb    INT,

  -- Polymorphic owner (the container that "holds" this photo)
  owner_type      TEXT        NOT NULL,          -- 'quote_section' | 'project_room' | 'diary_entry'
  owner_id        UUID        NOT NULL,          -- FK to the owner row (no DB-level FK — polymorphic)

  -- Denormalised document reference (for bulk queries, client portal)
  document_type   TEXT        NOT NULL,          -- 'quote' | 'project'
  document_id     UUID        NOT NULL,          -- quotes.id or projects.id

  -- Provenance
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order      INT         NOT NULL DEFAULT 0
);

-- Fast lookup by container (e.g. "all photos for section X")
CREATE INDEX IF NOT EXISTS media_items_owner_idx
  ON public.media_items (owner_type, owner_id);

-- Fast lookup by document (e.g. "all photos for quote Y" — used by client portal)
CREATE INDEX IF NOT EXISTS media_items_document_idx
  ON public.media_items (document_type, document_id);

-- Fast reference check (used by checkWhereImageIsUsed)
CREATE INDEX IF NOT EXISTS media_items_r2_key_idx
  ON public.media_items (r2_key);

-- RLS: app uses admin client — no direct row access
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_items: no direct access" ON public.media_items;
CREATE POLICY "media_items: no direct access"
  ON public.media_items FOR ALL TO authenticated
  USING (false);
