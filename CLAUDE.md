# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Epitek — Product Overview

Epitek is a **lightweight SaaS for solo contractors** (Hungarian market). It is NOT a full project management suite — it is a focused tool that lets tradespeople replace scattered WhatsApp/Viber/Messenger threads with one organised place.

**Primary users:**
1. **Solo contractors** — one person who needs quotes, project tracking, a client list, and a public website, all in one place with minimal clicks.
2. **Small collectives** — 2–6 contractors who team up for a single project and then part ways. One person is the Owner/Coordinator; the others are subcontractors. The collective is temporary and lightweight, not a company.

**Workspace visibility rules:**
- **Personal workspace** — all documents (surveys, quotes, projects) are private; visible only to the owner.
- **Collective workspace** — all documents are visible to every member of the collective.

**Collective Owner role (the de-facto kivitelező):**
- The Collective Owner acts as the general contractor: organises the work, directs the subcontractors, and is the single point of contact toward the client.
- The **client** always belongs to the Owner personally (`clients.owner_id` — never shared, GDPR). Contributors never own or manage clients.
- The Owner controls what the client sees on the **client portal** (`/clients/[id]`). Contributors can add work (sections, entries) to shared documents, but only the Owner/Admin can change quote status (send, accept, reject) or trigger client-facing actions.

**Survey-as-template access rules (applies to /ajanlatok/uj and any future "create from survey" flow):**

A survey is a physical site measurement tied to a specific job context. Template access is determined by the **intended offer destination** (the workspace selected in the picker), not the user's currently active workspace.

| Who | Offer destination | Personal surveys | Same-collective surveys | Other-collective surveys |
|---|---|---|---|---|
| Any user | Personal offer | ✅ | ❌ | ❌ |
| Owner / Admin | Collective offer | ✅ | ✅ | ❌ |
| Contributor | Collective offer (→ personal + transfer) | ✅ | ✅ | ❌ |

Rules:
- Personal surveys are always available regardless of offer destination.
- Collective surveys are only available when creating an offer destined for that same collective.
- Surveys from other collectives are never available — cross-collective reuse is not supported.
- When a collective is selected, the survey picker must show personal + same-collective surveys, grouped and labelled, NOT the AppContext `surveys` array (which is scoped to the active workspace and would miss personal surveys in collective context).
- Always show a contextual explanation in the survey picker so the user understands why they see what they see (e.g. "Csak a [Kollektíva neve] és saját felméréseid láthatók itt").

**Design principles:**
- Everything shareable with 1–2 clicks (share link, client portal, public website).
- Speed over completeness — features must be quick to reach, not buried.
- Mobile-first in practice — contractors use phones on-site.
- Hungarian language everywhere in the UI (default). The app is translated to EN/DE/HU — see Localisation section below.

**Core modules:**
| Module | Hungarian route | What it does |
|---|---|---|
| Workspaces | — | Personal and Collective contexts; toggle without re-logging in |
| Surveys | `/felmeres` | On-site measurements that feed directly into quotes |
| Quotes | `/ajanlatok` | Itemised offers (material / labour / equipment etc.); PDF + email send |
| Project cost tracking | `/projektek` | Invoices, labour entries, diary, financials per project |
| Client management | `/ugyfelek` | Contact list + shareable client portal (`/clients/[id]`) |
| Personal website | `/weboldalam` | Free one-page public site at `/szakemberek/[slug]` |

---

# Epitek — Architecture Reference for Claude

## Dev Commands
```bash
npm run dev      # start Next.js dev server (localhost:3000)
npm run build    # production build
npm run start    # start production server
npm run lint     # ESLint
```
No test runner is configured. Verify changes by running the dev server manually.

## Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLOUD_VISION_API_KEY   # optional — OCR feature only
```
R2 (Cloudflare object storage) credentials are also required for file uploads — see `src/lib/r2.js`.

---

## Database Access — Direct Connection via psql

The production database is a Supabase Postgres instance. All the values needed to connect are in `.env.local`.

### Connection string

```
postgresql://postgres.<PROJECT_REF>:<Supabase_DB_Passwort>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
```

Substituting from `.env.local`:
- `<PROJECT_REF>` — the subdomain from `NEXT_PUBLIC_SUPABASE_URL` (the part before `.supabase.co`)
- `<Supabase_DB_Passwort>` — the value of `Supabase_DB_Passwort`

The pooler region is **eu-west-2** (London). Port **6543** is transaction-mode pooler (stateless, safe for one-off SQL).

### Quick connect

```bash
DB_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
PGPASSWORD=<PASSWORD> psql "$DB_URL"
```

Or inline for a single statement:

```bash
PGPASSWORD=<PASSWORD> psql "$DB_URL" -c "SELECT version();"
```

### Applying a migration

Migrations live in `supabase/migrations/` as numbered `.sql` files. They are applied **manually** — there is no automated runner.

**Apply a single file:**
```bash
DB_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
PGPASSWORD=<PASSWORD> psql "$DB_URL" -f supabase/migrations/<NNN>_<name>.sql
```

**Apply a range (e.g. 134 through 139 in order):**
```bash
DB_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
for f in supabase/migrations/13{4,5,6,7,8,9}_*.sql; do
  echo "Applying $f …"
  PGPASSWORD=<PASSWORD> psql "$DB_URL" -f "$f"
done
```

### Verify a migration was applied

Check for a column, table, or policy that the migration adds:
```bash
# Did migration 129 add deleted_at to diary_entries?
PGPASSWORD=<PASSWORD> psql "$DB_URL" -c \
  "SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='diary_entries' AND column_name='deleted_at';"

# Does a table exist?
PGPASSWORD=<PASSWORD> psql "$DB_URL" -c \
  "SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' AND table_name='<table>';"
```

### Notes
- There is **no migration history table** — migrations are tracked only by the files in `supabase/migrations/` and the DB Safety doc (`DB_Safety.md`).
- The pooler uses **transaction mode** (port 6543). DDL statements (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`) work fine in transaction mode.
- Never run migrations in parallel — apply them one at a time, in numeric order.
- The `CASCADE` keyword is used in drop statements to remove dependent FK constraints automatically.

---

## Stack
- **Next.js** (App Router) + **Supabase** (Postgres + Auth)
- **Language:** All UI text must be in **Hungarian**
- All API routes use `createAdminClient()` (service role, bypasses RLS)
- RLS exists but is NOT enforced by the app — access control is done at application level

---

## User Roles (global)
| Role | Description |
|---|---|
| `superadmin` | Cross-entity god mode, `entity_id = NULL` in profiles |
| `admin` | Collective owner/admin — full access within their collective |
| `user` | Regular user — personal workspace only (free tier) |

