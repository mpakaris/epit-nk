# CLAUDE.md

@AGENTS.md
@design/desktop/AGENT_BRIEF.md

---

# Epitek — Overview

Lightweight SaaS for Hungarian solo contractors and small collectives (2–6 people). NOT a full PM suite — replaces scattered WhatsApp/Viber threads. Mobile-first (contractors on-site). UI in Hungarian; app translated HU/DE/EN.

**Workspaces:** Personal (private, `owner_id = user.id`) · Collective (shared, paid). `profiles.active_collective_id = NULL` → personal; `= UUID` → collective. Switch via `PATCH /api/auth/context`.

**Roles:** `superadmin` (god mode, `entity_id = NULL`) · `admin`/`owner` (collective full access) · `contributor` (add own work, no doc CRUD) · `user` (personal only).

**Modules:** `/felmeres` (surveys) · `/ajanlatok` (quotes) · `/projektek` (projects) · `/ugyfelek` (clients, GDPR-personal always) · `/weboldalam` (public site) · `/kollektivak` · `/elofizetes` (subscription).

---

# Stack & Dev

**Next.js** (App Router, v16, `--webpack` build) + **Supabase** (Postgres + Auth). `proxy.js` = middleware (NOT `middleware.js`). i18n: next-intl v4, `localePrefix:'never'`, `pathnames:{}` (empty object — do NOT change; localized paths break prod RSC). Locale from `NEXT_LOCALE` cookie only.

```bash
npm run dev | build | start | lint
npx vitest run tests/i18n.test.js   # run after every locale file change
```

**DB:** Supabase Postgres, pooler `aws-0-eu-west-2.pooler.supabase.com:6543`. Migrations: `supabase/migrations/<NNN>_name.sql`, apply manually in numeric order via Supabase SQL Editor. No automated runner.

**Supabase clients:**
```js
createClient()       // @/lib/supabase/server  — API routes, verifies JWT
createAdminClient()  // @/lib/supabase/admin   — bypasses RLS, all API routes use this
createClient()       // @/lib/supabase/client  — client components only
```

**Key libs:** `src/lib/calculations.js` (financials) · `constants.js` (`formatMoney`, `formatDate`, `QUOTE_STATUSES`) · `audit.js` (`logAudit`) · `godMode.js` (`resolveEffectiveUserId`) · `subscriptionLimits.js` (`isEffectivePremium`) · `podColor.js` (`podColor(id)`, `PERSONAL_COLOR`).

**AppContext exports:** `currentUser`, `activeCollectiveId`, `collectives`, `setActiveContext`, `isSuperAdmin`, `isAdmin`, `impersonating`, `isDemoMode`, `contextSwitching`, data arrays (`projects`, `quotes`, `clients`, `surveys`, ...).

---

# Two Design Systems — NEVER MIX

The app has **two completely separate UI trees**. Mobile and desktop are independent; changing one must never affect the other.

## Mobile Design (≤ 767 px) — Pods UI

Scope: `.m-root` in `globals.css`. Components: `src/components/mobile/` and `src/components/mobile/pods/`.

**Shell components:** `Dock.jsx` (bottom tab bar) · `PodStack.jsx` (workspace pod switcher) · `PageHeader.jsx` (coloured document header) · `Sheets.jsx` (bottom-sheet stack) · `WeekCalendar.jsx`.

**Tokens (CSS vars on `.m-root`):**
```
Neutrals:  --deep #0D0F13 · --m-canvas #EDEBE5 · --m-sheet #F5F5F5 · --m-card #fff · --m-ink #0E1116
Doc types: --m-survey #0A7F72 · --m-offer #6D3FD1 · --m-project #1F2A3C  (each has -deep/-tint/-ink)
Workspaces:--m-ws-personal #15181E · --m-ws-cobalt #2F5BFF · --m-ws-orange #FF8A2B  (each has -deep)
Shape:     --m-r-card:26px · --m-r-btn:30px · --m-r-header:0 0 32px 32px · --m-r-sheet:32px 32px 0 0
Touch:     --m-tap:48px (min touch target) · --m-cta:60px (primary CTA)
```

