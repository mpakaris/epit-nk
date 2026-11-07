-- Migration 139: Drop legacy entities and memberships tables
-- Required by: CLAUDE.md Task 11d
-- Code fully migrated to collectives/collective_members (migration 052+)
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- IMPORTANT: Run after verifying no active code references these tables.
-- The static analysis test in tests/db-rules.test.js (Test 11) confirms this.

DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;
