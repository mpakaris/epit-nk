# Client Portal — Full Concept & User Stories

## Overview

The Client Portal is an authenticated, client-facing dashboard at `/portal` where real-world clients
(identified by email address) can log in with an OTP and see everything their contractors have
shared with them — across all projects and all contractors they may work with.

---

## Current State (what already exists)

| Feature | Status | Notes |
|---|---|---|
| OTP login flow at `/portal` | ✅ Built | Email → 6-digit OTP → session |
| `/portal/dashboard` page | ✅ Built | Shows quotes + project totals + public diary |
| `/api/portal/data` | ✅ Partial | Quotes, projects, invoice totals, diary (is_public=true) |
| `/api/portal/quotes/[id]/respond` | ✅ Built | Accept / reject / question + contractor email notification |
| `/clients/[id]` unauthenticated view | ⚠️ Retire | Old surface — to be removed in Phase 1 |
| Per-item contractor publishing toggles | ❌ Missing | No UI to choose what to share |
| Individual invoice visibility | ❌ Missing | Only totals currently fetched |
| Labour entry visibility | ❌ Missing | Not fetched at all |
| Media file visibility | ❌ Missing | Not fetched at all |
| 48 h session duration | ❌ Not verified | Needs Supabase OTP session config check |
| Current / past split in dashboard | ❌ Missing | All projects displayed flat |

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Sharing granularity | **Per-item** | Contractor controls each invoice / labour entry / media file / diary entry individually |
| Old `/clients/[id]` page | **Retire** | Redirect to `/portal`; unify everything in one authenticated surface |
| Labour detail | **Line-by-line** | Full transparency to client |
| Client identity | **Email address** | One real person may be `clients` rows for multiple contractors |
| Session length | **48 hours** | Supabase `signInWithOtp` session expiry config |

---

## Data Model — Required DB Changes

### Migration 142: `portal_visible` columns

Add a `portal_visible BOOLEAN NOT NULL DEFAULT false` column to:
- `invoices` — contractor toggles per invoice
- `labour_entries` — contractor toggles per labour entry
- `media_items` — contractor toggles per media file
- `quotes` — contractor toggles per quote (non-draft quotes are already accessible, but contractor should be able to hide specific ones)

Diary entries already have `is_public` — no change needed there; treat it as the diary equivalent.

```sql
-- Migration 142: portal_visible columns for per-item sharing
ALTER TABLE public.invoices        ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.labour_entries  ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.media_items     ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.quotes          ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS invoices_portal_idx        ON public.invoices(portal_visible) WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS labour_entries_portal_idx  ON public.labour_entries(portal_visible) WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS media_items_portal_idx     ON public.media_items(portal_visible) WHERE portal_visible = true;
CREATE INDEX IF NOT EXISTS quotes_portal_idx          ON public.quotes(portal_visible) WHERE portal_visible = true;
```

**Note:** The portal data API must filter by `portal_visible = true` for all four of these tables
going forward. The existing `is_public` filter on diary entries remains unchanged.

---

## User Roles in Portal Context

| Actor | What they can do |
|---|---|
| **Contractor (app user)** | Toggle `portal_visible` on their own invoices, labour entries, media files, quotes; toggle `is_public` on diary entries |
| **Client (portal user)** | View everything shared with them; accept / reject / question quotes marked `portal_visible` |
| **Superadmin** | Access any client's portal view via `/superadmin/portals/[email]` (already exists) |

---

## Phased Delivery Plan

### Phase 1 — Foundation & Retirement (prerequisite)
Retire old surface, apply DB migration.

### Phase 2 — Contractor Publishing Controls
Give contractors UI in `/projektek/[id]` to decide what to share.

### Phase 3 — Portal Data API (extend)
Extend `/api/portal/data` to serve the new item types.

### Phase 4 — Client Dashboard (redesign)
Proper dashboard UX with current / past split, contractor sections, detail views.