Superadmin uses `/api/superadmin/data` (all entities).
Everyone else uses `/api/entity/data` (scoped to their active workspace).

---

## Workspace Model ("Google Drive meets Basecamp")

Every user has:
1. **Personal workspace** — private, always exists, identified by `user.id`
2. **Collective workspace** — shared team space, optional, paid subscription

```
profiles.active_collective_id = NULL   → personal context (default)
profiles.active_collective_id = UUID   → viewing a collective
```

Context switching is done via `PATCH /api/auth/context` with `{ collective_id }`.

---

## Key DB Tables

### New architecture (migration 052+)
```
collectives          id, name, created_at
collective_members   collective_id, user_id, role (owner|admin|contributor),
                     auto_approve, status (invited|active)
profiles             id (= user UUID), display_name, role, email,
                     active_collective_id, gdpr_consented_at,
                     must_change_password, is_subscription_premium
projects             id, owner_id, collective_id (nullable), created_by, ...
quotes               id, owner_id, collective_id (nullable), created_by, status, ...
surveys              id, owner_id, collective_id (nullable), created_by, ...
clients              id, owner_id (ALWAYS personal, never shared — GDPR), email, ...
quote_entries        entry_type: material|labour|equipment|transport|other
                     material+labour → quantity × unit_price; others → flat amount_huf
image_library        r2_key, trade_id (null = generic), orientation, is_platform_only
```

### Old tables (not yet dropped)
```
entities             still exists — personal + collective types
memberships          still exists — old role values: owner|admin|member
```
Migration 053 drops old `entity_id` columns. Migration 054 (pending) drops `entities`/`memberships` entirely once superadmin god-mode is updated. There are 73 migrations total — apply via Supabase SQL editor.

### Data scoping rules
- `projects/quotes/surveys`: personal = `owner_id = user.id AND collective_id IS NULL`
- collective context = `collective_id = X` only (no personal bleedthrough)
- `clients`: ALWAYS `owner_id = user.id` — never shared across collective (GDPR)
- `invoices/labour_entries`: scoped via `project_id`

---

## Superadmin God Mode

### Identity layers

| State | Lives in | Meaning |
|---|---|---|
| `currentUser` | AppContext React state | SA's **own** profile. Must always be SA. |
| `impersonating` | AppContext React state | Impersonated user's profile. `null` = not impersonating. |
| `effectiveUser` | Derived: `impersonating \|\| currentUser` | What the UI sees. |

`isSuperAdmin` is derived from `currentUser.role`, not `effectiveUser.role`.
The context value exposes `currentUser: effectiveUser` to consumers, plus `realUser: currentUser` as the escape hatch for SA's own identity.

### Cookies & SessionStorage

| Cookie | Value | Lifetime | Used by |
|---|---|---|---|
| `god_mode_user` | Impersonated user UUID | Session (tab close) | `/api/entity/data`, `/api/auth/profile` |
| `god_mode_entity` | Active collective UUID (empty = personal) | Session | `/api/entity/data` |

`sessionStorage['god_mode']` — JSON snapshot of `impersonating` profile. Written by a `useEffect` that watches `impersonating`. Read on page reload to restore cookies and re-hydrate `setImpersonating`.

### Non-negotiable God Mode rules

**GM-1: `currentUser` is always SA's own profile.**
Never populate `currentUser` from an impersonated user's data. `fetchProfile()` in `init()` must always call `/api/auth/profile?real=1` to bypass god_mode_user cookie resolution.

**GM-2: `/api/auth/profile` GET — `?real=1` flag.**
When `?real=1` is present, skip `resolveEffectiveUserId` and return the authenticated caller's own profile. `init()` always uses `?real=1`. All other callers may omit it.

**GM-3: Two context-switchers, never confused.**

| Function | When to use | Side effect |
|---|---|---|
| `setActiveContext(id)` | Regular user switching their own workspace | Writes `profiles.active_collective_id` to DB |
| `switchImpersonatingContext(id)` | SA switching the impersonated user's visible context | Cookie-only, no DB write |

The workspace switcher UI must call the right one based on `!!impersonating`. AppContext already exposes `setActiveContext` as a dispatcher that routes to `switchImpersonatingContext` during impersonation — do not bypass this wrapper.

**GM-4: Audit log actor = real SA, not effective user.**
When a mutation occurs while SA is impersonating, audit logs must use:
- `userId: user.id` (JWT holder = real SA)
- `details: { on_behalf_of: effectiveId }` when `effectiveId !== user.id`

**GM-5: SA-only routes under `/api/superadmin/` must not call `resolveEffectiveUserId`.**
They accept an explicit `userId` / `entityId` from the request body and operate on that target directly.

**GM-6: `resolveEffectiveUserId` — only on dual-mode routes.**
Only add it to routes explicitly designed to work for both regular users and SA-impersonating. Currently: `/api/entity/data`. Do not add it to new routes by default.

**GM-7: SA language change is cookie-only.**
SA's page-language preference must never be written to `profiles.locale`. The SA language toggle sets `NEXT_LOCALE` cookie + reloads. No `PATCH /api/auth/profile`.

**GM-8: Cookie lifecycle order.**

Start impersonation:
1. Set cookies (`setGodCookie`) first
2. Set React state (`setImpersonating`) — triggers sessionStorage write via useEffect
3. Fetch data (`_loadEntityData`)
4. Navigate

Stop impersonation:
1. Clear React state (`setImpersonating(null)`) — triggers sessionStorage removal
2. Clear cookies
3. Refresh SA's own data (`refreshSupabaseData(currentUser)`)
4. Navigate to `/superadmin`

---

## Subscription Tiers
| Tier | Price | Notes |
|---|---|---|
| Basic | free | max 5 surveys, max 5 quotes, max 1 project |
| Trial | free 14 days | full Premium features; assigned on first registration; same email cannot re-trial |
| Premium | 6.999 Ft/month + ÁFA | unlimited everything, required to create collectives |
| Collective seat | 1.999 Ft/seat/month + ÁFA | owner pays for all seats; owner NOT counted as a seat; Basic users can be invited |

Fields: `profiles.is_subscription_premium` (boolean, paid premium), `profiles.subscription_tier` ('basic'|'trial'|'premium'), `profiles.trial_started_at`, `profiles.trial_ends_at`.
Helper: `isEffectivePremium(profile)` in `src/lib/subscriptionLimits.js` — returns true for paid premium OR active trial.
Limits stored in `pricing_config` table (admin-editable via `/superadmin/pricing`).
Trial abuse prevention: `trial_emails` table records email → first user_id; re-registration with same email gets 'basic' not 'trial'.

