# i18n Plan — Epitek

## Current Status (last updated: 2026-11-02)

### Phase 1 — Infrastructure ✅ DONE
| Ticket | Status | Notes |
|---|---|---|
| T-01 | ✅ Done | next-intl installed; `messages/hu.json`, `de.json`, `en.json` (410 lines each) created; `src/i18n/routing.js`, `src/i18n/request.js` created |
| T-02 | ✅ Done | `middleware.js` at project root with full matcher excluding demo/api/public routes |
| T-03 | ✅ Done | All protected pages moved to `src/app/[locale]/`; `[locale]/layout.jsx` wraps with NextIntlClientProvider |

### Phase 2 — Route migration ✅ DONE
| Ticket | Status | Notes |
|---|---|---|
| T-04 | ✅ Done | `src/lib/publicRoutes.js` created; AppContext + LoadingGate import from it |
| T-05 | ✅ Done | `src/navigation.js` created with createNavigation(routing) exports |
| T-06 | ✅ Done | Sidebar uses `Link as LocaleLink from '@/navigation'` + `useTranslations`; AppContext route guard works without prefix stripping |
| T-07 | ✅ Done | All `/ajanlatok` detail/sub pages use `from '@/navigation'` (`[id]`, `[id]/szerkesztes`, `uj`, `nyomtatas`) |
| T-08 | ✅ Done | All `/felmeres` detail/sub pages use `from '@/navigation'` (`[id]`, `[id]/szerkesztes`, `[id]/feltoltes`, `uj`) |
| T-09 | ✅ Done | All `/projektek` pages use `from '@/navigation'` (ProjectsListClient, ProjectDetailClient, uj, szerkesztes, feltoltes, naplo sub-pages) |
| T-10 | ✅ Done | `/ugyfelek/[id]` and `/ugyfelek/uj` use `from '@/navigation'` |
| T-11 | ✅ Done | `/naptar` uses `from '@/navigation'`; `/naplo` is accessed via projekt sub-routes (also wired) |
| T-12 | ✅ Done | `/osszes` uses `from '@/navigation'`; `/otletek` and `/kollektivak` use LocaleLink via shared components |
| T-13 | ✅ Done | `/profil` and `/elofizetes` use `from '@/navigation'`; katalogus/osszes wired |
| T-14 | ✅ Done | `src/components/LocaleSwitcher.jsx` built — HU/DE/EN buttons using `router.replace(pathname, { locale })` |

Shared components also wired: `Sidebar.jsx`, `CompactRow.jsx`, `DocumentListPage.jsx`, `ItemCard.jsx`.

Note: List pages (`ajanlatok/page.js`, `felmeres/page.js`) still pass `navPrefix`-prefixed paths as `href` props, but the locale-aware `Link` in `DocumentListPage.jsx` handles the locale translation at render time. The `navPrefix` survives only to prefix `/demo/` for demo mode.

### Phase 3 — Text extraction ⚠️ PARTIAL
JSON namespaces: **complete for all 11 modules + `mobile` namespace** — this unblocks all remaining t() wiring.

| Ticket | Status | Notes |
|---|---|---|
| T-15 | ✅ Done | Sidebar, Modal, BottomSheet, AlertModal all use `useTranslations` |
| T-15b | ✅ Done | All mobile components wired: FloatingNav, WorkspacePicker, WorkspaceSectionHeader, SharingBanner, QuickDiarySheet, QuickCostSheet, QuickCostSheet, ItemCard, CompactRow, StatusBadge (mobile+shared), ConfirmDialog, DocumentListPage |
| T-16 | ⚠️ Partial | List page (11 t() calls) ✅; `uj/page.js` (9 t() calls) ✅; detail `[id]/page.js` (1675 lines, only 3 t() calls, ~33 hardcoded strings remain) — **the main outstanding item** |
| T-17 | ⚠️ Partial | List page (14 t() calls) ✅; `uj/page.js` mostly wired; `[id]/page.js` (1027 lines, 0 t() calls, ~23 hardcoded strings) — **needs full wiring** |
| T-18 | ✅ Done | Projects list (17 t() calls) + detail page (18 t() calls) fully wired |
| T-19 | ⚠️ Partial | List page (37 t() calls) ✅; `uj/page.js` (164 lines, ~3 remaining hardcoded strings) — nearly done |
| T-20 | ⚠️ Partial | Calendar page (465 lines, ~4 remaining hardcoded strings) — nearly done; naplo accessed via projekt sub-routes |
| T-21 | ⚠️ Partial | Ötletek (9 t() calls) ✅; weboldalam (8 t() calls) partial; kollektivak (5 t() calls) partial |
| T-22 | ⚠️ Partial | Profil (8 t() calls) partial; elofizetes (305 lines, ~27 hardcoded strings, only 2 t() calls) — needs wiring |
| T-23 | ✅ Done | `formatDate()` accepts optional `locale` param (defaults to `'hu-HU'`) |
| T-24 | ❌ Pending | Static pages: `/impressum`, `/adatkezeles`, `/aszf`, `/about` |
| T-25 | ❌ Pending | API error strings still hardcoded Hungarian in route handlers |