### Phase 5 — Client Actions
Verify and polish the quote response flow; consider future interactions.

---

## User Stories

---

### Phase 1 — Foundation & Retirement

---

#### CP-01 · DB Migration: portal_visible columns

**As a** developer  
**I want** `portal_visible` columns on `invoices`, `labour_entries`, `media_items`, and `quotes`  
**So that** contractors can control per-item portal sharing

**Acceptance criteria:**
- Migration file `supabase/migrations/142_portal_visible.sql` created
- All four columns default to `false` (not shared by default — opt-in model)
- Partial indexes created for performance
- Migration applied to production before any Phase 2 or Phase 3 code is deployed

---

#### CP-02 · Retire `/clients/[id]`

**As a** developer  
**I want** the old unauthenticated `/clients/[id]` route retired  
**So that** there is a single client-facing surface (`/portal`) and no unauthenticated data leakage

**Acceptance criteria:**
- `GET /clients/[id]` returns a redirect to `/portal` (HTTP 301)
- The old `ClientPortal.jsx` component is removed or archived
- `src/app/clients/[id]/ajanlat/[quoteId]/page.js` is also retired (redirects to `/portal`)
- Both `/clients/` prefixes are removed from `PUBLIC_PREFIXES` in `LoadingGate.jsx` and `PUBLIC_ROUTE_PREFIXES` in `AppContext.jsx`
- The old API routes that powered `/clients/[id]` (if any dedicated ones exist) are audited and removed if no longer needed

---

### Phase 2 — Contractor Publishing Controls

---

#### CP-03 · "Portal" section in Project Detail page

**As a** contractor  
**I want** a dedicated "Portál megosztás" section in the project detail page (`/projektek/[id]`)  
**So that** I can see at a glance what I'm sharing with my client and toggle items on/off

**Acceptance criteria:**
- New collapsible section at the bottom of the project detail page, titled "Portál megosztás"
- Section shows four sub-lists: Számlák (invoices), Munkanapló (labour entries), Média (media), Napló (diary entries)
- Each item shows its name/description + a toggle switch
- A summary badge at the top ("3 megosztott elem") gives a quick count
- Section is only visible when the project has a `client_id` set (no client = no portal sharing makes sense)
- Mobile-first: toggle rows must meet 44 × 44 px touch target rule

---

#### CP-04 · Toggle portal_visible on individual invoices

**As a** contractor  
**I want** to toggle `portal_visible` on each invoice within a project  
**So that** I can choose exactly which invoices my client sees

**Acceptance criteria:**
- Each invoice in the "Portál megosztás → Számlák" list has a toggle
- Toggle calls `PATCH /api/projects/[id]/invoices/[invoiceId]` with `{ portal_visible: true/false }`
- API verifies the requesting user owns the project (or is admin/owner of the collective)
- Optimistic UI: toggle responds instantly, rolls back on API error
- Zero-state: "Nincsenek számlák ebben a projektben" if no invoices exist
- `logAudit` called on both toggle-on and toggle-off

---

#### CP-05 · Toggle portal_visible on individual labour entries

**As a** contractor  
**I want** to toggle `portal_visible` on each labour entry within a project  
**So that** I can choose exactly which labour costs my client sees

**Acceptance criteria:**
- Each labour entry in "Portál megosztás → Munkanapló" has a toggle
- Toggle calls `PATCH /api/projects/[id]/labour/[entryId]` with `{ portal_visible: true/false }`
- API permission check identical to CP-04
- Optimistic UI with rollback
- Entry display shows: date, description, hours or flat amount
- `logAudit` on each toggle

---

#### CP-06 · Toggle portal_visible on individual media items

**As a** contractor  
**I want** to toggle `portal_visible` on each media file (images/videos) within a project  
**So that** I can curate a photo gallery for my client

