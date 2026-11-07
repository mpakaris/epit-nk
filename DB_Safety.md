# DB Safety & Egress Reduction Plan

> **Status:** Planning only — no implementation started.  
> Run each task in a **separate agent session** (clear context between tasks) to stay within token limits.  
> Every SQL block must be run in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

---

## Background — Current State

The app uses three Supabase clients:
- `createAdminClient()` — service role key; **bypasses all RLS**; used by ~140 API routes
- `createClient()` server — anon key + JWT cookie; used only for `supabase.auth.getUser()` identity checks
- `createClient()` browser — anon key; used in client components for auth state only

**RLS is enabled on many tables but universally bypassed** because every data query uses the service role. This is intentional per CLAUDE.md: "RLS exists but is NOT enforced by the app — access control is done at application level."

The warnings in the Supabase dashboard are caused by:
1. Migration 053 dropped `current_entity_id()` and `is_entity_admin()` with `CASCADE`, which silently orphaned or broke every policy that depended on those functions across ~15 tables.
2. Tables added in migrations 012–046 have RLS **enabled** but now have **zero active policies** (all were entity-based and dropped by cascade). Supabase warns when RLS is on but no policy covers authenticated access.
3. `schema.sql` (kept as reference) still contains policies referencing `profiles.entity_id` — a column dropped in migration 053. If this file is ever re-run it will error.

---

## Task 1 — Audit: inventory every RLS policy currently live in the DB

**Goal:** Produce a list of what policies actually exist right now (after all 128 migrations). This is the reference baseline before making any changes.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to audit the current state of Row Level Security (RLS) in the production database to understand what policies are live before we start any cleanup.

Please run the following SQL queries in the Supabase SQL Editor (Dashboard → SQL Editor) and collect the full output. I need you to report:

1. All tables in the `public` schema that have RLS enabled:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

2. All currently active RLS policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

3. All Postgres functions in the public schema that relate to auth/RLS:
SELECT proname, prosrc
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE pg_namespace.nspname = 'public'
AND proname IN ('is_admin','is_project_member','is_superadmin','is_entity_admin','current_entity_id','handle_new_user');

Report the full results so I can decide which policies are stale, which are still needed, and which tables are missing coverage entirely.
```

**Output needed:** A complete table-by-table list of: RLS enabled Y/N, policy names, and which functions are still alive.

---

## Task 2 — Stop the Supabase warnings: revoke direct table access from anon + authenticated roles

**Goal:** The anon key is public (exposed in `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Anyone can use it to query the Supabase REST API directly, hitting your tables without going through your Next.js API layer. Since all app traffic uses the service role, the `anon` and `authenticated` roles do not need direct table access at all.

Revoking their access closes the exposure gap AND stops the "no policy covers this role" warnings.

**Prerequisite:** Complete Task 1 first — confirm no code path uses the anon key for data reads (search the codebase: `createClient()` from `supabase/client.js` or `supabase/server.js` should only call `supabase.auth.*`, never `.from(...).select(...)`).

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. All data queries go through Next.js API routes that use the Supabase service_role key (bypasses RLS). The anon key is only used for auth.getUser() — it never does data reads or writes. I want to revoke direct table access from the `anon` and `authenticated` Postgres roles so that no one can bypass the API by calling the Supabase REST endpoint directly with the anon key.

Task: Search the codebase for any code that uses createClient() (browser or server, NOT createAdminClient) and calls .from(...).select/insert/update/delete. These are in:
- src/lib/supabase/client.js (browser client, uses anon key)
- src/lib/supabase/server.js (server client, uses anon key + JWT)

Check every file that imports from these two paths. For each usage, verify whether it is:
(a) only auth calls: supabase.auth.getUser(), supabase.auth.signIn(), etc. → safe to keep
(b) data calls: supabase.from('table').select() etc. → these would break after revoking table access

Report all findings. If there are NO data calls via the non-admin client, confirm that it is safe to run the following SQL to revoke table access:

-- Revoke all table access from anon and authenticated roles
-- The app uses service_role for all data; these roles have no business accessing tables directly
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Keep sequence access (needed for auth internals)
-- Do NOT revoke from service_role — that's what the app uses