---

## Self-Registration Flow
- `/` landing page has `AuthModal` with login/register/forgot views
- `registerWithEmail(name, email, password, gdprConsentedAt)` calls `supabase.auth.signUp()`
- `handle_new_user` DB trigger creates the profile row on signup
- No personal entity is created — personal workspace = `user.id` directly
- GDPR: `profiles.gdpr_consented_at` stored from signup metadata

---

## Collective Membership
```
role: 'owner'       — created the collective, pays the bill
role: 'admin'       — promoted by owner (Phase 4, not yet active)
role: 'contributor' — invited worker; can add but not edit/delete others' data
```
Old `memberships` table uses `owner|admin|member` (FK constraint — 'contributor' not valid there).

---

## Route Guard System

Two layers protect authenticated routes:

**1. `LoadingGate` (`src/components/LoadingGate.jsx`)** — blocks render until `loading=false && dataReady=true`. Public routes skip the gate.

**2. `AppContext` route guard** — redirects unauthenticated users to `/login`, which immediately redirects to `/` (the landing page).

Both maintain their own public route lists. **When adding a new public route, update both:**
```js
// AppContext.jsx  →  PUBLIC_ROUTE_PREFIXES
// LoadingGate.jsx →  PUBLIC_PREFIXES
['/login', '/change-password', '/szakemberek/', '/p/', '/clients/',
 '/naplo/', '/auth/', '/invitations/', '/demo', '/portal']
```

---

## API Patterns

### Supabase clients — use the right one
```js
import { createClient } from '@/lib/supabase/server';      // API routes — verifies JWT
import { createAdminClient } from '@/lib/supabase/admin';  // bypasses RLS, privileged ops
import { createClient } from '@/lib/supabase/client';      // client components only
```

### Standard API route auth check
```js
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const admin = createAdminClient();
const { data: profile } = await admin.from('profiles')
  .select('role, active_collective_id').eq('id', user.id).single();
```

### Data scoping
```js
// personal context
.eq('owner_id', userId).is('collective_id', null)
// collective context
.or(`collective_id.eq.${collectiveId},and(owner_id.eq.${userId},collective_id.is.null)`)
```

---

## Key Utilities (`src/lib/`)

| File | Purpose |
|---|---|
| `calculations.js` | `calculateProjectFinancials()` — settlement algorithm, cost/labour splits |
| `constants.js` | `INVOICE_CATEGORIES`, `QUOTE_ENTRY_TYPES`, `QUOTE_STATUSES`, `formatMoney(amount, currency)`, `formatHUF()` (HUF alias), `formatDate()` |
| `mediaGate.js` | `processMediaFiles()` — compresses images → WebP (400 KB target), validates video ≤ 10 MB |
| `r2.js` | Cloudflare R2 (S3-compatible) upload/delete; `r2PublicUrl(key)` builds CDN URL |
| `emailTemplates.js` | `fillTemplate()`, `wrapEmail()` — branded HTML email wrapper |
| `generateOfferPdf.js` | Puppeteer: renders `/ajanlatok/[id]/nyomtatas` → PDF for email attachment |
| `audit.js` | `logAudit()` — fire-and-forget write to `audit_logs` table |
| `websiteThemes.js` | `COLOR_SCHEMES` + `TYPOGRAPHY` for the website builder |
| `godMode.js` | `resolveEffectiveUserId(request, user, admin)` — reads `god_mode_user` cookie; returns impersonated user's ID when SA is active, otherwise caller's own ID. Only use in dual-mode routes. See GM-5/GM-6. |

---

## AppContext (`src/context/AppContext.jsx`)
Key exported values:
- `currentUser` — effective user (real or impersonated)
- `activeCollectiveId` — null = personal, UUID = active collective
- `collectives` — `{ collective_id, name, role }[]`
- `setActiveContext(collectiveId)` — switches workspace
- `isSuperAdmin`, `isAdmin`, `impersonating`, `isDemoMode`
- Data arrays: `projects`, `quotes`, `clients`, `invoices`, `labourEntries`, `surveys`, etc.

---

## Demo Mode

A fully client-side demo at `/demo/*` — no auth, no DB.

- `src/app/demo/layout.jsx` wraps every demo page with `DemoProvider`
- `DemoProvider` (`src/context/DemoContext.jsx`) replaces `AppContext.Provider` entirely with fake data + no-op mutations
- Seed data: `src/context/demo/seed.js` — bump `SEED_VERSION` whenever seed changes to reset localStorage
- All demo state persisted to `localStorage` key `epitek_demo_state`
- `isDemoMode: true` is in the context value; `isDemoMode: false` everywhere else

**Demo-aware navigation — always use `navPrefix`:**
```js
const navPrefix = isDemoMode ? '/demo' : '';
router.push(`${navPrefix}/projektek/${id}`);
<Link href={`${navPrefix}/ajanlatok`}>
```
Every shared component that navigates must use `navPrefix`. Sidebar already does this via `navPrefix = isDemoMode ? '/demo' : ''`.

**Demo page pattern** (re-export the real page):
```js
// src/app/demo/profil/page.jsx
'use client';
export { default } from '@/app/profil/page.js';
```

**Static demo preview:** `/api/szakemberek/nemes-peter-felujito/route.js` — hard-coded response so the demo website preview works without DB.

**Website builder in demo:** `BuilderEditor` saves to `localStorage` key `epitek_demo_website_builder`. The `/szakemberek/nemes-peter-felujito` preview page merges this on load so edits are reflected immediately.

---

## Website Builder

- `/weboldalam` — builder editor; exports `BuilderEditor` (used by demo)
- `/szakemberek/[slug]` — public-facing page, fetches from `/api/szakemberek/[slug]`
- Section types: `hero`, `about`, `services`, `certifications`, `gallery`, `pricing`, `testimonials`, `faq`, `service_area`, `contact`
- Premium-gated sections show in editor but are hidden on publish for free users
- `/api/image-library` — no auth required (uses admin client); safe to call from demo and client portal
- `ImagePickerModal` inside `BuilderEditor` calls `/api/image-library` — works in all contexts

---

## Client Portal

**`/clients/[id]`** — contractor-scoped, no auth, public URL. Server component fetches by `client_id`. Shows non-draft quotes (with entries + room photos), projects with diary entries and invoice totals. `ClientPortal.jsx` uses a `SidebarKiller` helper to zero out `--sidebar-w` and `--mobile-header-h` CSS vars to hide app chrome.

