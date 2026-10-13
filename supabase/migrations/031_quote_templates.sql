-- Migration 031 — Quote Templates
-- Reusable offer structures: sections + entries, no client reference.

CREATE TABLE IF NOT EXISTS public.quote_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID        NOT NULL REFERENCES public.entities(id)  ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  title       TEXT,
  location    TEXT,
  work_type   TEXT,
  description TEXT,
  tax_percent INTEGER     NOT NULL DEFAULT 27,
  created_by  UUID        REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_entity_id ON public.quote_templates(entity_id);

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_templates: no direct access" ON public.quote_templates;
CREATE POLICY "quote_templates: no direct access"
  ON public.quote_templates FOR ALL TO authenticated USING (false);

CREATE TABLE IF NOT EXISTS public.template_sections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID        NOT NULL REFERENCES public.quote_templates(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  size_m2     NUMERIC,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_sections_template_id ON public.template_sections(template_id);

ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "template_sections: no direct access" ON public.template_sections;
CREATE POLICY "template_sections: no direct access"
  ON public.template_sections FOR ALL TO authenticated USING (false);

CREATE TABLE IF NOT EXISTS public.template_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID        NOT NULL REFERENCES public.quote_templates(id)  ON DELETE CASCADE,
  section_id       UUID        REFERENCES public.template_sections(id)         ON DELETE SET NULL,
  entry_type       TEXT        NOT NULL DEFAULT 'material',
  work_description TEXT        NOT NULL,
  quantity         NUMERIC,
  unit             TEXT,
  unit_price       INTEGER,
  amount_huf       INTEGER     NOT NULL DEFAULT 0,
  notes            TEXT,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_entries_template_id ON public.template_entries(template_id);
CREATE INDEX IF NOT EXISTS idx_template_entries_section_id  ON public.template_entries(section_id);

ALTER TABLE public.template_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "template_entries: no direct access" ON public.template_entries;
CREATE POLICY "template_entries: no direct access"
  ON public.template_entries FOR ALL TO authenticated USING (false);
