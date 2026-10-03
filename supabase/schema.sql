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
    WHERE id = auth.uid() AND role = 'admin'
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
  USING (auth.uid() = id OR public.is_admin() OR EXISTS (
    -- Allow members in the same project to see each other's names
    SELECT 1 FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
  ));

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

-- 13. STORAGE BUCKET: invoices
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
