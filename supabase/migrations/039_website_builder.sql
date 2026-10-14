-- ============================================================
-- 039_website_builder.sql
-- Personal one-pager website builder for tradesmen
-- ============================================================

-- Trades / Szakmák
CREATE TABLE IF NOT EXISTS public.trades (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name_hu      text    NOT NULL,
  slug_prefix  text    NOT NULL,
  order_index  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO public.trades (name_hu, slug_prefix, order_index) VALUES
  ('Festő',                'festo',                  1),
  ('Villanyszerelő',       'villanyszerelo',          2),
  ('Vízszerelő',           'vizszerelo',              3),
  ('Burkoló',              'burkolo',                 4),
  ('Kőműves',              'komuves',                 5),
  ('Ács',                  'acs',                     6),
  ('Asztalos',             'asztalos',                7),
  ('Gipszkartonos',        'gipszkartonos',           8),
  ('Tetőfedő',             'tetofedo',                9),
  ('Szigetelő',            'szigetelo',              10),
  ('Parkettás',            'parkettas',              11),
  ('Klímaszerelő',         'klimaszerelo',           12),
  ('Hegesztő',             'hegeszto',               13),
  ('Kertész',              'kertesz',                14),
  ('Általános kivitelező', 'altalanos-kivitelezo',   15),
  ('Vakoló',               'vakolo',                 16),
  ('Csempéző',             'csempezo',               17),
  ('Festő-mázoló',         'festo-mazolo',           18),
  ('Tetőablak-szerelő',    'tetoablak-szerelo',      19),
  ('Lakatos',              'lakatos',                20)
ON CONFLICT DO NOTHING;

-- User websites
CREATE TABLE IF NOT EXISTS public.user_websites (
  id           uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid  REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trade_id     uuid  REFERENCES public.trades(id),
  slug         text  UNIQUE NOT NULL
                     CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3 AND length(slug) <= 60),
  status       text  DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Website sections (one row per section type per website)
CREATE TABLE IF NOT EXISTS public.website_sections (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id   uuid    REFERENCES public.user_websites(id) ON DELETE CASCADE NOT NULL,
  section_type text    NOT NULL
                       CHECK (section_type IN (
                         'hero','about','services','certifications','gallery',
                         'pricing','testimonials','faq','service_area','contact'
                       )),
  enabled      boolean DEFAULT false,
  content      jsonb   DEFAULT '{}',
  order_index  integer DEFAULT 0,
  UNIQUE (website_id, section_type)
);

-- Image library (superadmin managed, curated per trade)
CREATE TABLE IF NOT EXISTS public.image_library (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id    uuid REFERENCES public.trades(id),
  r2_key      text NOT NULL,
  orientation text DEFAULT 'horizontal' CHECK (orientation IN ('horizontal', 'vertical')),
  alt_text    text,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz DEFAULT now()
);

-- Contact leads from public page forms
CREATE TABLE IF NOT EXISTS public.website_contact_leads (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id uuid REFERENCES public.user_websites(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  email      text,
  phone      text,
  message    text,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ---- RLS --------------------------------------------------
ALTER TABLE public.trades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_websites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_library         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_contact_leads ENABLE ROW LEVEL SECURITY;

-- trades: public read
CREATE POLICY "trades_public_read"
  ON public.trades FOR SELECT USING (true);

-- image_library: public read
CREATE POLICY "image_library_public_read"
  ON public.image_library FOR SELECT USING (true);

-- user_websites: owner full access + published pages readable by anyone
CREATE POLICY "user_websites_owner_all"
  ON public.user_websites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_websites_public_read"
  ON public.user_websites FOR SELECT USING (status = 'published');

-- website_sections: owner full access
CREATE POLICY "website_sections_owner_all"
  ON public.website_sections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_websites w
    WHERE w.id = website_id AND w.user_id = auth.uid()
  ));

-- website_sections: public read for published websites
CREATE POLICY "website_sections_public_read"
  ON public.website_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_websites w
    WHERE w.id = website_id AND w.status = 'published'
  ));

-- contact_leads: anyone can insert (public contact form)
CREATE POLICY "website_contact_leads_insert"
  ON public.website_contact_leads FOR INSERT WITH CHECK (true);

-- contact_leads: only website owner can read their own leads
CREATE POLICY "website_contact_leads_owner_read"
  ON public.website_contact_leads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_websites w
    WHERE w.id = website_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "website_contact_leads_owner_update"
  ON public.website_contact_leads FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_websites w
    WHERE w.id = website_id AND w.user_id = auth.uid()
  ));