Do NOT run the SQL yet — just confirm whether it is safe to do so and report any exceptions found.
```

---

## Task 3 — Drop stale RLS policies and add "deny all" fallback policies

**Goal:** After migration 053 dropped `current_entity_id()` CASCADE, many tables have RLS enabled but zero policies. Supabase generates a warning for each. The fix is explicit: add a `DENY ALL` policy so the intent is clear and the warning goes away.

Additionally, `schema.sql` and migrations 009, 046, and the schema.sql profiles policy still reference `entity_id`. These need to be identified in the SQL Editor by querying `pg_policies` for any `qual` that references `entity_id` or dropped functions.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. The database uses service_role for all data access — RLS is intentionally bypassed. However, Supabase shows warnings because many tables have RLS enabled but no applicable policies (the old policies were dropped by a CASCADE in migration 053).

I need to silence the warnings by adding an explicit "deny all" policy on every table that has RLS enabled but no current policies. This policy denies access to the `anon` and `authenticated` roles, which is the correct state since the service_role handles everything.

Step 1: Run this query to find tables with RLS on but no policies:
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL;

Step 2: For each table in that list, generate and run this SQL (replace <tablename>):
CREATE POLICY "deny_all_direct_access"
  ON public.<tablename>
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

Step 3: Run the pg_policies query again to confirm no tables have RLS on + zero policies.

Step 4: Check for any surviving policies that still reference old entity_id columns or dropped functions:
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual ILIKE '%entity_id%'
    OR qual ILIKE '%current_entity_id%'
    OR qual ILIKE '%is_entity_admin%'
    OR with_check ILIKE '%entity_id%'
  );

Drop any policies found in Step 4 — they reference dropped columns/functions and will error if ever evaluated.

Report all SQL run and all results.
```

---

## Task 4 — Harden the cron endpoint (fail-closed)

**Goal:** `src/app/api/cron/expire-transfers/route.js` only checks `CRON_SECRET` if the env var is set. If the variable is missing from the environment, the endpoint is wide open to anyone who calls it. It needs to fail closed: if the secret is not configured, reject the request.

**File:** `src/app/api/cron/expire-transfers/route.js`

**Current code (line 9–11):**
```js
const secret = request.headers.get('x-cron-secret');
if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

**Fix (fail-closed):**
```js
const secret = request.headers.get('x-cron-secret');
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. There is a security issue in the cron endpoint at src/app/api/cron/expire-transfers/route.js.

The current auth check on lines 9–11 reads:
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)

This means: if CRON_SECRET is not set in the environment, the condition is falsy and the check is skipped — the endpoint is wide open.

Change the condition to fail-closed:
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)

This way: if CRON_SECRET is missing OR the provided secret doesn't match, return 401.

Make only this single change. Do not refactor anything else in the file. After the change, confirm the edit was applied correctly by reading the file back.
```

---

## Task 5 — Narrow SELECT * in entity/data and profile queries

**Goal:** Many API routes use `SELECT *` or `SELECT '*, sensitive_col'` unnecessarily. The main bulk fetch at `src/app/api/entity/data/route.js` fetches all columns from `profiles` including `must_change_password`, `trial_started_at`, `trial_ends_at`, subscription data, and other sensitive fields that the frontend doesn't need in the global context array.

This reduces:
1. **Egress** — fewer bytes transferred per request
2. **Data leakage surface** — if any client component accidentally exposes context data, it can't leak what wasn't fetched

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I want to narrow the SELECT columns in the main data fetch route at src/app/api/entity/data/route.js and in a few other routes to reduce egress and limit data surface.

Current state: several queries use SELECT * or select many sensitive columns unnecessarily.

Task:
1. Read src/app/api/entity/data/route.js fully.
2. Find every admin.from('profiles').select() call in that file.
3. For each one, determine what fields the UI actually uses by searching for usages of the `users` array in the AppContext and in components. The AppContext exposes this as `users` from useApp().
4. Replace the SELECT * with only the fields that are actually read in the UI. As a minimum, exclude: trial_started_at, trial_ends_at, must_change_password, gdpr_consented_at, offer_validity_days, offer_terms_text, payment_deadline_days, payment_method, deposit_percent, warranty_months (these are only needed in profile settings pages, not in the global context array).
5. Keep: id, display_name, role, email, active_collective_id, is_subscription_premium, subscription_tier, company_name, locale, currency, collective_role (the joined field).

Do not change any logic — only the select() column lists. After each change, verify the UI still works by checking what the AppContext and components read from the users array.

Report: which fields were removed from each query, and confirm no component depends on a removed field.
```

---

## Task 6 — Write proper RLS policies for the new owner_id / collective_id schema (Full hardening)

**Goal:** This is the "Phase 3" full security hardening. Replace the application-level-only access control with proper RLS policies that match the current DB schema (`owner_id`, `collective_id`, `auth.uid()`). Once this is done, even if the API layer is bypassed, the DB refuses cross-user data access.