**`/portal`** — planned: email-based OTP auth (Supabase `signInWithOtp`, no password). Queries `clients.email = auth.email()` across all `owner_id`s to show one unified portal per real-world person regardless of how many contractors they work with. Not yet built — `/portal` is pre-registered in the public route lists.

---

## CSS / Styling

`globals.css` defines all design tokens as CSS variables. Key ones:

```css
/* Typography */
--font-main: 'Plus Jakarta Sans'
--font-mono: 'JetBrains Mono'

/* Spacing / shape */
--radius-sm / --radius-md / --radius-lg / --radius-pill

/* Semantic colors */
--bg-base / --bg-subtle / --bg-card
--text-primary / --text-secondary / --text-muted
--primary          /* navy #0f172a */
--accent           /* blue #2563eb */
--success / --warning / --danger   (each with -bg / -border / -text variants)

/* Layout */
--sidebar-w: 240px    /* set to 0px in full-page views (portal, szakemberek) */
--mobile-header-h: 56px
```

Utility classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.card`, `.card-interactive`, `.form-control`, `.form-label`, `.stat-grid`, `.page-title`, `.container`.

---

## App Routes (Hungarian names decoded)

| Route | Hungarian | Purpose |
|---|---|---|
| `/ajanlatok` | árajánlatok | Quote/offer management |
| `/felmeres` | felmérés | Site survey tool |
| `/projektek` | projektek | Project management |
| `/ugyfelek` | ügyfelek | Client list |
| `/naplo` | napló | Project diary/log |
| `/naptar` | naptár | Calendar view |
| `/otletek` | ötletek | Ideas board |
| `/kollektivak` | kollektívák | Collective management |
| `/weboldalam` | weboldalam | Website builder |
| `/elofizetes` | előfizetés | Subscription management |
| `/szakemberek` | szakemberek | Public tradesperson pages |

---

## Key API Routes

```
GET  /api/entity/data           Main data fetch (scoped per workspace)
POST /api/quotes/[id]/send      Generate PDF (Puppeteer) + send via SMTP to client
POST /api/quotes/[id]/import-survey   Populate quote from survey measurements
GET  /api/image-library         Platform images (no auth required)
POST /api/website               Save/publish website builder content
POST /api/website/upload        Upload gallery/hero images (R2)
GET  /api/website/slug-check    Validate slug availability
GET  /api/website/leads/unread  Unread contact form leads count
POST /api/ocr                   Google Cloud Vision — extract text from invoice photo
POST /api/invoice-ai            AI-based invoice field extraction
GET  /api/szakemberek/[slug]    Public szakember page data
```

---

## Public Sharing

- `/p/[token]` — shareable diary entry feed (token-based, no auth). Resolved via `/api/diary/share/resolve?token=`.
- `/clients/[id]` — client portal link; contractor shares this URL directly with their client.

---

## Localisation — Language & Currency

### Language (`profiles.locale`)
- Stored in `profiles.locale` (VARCHAR 5, nullable). Values: `'hu'` | `'de'` | `'en'`.
- Drives **both** the app UI language **and** the language of outgoing documents (quote PDFs, emails). There is no separate "document language" — they are always the same.
- Changeable anytime by the user in **Profil → Nyelv és pénznem** (`/profil#preferences`). Clicking a language pill calls `PATCH /api/auth/profile` with `{ locale }`, sets the `NEXT_LOCALE` cookie, then does `window.location.reload()`.
- On login, AppContext syncs `profile.locale` to the `NEXT_LOCALE` cookie so next-intl renders in the correct language immediately.
- The landing page (`/`) has its own locale detection via `useLandingLocale()` (`src/hooks/useLandingLocale.js`) which reads the same `NEXT_LOCALE` cookie. The landing page language switcher (EN/DE/HU pills in the navbar) also writes this cookie.
- **There is NO language switcher in the Sidebar.** Language is managed exclusively in `/profil`.

### Routing & i18n infrastructure (do not change without testing in production)

The app uses **next-intl v4** with Next.js 16 and `localePrefix: 'never'`. The locale is determined entirely from the `NEXT_LOCALE` cookie — it never appears in the URL.

**URL paths do not change when switching language.** `/ajanlatok` stays `/ajanlatok` for all locales; only the page content changes. This is intentional.

**Key files:**
- `proxy.js` (project root) — Next.js 16 renamed `middleware.js` → `proxy.js`. Do not rename it back or create a parallel `middleware.js`.
- `src/i18n/routing.js` — defines locales, defaultLocale, localePrefix. Has `pathnames: {}` (empty object, NOT `undefined` and NOT a full locale map).
- `src/i18n/request.js` — loads the right `messages/*.json` based on locale.
- `[locale]/layout.jsx` — passes `locale` from `params` explicitly to both `getMessages({ locale })` and `NextIntlClientProvider locale={locale}`.

**Why `pathnames: {}`?** Two constraints make full localized pathnames (`/angebote` for DE, `/kunden` etc.) non-viable:
1. **Production Webpack RSC bug** — The production build uses `next build --webpack`. In this mode, next-intl's middleware rewrites (e.g. `/angebote` → `/de/ajanlatok`) cause 500 errors on RSC prefetch/navigation requests. Dev (Turbopack) is unaffected, which is why it "works on localhost."
2. **Middleware crash on `undefined`** — Setting `pathnames` to `undefined` (or omitting it) causes `Object.entries(undefined)` in next-intl's middleware initialization, crashing the entire middleware bundle at startup and returning 500 for every route including `/`.

The empty object `{}` is the safe middle ground: it keeps `pathnames` defined (no crash) while producing no localized URL translation (no RSC rewrite 500s).

**If you want localized URLs in the future:** Restore the full `pathnames` map in `routing.js` **and** test with `npm run build --webpack && npm start` (not just `npm run dev`) before shipping. The RSC prefetch requests to German paths are what fail in production.

### Currency (`profiles.currency`)
- Stored in `profiles.currency` (VARCHAR 3, nullable). Values: `'HUF'` | `'EUR'` | `'GBP'` | `'USD'`.
- **Write-once**: the API (`PATCH /api/auth/profile`) only saves `currency` when the current DB value is NULL. Once set it cannot be changed through the UI. Contact support to override.
- Exposed as `userCurrency` from `useApp()`. Use it with `formatMoney(amount, userCurrency)` from `@/lib/constants` for all monetary display.
- `formatHUF()` still exists as a backward-compat alias for `formatMoney(amount, 'HUF')`. Migrate to `formatMoney` in new code.
- Both `locale` and `currency` are NULL for new users until they complete the **OnboardingModal** (shown once on first login via `LoadingGate`).