**Acceptance criteria:**
- Each media item in "Portál megosztás → Média" shows a thumbnail + toggle
- Toggle calls `PATCH /api/media-items/[mediaId]` with `{ portal_visible: true/false }`
- API verifies ownership via the media item's `project_id` → project owner check
- Thumbnail grid layout (not list) for media items — 3 per row on mobile, 5 per row on desktop
- `logAudit` on each toggle

---

#### CP-07 · Toggle portal_visible on quotes from /ajanlatok

**As a** contractor  
**I want** to control which quotes are visible on the client portal, from the quote detail page  
**So that** I can keep draft-like or internal quotes off the portal even after sending

**Acceptance criteria:**
- Quote detail page (`/ajanlatok/[id]`) shows a "Portál megosztás" toggle in the sidebar / action area
- Toggle calls `PATCH /api/quotes/[id]` with `{ portal_visible: true/false }`
- **Default behaviour:** when a quote status changes to `sent`, `portal_visible` is automatically set to `true`. Contractor can override manually.
- When a quote is `rejected` or `expired`, contractor can still keep it visible (historical record) or hide it
- Portal data API filters to `portal_visible = true` for all quotes (no longer relies solely on `status != draft`)
- `logAudit` on toggle

---

#### CP-08 · Diary entry "is_public" toggle consistency

**As a** contractor  
**I want** the diary entry `is_public` toggle in the diary / project detail page to visually align with the new portal sharing UX  
**So that** the experience is coherent

**Acceptance criteria:**
- Existing `is_public` toggle on diary entries is visually styled to match the new portal sharing toggles (same switch component, same label pattern: "Megosztás az ügyféllel")
- No DB change needed — column already exists
- Diary entries in the "Portál megosztás → Napló" list in CP-03 reflect the existing `is_public` column
- Toggling via the portal section and toggling via the diary edit view must stay in sync (both write to `is_public`)

---

### Phase 3 — Portal Data API

---

#### CP-09 · Extend portal data API: individual invoices

**As a** client  
**I want** to see the individual invoices my contractor has shared with me  
**So that** I have a detailed financial record of the project

**Acceptance criteria:**
- `/api/portal/data` now fetches invoices with `portal_visible = true` for all relevant projects
- Returned fields per invoice: `id`, `project_id`, `category`, `value_huf`, `description`, `invoice_date`, `vendor`
- Invoice data is grouped inside the project object in the response
- Existing invoice total calculation is kept (project summary still shows a total)
- API performance: add to the existing `Promise.all` batch — no extra round trips

---

#### CP-10 · Extend portal data API: labour entries

**As a** client  
**I want** to see the labour entries my contractor has shared with me  
**So that** I know the work that was done and its cost

**Acceptance criteria:**
- `/api/portal/data` now fetches `labour_entries` with `portal_visible = true` for all relevant projects
- Returned fields: `id`, `project_id`, `work_description`, `hours`, `rate_huf`, `amount_huf`, `entry_date`, `created_by`
- Labour data grouped inside each project object
- No sensitive internal fields exposed (e.g. internal notes if any)

---

#### CP-11 · Extend portal data API: media items

**As a** client  
**I want** to see the media files (photos/videos) my contractor has shared with me  
**So that** I can see the progress and state of the project

**Acceptance criteria:**
- `/api/portal/data` now fetches `media_items` with `portal_visible = true` for all relevant projects
- Returned fields: `id`, `project_id`, `r2_key`, `thumbnail_url` (if exists), `mime_type`, `created_at`
- URLs served via `r2PublicUrl(r2_key)` — not raw R2 paths
- Media grouped inside each project object

---

#### CP-12 · Portal data API: quote filtering via portal_visible

**As a** client  
**I want** to only see quotes my contractor explicitly decided to share  
**So that** no internal / draft-like documents accidentally appear