## Desktop Design (≥ 768 px) — Pods UI

Scope: `.dk-root` in `src/styles/desktop.css` (imported by `DesktopShell.jsx`). Components: `src/components/desktop/`.

**Shell structure:**
```
<div.dk-root>  bg:#EDEBE5, padding:12px, flex, gap:12px, 100vh
  <aside.dk-sd>   264px, bg:#EFEDE6 (LIGHT linen), border-radius:32px
  <main.dk-mn>    flex:1, border-radius:32px, overflow:hidden
    <div.dk-page.dk-mod-[module] style={wsStyle}>
      <header.dk-mh>  border-radius:0 0 32px 32px; bg:var(--dk-c); padding:14px 28px
        <span.dk-gl>  decorative glow circle — MUST stay position:absolute (see §css-gotcha)
        kicker + H1 + right actions
      <div.dk-body>   flex:1, overflow-y:auto, padding:20px 28px 24px
```

**Module colours** (set by `.dk-mod-*`, overridable per workspace via `wsStyle`):
```
dashboard:   --dk-c:#15181E  --dk-deep:#0D0F13
surveys:     --dk-c:#0A7F72  --dk-deep:#0D0F13
quotes:      --dk-c:#6D3FD1  --dk-deep:#0D0F13
projects:    --dk-c:#263248  --dk-deep:#0B0F17
clients:     --dk-c:#B8456B  --dk-deep:#2A0F1A
profile:     --dk-c:#44413B  --dk-deep:#121110
collectives: --dk-c:#1E1A4E  --dk-deep:#0D0F13
calendar:    --dk-c:#1E3059  --dk-deep:#0A1225
```

**Workspace-aware header** — apply in every desktop page:
```js
import { podColor } from '@/lib/podColor';
const wsStyle = activeCollectiveId
  ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
  : {};
// apply to: <div className="dk-page dk-mod-dashboard" style={wsStyle}>
```

**Desktop Pods CSS classes:**
| Class | Purpose | Key styles |
|---|---|---|
| `.dk-btn` | Primary button | h:44px, border-radius:22px, 15px 700 |
| `.dk-btn-w` | White button | bg:#fff, color:#0E1116 |
| `.dk-btn-g` | Ghost button (on dark) | bg:rgba(255,255,255,.16), color:#fff |
| `.dk-btn-l` | Linen button | bg:#EFEDE6, color:#0E1116 |
| `.dk-btn-dark` | Dark button | bg:#0E1116, color:#fff |
| `.dk-chip` | Filter chip | h:40px, border-radius:20px, 14px 700 |
| `.dk-input` | Text input | h:46px, border-radius:16px, white bg, shadow, no native border |
| `.dk-card` | White card | bg:#fff, border-radius:24px, deep shadow |
| `.dk-badge` | Pill label | h:26px, bg:#F0F0F2, 12px 700 |
| `.dk-ic` | Icon container | 40×40px, border-radius:13px, bg:#F1F1F3 |
| `.dk-tr` | Table row | grid, border-top, min-height:60px |
| `.dk-th` | Table header | 12px 700 uppercase, color:#5A5F68 |
| `.dk-sr` | Transparent row button | full-width, clickable rows |
| `.dk-h1` | Page heading | Bricolage Grotesque, 32px 700 |
| `.dk-kick` | Kicker text | 12px 700 uppercase |
| `.dk-ws-spinner` | Workspace-switch ring | use `contextSwitching` flag, NOT `dataReady` |

**CSS gotcha — glow circle:** `.dk-mh > * { position: relative }` exists in `desktop.css`. `.dk-mh > .dk-gl { position: absolute }` MUST come after it or the glow becomes a 340px flex item ballooning the header. Never remove the second rule.