**Adding a new currency** requires changes in three places:
1. `src/lib/constants.js` — add an entry to `CURRENCY_FMT`: `XYZ: ['locale-tag', decimalPlaces, 'XYZ']`
2. `src/app/[locale]/profil/page.js` (or wherever the currency picker lives) — add the new option to the UI pill list
3. `CLAUDE.md` (this file) — add the new code to the `Values:` list above

### No hardcoded strings — ever

The **entire app is translated** (HU / DE / EN). Every user-visible string — labels, buttons, placeholders, empty states, error messages, section headings, tooltips — must go through the translation system. This is a non-negotiable rule that applies to every new feature and every change.

**Inside the `[locale]` app** (authenticated pages):
```js
// In a server or client component
const t = useTranslations('mySection');   // key namespace from the JSON files
<button>{t('saveBtn')}</button>           // NOT <button>Save</button>
```
Then add the key to **all three files**: `messages/hu.json`, `messages/de.json`, `messages/en.json`.

**Outside the `[locale]` app** (landing page `/`, auth modal, onboarding modal):
These pages are not wrapped in `NextIntlClientProvider`. Use the `LANDING_I18N` / `AUTH_I18N` / `CHANGE_PASSWORD_I18N` objects in `src/lib/landingI18n.js` and the `useLandingLocale()` hook.

**Common mistake to avoid:** writing a string directly in JSX and thinking "I'll add the translation later." Add it immediately — the i18n consistency test will catch missing keys at CI time.

### i18n consistency test

`tests/i18n.test.js` runs as part of the normal test suite (`npm test`). It:
- Collects all dot-notation key paths from each JSON file recursively
- Fails if any two files have different key sets (a key exists in one language but not another)
- Fails if any key has an empty-string value (forgotten placeholder)

**Run it standalone:** `npx vitest run tests/i18n.test.js`

When you add new keys, add them to all three files before committing. If a key intentionally has the same value in all languages (e.g. a brand name), still add it explicitly to each file — do not omit it.

### OnboardingModal flow
1. New user registers → `profiles.locale` and `profiles.currency` are NULL.
2. On first authenticated page load, `AppContext` sets `needsOnboarding = true`.
3. `LoadingGate` renders `<OnboardingModal />` (takes priority over `<WelcomeModal />`).
4. User picks language + currency → `PATCH /api/auth/profile` → `completeOnboarding(locale, currency)` in AppContext → modal closes → WelcomeModal shows.
5. Existing users who pre-date migration 128 also see OnboardingModal once.

---

## Standards — Non-Negotiable Rules

These rules apply to every change, in every file. If a task conflicts with any of these, flag it before writing code.

### 1. Mobile-First
- **Breakpoint: 768 px** is the single mobile boundary. Mobile ≤ 767 px, tablet/desktop ≥ 768 px. Never use 640, 769, 800, or any other value.
- **Always use `useMobile()`** from `@/hooks/useMobile` for JS-side checks. Never write `window.innerWidth` inline — not in state initialisers, not in event handlers, not anywhere.
- Touch targets minimum 44 × 44 px. Fixed bottom elements require `env(safe-area-inset-bottom)` padding.

### 2. Feedback UI — Two Components Only
Never create a new overlay (`position: fixed` div, portal, etc.). Use only:
| Use case | Component | File |
|---|---|---|
| Forms, content, multi-step flows | `Modal` | `@/components/Modal.jsx` |
| Context-menu actions (Open / Rename / Delete) | `BottomSheet` | `@/components/mobile/BottomSheet.jsx` |
| Success / error / warning feedback | `AlertModal` | `@/components/Modal.jsx` |
| Destructive confirmation | `ConfirmModal` | `@/components/Modal.jsx` |

Both adapt automatically: `Modal` becomes a bottom sheet at ≤ 640 px via `.modal-dialog` CSS; `BottomSheet` becomes a centered modal at ≥ 769 px via `.bs-panel` CSS.

### 3. Permission Model

**Superadmin has no code-level permission checks** — SA operates via DB access only. Never add `if (isSuperAdmin)` bypass logic to new routes (only existing routes that already have it are grandfathered).

Three meaningful roles in a collective context:

| Actor | Create Document | Edit/Delete Document | Edit/Delete Own Sections & Entries | Edit/Delete Others' Sections & Entries | Send Offer / Change Status |
|---|---|---|---|---|---|
| Kollektive Owner / Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Collective Member (`contributor`) | ❌ | ❌ | ✅ | ❌ | ❌ |
| Unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ |

**"Document"** = top-level record: `projects`, `quotes`, `surveys`  
**"Section"** = `quote_sections` — members may create their own; `created_by` determines ownership  
**"Entry"** = `quote_entries`, `labour_entries`, `invoices`, `diary_entries`, `survey_entries`, `survey_items` — `user_id` or `created_by` determines ownership

Standard permission check pattern for document-level mutations:
```js
const isOwner          = doc.owner_id === user.id || doc.created_by === user.id;
const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
if (!isOwner && !isKollektivOwner)
  return Response.json({ error: 'Csak a tulajdonos módosíthatja.' }, { status: 403 });
```

Standard check for document creation in a collective:
```js
// When creating a document in collective context, contributor role is blocked
const { data: mem } = await admin.from('collective_members')
  .select('role').eq('collective_id', collectiveId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
  return Response.json({ error: 'Csak a kollektíva tulajdonosa hozhat létre dokumentumot.' }, { status: 403 });
```

Standard check for entry-level mutations (own work only for contributors):
```js
const isEntryOwner     = entry.user_id === user.id || entry.created_by === user.id;
const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
if (!isEntryOwner && !isKollektivOwner)
  return Response.json({ error: 'Csak a saját bejegyzést módosíthatod.' }, { status: 403 });
```

**`user_id` on entries must ALWAYS be set server-side** — never read from request body:
```js
// WRONG — client can impersonate any user
user_id: body.user_id || user.id,
// CORRECT
user_id: user.id,
```

### 4. Soft Delete Only
Never issue a hard `.delete()` on user-owned content: `projects`, `quotes`, `surveys`, `clients`, `invoices`, `diary_entries`, `ideas`.
```js
// CORRECT
await admin.from('quotes').update({ deleted_at: new Date().toISOString() }).eq('id', id);
// WRONG — never use on user content
await admin.from('quotes').delete().eq('id', id);
```
All list queries must filter: `.is('deleted_at', null)`.
Sub-records (quote_entries, survey_entries, room items) may be hard-deleted — they have no `deleted_at` column.
Superadmin `total-recall` and admin entity-deletion routes are the only legitimate exceptions.

