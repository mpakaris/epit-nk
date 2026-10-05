-- ==============================================================================
-- Migration 005 — MULTI-TENANT FRESH START
-- ⚠️  DROPS ALL EXISTING DATA. Run ONLY when ready to start fresh.
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. DROP everything (order matters for FK constraints)
DROP TABLE IF EXISTS public.quote_entries   CASCADE;
DROP TABLE IF EXISTS public.quotes          CASCADE;
DROP TABLE IF EXISTS public.labour_entries  CASCADE;
DROP TABLE IF EXISTS public.invoices        CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects        CASCADE;
DROP TABLE IF EXISTS public.clients         CASCADE;
DROP TABLE IF EXISTS public.profiles        CASCADE;
DROP TABLE IF EXISTS public.entities        CASCADE;

DROP FUNCTION IF EXISTS public.is_admin()                CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(UUID)   CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()         CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ==============================================================================
-- 2. CORE TABLES
-- ==============================================================================

-- ENTITIES (tenants)
CREATE TABLE public.entities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (extends auth.users)
-- role: superadmin | admin (entity admin) | user (entity member)
-- entity_id: NULL for superadmin, required for admin/user
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'user'
                         CHECK (role IN ('superadmin', 'admin', 'user')),
  entity_id            UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT MEMBERS
CREATE TABLE public.project_members (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- INVOICES
CREATE TABLE public.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploader_name       TEXT,
  image_url           TEXT,
  storage_path        TEXT,
  value_huf           INTEGER NOT NULL CHECK (value_huf > 0),
  ocr_suggested_value INTEGER,
  description         TEXT,
  category            TEXT NOT NULL CHECK (category IN (
                        'Anyag','Szerszám/Eszköz','Szállítás','Engedély/Hatóság','Egyéb'
                      )),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- LABOUR ENTRIES
CREATE TABLE public.labour_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  labour_type TEXT NOT NULL,
  hours       DECIMAL(6,2) NOT NULL CHECK (hours > 0),
  hourly_rate INTEGER NOT NULL CHECK (hourly_rate > 0),
  value_huf   INTEGER NOT NULL CHECK (value_huf > 0),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTS
CREATE TABLE public.clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  notes            TEXT,
  discount_percent DECIMAL(4,2) DEFAULT 0
                     CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- QUOTES
CREATE TABLE public.quotes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  location    TEXT,
  work_type   TEXT,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','accepted','rejected')),
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  shared_with UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- QUOTE ENTRIES
CREATE TABLE public.quote_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id         UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entry_type       TEXT NOT NULL DEFAULT 'other'
                     CHECK (entry_type IN ('material','labour','equipment','transport','other')),
  work_description TEXT NOT NULL,
  quantity         DECIMAL(10,3),
  unit             TEXT,
  unit_price       INTEGER,
  amount_huf       INTEGER NOT NULL CHECK (amount_huf > 0),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX idx_profiles_entity_id        ON public.profiles(entity_id);
CREATE INDEX idx_projects_entity_id        ON public.projects(entity_id);
CREATE INDEX idx_project_members_user_id   ON public.project_members(user_id);
CREATE INDEX idx_project_members_proj_id   ON public.project_members(project_id);
CREATE INDEX idx_invoices_project_id       ON public.invoices(project_id);
CREATE INDEX idx_invoices_uploaded_by      ON public.invoices(uploaded_by);
CREATE INDEX idx_labour_project_id         ON public.labour_entries(project_id);
CREATE INDEX idx_clients_entity_id         ON public.clients(entity_id);
CREATE INDEX idx_quotes_entity_id          ON public.quotes(entity_id);
CREATE INDEX idx_quotes_status             ON public.quotes(status);
CREATE INDEX idx_quote_entries_quote_id    ON public.quote_entries(quote_id);

-- ==============================================================================
-- 4. HELPER FUNCTIONS (SECURITY DEFINER — no RLS recursion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_entity_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.current_entity_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT entity_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Keep is_admin() as a convenience alias (admin OR superadmin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'));
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
$$;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.entities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_entries   ENABLE ROW LEVEL SECURITY;

-- ENTITIES
CREATE POLICY "entities: superadmin all"
  ON public.entities FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "entities: members read own"
  ON public.entities FOR SELECT TO authenticated
  USING (id = current_entity_id());

-- PROFILES
CREATE POLICY "profiles: superadmin all"
  ON public.profiles FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "profiles: entity admin manages own entity"
  ON public.profiles FOR ALL TO authenticated
  USING (is_entity_admin() AND (entity_id = current_entity_id() OR id = auth.uid()))
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "profiles: user reads own entity members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    entity_id = current_entity_id() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
    )
  );

CREATE POLICY "profiles: user updates own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- PROJECTS
CREATE POLICY "projects: superadmin all"
  ON public.projects FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "projects: entity admin full access"
  ON public.projects FOR ALL TO authenticated
  USING (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "projects: members can read"
  ON public.projects FOR SELECT TO authenticated
  USING (entity_id = current_entity_id() AND is_project_member(id));

-- PROJECT MEMBERS
CREATE POLICY "project_members: superadmin all"
  ON public.project_members FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "project_members: entity admin full"
  ON public.project_members FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "project_members: read own memberships"
  ON public.project_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_project_member(project_id));

-- INVOICES
CREATE POLICY "invoices: superadmin all"
  ON public.invoices FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "invoices: entity admin full"
  ON public.invoices FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "invoices: project members read"
  ON public.invoices FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "invoices: members insert own"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_project_member(project_id));