**Sidebar nav:** Workspace pod buttons (`.dk-pod`) call `setActiveContext(id)` ONLY — no navigation. Nav links route to pages. The sidebar is light (`#EFEDE6`); pods keep their own dark backgrounds.

**Adding a new desktop screen pattern:**
1. Create `src/app/[locale]/[route]/desktop/[Name]Desktop.jsx`
2. In page.js: `import { detectMobile } from '@/lib/detectMobile'` → branch on `isMobile`
3. Use the shell structure above with correct `.dk-mod-*` class + `wsStyle`
4. Show `<div className="dk-ws-spinner" />` when `contextSwitching`, else page content

---

# Non-Negotiable Rules

## R1 — Mobile/Desktop Separation
Breakpoint: **768 px** only. `useMobile()` from `@/hooks/useMobile` for all JS checks (never `window.innerWidth`). Never edit mobile-only components for a desktop change and vice versa. Touch targets ≥ 44 × 44 px.

## R2 — Overlays: Two Components Only
| Use case | Component |
|---|---|
| Forms, multi-step | `Modal` from `@/components/Modal.jsx` |
| Context menu (open/rename/delete) | `BottomSheet` from `@/components/mobile/BottomSheet.jsx` |
| Success/error/warning | `AlertModal` from `@/components/Modal.jsx` |
| Destructive confirm | `ConfirmModal` from `@/components/Modal.jsx` |
Never create a new `position:fixed` overlay.

## R3 — Permissions (double-layer: client + API)
Client side (fast feedback from local state) + API side (authoritative DB re-read, 403 on fail). Both always required.

Roles in collective: Owner/Admin can create/edit/delete docs + change status. Contributor can only edit/delete own entries.
```js
// Document mutation guard (API)
const isOwner = doc.owner_id === user.id || doc.created_by === user.id;
const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
if (!isOwner && !isKollektivOwner) return Response.json({ error: '...' }, { status: 403 });
// user_id on inserts: ALWAYS server-side — never from request body
```

## R4 — Soft Delete Only
Never `.delete()` on `projects`, `quotes`, `surveys`, `clients`, `invoices`, `diary_entries`, `ideas`. Use `.update({ deleted_at: new Date().toISOString() })`. All list queries must filter `.is('deleted_at', null)`. Sub-records (quote_entries etc.) may be hard-deleted.

## R5 — Data Scoping
```js
// Personal
.eq('owner_id', userId).is('collective_id', null).is('deleted_at', null)
// Collective
.eq('collective_id', collectiveId).is('deleted_at', null)
// clients: ALWAYS personal — never collective (GDPR)
```

## R6 — Demo Mode Navigation
```js
const { isDemoMode } = useApp();
const navPrefix = isDemoMode ? '/demo' : '';
router.push(`${navPrefix}/projektek/${id}`);
```
Every shared component with `<Link>` or `router.push()` needs `navPrefix`.

## R7 — Design Tokens Only
```js
// WRONG:  style={{ color: '#0f172a', borderRadius: '8px' }}
// CORRECT: style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-md)' }}
```
Mobile: use `--m-*` vars. Desktop: use `.dk-*` classes. Never hardcode hex in JSX `style` props.

## R8 — Translations (zero tolerance)
Every visible string goes through the translation system. No exceptions.
- **In `[locale]` pages:** `const t = useTranslations('ns'); <button>{t('key')}</button>`
- **Outside `[locale]`:** use `LANDING_I18N`/`AUTH_I18N` from `src/lib/landingI18n.js`
- Add key to **all three files simultaneously**: `messages/hu.json`, `messages/de.json`, `messages/en.json`
- Validate after edits: `node -e "JSON.parse(require('fs').readFileSync('messages/hu.json','utf8'))"`
- Watch for curly/smart quotes (`"`) introduced by Edit tool — JSON rejects them. Fix byte-level, not via Edit.