### 5. Data Scoping
```js
// Personal context — only own records, no collective bleedthrough
.eq('owner_id', userId).is('collective_id', null).is('deleted_at', null)
// Collective context — only collective records
.eq('collective_id', collectiveId).is('deleted_at', null)
```
`clients` are ALWAYS personal (`owner_id = user.id`), never shared across collectives — GDPR.

### 6. Demo Mode Navigation
Every component that navigates must use `navPrefix`:
```js
const { isDemoMode } = useApp();
const navPrefix = isDemoMode ? '/demo' : '';
router.push(`${navPrefix}/projektek/${id}`);
<Link href={`${navPrefix}/ajanlatok`}>
```

### 7. Design Tokens — No Hardcoded Values
Always use CSS variables. Never hardcode colours, radii, or shadows in JSX `style` props.
```js
// WRONG
style={{ color: '#0f172a', borderRadius: '8px', borderBottom: '1px solid #e2e8f0' }}
// CORRECT
style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', borderBottom: '1px solid var(--border-subtle)' }}
```

### 8. API Fetch Error Handling
Every `fetch()` must check `res.ok` and surface errors via `AlertModal`:
```js
const res = await fetch('/api/...', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
if (!res.ok) {
  const { error } = await res.json().catch(() => ({}));
  setAlert({ open: true, message: error || 'Hiba történt. Kérjük, próbáld újra.' });
  return;
}
```

### 9. Subscription Gate on Creation
Any route or UI that creates a resource (quote, survey, project, collective) must check limits via `isEffectivePremium(profile)` from `@/lib/subscriptionLimits` when a tier limit applies.

### 10. Common Agent Mistakes — Read Before Every Change
- **Missing `deleted_at` filter** — new list queries frequently omit `.is('deleted_at', null)`.
- **Third overlay** — do not create new `position: fixed` overlays; use `Modal` or `BottomSheet`.
- **`window.innerWidth` inline** — always use `useMobile()` hook instead.
- **Hard delete on user content** — `.delete()` is forbidden on the tables listed in rule 4.
- **Missing `navPrefix`** — every in-app `<Link>` or `router.push()` in a shared/demo-aware component needs it.
- **Hardcoded breakpoint** — the one mobile breakpoint is 768 px.
- **Hardcoded colour hex** — use CSS vars from `globals.css`.
- **Hardcoded string** — zero tolerance. Never write a user-visible string directly in JSX, not even in Hungarian. Use `useTranslations()` inside `[locale]` pages; use `LANDING_I18N` / `AUTH_I18N` on the landing page and auth modal. Add the key to **all three JSON files** (`hu`, `de`, `en`) immediately — not later. `tests/i18n.test.js` will catch mismatches at CI time.
- **`user_id` from request body** — always set `user_id: user.id` server-side on inserts; never trust the client.
- **Membership check without role** — checking only `active` status is not enough for document creation; must also verify `role === 'owner' || role === 'admin'`.
- **Superadmin bypass in new routes** — do not add `isSuperAdmin` escape hatches to new routes; SA uses DB access.
- **`fetchProfile()` without `?real=1`** — `init()` in AppContext must always use `/api/auth/profile?real=1`; omitting it causes SA to inherit the impersonated user's role on page reload (BUG-1). See GM-1/GM-2.
- **`resolveEffectiveUserId` in new routes** — only add to dual-mode routes (like `/api/entity/data`). Do not add to new API routes by default. See GM-6.
- **Audit log using `effectiveUserId` as actor** — when a route calls `resolveEffectiveUserId`, the `logAudit` call must use `userId: user.id` (real SA), not `effectiveUserId`. Add `details: { on_behalf_of: effectiveUserId }` when they differ. See GM-4.
- **SA language toggle writing to DB** — the SA locale pill in the Sidebar sets the `NEXT_LOCALE` cookie only; it must never call `PATCH /api/auth/profile`. See GM-7.
- **Wrong context switcher during impersonation** — `setActiveContext` as exposed by AppContext is already a safe dispatcher; it calls `switchImpersonatingContext` (cookie-only) during impersonation. Do not call `setActiveContext` directly from `godModeActions` or bypass the dispatcher. See GM-3.
- **`flexWrap: 'wrap'` on banner rows** — see rule 11.
- **Single-layer permission check** — every mutation needs both a client-side guard AND an API-side guard; see rule 12.
- **Fail-open secret check** — `if (process.env.SECRET && value !== process.env.SECRET)` is wrong; use `if (!process.env.SECRET || value !== process.env.SECRET)`. See rule 14.
- **New table without RLS** — every new `CREATE TABLE` in `public` schema must immediately be followed by `ENABLE ROW LEVEL SECURITY` and a deny-all policy. See rule 14.
- **Webhook without fail-closed signature check** — always verify webhook signatures fail-closed. See rule 15.
- **Missing audit log on mutation** — every INSERT/UPDATE/DELETE and every external API call (Creem, SMTP, AI) must call `logAudit` for both success and failure. See rule 19.

### 11. Banner / Notification Row Layout
Banners with icon + text + action button use different layouts on mobile vs desktop. Always use `useMobile()` — never `flexWrap: 'wrap'` (it creates squished columns on narrow screens).

```jsx
const isMobile = useMobile();

// Desktop: icon · text (flex:1) · button — one row
// Mobile:  icon · text (flex:1) on line 1, button right-aligned on line 2
<div style={{ background: '...', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <div style={{ flexShrink: 0, width: 36, height: 36, ... }}>{/* icon */}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700 }}>Title</div>
      <div style={{ fontSize: '0.775rem' }}>Subtitle</div>
    </div>
    {!isMobile && <Link style={{ flexShrink: 0 }}>Megtekintés</Link>}
  </div>
  {isMobile && (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
      <Link>Megtekintés</Link>
    </div>
  )}
</div>
```

### 12. Double Permission Check — Client AND API

Every mutation (create, edit, delete) must be guarded at **two layers**:

**Layer 1 — Client-side (AppContext / component)**
Fast feedback before a network round-trip. Reads from local state (`projects.find()`, `surveys.find()`, `collectives.some()`). Throws an error that the UI catches and shows to the user.

```js
// AppContext deleteX pattern
const doc = documents.find(d => d.id === id);
const isOwner          = doc?.owner_id === uid || doc?.created_by === uid;
const isKollektivOwner = collectives.some(c => c.collective_id === doc?.collective_id && c.role === 'owner');
if (!isAdmin && !isOwner && !isKollektivOwner) throw new Error('Nincs jogosultsága!');
// then call the API
```

