-- Migration 136: Task 6a — RLS helper functions for the new owner_id/collective_id schema
--
-- These functions are used by the RLS policies in migrations 137 and 138.
-- All are SECURITY DEFINER (run as the function owner, not the caller) to avoid
-- RLS recursion when querying profiles/collective_members from within a policy.
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── is_superadmin() ──────────────────────────────────────────────────────────────
-- Returns true if the calling user has role='superadmin' in profiles.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
$$;

-- ── is_collective_owner_or_admin(UUID) ───────────────────────────────────────────
-- Returns true if the calling user is an active owner or admin of the given collective.
CREATE OR REPLACE FUNCTION public.is_collective_owner_or_admin(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collective_members
    WHERE collective_id = c_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- ── is_collective_member(UUID) ───────────────────────────────────────────────────
-- Returns true if the calling user is any active member of the given collective.
CREATE OR REPLACE FUNCTION public.is_collective_member(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collective_members
    WHERE collective_id = c_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
$$;
