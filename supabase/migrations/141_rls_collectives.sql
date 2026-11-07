-- Migration 141: Enable RLS on collectives and collective_members
-- Required by: CLAUDE.md §14 (new tables must have deny-all policy)
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- These two tables were created before the deny-all RLS policy rule was
-- established. Without RLS, anyone holding the anon key can read all
-- collective names and member lists via the Supabase REST API directly.
-- The app uses service_role (bypasses RLS) so this is defence-in-depth only.

ALTER TABLE public.collectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_direct_access"
  ON public.collectives
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);

ALTER TABLE public.collective_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_direct_access"
  ON public.collective_members
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
