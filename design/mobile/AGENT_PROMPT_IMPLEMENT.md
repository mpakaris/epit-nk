# Prompt for the implementation agent — user story drop

Copy everything below the line into the agent.

---

You are implementing the mobile "Pods" redesign of Epitek (OkosSzaki). The branch is `design/mobile-pods`.

## What is already built

Dashboard (`/dashboard`) and all Survey screens (`/felmeres`, `/felmeres/[id]`, room editor, items, floor-plan AI) are fully implemented in mobile. The existing files are:

- `src/app/[locale]/dashboard/mobile/DashboardMobile.jsx`
- `src/app/[locale]/felmeres/mobile/` — `SurveyListMobile.jsx`, `SurveyDetailMobile.jsx`, `RoomEditorMobile.jsx`, `ItemsMobile.jsx`, `NewSurveyMobile.jsx`, `AnalyzeLayoutSheet.jsx`
- `src/components/mobile/pods/` — `Dock`, `PageHeader`, `PodStack`, `WeekCalendar`, `Sheets`

Do not fork these components. Extend them or add new shared pieces to `src/components/mobile/pods/` only if two or more screens need them.

## Read first (in this order)

1. `design/mobile/README.md`
2. `design/mobile/AGENT_BRIEF.md`
3. `design/mobile/DESIGN_SPEC.md`
4. `design/mobile/FUNCTION_MAP.md`
5. `design/mobile/tokens.css`
6. Every `design/mobile/screens/*.dc.html` for the module you are about to build. The `<x-dc>` markup is the layout; the last `<script type="text/x-dc">` lists states and interactions.
7. `node_modules/next/dist/docs/` before touching any routing (this is Next.js 16 — APIs differ from training data).
8. `/CLAUDE.md` — its rules win over everything else.

## User stories

All user stories are in this doc: https://claude.ai/artifact/DBjthjJHw4X5QFgPRZFJRw

Read it before you start. Each story lists its screen reference, acceptance criteria, and known deviations. Do not invent scope beyond what the stories describe.

## Order of work — one PR per module

### PR 0 — Dashboard parity (do first)
Screens `H1-Kezdolap.dc.html`, `H2-Kezdolap-ures.dc.html`. Stories H0.1–H0.5.

The existing `DashboardMobile.jsx` is missing five things the design shows:
1. **Folytasd cards** — last survey, quote, project as compact tap-to-open cards.
2. **Stat cards** — total project costs, active project count, total invoiced.
3. **Latest activity feed** — chronological list of recent actions (~5 items).
4. **Latest projects / surveys / quotes** — scrollable sections with a "view all" link each.
5. **Empty state** — `H2` layout shown when all data arrays are empty.

Wire these to the existing `DashboardClient.jsx` data (`activityItems`, `recentProjects`, `recentSurveys`, `recentQuotes`, `calculateProjectFinancials`). No new API routes needed. i18n namespace `dashboard`; keys listed in `FUNCTION_MAP.md § Dashboard additions`.

### PR 1 — Offers `/ajanlatok` (violet)
Screens `O1`–`O7`. Stories O1.1–O7.1. i18n ns `quotes`, `offerPrint`.

### PR 2 — Projects `/projektek` (slate-navy)
Screens `P1`–`P8`. Stories P1.1–P8.1. i18n ns `projects`, `projectDetail`, `diary`.

### PR 3 — Clients `/ugyfelek` (rose)
Screens `C1`–`C5`. Stories C1.1–C5.1. i18n ns `clients`.
**Before writing a single line of PR 3 code, ask the owner:** "Do you confirm rose `#B8456B` for the Clients module colour?" Until answered, the token `--m-clients-bg` exists in `tokens.css` but no colour is baked into any component.

### PR 4 — Profile `/profil` (stone)
Screens `U1`–`U6` incl. `U4b`. Stories U1.1–U6.1. i18n ns `profile`.
Same question for stone `#44413B` — ask alongside the Clients question (one message, two answers needed).

## Mobile / desktop separation

Every module already has a desktop page. The pattern is:

```js
// src/app/[locale]/ajanlatok/page.js  (already exists)
import useMobile from '@/hooks/useMobile';
import OffersDesktop from './OffersDesktop';      // already exists, do not touch
import OffersMobile  from '../mobile/OffersMobile'; // you create this

export default function Page() {
  const isMobile = useMobile();
  return isMobile ? <OffersMobile /> : <OffersDesktop />;
}
```

Sub-routes (`/ajanlatok/[id]`, `/ajanlatok/uj`, etc.) follow the same split. **Never edit a desktop file.**

Demo pages re-export the real page unchanged:
```js
// src/app/demo/ajanlatok/page.jsx
'use client';
export { default } from '@/app/[locale]/ajanlatok/page.js';
```