**Remaining Phase 3 work ranked by effort:**
1. `ajanlatok/[id]/page.js` — 1675 lines, ~33 strings (T-16) — **largest**
2. `felmeres/[id]/page.js` — 1027 lines, ~23 strings (T-17) — **large**
3. `elofizetes/page.js` — 305 lines, ~27 strings (T-22)
4. `weboldalam/page.js` + `kollektivak/page.js` — partial (T-21)
5. `profil/page.js` — partial (T-22)
6. `naptar/page.js` — ~4 strings remaining (T-20) — **quick**
7. `ugyfelek/uj/page.js` — ~3 strings remaining (T-19) — **quick**

---

## Final Approach

**Library:** `next-intl` with `localePrefix: 'never'`

**Locale strategy — no prefixes, ever:**
| Locale | URL | Example |
|---|---|---|
| Hungarian (`hu`) | clean slug | `/ajanlatok` |
| German (`de`) | clean slug | `/angebote` |
| English (`en`) | clean slug | `/offers` |

**How it works:** The slug itself is the locale indicator. `/angebote` is always German. `/offers` is always English. `/ajanlatok` is always Hungarian. No `/de/`, `/en/`, `/hu/` ever appears in a URL.

The next-intl middleware detects locale in this order:
1. Slug map — if the path starts with a known localized slug (e.g. `/angebote`), the locale is `de`
2. `NEXT_LOCALE` cookie — set when the user last visited a localized slug or used the language switcher
3. `Accept-Language` header — browser preference
4. Fallback: `hu`

Once the locale is determined, the middleware **internally** rewrites `/angebote/123` to `/de/ajanlatok/123` before Next.js routing resolves it. The user never sees the internal path.

**`[locale]` folder is internal only.** `src/app/[locale]/ajanlatok/` is the file on disk. The URL `/ajanlatok` maps to it. The `[locale]` segment is populated by the middleware rewrite, not by the URL. Users never see it.

**For non-translated routes** (e.g. `/dashboard`, `/profil`) — locale comes from the cookie set by the last localized page the user visited. A brand-new user with no cookie gets Hungarian by default.

---

**What stays outside `[locale]`** (language-agnostic, no locale logic):
- `/demo/*` — Hungarian only, localized demo deferred
- `/szakemberek/[slug]` — public contractor page
- `/clients/[id]` — client portal
- `/p/[token]` — shared diary link
- `/invitations/[token]`
- `/auth/*`, `/login`, `/change-password`
- `/impressum`, `/adatkezeles`, `/aszf`, `/about`
- `/api/*`

**navPrefix replacement:** The existing `navPrefix = isDemoMode ? '/demo' : ''` pattern is replaced by next-intl's locale-aware `Link` and `useRouter` from `src/navigation.js`. Demo mode retains its own prefix logic on top.

---

## Slug Translation Map

### Top-level routes

| Internal (canonical) | HU | DE | EN |
|---|---|---|---|
| `/dashboard` | `/dashboard` | `/dashboard` | `/dashboard` |
| `/ajanlatok` | `/ajanlatok` | `/angebote` | `/offers` |
| `/felmeres` | `/felmeres` | `/aufmass` | `/surveys` |
| `/projektek` | `/projektek` | `/projekte` | `/projects` |
| `/ugyfelek` | `/ugyfelek` | `/kunden` | `/clients` |
| `/naptar` | `/naptar` | `/kalender` | `/calendar` |
| `/naplo` | `/naplo` | `/tagebuch` | `/diary` |
| `/weboldalam` | `/weboldalam` | `/meine-website` | `/my-website` |
| `/otletek` | `/otletek` | `/ideen` | `/ideas` |
| `/kollektivak` | `/kollektivak` | `/kollektive` | `/collectives` |
| `/profil` | `/profil` | `/profil` | `/profile` |
| `/elofizetes` | `/elofizetes` | `/abonnement` | `/subscription` |
| `/katalogus` | `/katalogus` | `/katalog` | `/catalogue` |
| `/osszes` | `/osszes` | `/alle` | `/all` |

### Named sub-routes (non-[id])

| Internal | HU | DE | EN |
|---|---|---|---|
| `/ajanlatok/uj` | `/ajanlatok/uj` | `/angebote/neu` | `/offers/new` |

Dynamic `[id]` segments are never translated — they pass through as-is.

---

## User Stories