**Layer 2 — API-side (route handler)**
Authoritative. Re-reads from the DB — never trusts client-supplied ownership claims. Returns 403 / 423 on violation. This is the real security boundary.

**Critical invariant: keep local state fresh**

The client guard is only as good as the data it reads. After any operation that changes ownership or permissions (e.g. accepting a transfer, switching workspace context), call `refreshSupabaseData()` before the user can act on the affected documents. If state is stale, the client guard produces false-negatives — it throws when it shouldn't, or worse, allows when it shouldn't.

```js
// After accepting a transfer — refresh immediately so the new owner
// sees the document in their cache with the updated owner_id
refreshSupabaseData();
```

**Wrong — only one layer:**
```js
// Client only → API has no guard, anyone can call the endpoint directly
// API only  → UX shows delete button to users who will get a 403
```

### 13. No Hardcoded Strings — Translations Required

**Never write a user-visible string directly in JSX. Use a translation key and add it to all three JSON files immediately.**

The entire app is translated (HU / DE / EN). Every label, button, placeholder, error message, empty state, tooltip, and heading must go through the translation system — no exceptions.

**Inside `[locale]` pages** (uses `next-intl`):
```js
const t = useTranslations('mySection');
// CORRECT
<button>{t('saveBtn')}</button>
// WRONG — never do this
<button>Save</button>
<button>Mentés</button>
```
Add the key to **all three files** at the same time: `messages/hu.json`, `messages/de.json`, `messages/en.json`. Do not add it to one file and plan to do the others later.

**Outside `[locale]`** (landing page, auth modal, onboarding modal, preview components — no `NextIntlClientProvider`):
Use `LANDING_I18N` / `AUTH_I18N` objects from `src/lib/landingI18n.js` and the `useLandingLocale()` hook. Add the string to all three locale objects (`hu`, `de`, `en`) in that file.

**`tests/i18n.test.js`** enforces this automatically — it fails if any two locale files have different key sets or if any value is an empty string. Run standalone: `npx vitest run tests/i18n.test.js`.

### 14. New DB Tables — Required Boilerplate

Every `CREATE TABLE` in the `public` schema requires three things immediately after creation. No exceptions.

**1. Enable RLS:**
```sql
ALTER TABLE public.<new_table> ENABLE ROW LEVEL SECURITY;
```

**2. Add deny-all policy** (the app uses service_role; anon/authenticated must not reach tables directly):
```sql
CREATE POLICY "deny_all_direct_access"
  ON public.<new_table>
  AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (false);
```

**3. Add composite indexes** if the table uses the workspace model (`owner_id`, `collective_id`, `deleted_at`):
```sql
-- Personal context queries
CREATE INDEX IF NOT EXISTS <table>_personal_idx
  ON public.<table> (owner_id, deleted_at)
  WHERE collective_id IS NULL;

-- Collective context queries
CREATE INDEX IF NOT EXISTS <table>_collective_idx
  ON public.<table> (collective_id, deleted_at)
  WHERE collective_id IS NOT NULL;
```

**4. Add `deleted_at` column** if the table stores user-owned content (projects, quotes, surveys, clients, invoices, ideas, diary entries):
```sql
ALTER TABLE public.<table> ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
```

**Why:** The app bypasses RLS via service_role, so the deny-all policy is defence-in-depth — it blocks direct REST API access using the exposed anon key. Missing composite indexes cause sequential scans on every workspace context switch once a user has significant data. `tests/db-schema.test.js` enforces the first two automatically.

---

### 15. Secret / Env Var Checks Must Fail-Closed

