# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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

SA impersonates any user:
- Cookie `god_mode_user` = impersonated user's UUID
- Cookie `god_mode_entity` = their active collective UUID (empty = personal)
- `entity/data` route reads these cookies when `profile.role === 'superadmin'`
- `src/lib/godMode.js` → `resolveEffectiveUserId()` handles cookie parsing
- `refreshSupabaseData` checks `sessionStorage.getItem('god_mode')` to confirm active impersonation before overwriting SA's global state

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
| `constants.js` | `INVOICE_CATEGORIES`, `QUOTE_ENTRY_TYPES`, `QUOTE_STATUSES`, `formatHUF()`, `formatDate()` |
| `mediaGate.js` | `processMediaFiles()` — compresses images → WebP (400 KB target), validates video ≤ 10 MB |
| `r2.js` | Cloudflare R2 (S3-compatible) upload/delete; `r2PublicUrl(key)` builds CDN URL |
| `emailTemplates.js` | `fillTemplate()`, `wrapEmail()` — branded HTML email wrapper |
| `generateOfferPdf.js` | Puppeteer: renders `/ajanlatok/[id]/nyomtatas` → PDF for email attachment |
| `audit.js` | `logAudit()` — fire-and-forget write to `audit_logs` table |
| `websiteThemes.js` | `COLOR_SCHEMES` + `TYPOGRAPHY` for the website builder |
| `godMode.js` | `resolveEffectiveUserId()` — superadmin cookie parsing |

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

## Known Issues / In Progress
- Migration 053 written — apply via Supabase SQL editor to drop old entity_id columns
- RLS policies still reference old `current_entity_id()` function — not enforced, rewrite pending
- `admin` role in collective_members: schema ready, no UI to promote yet
- Approval workflow (`status: pending|approved`): schema ready, logic not active
- Per-project contributor assignment: schema ready, logic not active
- `/clients/[id]` portal still references `entity_id` — needs updating after migration 053
- `/portal` (email OTP client portal): public routes pre-registered, implementation pending
