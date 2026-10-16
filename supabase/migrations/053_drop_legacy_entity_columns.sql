-- ============================================================
-- Migration 053: Drop legacy entity_id columns + stale RLS
-- ============================================================
-- Root cause: migration 011 created entity-based RLS policies on every
-- table that reference entity_id columns and current_entity_id().
-- Migration 052 added new owner_id/collective_id columns but left these
-- policies intact, so PostgreSQL refuses to drop the old columns.
--
-- The app uses createAdminClient() (service role) for all data access —
-- RLS is bypassed entirely and these policies were never enforced.
--
-- Order: DROP policies → DROP helper functions → DROP columns
-- ============================================================

-- ── 1. Drop all old entity-based RLS policies ────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "profiles: entity admin manages own entity" ON public.profiles;
DROP POLICY IF EXISTS "profiles: entity members read"             ON public.profiles;

-- projects
DROP POLICY IF EXISTS "projects: entity admin full access"        ON public.projects;
DROP POLICY IF EXISTS "projects: members can read"                ON public.projects;

-- project_members (references entity_id via subquery on projects)
DROP POLICY IF EXISTS "project_members: entity admin full"        ON public.project_members;

-- invoices (references entity_id via subquery on projects)
DROP POLICY IF EXISTS "invoices: entity admin full"               ON public.invoices;

-- labour_entries
DROP POLICY IF EXISTS "labour: entity admin full"                 ON public.labour_entries;
DROP POLICY IF EXISTS "labour: member deletes own"                ON public.labour_entries;

-- clients
DROP POLICY IF EXISTS "clients: entity admin full"                ON public.clients;
DROP POLICY IF EXISTS "clients: entity members read"              ON public.clients;

-- quotes
DROP POLICY IF EXISTS "quotes: entity admin full"                 ON public.quotes;
DROP POLICY IF EXISTS "quotes: visible to creator and shared"     ON public.quotes;
DROP POLICY IF EXISTS "quotes: entity member insert own"          ON public.quotes;
DROP POLICY IF EXISTS "quotes: creator updates"                   ON public.quotes;

-- quote_entries (references entity_id via subquery on quotes)
DROP POLICY IF EXISTS "quote_entries: entity admin full"          ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: read on visible quote"      ON public.quote_entries;
DROP POLICY IF EXISTS "quote_entries: insert own on visible quote" ON public.quote_entries;

-- payment_plan (migration 045)
DROP POLICY IF EXISTS "payment_plan: entity admin full"           ON public.payment_plan_items;
DROP POLICY IF EXISTS "payment_item_files: entity admin full"     ON public.payment_item_files;

-- ── 2. Drop old entity helper functions ─────────────────────────────────────
-- CASCADE drops any remaining policies that still depend on these functions.
DROP FUNCTION IF EXISTS public.current_entity_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_entity_admin()   CASCADE;

-- ── 3. Drop legacy entity_id columns ────────────────────────────────────────

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS entity_id,
  DROP COLUMN IF EXISTS current_entity_id;

ALTER TABLE public.projects       DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.quotes         DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.surveys        DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.clients        DROP COLUMN IF EXISTS entity_id;

-- ── Child tables (also had entity_id inherited from old model) ────────────────
ALTER TABLE public.project_rooms  DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.quote_sections DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.survey_entries DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.diary_entries  DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.diary_photos   DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.ideas          DROP COLUMN IF EXISTS entity_id;
