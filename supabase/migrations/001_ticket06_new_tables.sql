-- ==============================================================================
-- Migration 001 — TICKET-06: New tables & schema additions
-- Safe to run on an existing database. Touches nothing already in production.
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Add calendar columns to projects (no-op if already present)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. LABOUR ENTRIES
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

-- 3. CLIENTS
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

-- 4. QUOTES
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

-- 5. QUOTE ENTRIES
CREATE TABLE IF NOT EXISTS public.quote_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_description TEXT NOT NULL,
  amount_huf INTEGER NOT NULL CHECK (amount_huf > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_labour_entries_project_id ON public.labour_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_labour_entries_uploaded_by ON public.labour_entries(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_entries_quote_id ON public.quote_entries(quote_id);

-- 7. Enable RLS
ALTER TABLE public.labour_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_entries ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: LABOUR_ENTRIES
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

-- 9. RLS Policies: CLIENTS
DROP POLICY IF EXISTS "Clients: admin full access" ON public.clients;
CREATE POLICY "Clients: admin full access"
  ON public.clients FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Clients: authenticated users can read" ON public.clients;
CREATE POLICY "Clients: authenticated users can read"
  ON public.clients FOR SELECT TO authenticated USING (true);

-- 10. RLS Policies: QUOTES
DROP POLICY IF EXISTS "Quotes: admin full access" ON public.quotes;
CREATE POLICY "Quotes: admin full access"
  ON public.quotes FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Quotes: authenticated users can read" ON public.quotes;
CREATE POLICY "Quotes: authenticated users can read"
  ON public.quotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Quotes: authenticated users can insert" ON public.quotes;
CREATE POLICY "Quotes: authenticated users can insert"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Quotes: creator can update status" ON public.quotes;
CREATE POLICY "Quotes: creator can update status"
  ON public.quotes FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- 11. RLS Policies: QUOTE_ENTRIES
DROP POLICY IF EXISTS "Quote entries: admin full access" ON public.quote_entries;
CREATE POLICY "Quote entries: admin full access"
  ON public.quote_entries FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Quote entries: authenticated users can read" ON public.quote_entries;
CREATE POLICY "Quote entries: authenticated users can read"
  ON public.quote_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Quote entries: authenticated users can insert own" ON public.quote_entries;
CREATE POLICY "Quote entries: authenticated users can insert own"
  ON public.quote_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Quote entries: users can delete own" ON public.quote_entries;
CREATE POLICY "Quote entries: users can delete own"
  ON public.quote_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());
