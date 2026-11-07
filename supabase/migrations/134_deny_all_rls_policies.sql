-- Migration 134: Task 3 — Add deny-all fallback RLS policies + drop stale entity_id policies
--
-- Context: Migration 053 dropped current_entity_id() with CASCADE, which silently orphaned
-- every RLS policy that referenced it. Many tables now have RLS ENABLED but zero active
-- policies, causing Supabase dashboard warnings and leaving tables uncovered.
--
-- Part A: For every table that has RLS enabled but no policy at all, add an explicit
--         RESTRICTIVE "deny all" policy on anon and authenticated roles.
--         The app uses service_role for all data access — anon/authenticated should never
--         reach tables directly. This is defence-in-depth.
--
-- Part B: Drop any surviving policies that reference dropped columns/functions
--         (entity_id, current_entity_id, is_entity_admin). They would error if evaluated.
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── Part A: add deny-all to tables that have RLS on but no policies ─────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p
      ON p.tablename = t.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND p.policyname IS NULL
    ORDER BY t.tablename
  LOOP
    EXECUTE format(
      'CREATE POLICY "deny_all_direct_access"
         ON public.%I
         AS RESTRICTIVE
         FOR ALL
         TO anon, authenticated
         USING (false)',
      r.tablename
    );
    RAISE NOTICE 'Added deny_all_direct_access policy to %', r.tablename;
  END LOOP;
END $$;

-- ── Part B: drop stale policies referencing dropped entity_id columns/functions ──
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual        ILIKE '%entity_id%'
        OR qual     ILIKE '%current_entity_id%'
        OR qual     ILIKE '%is_entity_admin%'
        OR with_check ILIKE '%entity_id%'
      )
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'Dropped stale policy "%" on table "%"', r.policyname, r.tablename;
  END LOOP;
END $$;