## R9 — Subscription Gate
Check `isEffectivePremium(profile)` before creating quotes/surveys/projects/collectives if a tier limit applies.

## R10 — API Error Handling
```js
const res = await fetch('/api/...', { ... });
if (!res.ok) {
  const { error } = await res.json().catch(() => ({}));
  setAlert({ open: true, message: error || 'Hiba történt. Kérjük, próbáld újra.' });
  return;
}
```

## R11 — Banner Layout
Icon + text + button rows: use `useMobile()` branch — desktop is one flex row, mobile puts button on a second right-aligned row. Never `flexWrap:'wrap'`.

## R12 — New DB Tables
Every `CREATE TABLE` needs immediately after:
1. `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;`
2. `CREATE POLICY "deny_all_direct_access" ON public.<t> AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);`
3. Composite indexes: `(owner_id, deleted_at) WHERE collective_id IS NULL` + `(collective_id, deleted_at) WHERE collective_id IS NOT NULL`
4. `deleted_at TIMESTAMPTZ DEFAULT NULL` if user-owned content

## R13 — Migrations
Every schema change → migration file `supabase/migrations/<NNN>_name.sql`. Apply manually before deploying dependent code. No automated runner.

## R14 — Secrets Fail-Closed
```js
// WRONG: if (process.env.SECRET && value !== process.env.SECRET)
// CORRECT:
if (!process.env.MY_SECRET || value !== process.env.MY_SECRET)
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

## R15 — Webhook Signatures
Fail-closed: reject if secret not set OR signature absent OR invalid. Use `crypto.timingSafeEqual()`. Read raw body (`request.text()`) before parsing.

## R16 — Rate Limiting
Use `globalRateLimit` from `@/lib/rateLimitGlobal` (not in-process `rateLimit`). Required on: unauthenticated endpoints, external paid APIs (OCR/AI/SMTP/PDF), public UGC. Rates: password-reset 5/h/IP · quote-send 10/h/user · OCR/invoice-ai 20/h/user · contact 5/h/IP.

## R17 — Audit Logging
Every mutation (INSERT/UPDATE/DELETE, external API call) → `logAudit({ entityId, userId, userName, action, targetType, targetId, targetName, details })`. Log both success and failure. Payment routes: include `subscription_id`, `product_id`, `creem_status`. Skip: 401s, GET-only routes, 400 validation errors, side-effect-free AI helpers.

---

# Superadmin God Mode (compact)

`currentUser` = always SA's OWN profile (via `?real=1`). `impersonating` = target profile. `effectiveUser = impersonating || currentUser`. `isSuperAdmin` from `currentUser.role` only.

- **GM-1:** `init()` ALWAYS calls `/api/auth/profile?real=1` — never without it.
- **GM-3:** `setActiveContext` → DB write for real users; `switchImpersonatingContext` → cookie-only for SA. AppContext dispatcher routes correctly; don't bypass it.
- **GM-4:** Audit logs use `userId: user.id` (real SA) + `details: { on_behalf_of }` when impersonating.
- **GM-5/6:** `resolveEffectiveUserId` only on dual-mode routes (currently only `/api/entity/data`). Never on new SA-only or regular routes.
- **GM-7:** SA language toggle → `NEXT_LOCALE` cookie only, never `PATCH /api/auth/profile`.
- **GM-8:** Start impersonation: set cookies → set state → fetch data → navigate. Stop: clear state → clear cookies → refresh SA data → navigate to `/superadmin`.
- `contextSwitching` flag controls desktop workspace-switch spinner — NOT `dataReady` (setting `dataReady=false` triggers full-screen LoadingGate overlay — wrong UX).

---

# Subscriptions

| Tier | Price | Limits |
|---|---|---|
| Basic | free | 5 surveys, 5 quotes, 1 project |
| Trial | free 14d | Full premium; non-repeatable per email |
| Premium | 7.990 Ft/mo + ÁFA | Unlimited + 1 XS inclusive collective |
| Seat | 1.500 Ft/seat/mo | Owner pays; owner not counted |

**Creem.io** (payment provider): `POST /api/checkout` → checkout session → iframe bottom sheet. Two detection paths: localStorage poll (400ms) + webhook poll (3s). Webhooks at `POST /api/webhooks/creem` — HMAC-SHA256 verified, fail-closed. `grantPremium()` / `revokePremium()` update DB + manage inclusive collective. `profiles.creem_customer_id` stored for portal lookups.

Local dev: ngrok required for webhooks. Set `NEXT_PUBLIC_APP_URL` to ngrok URL; browse through it (not localhost) for checkout to work cross-origin.

---

# Route Guards & Public Routes

`LoadingGate` blocks render until `loading=false && dataReady=true`. When adding a public route, update BOTH:
- `AppContext.jsx` → `PUBLIC_ROUTE_PREFIXES`
- `LoadingGate.jsx` → `PUBLIC_PREFIXES`

---

# Key Routes Decoded

`/ajanlatok` quotes · `/felmeres` surveys · `/projektek` projects · `/ugyfelek` clients · `/naplo` diary · `/naptar` calendar · `/otletek` ideas · `/kollektivak` collectives · `/weboldalam` website builder · `/elofizetes` subscription · `/szakemberek/[slug]` public tradesperson page · `/clients/[id]` client portal (no auth) · `/p/[token]` shareable diary feed · `/demo/*` client-side demo (no auth/DB).

---

# Demo Mode

`DemoProvider` replaces `AppContext` entirely with fake data. All state in `localStorage` key `epitek_demo_state`. Bump `SEED_VERSION` in `seed.js` to reset. Demo pages re-export real pages: `export { default } from '@/app/[route]/page.js'`. Always use `navPrefix`.

---

# Common Agent Mistakes — Check Before Every PR

- Missing `.is('deleted_at', null)` on list queries
- New `position:fixed` overlay instead of `Modal`/`BottomSheet`
- `window.innerWidth` instead of `useMobile()`
- Hard `.delete()` on user content
- Missing `navPrefix` on `<Link>`/`router.push()`
- Hardcoded breakpoint (not 768)
- Hardcoded hex colour in JSX `style`
- Hardcoded string in JSX (even Hungarian)
- `user_id` read from request body on inserts
- Membership check missing role check (`owner`/`admin`) — `active` status alone is not enough
- `resolveEffectiveUserId` added to non-dual-mode routes
- `isSuperAdmin` bypass in new routes
- Audit log using `effectiveUserId` as actor
- SA language toggle writing to `profiles.locale`
- `dataReady=false` for workspace switch (use `contextSwitching` instead)
- Missing `dk-mh > .dk-gl { position: absolute }` rule after editing desktop.css
- Curly quotes in JSON locale files after Edit tool
- `pathnames` changed in `src/i18n/routing.js` without prod webpack build test

---

# Known Issues / Pending

**Pending migrations (apply in order):**
- 053 — drop old `entity_id` columns
- 129 — `deleted_at` on `diary_entries`+`ideas` (code already updated — apply before deploy)
- 130 — `survey_items` table (required for `/api/surveys/[id]/items`)
- 131 — composite indexes on projects/quotes/surveys
- 132 — unique partial index preventing duplicate inclusive collective

**Schema gaps:** `survey_items` and `project_media` tables do not exist yet.

**Bug:** SA impersonation overwrites `profiles.display_name` of SA account with impersonated user's name.

**Race condition:** `GET /api/collectives` can double-create inclusive collective under StrictMode — fix is migration 132.

**Pending features:** `admin` role UI · approval workflow · per-project contributor assignment · `/portal` email OTP · `/clients/[id]` still references `entity_id`.