-- LABOUR ENTRIES
CREATE POLICY "labour: superadmin all"
  ON public.labour_entries FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "labour: entity admin full"
  ON public.labour_entries FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND entity_id = current_entity_id())
  );

CREATE POLICY "labour: project members read"
  ON public.labour_entries FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "labour: members insert own"
  ON public.labour_entries FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_project_member(project_id));

CREATE POLICY "labour: member deletes own"
  ON public.labour_entries FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- CLIENTS
CREATE POLICY "clients: superadmin all"
  ON public.clients FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "clients: entity admin full"
  ON public.clients FOR ALL TO authenticated
  USING (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "clients: entity members read"
  ON public.clients FOR SELECT TO authenticated
  USING (entity_id = current_entity_id());

-- QUOTES
CREATE POLICY "quotes: superadmin all"
  ON public.quotes FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "quotes: entity admin full"
  ON public.quotes FOR ALL TO authenticated
  USING (is_entity_admin() AND entity_id = current_entity_id())
  WITH CHECK (is_entity_admin() AND entity_id = current_entity_id());

CREATE POLICY "quotes: visible to creator and shared"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    entity_id = current_entity_id() AND (
      created_by = auth.uid() OR
      auth.uid() = ANY(shared_with)
    )
  );

CREATE POLICY "quotes: entity member insert own"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (entity_id = current_entity_id() AND created_by = auth.uid());

CREATE POLICY "quotes: creator updates"
  ON public.quotes FOR UPDATE TO authenticated
  USING (entity_id = current_entity_id() AND created_by = auth.uid());

-- QUOTE ENTRIES
CREATE POLICY "quote_entries: superadmin all"
  ON public.quote_entries FOR ALL TO authenticated USING (is_superadmin()) WITH CHECK (is_superadmin());

CREATE POLICY "quote_entries: entity admin full"
  ON public.quote_entries FOR ALL TO authenticated
  USING (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND entity_id = current_entity_id())
  )
  WITH CHECK (
    is_entity_admin() AND
    EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND entity_id = current_entity_id())
  );

CREATE POLICY "quote_entries: read on visible quote"
  ON public.quote_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_id
        AND quotes.entity_id = current_entity_id()
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "quote_entries: insert own on visible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_id
        AND quotes.entity_id = current_entity_id()
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

CREATE POLICY "quote_entries: update own"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "quote_entries: delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==============================================================================
-- 6. AUTO-PROFILE TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, entity_id, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NULLIF(NEW.raw_user_meta_data->>'entity_id', '')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE)
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name         = EXCLUDED.display_name,
    role                 = EXCLUDED.role,
    entity_id            = EXCLUDED.entity_id,
    must_change_password = EXCLUDED.must_change_password;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. STORAGE BUCKET: invoices
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Storage: Authenticated users can upload invoices" ON storage.objects;
CREATE POLICY "Storage: Authenticated users can upload invoices"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Storage: Anyone can read invoice images" ON storage.objects;
CREATE POLICY "Storage: Anyone can read invoice images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices');

-- ==============================================================================
-- To create the first superadmin after running this migration:
-- 1. Create user via Supabase Auth dashboard (Authentication > Users > Add user)
-- 2. Then run: UPDATE public.profiles SET role = 'superadmin', entity_id = NULL WHERE email = 'your@email.com';
-- (Note: profiles.email doesn't exist — join via auth.users)
-- Better: UPDATE public.profiles SET role = 'superadmin', entity_id = NULL WHERE id = '<user-uuid>';
-- ==============================================================================