Each ticket is scoped to be completable and testable in one session.
Tickets must be done in order within each phase.

---

### Phase 1 — Infrastructure (no visible changes to users)

---

#### T-01 · Install next-intl + create config skeleton

**Goal:** Library installed, all config files created. No app restructuring yet.

**Tasks:**
- `npm install next-intl`
- Create `src/i18n/routing.ts` — defines locales `['hu', 'de', 'en']`, `defaultLocale: 'hu'`, `localePrefix: 'never'`, and the full `pathnames` map from the slug table above
- Create `src/i18n/request.ts` — server-side locale resolver (reads `x-next-intl-locale` header set by middleware)
- Create `messages/hu.json`, `messages/de.json`, `messages/en.json` as empty objects `{}`
- Wrap `next.config.mjs` with `createNextIntlPlugin` if required by the installed version

**Acceptance:** `npm run build` passes. No runtime changes yet.

---

#### T-02 · Add `middleware.ts` for locale + slug detection

**Goal:** Incoming requests get a locale resolved and internally rewritten. No URL changes visible to users.

**Tasks:**
- Create `middleware.ts` at project root
- Build a flat slug→locale lookup from the pathnames map: `{ angebote: 'de', offers: 'en', aufmass: 'de', surveys: 'en', ... }` for every non-Hungarian slug
- Middleware logic:
  1. Parse first path segment
  2. If it matches a non-HU slug → set locale, rewrite to canonical internal path
  3. Otherwise → read `NEXT_LOCALE` cookie → fall back to `Accept-Language` → default `hu`
  4. Internally rewrite to `/[locale]/[canonical-path]` (e.g. `/angebote/123` → `/de/ajanlatok/123`)
- Matcher: exclude `/api/*`, `/_next/*`, `/favicon.ico`, and all routes listed in "What stays outside [locale]"

**Acceptance:**
- `curl http://localhost:3000/angebote` responds with the quotes page, no redirect, URL stays `/angebote`
- `curl http://localhost:3000/ajanlatok` responds with the quotes page in Hungarian
- `curl -H "Accept-Language: de" http://localhost:3000/dashboard` renders in German (cookie set)
- `/api/entity/data` is unaffected

---

#### T-03 · Restructure app directory → `[locale]` wrapper

**Goal:** All protected pages live under `src/app/[locale]/`. This is the largest structural change.

**Tasks:**
- Create `src/app/[locale]/layout.jsx` — wraps children in `NextIntlClientProvider`, sets `<html lang={locale}>`
- Move into `src/app/[locale]/`: `dashboard`, `ajanlatok`, `felmeres`, `projektek`, `ugyfelek`, `naptar`, `naplo`, `weboldalam`, `otletek`, `kollektivak`, `profil`, `elofizetes`, `katalogus`, `osszes`, `admin`, `superadmin`
- Keep outside `[locale]`: `demo`, `szakemberek`, `clients`, `p`, `invitations`, `auth`, `login`, `change-password`, `impressum`, `adatkezeles`, `aszf`, `about`, `checkout-popup-success`, `portal`, `api`
- Root `src/app/layout.js` becomes a minimal shell (lang tag moves to `[locale]/layout`)

**Acceptance:**
- `http://localhost:3000/dashboard` loads correctly (URL unchanged, hu default)
- `http://localhost:3000/angebote` loads the quotes list (URL unchanged, de locale)
- `/demo/dashboard` still loads (stays outside [locale])
- No 404s on any previously working route

---

### Phase 2 — Route migration (wiring up navigation)

---

#### T-04 · Consolidate PUBLIC_ROUTE arrays

**Goal:** Single source of truth for public routes. Since there are no locale prefixes, the logic is simpler than the prefix approach.

**Tasks:**
- Create `src/lib/publicRoutes.js` exporting `PUBLIC_PREFIXES` and `PUBLIC_EXACT`
- Remove the duplicate arrays from `AppContext.jsx` (line 97) and `LoadingGate.jsx` (line 9) — both import from the new file
- AppContext route guard does NOT need to strip a locale prefix (there is none). The guard checks the raw pathname as-is.
- Add translated public slugs to the public list if any translated route maps to a currently public path (currently: none)

**Acceptance:** Navigating to `/angebote` while logged out redirects to login. `/clients/[id]` remains accessible without auth.

---

#### T-05 · Locale-aware navigation helper

**Goal:** Single import point for all in-app navigation.

**Tasks:**
- Create `src/navigation.js` — re-exports `Link`, `useRouter`, `usePathname`, `redirect` from next-intl's `createNavigation(routing)`
- These are automatically locale-aware and will generate the correct localized slug (e.g. `useRouter().push('/ajanlatok')` generates `/angebote` for a German user)
- The demo `navPrefix` logic wraps on top: `const href = \`${demoPrefix}${path}\`` where `path` is the result from next-intl's router