Never write a conditional secret check as:
```js
// WRONG — if the env var is missing, the check is skipped entirely
if (process.env.MY_SECRET && value !== process.env.MY_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Always write it fail-closed:
```js
// CORRECT — missing env var is treated as a misconfiguration → reject
if (!process.env.MY_SECRET || value !== process.env.MY_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

This applies to: cron endpoints (`CRON_SECRET`), internal service-to-service calls (`INTERNAL_CRON_SECRET`), webhook handlers (`*_WEBHOOK_SECRET`), and any other route that relies on a shared secret for access control.

**Why:** A missing env var in production (misconfigured deployment, secret rotation error) should cause the endpoint to reject all traffic, not silently accept it. `tests/db-rules.test.js` detects the fail-open pattern automatically.

---

### 16. Webhook Handlers — Signature Verification Required

Any route that processes external webhook events (payments, messaging, etc.) must:

1. **Verify the signature fail-closed** — reject if the secret is not configured OR the signature is absent OR invalid:
```js
const secret = process.env.WEBHOOK_SECRET;
const signature = request.headers.get('x-signature');

if (!secret) {
  console.error('[webhook] secret not configured');
  return Response.json({ error: 'Not configured' }, { status: 500 });
}
if (!signature || !verifySignature(rawBody, signature, secret)) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
```

2. **Use `timing-safe` comparison** — always use `crypto.timingSafeEqual()` to prevent timing attacks, never `===` for signature strings.

3. **Read the raw body before parsing** — signature is computed over the raw bytes; parsing with `request.json()` first will make verification impossible. Read with `request.text()` or `request.arrayBuffer()` first.

**Why:** A payment webhook that accepts unsigned requests allows anyone to forge subscription activations, subscription cancellations, or refund events. This is a critical revenue and access-control vulnerability.

---

### 17. Rate Limiting on Expensive and Public Endpoints

Any endpoint that does one or more of the following **must** have rate limiting:
- Is accessible without authentication (public IP-based limit)
- Calls an external paid API (OCR, AI, SMTP, Puppeteer PDF)
- Accepts user-generated content from the public internet

**Use the global rate limiter** (`src/lib/rateLimitGlobal.js` backed by Upstash/Vercel KV) — not the in-process `rateLimit()` from `src/lib/rateLimit.js`. The in-process version resets on cold starts and doesn't work across serverless instances.

```js
import { globalRateLimit } from '@/lib/rateLimitGlobal';

// User-scoped (authenticated endpoints)
const { allowed } = await globalRateLimit(`ocr:${user.id}`, { limit: 20, windowSec: 3600 });

// IP-scoped (public endpoints)
const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
const { allowed } = await globalRateLimit(`contact:${ip}`, { limit: 5, windowSec: 3600 });

if (!allowed) return Response.json({ error: 'Túl sok kérés. Kérjük, próbáld újra később.' }, { status: 429 });
```

**Endpoints currently requiring rate limits:**
- `POST /api/auth/request-password-reset` — 5/hour per IP
- `POST /api/quotes/[id]/send` — 10/hour per userId
- `POST /api/ocr` — 20/hour per userId
- `POST /api/invoice-ai` — 20/hour per userId
- `POST /api/szakemberek/[slug]/contact` — 5/hour per IP

---

### 19. Audit Logging — Required on Every Mutation

Every API route handler that performs a mutation (INSERT, UPDATE, DELETE, or any external state change such as a Creem API call) **must** call `logAudit` for both the success path and every failure path where the user identity is known. No exceptions.

```js
import { logAudit } from '@/lib/audit';

// CORRECT — log success AND failure
const { data, error } = await admin.from('quotes').insert([...]).select().single();
if (error) {
  logAudit({ entityId: collectiveId || user.id, userId: user.id, userName: profile.display_name || user.email,
    action: 'Quote creation failed', targetType: 'quote', details: { error: error.message } });
  return Response.json({ error: error.message }, { status: 400 });
}
logAudit({ entityId: collectiveId || user.id, userId: user.id, userName: profile.display_name || user.email,
  action: 'Quote created', targetType: 'quote', targetId: data.id, targetName: data.title });

// WRONG — silent failure
if (error) return Response.json({ error: error.message }, { status: 400 });
```

**What must be logged:**

| Path | Log |
|---|---|
| Successful DB write | action describing what was created/updated/deleted, `targetId`, `targetName` |
| DB error (insert/update fails) | `action: 'X creation failed'`, `details: { error: error.message }` |
| Permission denied (403) | `action: 'X denied'`, `details: { error: 'Permission denied' }` |
| External API failure (Creem, OpenAI, SMTP) | `action: 'X failed'`, `details: { error: msg, creem_status: res.status }` |
| Webhook received | log event type + all extracted context immediately on entry |

**What can be skipped:**
- 401 returns (no user identity — nothing to attribute)
- 400 validation errors on missing/invalid input (not an action, just a bad request)
- GET-only routes (reads are not mutations)
- Internal AI helper routes that produce no DB side-effects (`ocr`, `invoice-ai`, `transcribe`, `fill-property`)

**Field conventions:**
- `action` — English, imperative past tense: `'Quote created'`, `'Quote creation failed'`, `'Subscription canceled'`
- `targetType` — snake_case noun: `'quote'`, `'payment'`, `'survey_entry'`, `'wa_account'`
- `entityId` — the workspace: `collective_id || user.id` (omit for superadmin-only routes)
- `details` — always include `{ error: message }` on failure paths; include business-relevant fields on success (amounts, counts, IDs of related records)

**Payment routes require extra detail** — every Creem API call (checkout, cancel, upgrade, webhook event) must log the `subscription_id`, `product_id`, and `creem_status` so support can reconstruct the exact payment timeline without reading server logs.

---

### 18. DB Migrations — Always Create a Migration File

Any code change that requires a DB schema change (new table, new column, new index, new policy, dropped column) **must** include a corresponding SQL migration file in `supabase/migrations/` before or alongside the code change. Never push code that depends on a schema change without an accompanying migration.

**File naming convention:** `<next_number>_<short_description>.sql` — e.g. `129_soft_delete_diary_ideas.sql`. Use the next sequential number after the last file in `supabase/migrations/`.

**Migration file template:**
```sql
-- Migration NNN: short description
-- Required by: CLAUDE.md §X (rule name) OR feature: <feature name>
-- Apply via Supabase SQL Editor (Dashboard → SQL Editor → New query)

ALTER TABLE public.<table> ADD COLUMN IF NOT EXISTS ...;
CREATE INDEX IF NOT EXISTS ...;
```

**Checklist for every new migration:**
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + deny-all policy if it's a new table (§14)
2. Composite indexes for `(owner_id, deleted_at)` and `(collective_id, deleted_at)` if it uses the workspace model (§14)
3. `deleted_at TIMESTAMPTZ DEFAULT NULL` if it stores user-owned content (§4)
4. Update `Known Issues / Pending migrations` section in this file to list what still needs to be applied

**Apply workflow:** Migrations are applied manually via Supabase SQL Editor — there is no automated migration runner. When deploying a feature, apply the migration SQL first, then deploy the code. The migration files in `supabase/migrations/` are the authoritative record of all schema changes.

---

## Known Issues / In Progress

### Race condition — inclusive collective duplicate creation
`GET /api/collectives` auto-creates the user's inclusive collective if they don't have one. React StrictMode (and any double-render) fires the GET twice simultaneously, both requests see no inclusive collective, and both create one. Partial fix in place (re-queries DB before inserting), but the proper fix is a **unique partial index**:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS one_inclusive_per_owner
ON collective_members (user_id)
WHERE role = 'owner' AND status = 'active'
AND collective_id IN (SELECT id FROM collectives WHERE is_inclusive = true);
```
Apply via Supabase SQL editor when ready.

### Schema gaps
- `survey_items` table — referenced in code (`/api/surveys/[id]/items`) and permission docs but does **not exist** in the DB. Requires a migration before that route is functional.
- `project_media` table — referenced in deletion scripts but does **not exist** in the DB. Requires a migration.

### Bugs to fix
- **Superadmin impersonation display_name bleedthrough** — when SA impersonates a user, `profiles.display_name` of the SA account gets overwritten with the impersonated user's name. Root cause is in the impersonation flow; `god_mode.js` / `refreshSupabaseData` need to avoid writing SA's own profile during impersonation.

### Pending migrations (apply via Supabase SQL Editor in order)
- **Migration 053** — drop old `entity_id` columns
- **Migration 129** (`supabase/migrations/129_soft_delete_diary_ideas.sql`) — add `deleted_at` to `diary_entries` and `ideas`; **code already updated to use soft delete — apply before the next deploy**
- **Migration 130** (`supabase/migrations/130_survey_items.sql`) — create `survey_items` table; required for `/api/surveys/[id]/items` to function
- **Migration 131** (`supabase/migrations/131_composite_indexes.sql`) — composite indexes for projects/quotes/surveys workspace queries; apply for performance
- **Migration 132** (`supabase/migrations/132_inclusive_collective_unique_index.sql`) — unique partial index preventing duplicate inclusive collective on double-render
- RLS policies still reference old `current_entity_id()` function — not enforced, rewrite pending

### Pending features
- `admin` role in collective_members: schema ready, no UI to promote yet
- Approval workflow (`status: pending|approved`): schema ready, logic not active
- Per-project contributor assignment: schema ready, logic not active
- `/clients/[id]` portal still references `entity_id` — needs updating after migration 053
- `/portal` (email OTP client portal): public routes pre-registered, implementation pending
