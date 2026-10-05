-- ==============================================================================
-- EPITEK - Database Schema & Security Policies for Supabase
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROJECT MEMBERS (Many-to-Many: users <-> projects)
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploader_name TEXT,
  image_url TEXT,
  storage_path TEXT,
  value_huf INTEGER NOT NULL CHECK (value_huf > 0),
  ocr_suggested_value INTEGER,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'Anyag',
    'Munka',
    'Szerszám/Eszköz',
    'Szállítás',
    'Engedély/Hatóság',
    'Egyéb'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_uploaded_by ON public.invoices(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);

-- 6. HELPER FUNCTIONS FOR RLS (Security Definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
$$;

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES: PROFILES
DROP POLICY IF EXISTS "Profiles: view own or admin" ON public.profiles;
CREATE POLICY "Profiles: view own or admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      -- Allow any member to see everyone in the same entity
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.entity_id = profiles.entity_id
    )
  );

DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;
CREATE POLICY "Profiles: user can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9. POLICIES: PROJECTS
DROP POLICY IF EXISTS "Projects: admin full access" ON public.projects;
CREATE POLICY "Projects: admin full access"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Projects: members can read" ON public.projects;
CREATE POLICY "Projects: members can read"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(id));

-- 10. POLICIES: PROJECT_MEMBERS
DROP POLICY IF EXISTS "Project Members: admin full access" ON public.project_members;
CREATE POLICY "Project Members: admin full access"
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Project Members: members can read" ON public.project_members;
CREATE POLICY "Project Members: members can read"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_project_member(project_id));

-- 11. POLICIES: INVOICES
DROP POLICY IF EXISTS "Invoices: admin full access" ON public.invoices;
CREATE POLICY "Invoices: admin full access"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Invoices: project members can read" ON public.invoices;
CREATE POLICY "Invoices: project members can read"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Invoices: project members can insert own invoice" ON public.invoices;
CREATE POLICY "Invoices: project members can insert own invoice"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    public.is_project_member(project_id)
  );

-- Note: Normal users CANNOT update or delete invoices (only Admin has ALL)

-- 12. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, TRUE)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- TICKET-06 ADDITIONS: Labour entries, Clients, Quotes, Quote Entries
-- Also: Projects gets start_date/end_date for calendar; invoices loses 'Munka' category
-- ==============================================================================

-- 13. PROJECTS: Add calendar date columns + client link
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);

-- 14. INVOICES: Remove 'Munka' category (labour is now tracked separately)
-- First migrate existing 'Munka' invoices to 'Egyéb'
UPDATE public.invoices SET category = 'Egyéb' WHERE category = 'Munka';
-- Drop old constraint and recreate without 'Munka'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_category_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_category_check
  CHECK (category IN ('Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'));

-- 15. LABOUR ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.labour_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  labour_type TEXT NOT NULL,
  hours DECIMAL(6, 2) NOT NULL CHECK (hours > 0),
  hourly_rate INTEGER NOT NULL CHECK (hourly_rate > 0),
  value_huf INTEGER NOT NULL CHECK (value_huf > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  discount_percent DECIMAL(4, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. QUOTES TABLE
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  location TEXT,
  work_type TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. QUOTE ENTRIES TABLE (multi-contributor)
CREATE TABLE IF NOT EXISTS public.quote_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_description TEXT NOT NULL,
  amount_huf INTEGER NOT NULL CHECK (amount_huf > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. INDEXES for new tables
CREATE INDEX IF NOT EXISTS idx_labour_entries_project_id ON public.labour_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_labour_entries_uploaded_by ON public.labour_entries(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_entries_quote_id ON public.quote_entries(quote_id);

-- 20. ENABLE RLS on new tables
ALTER TABLE public.labour_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_entries ENABLE ROW LEVEL SECURITY;

-- 21. POLICIES: LABOUR_ENTRIES
DROP POLICY IF EXISTS "Labour: admin full access" ON public.labour_entries;
CREATE POLICY "Labour: admin full access"
  ON public.labour_entries FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Labour: project members can read" ON public.labour_entries;
CREATE POLICY "Labour: project members can read"
  ON public.labour_entries FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Labour: members can insert own entry" ON public.labour_entries;
CREATE POLICY "Labour: members can insert own entry"
  ON public.labour_entries FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_project_member(project_id));

DROP POLICY IF EXISTS "Labour: members can delete own entry" ON public.labour_entries;
CREATE POLICY "Labour: members can delete own entry"
  ON public.labour_entries FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- 22. POLICIES: CLIENTS
DROP POLICY IF EXISTS "Clients: admin full access" ON public.clients;
CREATE POLICY "Clients: admin full access"
  ON public.clients FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Clients: authenticated users can read" ON public.clients;
DROP POLICY IF EXISTS "Clients: members can read entity clients" ON public.clients;
CREATE POLICY "Clients: members can read entity clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.entity_id = clients.entity_id
    )
  );

-- 23. POLICIES: QUOTES
DROP POLICY IF EXISTS "Quotes: admin full access" ON public.quotes;
CREATE POLICY "Quotes: admin full access"
  ON public.quotes FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Quotes: authenticated users can read" ON public.quotes;
DROP POLICY IF EXISTS "Quotes: visible to creator, shared members and admin" ON public.quotes;
CREATE POLICY "Quotes: visible to creator, shared members and admin"
  ON public.quotes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
    OR auth.uid() = ANY(shared_with)
  );

DROP POLICY IF EXISTS "Quotes: authenticated users can insert" ON public.quotes;
CREATE POLICY "Quotes: authenticated users can insert"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Quotes: creator can update status" ON public.quotes;
DROP POLICY IF EXISTS "Quotes: creator or admin can update" ON public.quotes;
CREATE POLICY "Quotes: creator or admin can update"
  ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_admin() OR created_by = auth.uid());

-- 24. POLICIES: QUOTE_ENTRIES
DROP POLICY IF EXISTS "Quote entries: admin full access" ON public.quote_entries;
CREATE POLICY "Quote entries: admin full access"
  ON public.quote_entries FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Quote entries: authenticated users can read" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: visible on accessible quotes" ON public.quote_entries;
CREATE POLICY "Quote entries: visible on accessible quotes"
  ON public.quote_entries FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own" ON public.quote_entries;
DROP POLICY IF EXISTS "Quote entries: insert own on visible quote" ON public.quote_entries;
CREATE POLICY "Quote entries: insert own on visible quote"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (public.is_admin() OR quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

DROP POLICY IF EXISTS "Quote entries: users can update own on visible quote" ON public.quote_entries;
CREATE POLICY "Quote entries: users can update own on visible quote"
  ON public.quote_entries FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_entries.quote_id
        AND (public.is_admin() OR quotes.created_by = auth.uid() OR auth.uid() = ANY(quotes.shared_with))
    )
  );

DROP POLICY IF EXISTS "Quote entries: users can delete own" ON public.quote_entries;
CREATE POLICY "Quote entries: users can delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 25. STORAGE BUCKET: invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Storage: Authenticated users can upload invoices" ON storage.objects;
CREATE POLICY "Storage: Authenticated users can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Storage: Anyone can read invoice images" ON storage.objects;
CREATE POLICY "Storage: Anyone can read invoice images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices');