**Scope:** Core tables — `projects`, `quotes`, `surveys`, `clients`, `invoices`, `labour_entries`, `quote_entries`, `quote_sections`, `project_rooms`, `diary_entries`.

**This is a large task — split into sub-tasks:**

### 6a — Write and test the new RLS helper functions

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to write new Postgres helper functions for RLS policies that work with the current schema (post-migration 052/053 — no more entity_id).

The current schema uses:
- profiles.active_collective_id (nullable UUID) — which collective the user is currently viewing
- collective_members (collective_id, user_id, role, status) — membership table
- projects/quotes/surveys: owner_id (UUID), collective_id (nullable UUID)
- clients: owner_id (UUID, always personal, never shared)

Write these helper functions in SQL (run in Supabase SQL Editor):

1. is_superadmin() — returns true if the calling user has role='superadmin' in profiles
2. is_collective_owner_or_admin(c_id UUID) — returns true if the calling user is a member of collective c_id with role in ('owner','admin') and status='active'
3. is_collective_member(c_id UUID) — returns true if the calling user is any active member of collective c_id

Important constraints:
- All functions must be SECURITY DEFINER to avoid RLS recursion on profiles
- All functions must SET search_path = public
- All functions must be STABLE (read-only)
- Do NOT use current_entity_id() — that function was dropped

Write the SQL, explain each function, and note which existing function (is_admin, is_project_member) can be reused vs replaced.
```

### 6b — Write RLS policies for projects, quotes, surveys (documents)

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to write RLS policies for the three main document tables: projects, quotes, surveys.

Access rules (from CLAUDE.md):
- Personal document: owner_id = user.id AND collective_id IS NULL — only the owner can see/edit/delete
- Collective document: collective_id = X — all active members of collective X can read; only owner/admin can edit/delete
- Superadmin: can see everything (no code-level bypass — use the is_superadmin() function)

The helper functions is_superadmin(), is_collective_owner_or_admin(UUID), is_collective_member(UUID) are already defined (from Task 6a).

Write RLS policies for each of the three tables covering SELECT, INSERT, UPDATE, DELETE operations:

For SELECT:
- Own personal docs: owner_id = auth.uid() AND collective_id IS NULL
- Collective docs (member can read): collective_id IS NOT NULL AND is_collective_member(collective_id)
- Superadmin: is_superadmin()

For INSERT:
- Personal: owner_id = auth.uid() AND collective_id IS NULL
- Collective (owner/admin only): collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id)

For UPDATE/DELETE:
- Personal owner: owner_id = auth.uid() AND collective_id IS NULL
- Collective owner/admin: collective_id IS NOT NULL AND is_collective_owner_or_admin(collective_id)
- Superadmin: is_superadmin()

Also add soft-delete awareness: all SELECT policies must check deleted_at IS NULL (or add a USING clause that includes it). The app always filters deleted_at in queries; RLS should enforce the same.

Write the full SQL. Run it in Supabase SQL Editor. Test by temporarily using the anon key in a test script to verify a user can only see their own data.
```

### 6c — Write RLS policies for child tables (invoices, labour, entries, sections, rooms, diary)

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to write RLS policies for the child tables: invoices, labour_entries, quote_entries, quote_sections, project_rooms, diary_entries.

These tables are always scoped via a parent document (project_id or quote_id). The parent's RLS policies are already written (Task 6b). For children, the access rule is: if you can see the parent, you can see the child. Write the policies as EXISTS subqueries on the parent table rather than repeating the full ownership logic.

For example, for invoices:
SELECT: EXISTS (SELECT 1 FROM projects WHERE projects.id = invoices.project_id AND [user can see this project])
INSERT: Same check on parent + user_id = auth.uid() (entries must be own)
UPDATE/DELETE: user_id = auth.uid() OR is_collective_owner_or_admin(parent.collective_id) [owner of entry OR collective admin]

Tables to cover:
- invoices (parent: projects.project_id)
- labour_entries (parent: projects.project_id)
- quote_entries (parent: quotes.quote_id)
- quote_sections (parent: quotes.quote_id)
- project_rooms (parent: projects.project_id)
- diary_entries (parent: projects.project_id; also check is_public flag for public access)

Also handle: clients — these are ALWAYS personal (owner_id = user.id, never collective). RLS: SELECT/UPDATE/DELETE only for owner_id = auth.uid() OR is_superadmin(). No collective sharing at the RLS level (collective sharing is handled via client_collective_shares table separately).