**Acceptance:** File exists, exports compile. Demo links still resolve to `/demo/...`.

---

#### T-06 · Update Sidebar + AppContext route guard

**Goal:** Primary navigation uses locale-aware links. AppContext guard works without prefix stripping.

**Files:** `src/components/Sidebar.jsx`, `src/context/AppContext.jsx`

**Tasks:**
- Replace all `<Link href="...">` in Sidebar with locale-aware `Link` from `src/navigation.js`
- Replace `navPrefix` string concatenation in Sidebar with the new navigation pattern
- `setActiveContext` / `refreshSupabaseData` redirects use locale-aware router
- AppContext route guard: no change needed for locale (no prefix to strip), but verify it still works correctly with translated slugs in the pathname

**Acceptance:**
- German user's sidebar shows `/angebote` links
- Hungarian user's sidebar shows `/ajanlatok` links
- Demo sidebar still shows `/demo/ajanlatok`
- Logging out from `/angebote/123` redirects to `/` (root)

---

#### T-07 · Migrate `/ajanlatok` (Quotes)

**Goal:** All internal navigation within the quotes module is locale-aware.

**Files:** `src/app/[locale]/ajanlatok/` and all components that link into it.

**Tasks:**
- Replace all `router.push('/ajanlatok...')` and `<Link href="/ajanlatok...">` with locale-aware equivalents from `src/navigation.js`
- Add `/ajanlatok/uj` → `{ hu: '/ajanlatok/uj', de: '/angebote/neu', en: '/offers/new' }` to pathnames
- Verify AppContext `deleteQuote`, `createQuote` redirects are locale-aware

**Acceptance:**
- `http://localhost:3000/angebote` loads the quotes list (DE)
- Creating a quote as a DE user redirects to `/angebote/[id]`
- `http://localhost:3000/offers/new` loads the new quote form (EN)

---

#### T-08 · Migrate `/felmeres` (Surveys)

Same pattern as T-07.

---

#### T-09 · Migrate `/projektek` (Projects)

Same pattern as T-07. Also update `ProjectsListClient.jsx`.

---

#### T-10 · Migrate `/ugyfelek` (Clients)

Same pattern as T-07. Note: `/clients/[id]` (public portal) stays outside `[locale]` untouched.

---

#### T-11 · Migrate `/naptar` + `/naplo`

Two small modules, one ticket.

---

#### T-12 · Migrate `/weboldalam` + `/otletek` + `/kollektivak`

Three smaller modules, one ticket.

---

#### T-13 · Migrate `/profil` + `/elofizetes` + `/katalogus` + `/osszes`

Remaining modules.

---

#### T-14 · Language switcher UI

**Goal:** User can change locale from any page. Persists via `NEXT_LOCALE` cookie.

**Tasks:**
- Small dropdown in the Sidebar header (desktop) and in the mobile menu
- Uses next-intl's `useRouter().replace(currentPathname, { locale: newLocale })` — automatically navigates to the equivalent localized slug
- Switching from `/ajanlatok` to DE navigates to `/angebote` (same page)
- Labels: `HU / DE / EN` — no flags

**Acceptance:**
- Switching DE→HU from `/angebote` lands on `/ajanlatok`
- Switching HU→EN from `/projektek` lands on `/projects`
- Refreshing after switch stays in the new locale

---

### Phase 3 — Text extraction

Each ticket: identify Hungarian strings → add to `messages/*.json` → replace with `t('key')`.

| Ticket | Scope |
|---|---|
| T-15 | Shared: `Sidebar`, `Modal`, `BottomSheet`, `AlertModal`, common errors |
| T-16 | `/ajanlatok` — list, detail, new quote form |
| T-17 | `/felmeres` — list, detail, upload flow |
| T-18 | `/projektek` — list, detail, financials |
| T-19 | `/ugyfelek` — client list, detail |
| T-20 | `/naptar` + `/naplo` |
| T-21 | `/weboldalam` + `/otletek` + `/kollektivak` |
| T-22 | `/profil` + `/elofizetes` |
| T-23 | `formatDate()` + `formatHUF()` — locale-aware in `src/lib/constants.js` |
| T-24 | Static pages: `/impressum`, `/adatkezeles`, `/aszf`, `/about` |
| T-25 | API error strings (currently Hungarian in route handlers) |

---

## Open Questions (decide before T-01)

1. **Admin/superadmin routes** — translate slugs or keep as-is? Suggest: keep as-is — internal tool.
2. **`/szakemberek/[slug]`** — keep language-agnostic (contractor's own name doesn't translate). Suggest: yes, keep as-is.
3. **Email templates** — should emails respect recipient locale? Suggest: out of scope, add `locale` field to `clients` table later.