**Acceptance criteria:**
- `/api/portal/data` quote query changes from `.neq('status', 'draft')` to `.eq('portal_visible', true)`
- Quotes with `portal_visible = true` AND any status other than `draft` are shown
- Backward compatibility: on deploy, run a one-time data migration that sets `portal_visible = true` for all existing `sent`/`accepted`/`rejected` quotes (so existing clients don't lose their history)
  - This can be a small SQL snippet run before the code deploy: `UPDATE quotes SET portal_visible = true WHERE status IN ('sent','accepted','rejected') AND deleted_at IS NULL;`

---

### Phase 4 — Client Dashboard

---

#### CP-13 · Session: 48-hour portal login

**As a** client  
**I want** to stay logged into the portal for 48 hours without re-authenticating  
**So that** I don't have to enter OTP every time I check on my project

**Acceptance criteria:**
- Supabase `signInWithOtp` session configured for 48h expiry (via Supabase dashboard: Auth → Email → `OTP expiry` + session TTL settings)
- Portal login page (`/portal/page.jsx`) does not call `supabase.auth.signOut()` on window close
- After 48h, the session is invalid and the user is redirected to `/portal` (login page)
- No "remember me" checkbox needed — 48h is always the duration

---

#### CP-14 · Client dashboard: current vs. past projects split

**As a** client  
**I want** a clear separation between active/current projects and closed/past projects  
**So that** I can quickly focus on what's happening now

**Acceptance criteria:**
- Dashboard top section: "Folyamatban lévő projektek" — projects with status `active` or `in_progress`
- Dashboard bottom section: "Lezárt projektek" — projects with status `completed`, `closed`, or `archived`
- If no active projects: a subtle empty state ("Jelenleg nincs aktív projekt") — not an error
- Each project card shows: project name, contractor name, start date, shared items count, latest diary entry date
- Clicking a project card opens the project detail view (CP-15)

---

#### CP-15 · Client dashboard: per-contractor sections

**As a** client  
**I want** to see all my contractors grouped separately on the dashboard  
**So that** I can distinguish between work done by different contractors

**Acceptance criteria:**
- If client has records with more than one contractor, the dashboard is grouped by contractor
- Each contractor group shows: contractor display name / company name, their contact email
- If only one contractor, no grouping header needed — just show projects flat
- Order: contractors sorted by most recent project activity (descending)

---

#### CP-16 · Client dashboard: project detail view

**As a** client  
**I want** to drill into a project and see all shared content in organised tabs  
**So that** I have a full picture of the project without scrolling through a single long page

**Acceptance criteria:**
- Project detail view accessible from the project card
- Tabs (or sections if only a few items): **Árajánlat** / **Számlák** / **Munkadíj** / **Média** / **Napló**
- Tab visibility: a tab only appears if the contractor has shared at least one item of that type
- **Árajánlat tab:** quote line items, total, status badge, accept/reject/question actions (for `sent` status quotes)
- **Számlák tab:** list of invoices with category, description, amount, date — plus a running total at the top
- **Munkadíj tab:** list of labour entries with description, date, hours/rate, amount — plus a total
- **Média tab:** photo/video grid with lightbox on tap (reuse existing `Lightbox` component)
- **Napló tab:** diary entries with date, title, body, `client_note`, photos
- All monetary values formatted with `formatMoney(amount, 'HUF')` (or contractor's currency)
- Mobile-first layout; each tab scrolls independently

---

#### CP-17 · Client dashboard: overall financial summary per project

**As a** client  
**I want** a quick financial summary at the top of each project  
**So that** I can see totals at a glance without scrolling through individual lines

**Acceptance criteria:**
- Project detail header shows three stat tiles: **Ajánlat összege** / **Számlázott** / **Munkadíj**
- These only show values for items with `portal_visible = true` / `is_public = true`
- If a tile has no data (nothing shared), it shows "—" not "0 Ft"

---

### Phase 5 — Client Actions

---

#### CP-18 · Client: accept quote

**As a** client  
**I want** to accept a quote directly from the portal  
**So that** I can confirm the work without calling or messaging the contractor

**Acceptance criteria:**
- Already built in `/api/portal/quotes/[id]/respond` — verify works correctly end-to-end
- UI: "Elfogadom" button visible only for quotes with `status = 'sent'`
- After accept: quote status updates to `accepted`, button replaced with "Elfogadva ✓" badge
- Contractor receives email notification (already implemented)
- Optional text field: "Megjegyzés (opcionális)" before confirming
- Confirm step: `ConfirmModal` ("Biztosan elfogadod az ajánlatot?") to prevent accidental taps
- `logAudit` already implemented — verify it fires

---

#### CP-19 · Client: decline quote

**As a** client  
**I want** to decline a quote from the portal  
**So that** I can communicate my decision without a phone call

**Acceptance criteria:**
- "Elutasítom" button visible for `status = 'sent'` quotes
- Modal with mandatory reason field: "Kérjük, írd le az elutasítás okát" (min 10 chars)
- After decline: status → `rejected`, UI reflects this
- Contractor email notification sent (already implemented)
- `logAudit` fires

---

#### CP-20 · Client: return quote with questions

**As a** client  
**I want** to send questions or change requests back to my contractor about a quote  
**So that** I can clarify details before accepting or declining

**Acceptance criteria:**
- "Kérdésem van" button visible for `sent` quotes
- Modal with text area: "Üzenet a vállalkozónak" (required, min 10 chars)
- Quote status stays `sent` after question (contractor must respond, then client can act)
- Contractor email notification sent with the question (already implemented)
- UI feedback: "Üzeneted elküldve" confirmation state on the button
- `logAudit` fires

---

#### CP-21 · Client: logout

**As a** client  
**I want** a clear "Kijelentkezés" button in the portal  
**So that** I can end my session when using a shared device

**Acceptance criteria:**
- Logout button in the portal header / nav
- Calls `supabase.auth.signOut()` and redirects to `/portal` (login page)
- No confirmation modal needed for logout

---

## API Changes Summary

| Route | Change |
|---|---|
| `PATCH /api/projects/[id]/invoices/[invoiceId]` | Add `portal_visible` field handling |
| `PATCH /api/projects/[id]/labour/[entryId]` | Add `portal_visible` field handling |
| `PATCH /api/media-items/[mediaId]` | Add `portal_visible` field handling |
| `PATCH /api/quotes/[id]` | Add `portal_visible` field handling; auto-set `true` on `sent` status transition |
| `GET /api/portal/data` | Extend: individual invoices, labour entries, media items (all filtered by `portal_visible = true`); change quote filter from `status != draft` → `portal_visible = true` |
| `GET /clients/[id]` | Redirect 301 → `/portal` |

---

## Migration Checklist

| Migration | Description | Status |
|---|---|---|
| 142 | `portal_visible` columns on invoices, labour_entries, media_items, quotes | ❌ Pending |
| (SQL snippet) | Backfill `portal_visible = true` for existing sent/accepted/rejected quotes | ❌ Run before Phase 3 deploy |

---

## Open Questions / Future Scope

- **CP-22 (Future):** Client can send a free-form message to contractor from the portal (not tied to a specific quote)
- **CP-23 (Future):** Contractor can upload a signed PDF of an accepted quote to the portal
- **CP-24 (Future):** Client receives an email notification when the contractor shares new content (new invoice, new diary entry, etc.)
- **CP-25 (Future):** Client can download a combined PDF report of all shared documents for a project

---

## Delivery Order (strict)

```
CP-01 (migration) → CP-07 (quote auto-share on send) → CP-02 (retire old page)
  → CP-03 through CP-08 (publishing UI)
  → CP-09 through CP-12 (extend API — apply CP-01 migration first)
  → CP-13 through CP-17 (dashboard redesign)
  → CP-18 through CP-21 (client actions — verify/polish)
```

**Hard rule:** Never deploy Phase 3 (extend API) before Phase 1 (migration 142) is applied — the API
queries `portal_visible` columns that don't yet exist.
