# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Epitek — Product Overview

Epitek is a **lightweight SaaS for solo contractors** (Hungarian market). It is NOT a full project management suite — it is a focused tool that lets tradespeople replace scattered WhatsApp/Viber/Messenger threads with one organised place.

**Primary users:**
1. **Solo contractors** — one person who needs quotes, project tracking, a client list, and a public website, all in one place with minimal clicks.
2. **Small collectives** — 2–6 contractors who team up for a single project and then part ways. One person is the Owner/Coordinator; the others are subcontractors. The collective is temporary and lightweight, not a company.

**Design principles:**
- Everything shareable with 1–2 clicks (share link, client portal, public website).
- Speed over completeness — features must be quick to reach, not buried.
- Mobile-first in practice — contractors use phones on-site.
- Hungarian language everywhere in the UI.

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
- **Hungarian UI** — all user-facing text (labels, buttons, placeholders, empty states, errors) must be in Hungarian.
- **`user_id` from request body** — always set `user_id: user.id` server-side on inserts; never trust the client.
- **Membership check without role** — checking only `active` status is not enough for document creation; must also verify `role === 'owner' || role === 'admin'`.
- **Superadmin bypass in new routes** — do not add `isSuperAdmin` escape hatches to new routes; SA uses DB access.
- **`flexWrap: 'wrap'` on banner rows** — see rule 11.

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
- `diary_entries` has **no `deleted_at` column** — currently uses hard delete. Soft-delete rule (§4) cannot be applied until a migration adds the column.

### Bugs to fix
- **Superadmin impersonation display_name bleedthrough** — when SA impersonates a user, `profiles.display_name` of the SA account gets overwritten with the impersonated user's name. Root cause is in the impersonation flow; `god_mode.js` / `refreshSupabaseData` need to avoid writing SA's own profile during impersonation.

### Pending migrations
- Migration 053 written — apply via Supabase SQL editor to drop old `entity_id` columns
- RLS policies still reference old `current_entity_id()` function — not enforced, rewrite pending

### Pending features
- `admin` role in collective_members: schema ready, no UI to promote yet
- Approval workflow (`status: pending|approved`): schema ready, logic not active
- Per-project contributor assignment: schema ready, logic not active
- `/clients/[id]` portal still references `entity_id` — needs updating after migration 053
- `/portal` (email OTP client portal): public routes pre-registered, implementation pending