Use `navPrefix` on every `router.push` and `<Link>`:
```js
const { isDemoMode } = useApp();
const p = (path) => isDemoMode ? `/demo${path}` : path;
router.push(p('/ajanlatok'));
```

## Cross-cutting rules (non-negotiable)

- **Tokens only** — never hardcode hex, radius, or shadow. Use `globals.css` vars. New module colour tokens go in `tokens.css` only.
- **i18n** — add every new key to `messages/hu.json`, `messages/en.json`, `messages/de.json` at the same time. Reuse existing keys first (names listed in `FUNCTION_MAP.md`). Run `npx vitest run tests/i18n.test.js` before each commit — it fails on missing or empty keys.
- **Sheets only** — `Modal`, `BottomSheet`, `AlertModal`, `ConfirmModal`. No new `position: fixed` overlays.
- **Soft delete** — `.update({ deleted_at: new Date().toISOString() })`, never `.delete()` on user content (`projects`, `quotes`, `surveys`, `clients`, `invoices`, `diary_entries`). All list queries filter `.is('deleted_at', null)`.
- **Subscription gate** — call `isEffectivePremium(profile)` from `@/lib/subscriptionLimits` before creating surveys (limit 5), quotes, or projects (limit 1) for Basic-tier users.
- **`res.ok` checks** — every `fetch()` checks `res.ok`; errors surface via `AlertModal`, not `console.error`.
- **Double permission check** — client-side guard in AppContext/component AND API-side guard in the route handler. Contributors cannot create or delete team documents. Only owner/admin may change quote status or trigger client-facing actions.
- **`formatMoney(amount, userCurrency)`** — no `formatHUF()` in new code.
- **Audit log** — `logAudit` on every INSERT/UPDATE/DELETE and every external API call (Creem, SMTP, AI, OCR).
- **`user_id` server-side** — always set `user_id: user.id` in route handlers; never read it from the request body.
- **Loading skeletons** — not `<PageSpinner />` on dark backgrounds. Use pulsing skeleton shapes matching the screen's colour scheme (see existing mobile screens for the pattern).
- **Bottom sheets animate in** — apply `className="pod-sheet"` (defined in `globals.css`) to every sheet div.
- **Focus rings** — apply `className="pod-screen"` (light bg) or `className="pod-screen-dark"` (dark bg) to every screen's root div.
- **Offline banner** — import `useOnline` from `@/hooks/useOnline`; show a warning banner when `!online`.

## Per-screen implementation checklist

For each screen in a module:

- [ ] Skeleton loading state (not spinner on dark background)
- [ ] Empty state (illustration-free; one sentence + primary action)
- [ ] Error state (danger card with retry)
- [ ] Offline banner (`useOnline`)
- [ ] Read-only / locked banner where applicable
- [ ] Contributor restrictions enforced (UI + API)
- [ ] Free-tier limit check on creation
- [ ] All `aria-label` attributes use i18n keys (no hardcoded Hungarian strings)
- [ ] `className="pod-screen"` or `pod-screen-dark"` on root div
- [ ] `className="pod-sheet"` on every bottom sheet div
- [ ] `navPrefix` (`p()`) on every navigation call

## Design deviations — fix, do not copy

- **Soft delete copy**: the design mocks say deletion is permanent. The app soft-deletes. Use existing translated delete keys; do not claim permanence.
- **C2 (Client form)**: design shows create mode only. Edit mode reuses the same screen (title `Ügyfél szerkesztése`, CTA `Módosítás`).
- **U2/U3 (Profile)**: the design splits profile data across two screens. In the repo, phone and default VAT live in the invoice form. Keep **one form, one `PATCH /api/auth/profile`** — do not split.
- **C5 demo chips**: the client-switcher chips on `C5-Portal.dc.html` are demo-only controls. Skip them.
- **Shared clients (C1 second tab)**: read-only — no edit/delete actions.
- **SA language toggle (U5)**: cookie-only — must NOT call `PATCH /api/auth/profile` (rule GM-7).
- **Currency (U5)**: write-once — the API only saves `currency` when the current DB value is `NULL`. Disable the selector after first save and show `currencyNote`.

## Out of scope — do not build

`/uzenetek`, `/naptar`, `/otletek`, `/katalogus`, `/kollektivak`, `/elofizetes` (standalone), `/weboldalam`, public `/clients/[id]`, `/portal`, collective-context dashboard sections. Leave these on their current desktop UI.

## Verify before each PR

```bash
npm run lint
npx vitest run
```

Then run the dev server at 390 × 844 and walk every screen of the module:
- Personal and collective workspace context
- As owner and as contributor
- In HU, EN, and DE
- In `/demo`

In the PR description include:
1. Screens completed
2. Functions checked against `FUNCTION_MAP.md` (list each one)
3. Deviations from the design (what you changed and why)
4. Open questions for the owner