Write full SQL for all tables. Note which tables have no deleted_at column (diary_entries — use hard delete, no filter needed) vs which need the soft-delete filter.
```

---

## Task 7 — Egress reduction: add HTTP caching to entity/data endpoint

**Goal:** The main bulk fetch at `/api/entity/data` returns `Cache-Control: no-store`, which forces a full DB round-trip on every navigation. Adding a short-TTL `ETag` or `stale-while-revalidate` cache would let the browser serve from cache on tab switches and fast navigations.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. The main data fetch at src/app/api/entity/data/route.js currently returns Cache-Control: no-store on every response (line ~265). This means every page navigation triggers a full DB round-trip (~10 parallel Supabase queries).

I want to add ETag-based caching so that:
1. The first request returns the full payload + an ETag header (hash of the response body or a DB sequence/timestamp)
2. Subsequent requests from the same browser send If-None-Match: <etag>
3. If the data hasn't changed, the server returns 304 Not Modified (zero egress, zero DB query cost)
4. If the data has changed, it returns the new payload with a new ETag

The challenge: we need a cheap "has anything changed for this user?" signal without running all 10 queries. Options:
(a) Use MAX(updated_at) across projects+quotes+surveys for the user — cheap single query, good enough for 90% of cases
(b) Use a user-scoped sequence number stored in profiles that increments on any mutation

Implement option (a):
- Before running the full data fetch, run: SELECT GREATEST(MAX(updated_at), MAX(created_at)) FROM projects WHERE owner_id = userId AND deleted_at IS NULL (and same for quotes, surveys)
- Hash the result into an ETag
- Check the If-None-Match request header
- If they match: return 304
- If they don't match: run the full fetch and return 200 with the new ETag

Also change Cache-Control from no-store to: private, no-cache (allows ETag revalidation but doesn't store the body in shared caches).

Important: the entity/data route uses superadmin god-mode (cookie-based userId override). Make sure the ETag computation uses the effective userId (after god-mode resolution), not the authenticated user's ID.

Read the full file before making changes. Make only this caching change — do not refactor the data fetching logic.
```

---

## Task 8 — Egress reduction: lazy-load per-page detail data

**Goal:** Currently all invoices, labour entries, quote entries, sections, project rooms, and diary previews for the user are loaded in a single bulk fetch on every page load. Most of this data is only used when a user opens a specific project or quote — not on the dashboard or list pages.

This is the highest-impact egress reduction: split the bulk fetch into:
1. **Lightweight list fetch** — just the top-level records (projects, quotes, surveys, clients) with minimal columns for list cards
2. **Detail fetch on demand** — when a user opens a project/quote, fetch its children (invoices, labour, entries) at that point

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. The main data fetch at src/app/api/entity/data/route.js loads ALL invoices, labour_entries, quote_entries, quote_sections, project_rooms for the user in a single request. This creates high egress even when the user just navigates to the dashboard.

I want to split this into two tiers:

Tier 1 — fast bulk fetch (keep in entity/data):
- projects (all columns except heavy ones — keep as-is for now)
- quotes (all columns)
- surveys (with counts but NOT survey_entries detail)
- clients (all columns)
- users / collective members

Remove from entity/data:
- quoteEntries (move to on-demand)
- quoteSections (move to on-demand)
- labourEntries (move to on-demand)
- invoices (move to on-demand — keep the _total_ on the project card via a SUM, not raw rows)
- projectRooms (move to on-demand)

Tier 2 — on-demand fetch (new endpoints):
- GET /api/projects/[id]/detail — returns invoices, labour_entries, project_rooms for one project
- GET /api/quotes/[id]/detail — returns quote_entries, quote_sections for one quote

Before implementing:

1. Read src/app/api/entity/data/route.js and understand the full response shape
2. Search for every component that reads quoteEntries, quoteSections, labourEntries, invoices, projectRooms from the AppContext (src/context/AppContext.jsx) — list all of them
3. Check whether any of these are used on list/dashboard pages (would break if removed from bulk fetch) vs. only on detail pages
4. Report the findings and propose a minimal safe first step: which of the five arrays can be safely moved to on-demand without breaking any list page or card component

