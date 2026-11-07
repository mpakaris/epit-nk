-- Migration 135: Task 2 — Revoke all direct table access from anon and authenticated roles
--
-- Context: The anon key is public (NEXT_PUBLIC_SUPABASE_ANON_KEY). Anyone can use it to
-- call the Supabase REST API directly, bypassing the Next.js API layer entirely.
-- Since all app data access goes through Next.js API routes using the service_role key,
-- the anon and authenticated Postgres roles have no legitimate reason to touch any table.
--
-- This migration closes that exposure gap. After this runs:
--   - Direct REST calls with the anon key → 403 (no table privilege)
--   - App traffic via service_role → unchanged (service_role bypasses both RLS and grants)
--   - Auth calls (supabase.auth.*) → unchanged (auth schema is separate)
--
-- Prerequisite: Migration 134 must be applied first (adds deny-all policies so the intent
-- is explicit even before this REVOKE takes effect).
--
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Revoke all table access from anon (unauthenticated REST calls)
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Revoke all table access from authenticated (JWT-authenticated REST calls)
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Keep sequence access — needed by Postgres internals for serial columns
-- (service_role retains full access; this only affects anon/authenticated)