Do NOT implement yet — just research and report.
```

---

## Decision: Should GET requests bypass the API and use RLS directly?

**Short answer: not recommended for Epitek's current architecture — but partially viable for specific detail pages.**

**The problem with full GET-via-RLS:**
The workspace context (`active_collective_id`) is stored in `profiles` in the DB. Supabase RLS policies can only use `auth.uid()` and JWT claims. The active collective is NOT in the JWT, so RLS cannot filter "show me only this workspace's data" without reading profiles first.

To make workspace-scoped RLS work, you would need to either:
1. Store active_collective_id in the JWT (via Supabase custom claims hook) — this requires a DB trigger that updates the JWT whenever the user switches workspace, and the JWT TTL means there's a propagation delay
2. Write permissive RLS that shows ALL data the user has access to (personal + all collectives they're in) and do workspace filtering on the client — this changes the app's data model significantly

**The bigger performance trap:**
The current `entity/data` route runs ~10 queries in parallel and returns them in one HTTP round-trip. Moving to direct Supabase client calls would require 10+ parallel client-initiated queries, each with its own TLS handshake and connection overhead. Net result: often slower, not faster.

**Where GET-via-RLS DOES make sense (after Task 6 RLS is written):**
- Per-project detail pages: a single `SELECT * FROM invoices WHERE project_id = X` with RLS enforcing the user is a member — one query, low overhead, removes the API hop
- Per-quote detail pages: same pattern for quote_entries/quote_sections
- These are the "Tier 2 on-demand fetches" from Task 8 above — once RLS is in place, those new endpoints could optionally become direct Supabase client queries

**Recommended sequence:**
1. Tasks 1–5 (fix warnings and quick wins) — no architecture change
2. Task 7 (ETag caching) — biggest single egress win with minimal change
3. Task 8 research step — understand what can be lazy-loaded
4. Tasks 6a–6c (write proper RLS) — prerequisite for any client-direct queries
5. After 6a–6c: convert Tier 2 on-demand fetches to direct Supabase client queries using RLS

---

---

## Task 9 — Fix fail-open webhook signature verification (Creem payment webhook)

**Goal:** The Creem payment webhook at `src/app/api/webhooks/creem/route.js` has the same fail-open bug as the cron endpoint. Line 184:

```js
if (webhookSecret && signature) {   // ← only runs check if BOTH are present
```

If `CREEM_WEBHOOK_SECRET` is missing from env vars, the webhook accepts all requests with no verification — anyone can POST a fake `subscription.activated` event and get Premium for free.

**Fix (fail-closed):** Reject the request if the secret is not configured OR if the signature doesn't match.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. There is a critical security vulnerability in the Creem payment webhook at src/app/api/webhooks/creem/route.js.

Current code around line 184:
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    if (!verifySignature(body, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

This is fail-open: if CREEM_WEBHOOK_SECRET is missing from environment variables, the webhook accepts ALL incoming requests. A malicious actor can POST a fake subscription activation event and grant themselves Premium access.

Change to fail-closed: reject if the secret is not set OR if the signature is missing OR if the signature is invalid.

New logic:
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[creem webhook] CREEM_WEBHOOK_SECRET is not configured — rejecting request');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  if (!signature || !verifySignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

Read the file fully before making the change. Make only this change — do not alter any other logic. After editing, read the relevant lines back to confirm the fix is correct.
```

---

## Task 10 — Global rate limiting on expensive and public endpoints

**Goal:** The existing `src/lib/rateLimit.js` is in-process only — it resets on cold starts and doesn't work across parallel Vercel serverless instances. For security-sensitive and expensive endpoints, rate limits must be enforced globally via a shared store (Upstash Redis or Vercel KV).

**Endpoints that need rate limiting:**

| Endpoint | Risk | Suggested limit |
|---|---|---|
| `POST /api/auth/request-password-reset` | Email bombing / account enumeration | 5/hour per IP |
| `POST /api/quotes/[id]/send` | Puppeteer PDF + SMTP per call | 10/hour per user |
| `POST /api/ocr` | External Google Vision API, paid per call | 20/hour per user |
| `POST /api/invoice-ai` | External AI API, paid per call | 20/hour per user |
| `POST /api/szakemberek/[slug]/contact` | Public contact form spam | 5/hour per IP |

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. The current rate limiter in src/lib/rateLimit.js uses an in-process Map — it doesn't work across multiple Vercel serverless instances and resets on cold starts.

I need to implement a production-grade rate limiter using Upstash Redis (or Vercel KV, which uses Upstash under the hood). The package @upstash/ratelimit and @upstash/redis are the standard choice.

Task:
1. Add @upstash/ratelimit and @upstash/redis to package.json
2. Create src/lib/rateLimitGlobal.js that exports a globalRateLimit(key, { limit, window }) function backed by Upstash
3. Add the following env vars to .env.local (I will fill in the values):
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
4. Apply global rate limiting to these 5 routes:
   - src/app/api/auth/request-password-reset/route.js (5 per hour per IP)
   - src/app/api/quotes/[id]/send/route.js (10 per hour per userId)
   - src/app/api/ocr/route.js (20 per hour per userId)
   - src/app/api/invoice-ai/route.js (20 per hour per userId)
   - src/app/api/szakemberek/[slug]/contact/route.js (5 per hour per IP)

For IP-based limits, use the getClientIp() function from src/lib/rateLimit.js.
For user-based limits, use user.id from the existing auth.getUser() call in each route.

The rate limiter must be gracefully degraded: if Upstash is unreachable (network error), log a warning and allow the request through (don't fail the whole endpoint). Rate limiting is defence-in-depth — availability is more important than perfect enforcement.

Read each target route before modifying it. Return 429 with a JSON error on rate limit exceeded. Do not change any other logic in the routes.
```

---

## Task 11 — Fix three schema gaps + apply pending migrations

**Goal:** Three tables/columns are missing from the DB schema, causing runtime errors or rule violations. Two additional migrations are pending. All must be applied before scaling.

**Sub-task A — survey_items table (causes 500 on any survey item API call)**
```sql
CREATE TABLE IF NOT EXISTS public.survey_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  entry_id    UUID REFERENCES public.survey_entries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    DECIMAL(10, 2),
  unit        TEXT,
  unit_price  INTEGER,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_survey_items_survey_id ON public.survey_items(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_items_entry_id  ON public.survey_items(entry_id);
ALTER TABLE public.survey_items ENABLE ROW LEVEL SECURITY;
```

**Sub-task B — diary_entries.deleted_at and ideas.deleted_at columns (soft-delete rule violation)**

Both tables are user content (listed in CLAUDE.md §4) but were created before the soft-delete rule was enforced — neither has a `deleted_at` column, so their routes currently use hard `.delete()`. The routes must also be updated after the column is added.

```sql
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_diary_entries_deleted_at ON public.diary_entries(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_ideas_deleted_at ON public.ideas(deleted_at) WHERE deleted_at IS NULL;
```

After running the SQL, update the routes:
- `src/app/api/diary/[id]/route.js:111` — change `.delete()` to `.update({ deleted_at: new Date().toISOString() })`
- `src/app/api/ideas/[id]/route.js:22` — same change
- All list queries on both tables must add `.is('deleted_at', null)` filter

**Sub-task C — inclusive collective race condition unique index**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS one_inclusive_per_owner
ON collective_members (user_id)
WHERE role = 'owner' AND status = 'active'
AND collective_id IN (SELECT id FROM collectives WHERE is_inclusive = true);
```

**Sub-task D — Migration 054: drop legacy entities and memberships tables**
Only apply after confirming no code paths reference `entities` or `memberships` tables directly.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to apply four schema fixes. Run each in the Supabase SQL Editor (Dashboard → SQL Editor) in order.

Before starting:
1. Run this query to verify the current state:
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

Fix A — Create survey_items table (referenced in code but missing from DB):
[paste Sub-task A SQL above]

Fix B — Add deleted_at to diary_entries (required by soft-delete rule):
[paste Sub-task B SQL above]
Then verify: all API routes that query diary_entries must add .is('deleted_at', null) filter.
Search src/app/api for all queries on diary_entries and add the filter where missing.

Fix C — Unique index for inclusive collective race condition:
[paste Sub-task C SQL above]

Fix D — Check if entities/memberships tables are still referenced in code:
grep -r "from('entities')\|from('memberships')" src/
If nothing is found (or only legacy/commented code), run:
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;

Report the result of each step.
```

---

## Task 12 — Add composite indexes for the main query patterns

**Goal:** The main data fetch (`entity/data`) queries by `(owner_id, collective_id, deleted_at)` on projects, quotes, and surveys. Only single-column indexes currently exist. With growing user data, Postgres will sequential-scan instead of using an index efficiently.

**Agent Prompt:**
```
I am working on a Next.js + Supabase project called Epitek. I need to add composite indexes for the most frequent query patterns used by the main data fetch endpoint (src/app/api/entity/data/route.js).

The main patterns are:
1. Personal context: WHERE owner_id = X AND collective_id IS NULL AND deleted_at IS NULL
2. Collective context: WHERE collective_id = X AND deleted_at IS NULL

These patterns apply to: projects, quotes, surveys.

Also needed:
3. Invoices and labour_entries are always fetched by project_id — verify an index exists on each.
4. quote_entries and quote_sections are fetched by quote_id — verify indexes exist.

Step 1: Run this query to see existing indexes:
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('projects', 'quotes', 'surveys', 'invoices', 'labour_entries', 'quote_entries', 'quote_sections') ORDER BY tablename, indexname;

Step 2: Create missing composite indexes. For each of projects, quotes, surveys:
CREATE INDEX IF NOT EXISTS <table>_personal_idx
  ON public.<table> (owner_id, deleted_at)
  WHERE collective_id IS NULL;

CREATE INDEX IF NOT EXISTS <table>_collective_idx
  ON public.<table> (collective_id, deleted_at)
  WHERE collective_id IS NOT NULL;

Step 3: Verify invoices and labour_entries have an index on project_id; quote_entries and quote_sections have an index on quote_id. Create any that are missing.

Step 4: Run EXPLAIN ANALYZE on a representative query to confirm index is used:
EXPLAIN ANALYZE SELECT * FROM projects WHERE owner_id = '<any real user UUID>' AND collective_id IS NULL AND deleted_at IS NULL;

Report the before/after index state and the EXPLAIN output.
```

---

## Implementation Status

### Code changes (applied — deploy these)
| Task | Status | Notes |
|---|---|---|
| Task 4 — Cron endpoint fail-closed | ✅ Done | `cron/expire-transfers/route.js` |
| Task 9 — Creem webhook fail-closed | ✅ Done | `webhooks/creem/route.js` |
| Task 10 — Global rate limiting | ✅ Done | `src/lib/rateLimitGlobal.js` + 5 routes — **needs `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in `.env.local`** |
| Task 5 — Narrow SELECT * in entity/data | ✅ Done | Explicit PROFILE_COLS list; excludes 10 sensitive fields |
| Task 7 — ETag caching on entity/data | ✅ Done | 304 on unchanged data; 3 cheap pre-queries + ETag header |
| Task 11b — diary/ideas soft delete (code) | ✅ Done | Routes updated; **migration 129 must be applied before next deploy** |
| Bug fix — diary/[id] resolveEntry deleted_at | ✅ Done | `diary/[id]/route.js` PATCH/DELETE could operate on soft-deleted entries |
| Bug fix — ideas/[id] DELETE deleted_at | ✅ Done | `ideas/[id]/route.js` DELETE lookup now filters deleted ideas |
| Bug fix — public diary feeds missing deleted_at | ✅ Done | `diary/share/resolve`, `portal/data`, `entity/data` preview fetch, `clients/[id]` portal, `naplo/[id]` public view, `projektek/[id]` count, `admin/projektek` count — all now filter `.is('deleted_at', null)` |
| Task 11d (partial) — remove entities lookups from public pages | ✅ Done | `naplo/[id]`, `naplo/[id]/ajanlat`, `clients/[id]`, `clients/[id]/ajanlat/[quoteId]` now use `profiles.company_name\|\|display_name` via `owner_id` instead of `entities` table; remaining `entities` refs are all in `/superadmin/` paths |
| Bug fix — portal/data quotes+projects+clients missing deleted_at | ✅ Done | `portal/data/route.js` now filters deleted quotes, projects and clients |
| Bug fix — workspace/combined projects missing deleted_at | ✅ Done | `workspace/combined/route.js` personal + shared project queries now filter deleted_at |
| Bug fix — entity/data invoices missing deleted_at | ✅ Done | `entity/data/route.js` invoice fetch in bulk load now filters deleted_at |
| Bug fix — quotes/projects/surveys gatekeeper lookups missing deleted_at | ✅ Done | `quotes/[id]`, `projects/[id]`, `surveys/[id]`, `invoices/[id]` gatekeeper `.single()` calls now include `.is('deleted_at', null)` — soft-deleted documents now return 404 instead of 200 |
| Bug fix — 30+ sub-document route parent lookups missing deleted_at | ✅ Done | All survey/quote/project sub-routes (entries, sections, rooms, diary, labour, invoices, payment-plan, etc.) now filter deleted parents before allowing mutations |
| Bug fix — quotes/[id]/send gatekeeper + client lookup | ✅ Done | PDF+email endpoint now rejects soft-deleted quotes and clients |
| Bug fix — invoice-splits parent invoice lookup | ✅ Done | `invoice-splits/route.js` now filters deleted invoices |
| Bug fix — 7 AI routes missing rate limiting | ✅ Done | `analyze-layout`, `fill-property`, `fill-entry`, `generate-items`, `parse-entry`, `generate-entries`, `format-notes` — all now have `globalRateLimit` (30/hr per user) |
| Bug fix — 3 more quote sub-routes missing deleted_at gatekeeper | ✅ Done | `parse-entry`, `sections/[sectionId]/generate-entries`, `sections/[sectionId]/route.js` |
| Bug fix — history routes missing deleted_at | ✅ Done | `quotes/[id]/history`, `projects/[id]/history` |
| Bug fix — invoice media routes missing deleted_at on parent lookups | ✅ Done | `invoices/[id]/media`, `invoices/[id]/media/[mediaId]` |
| Bug fix — labour-entries/[id] project gatekeeper | ✅ Done | Project FK lookup now filters deleted projects |
| Bug fix — diary/photos/[id] diary_entries gatekeeper | ✅ Done | Photo deletion now 404s if the parent entry is deleted |
| Bug fix — portal/quotes/[id]/respond quotes+clients gatekeeper | ✅ Done | Client quote-accept/reject flow 404s on deleted quotes/clients |
| Bug fix — projects/[id]/invoice-media project gatekeeper | ✅ Done | |
| Security — WA process + send routes Bearer token was fail-open | ✅ Done | `wa/process`, `wa/send` now use `!secret \|\| header !== Bearer ${secret}` pattern |
| Security — WhatsApp webhook was fail-open (skip if no secret) | ✅ Done | `webhooks/whatsapp/route.js` now rejects with 500 if `WHINSELF_WEBHOOK_SECRET` not configured |
| Tests — Test 1 extended: catches Bearer template literal fail-open | ✅ Done | Detects `header !== \`Bearer \${process.env.X}\`` without prior `!secret` guard |
| Tests — Test 5 tightened: catches `if (secret) {` fail-open variant | ✅ Done | Covers any variable name, not just `*Secret` naming |
| Tests — Test 6 extended: 7 more AI routes in MUST_HAVE_GLOBAL_RL | ✅ Done | |
| Tests — Test 7 upgraded to per-table proximity check | ✅ Done | Covers workspace/combined + portal/data + entity/data invoices (6 new entries) |
| Tests — Test 10 added: gatekeeper deleted_at coverage | ✅ Done | 30+ gatekeeper routes verified; all 10 tests green |
| Task 11d — entities/memberships code migration | ✅ Done | superadmin/data, entityUserActions, delete-entity, superadmin pages all migrated to collectives/collective_members |
| Tests — Test 11 added: no legacy table references | ✅ Done | Scans API routes + context files for `.from('entities')` / `.from('memberships')` |

### SQL migrations — full apply order (all in `supabase/migrations/`)
| # | File | Priority | Notes |
|---|---|---|---|
| 129 | `129_soft_delete_diary_ideas.sql` | 🔴 **Before next deploy** | Adds `deleted_at` to diary_entries + ideas; code already uses it |
| 130 | `130_survey_items.sql` | 🟡 High | Creates survey_items table; fixes 500 on survey items API |
| 131 | `131_composite_indexes.sql` | 🟡 Medium | Composite workspace indexes; performance |
| 132 | `132_inclusive_collective_unique_index.sql` | 🟡 Medium | Adds `owner_id` to collectives + unique partial index; race condition fix |
| 133 | `133_invoice_media_rls.sql` | 🟢 Low | Retroactive RLS on invoice_media table |
| 134 | `134_deny_all_rls_policies.sql` | 🟢 Low | Task 3: deny-all on tables missing policies; drops stale entity_id policies |
| 135 | `135_revoke_anon_table_access.sql` | 🟢 Low | Task 2: REVOKE all table grants from anon + authenticated roles |
| 136 | `136_rls_helper_functions.sql` | 🟢 Low | Task 6a: is_superadmin(), is_collective_member(), is_collective_owner_or_admin() |
| 137 | `137_rls_document_tables.sql` | 🟢 Low | Task 6b: RLS policies for projects, quotes, surveys, clients |
| 138 | `138_rls_child_tables.sql` | 🟢 Low | Task 6c: RLS policies for invoices, labour_entries, quote_entries, quote_sections, project_rooms, diary_entries |
| 139 | `139_drop_entities_memberships.sql` | 🟡 High | Task 11d: DROP TABLE entities + memberships; apply after deploying this code change |

**Previously blocked — now done:**
| Task | Status | Notes |
|---|---|---|
| Task 2 code audit | ✅ Done | db-rules Test 2 passes — no anon data reads in codebase |
| Task 11d — Drop entities/memberships tables | ✅ Done | Code migrated: superadmin/data uses collectives/collective_members; entityUserActions uses API routes; delete-entity uses collective_id; superadmin pages fixed (collective_id); migration 139 created; Test 11 added |
