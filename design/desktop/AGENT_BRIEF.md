# Agent brief — implement the desktop Pods UI (≥ 768 px)

Read `CLAUDE.md` first — its rules win over this brief. `AGENTS.md` warns this Next.js differs from training data: check `node_modules/next/dist/docs/` before touching routing.

---

## 0. Goal

Restyle the **desktop visual layer** (≥ 768 px) of every page to match the design files in `design/desktop/screens/`. Every existing function is kept. No APIs, data fetching, permissions, audit logging, mobile components, or mobile CSS are changed.

---

## 0a. Two-panel mental model — read before touching any UI

The desktop layout has two distinct areas with distinct responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│  dk-root                                                        │
│  ┌──────────────┐  ┌───────────────────────────────────────┐   │
│  │  SIDEBAR     │  │  PODS VIEW  (dk-mn)                   │   │
│  │  (dk-sd)     │  │                                       │   │
│  │              │  │  The main content area. Displays and  │   │
│  │  Controls:   │  │  lets the user manipulate documents,  │   │
│  │  • Workspace │  │  lists, detail views, etc. — scoped   │   │
│  │    switching │  │  to the active workspace + route.     │   │
│  │  • Route     │  │                                       │   │
│  │    navigation│  │  Content changes when:                │   │
│  │              │  │  • Workspace switches (data refresh)  │   │
│  │              │  │  • Route changes (page navigation)    │   │
│  └──────────────┘  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Sidebar** (`dk-sd`) — the user controls *what workspace* and *which page* to view:
- **Workspace pod buttons** (Személyes, Cobalt, Orange…) — switch the active workspace context. No navigation. Data in the Pods View refreshes in place.
- **Nav link buttons** (Kezdőlap, Felmérések, Ajánlatok, Projektek, Ügyfelek, Naptár…) — navigate to a page route. The Pods View swaps to that page.

**Pods View** (`dk-mn`) — the user *works with documents*: browses lists, opens details, creates/edits/deletes records. Its content is determined by the combination of active workspace + current route.

These two areas must never be confused. The Sidebar never renders document content; the Pods View never controls the workspace or routing.

---

## 1. Separation rule — the single most important constraint

**Mobile and desktop are separate trees.** The existing mobile view (`useMobile() === true`) must be pixel-identical before and after any desktop change.

- Never edit a component that is rendered only on mobile.
- Never add or remove a `useMobile()` branch — wrap at the page/layout level instead.
- Never edit `src/components/mobile/pods/` files.
- Only shared: `src/lib/*`, `AppContext`, API routes, `messages/*.json`.
- Desktop-only wrapper components live in `src/components/desktop/`.
- When in doubt: `useMobile()` returns `true` → do not touch that code path.

---

## 2. Shell structure — AS IMPLEMENTED

The shell is live. `src/app/[locale]/layout.jsx` renders `<DesktopShell>` for all desktop pages.

```
<div.dk-root>                 /* background:#EDEBE5; padding:12px; display:flex; gap:12px; height:100vh */
  <aside.dk-sd />             /* 264px sidebar — light linen #EFEDE6 (NOT dark, see §8) */
  <main.dk-mn>                /* flex:1; border-radius:32px; overflow:hidden; background:#fff fallback */
    {children}                /* each page renders its own dk-page wrapper */
  </main.dk-mn>
</div.dk-root>
```

Each new-design page renders inside `dk-mn` as:
```
<div.dk-page.dk-mod-[module]  style={wsStyle}>   /* sets --dk-c and --dk-deep via inline style */
  <header.dk-mh />            /* border-radius:0 0 32px 32px; background:var(--dk-c) */
  <div.dk-body />             /* flex:1; overflow-y:auto; padding:14px 28px 24px */
</div>
```

Old-style pages (no new design yet) render a `<div>` directly in `dk-mn`. CSS rule `.dk-mn > div:not(.dk-page)` gives them `flex:1; overflow-y:auto; background:#fff` so they scroll correctly.

### 2a. Sidebar — ACTUAL colours (differs from original design spec)

```css
background: #EFEDE6;   /* warm linen — NOT the original dark #0E1116 */
color: #0E1116;
```

The sidebar is **light**, not dark. This was changed so the dark pod buttons stand out with proper contrast. Nav text colours are adjusted accordingly:

- **Inactive nav:** `color: #5A6070` on transparent background
- **Hover nav:** `background: rgba(0,0,0,0.06); color: #0E1116`
- **Active nav:** `background: <module colour>; color: #fff` — module colour computed in JS from `MODULE_ACTIVE_COLOR[moduleKey]` in `DesktopSidebar.jsx`
- **Pod buttons:** keep their OWN dark backgrounds (personal `#15181E`, cobalt `#0E1840`, orange `#241409`) — they always render white text regardless of sidebar bg
- **User card:** `background: rgba(0,0,0,0.07); color: #0E1116`; avatar circle is dark `#0E1116` with white initials

Logo: `okosszaki.` in Bricolage Grotesque 26 px 700; dot `color: #6F93FF` — works fine on the light background.

**Workspace pods vs nav links — critical distinction:**
- **Workspace pod buttons** (Személyes, collective pods) do **NOT navigate**. They call `setActiveContext(id)` only. The user stays on the current page; the data in the main panel refreshes to reflect the selected workspace.
- **Nav link buttons** (Kezdőlap, Felmérések, Ajánlatok, Projektek, Ügyfelek, etc.) are the actual page navigation. They route to the respective page.

`switchWorkspace` in `DesktopSidebar.jsx` must call `setActiveContext(id)` without any `router.push()`. Never navigate on a workspace switch.

Nav structure (two groups):
1. Kezdőlap (home icon)
2. **"Dokumentumok"** group: Felmérések · Ajánlatok · Projektek · Ügyfelek
3. **"Munka"** group: Naptár · Ötletek · Katalógus · Weboldalam · Kollektívák

### 2b. Module header (`.dk-mh`) — ACTUAL spec

```css
padding: 14px 28px;   /* NOT 20px — keeps header ~80px, well under 100px */
border-radius: 0 0 32px 32px;
background: var(--dk-c, #15181E);
position: relative; overflow: hidden;
display: flex; align-items: center; gap: 16px;
```

Content: **kicker only + H1 + right actions**. No subtitle/date line — the date was removed; a calendar widget will replace it in a later PR.

**⚠️ Glow circle bug (already fixed in desktop.css):**
`.dk-mh > * { position: relative }` overrides `.dk-gl`'s `position: absolute`, turning the 340×340px decorative circle into a flex item that stretches the header to ~380px. Fix already applied:
```css
.dk-mh > .dk-gl { position: absolute; }  /* must come AFTER the > * rule */
```
Never remove this rule.

### 2c. White cards (`.dk-card`)

```css
background: #fff; color: #0E1116; border-radius: 24px;
box-shadow: inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.7), 0 3px 6px -2px rgba(0,0,0,.3);
```

### 2d. Modals

Use `Modal` / `ConfirmModal` / `AlertModal` from `@/components/Modal.jsx`. Never create a new overlay type.

---

## 3. Design token reference

All tokens live in `src/styles/desktop.css` scoped under `.dk-root`. Imported by `DesktopShell.jsx`.

### Module colours

| Module | `--dk-c` (header bg) | `--dk-deep` (page body bg) | Active nav bg |
|---|---|---|---|
| Dashboard | `#15181E` | `#0D0F13` | `#2A2F3A` |
| Felmérések | `#0A7F72` | `#06302C` | `#0A7F72` |
| Ajánlatok | `#6D3FD1` | `#1C1038` | `#6D3FD1` |
| Projektek | `#263248` | `#0B0F17` | `#3A4963` |
| Ügyfelek | `#B8456B` | `#2A0F1A` | `#B8456B` |
| Profil/Beállítások | `#44413B` | `#121110` | `#44413B` |

The module CSS class (e.g. `.dk-mod-dashboard`) sets `--dk-c` and `--dk-deep` as defaults. Inline style `wsStyle` on the `dk-page` div overrides them for collective workspaces (see §8).

### Workspace pod colours

Use `podColor(collectiveId)` from `@/lib/podColor`. Personal uses `PERSONAL_COLOR`. Do not hardcode.

| Workspace | Pod bg (`colors.deep`) | Dot (`colors.bg`) |
|---|---|---|
| Személyes | `#15181E` | `#2A2F3A` |
| Cobalt | `#0E1840` | `#2F5BFF` |
| Orange | `#241409` | `#FF8A2B` |

### Key utility classes (defined in `src/styles/desktop.css`)

```
.dk-badge   height:26px; pill; bg:#F0F0F2; color:#2B3038
.dk-btn     height:44px; border-radius:22px; 15px 700
.dk-btn-w   bg:#fff; color:#0E1116
.dk-btn-g   bg:rgba(255,255,255,.16); color:#fff
.dk-btn-l   bg:#EFEDE6; color:#0E1116
.dk-btn-dark bg:#0E1116; color:#fff
.dk-chip    height:40px; border-radius:20px; 14px 700
.dk-tr      grid row; border-top:1px solid #EDEBE5; min-height:60px
.dk-th      grid header row; 12px 700 uppercase; color:#5A5F68
.dk-input   height:46px; border-radius:16px; white bg; shadow
.dk-ic      40×40px; border-radius:13px; bg:#F1F1F3
.dk-sr      full-width transparent button (clickable rows)
.dk-ws-spinner  workspace-switch loading ring (white on dark)
```

### Typography

```css
/* Headings */  font-family: 'Bricolage Grotesque'; font-weight: 700; letter-spacing: -0.02em;
/* Body */      font-family: 'Plus Jakarta Sans', system-ui;
/* Kicker */    font-size: 11–12px; font-weight: 700; letter-spacing: .07–.08em; text-transform: uppercase;
/* Muted */     font-size: 13px; font-weight: 600; color: #5A5F68;
```

Both fonts already loaded globally in `src/app/layout.js`. Do not add them again.

---

## 4. Screen inventory & progress

| Design file | Route | Status |
|---|---|---|
| `DD1-Kezdolap` | `/dashboard` | ✅ done |
| `DS1-Lista` | `/felmeres` | ⬜ pending |
| `DS2-Reszletek` | `/felmeres/[id]` | ⬜ pending |
| `DO1-Lista` | `/ajanlatok` | ⬜ pending |
| `DO2-Szerkeszto` | `/ajanlatok/[id]` | ⬜ pending |
| `DP1-Lista` | `/projektek` | ⬜ pending |
| `DP2-Reszletek` | `/projektek/[id]` | ⬜ pending |
| `DC1-Ugyfelek` | `/ugyfelek` | ⬜ pending |
| `DU1-Beallitasok` | `/profil` | ⬜ pending |
| `DU2-Elofizetes` | `/elofizetes` | ⬜ pending |

**Other routes without a dedicated design screen** (Üzenetek, Naptár, Ötletek, Katalógus, Weboldalam, Kollektívák) already get the shell. Their existing page content sits inside `dk-mn` with a white background. No new page component needed — shell only.

Mark a screen `✅ done` when: `npm run lint` passes, `npx vitest run tests/i18n.test.js` passes, desktop matches design file, mobile at 390 px is visually unchanged.

---

## 5. Per-screen design notes

### DD1 — Kezdőlap (Dashboard) ✅
- Module colour: `#15181E` / deep `#0D0F13`.
- Header: kicker + greeting H1 + right (bell + "Új dokumentum"). No date line.
- Body: banners (invitation + transfer) → 3 quick-create cards → 3 stat cards → 3-col preview grid (Projektek / Felmérések / Ajánlatok) → activity feed.
- "Új dokumentum" opens a `Modal` with 3 coloured doc-type buttons.
- Workspace spinner: `.dk-ws-spinner` shown in body when `contextSwitching` (see §8).

### DS1 — Felmérések lista
- Module colour: `#0A7F72` / deep `#06302C`.
- Header right: search input (280 px) + "Új felmérés" white button.
- Table with preview side-panel (open, create quote, share, delete actions).

### DS2 — Felmérés részletek
- Back button (ghost) + "Mentés" (white) in header right.
- Two-column layout: left = rooms list + room editor (dims, openings, items); right = summary card + actions.

### DO1 — Ajánlatok lista
- Module colour: `#6D3FD1` / deep `#1C1038`.
- 4-stat strip (Nyitott, Elfogadva, Elfogadási arány, Piszkozatok).
- Status filter chips: Mind / Tervezet / Kiküldve / Elfogadva / Elutasítva.
- Table columns: `2.2fr 1.4fr 1.1fr 110px 90px 90px 40px` (Cím / Ügyfél / Összeg / Státusz / Dátum / Készítő / ⋯).

### DO2 — Ajánlat szerkesztő
- Two-panel: left = sections + entries editor, right = totals card + status flow + send button.
- Status flow: Tervezet → Kiküldve → Elfogadva/Elutasítva — only Owner/Admin may change.
- "Küldés" opens centred Modal.

### DP1 — Projektek lista
- Module colour: `#263248` / deep `#0B0F17`.
- Filter chips: Összes / Nyitott / Lezárt.
- 3-column card grid. Each card: name + status badge, client + address meta, "Elköltve" amount, progress bar (spend ÷ quote), percentage label.

### DP2 — Projekt részletek
- Two-panel: main (flex 1) + right aside (320 px fixed).
- Main: 4-stat strip + burndown chart + cost-split bar chart + tab bar (Kiadások / Munkaóra / Napló / Fizetési terv / Portál).
- Right aside: Státusz card + Csapat card + Ügyfél card + portal link button.
- "Új kiadás" white button in header right; "Vissza" ghost button.

### DC1 — Ügyfelek
- Module colour: `#B8456B` / deep `#2A0F1A`.
- Master-detail: left panel 380 px (tab Saját/Megosztott, search, client list rows), right panel (flex 1) = selected client detail.
- "Új ügyfél" opens centred Modal with GDPR checkbox + sharing toggle.
- Clients are ALWAYS personal (`owner_id`) — GDPR. Reflect this in the header kicker text.

### DU1 — Profil / Beállítások
- Module colour: `#44413B` / deep `#121110`.
- Sections: Személyes adatok, Számlafej, Ajánlat alapértelmezések, ÁSZF, Nyelv és pénznem.
- Language switcher: pill group (HU/DE/EN), writes `profiles.locale` + reloads (existing behaviour — do not change).

### DU2 — Előfizetés
- Same module colour as DU1 (`#44413B`).
- Sections: current plan info, Kollektívák management, Biztonság (password change), Veszélyzóna (delete account).
- Cancel and delete flows use `ConfirmModal`.

---

## 6. Hard rules checklist (applies to every desktop PR)

- **No mobile touch** — the 390 px viewport must look identical before and after.
- **No API changes** — routes, fetch calls, data scoping, permissions, audit logging: untouched.
- **No new overlay type** — `Modal`/`ConfirmModal`/`AlertModal` only (CLAUDE.md rule 2).
- **CSS tokens only** — no hardcoded hex in JSX `style` props; use CSS variables or CSS classes.
- **i18n** — every string through `useTranslations()` + all three JSON files at once (CLAUDE.md rule 13).
- **navPrefix** — every `<Link>` and `router.push()` in a shared component must use `navPrefix` (CLAUDE.md rule 6).
- **Touch targets** — minimum 44 × 44 px even on desktop.
- **`useMobile()` only** — never `window.innerWidth`; never hardcode a breakpoint other than 768.
- **Lint + i18n test** — `npm run lint` and `npx vitest run tests/i18n.test.js` must pass before each PR.

---

## 7. Build order

Shell + DD1 ✅ done. Continue:

1. ~~Shell + Dashboard~~ ✅
2. **Next: Projektek list + detail** (DP1, DP2) — most complex, good stress test.
3. Ajánlatok list + editor (DO1, DO2).
4. Felmérések list + detail (DS1, DS2).
5. Ügyfelek (DC1).
6. Profil + Előfizetés (DU1, DU2).
7. Remaining routes — shell already applied, no new page component needed.

---

## 8. Implementation notes & gotchas — READ BEFORE CODING

These are lessons learned building the shell and DD1. They will save you time.

### 8a. How to add a new desktop screen (the pattern)

1. Create `src/app/[locale]/[route]/desktop/[Name]Desktop.jsx` — client component.
2. In `src/app/[locale]/[route]/page.js` (or page.jsx): `import { detectMobile } from '@/lib/detectMobile'`. If `isMobile` → render mobile component. Else → render `[Name]Desktop`.
3. `[Name]Desktop` renders:
```jsx
<div className="dk-page dk-mod-[module]" style={wsStyle}>
  <header className="dk-mh">
    <span className="dk-gl" aria-hidden="true" />
    <div style={{ flex: 1, ... }}>
      <span className="dk-kick">{kicker}</span>
      <h1 className="dk-h1">{title}</h1>
    </div>
    <div>{/* right-side actions */}</div>
  </header>
  <div className="dk-body">
    {contextSwitching && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="dk-ws-spinner" /></div>}
    {!contextSwitching && <>
      {/* page content */}
    </>}
  </div>
</div>
```
4. Add `wsStyle` for workspace-aware header colour (see §8b).
5. Add translation keys to all three JSON files.
6. Run `npx vitest run tests/i18n.test.js` — must pass.

### 8b. Workspace-aware header colours

The header background tracks the active workspace pod colour so the user can always see which workspace is active. Each desktop page applies this pattern:

```js
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

// Inside the component, after destructuring activeCollectiveId from useApp():
const wsStyle = activeCollectiveId
  ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
  : {};
```

Apply `wsStyle` to the `dk-page` root div:
```jsx
<div className="dk-page dk-mod-dashboard" style={wsStyle}>
```

How it works: `.dk-mod-[module]` sets default values for `--dk-c` and `--dk-deep`. Inline `style` on the same element overrides CSS variables (inline always wins). `dk-mh { background: var(--dk-c) }` picks up the override automatically.

For personal workspace `wsStyle` is `{}` — the module class defaults apply unchanged.

### 8c. Workspace-switch loading state — `contextSwitching`, NOT `dataReady`

**Never use `setDataReady(false)` to signal a workspace switch.**

`LoadingGate` (`src/components/LoadingGate.jsx`) checks `loading || !dataReady` and shows a **full-screen white spinner covering the entire app** when either is false. Setting `dataReady(false)` for a workspace switch therefore hides the sidebar, header, and everything — terrible UX.

The correct flag is `contextSwitching` from `useApp()`. It is:
- Set to `true` at the START of `setActiveContext` (before the API call) in `godModeActions.js`
- Cleared in `finally {}` after `refreshSupabaseData()` completes
- **Not checked by `LoadingGate`** — only by the page's body section

Flow during pod click:
1. `setCurrentUser(...)` — optimistic: `activeCollectiveId` updates immediately → header colour flips
2. `setContextSwitching(true)` — body spinner appears; sidebar and header stay visible
3. `await fetch('/api/auth/context', ...)` — API call
4. `await refreshSupabaseData()` — new data loads
5. `setContextSwitching(false)` (in `finally`) — spinner hides, content appears

### 8d. Glow circle — do not break the absolute position fix

`desktop.css` has this pair of rules — the ORDER matters:
```css
.dk-mh > * { position: relative; }     /* lifts content above the glow */
.dk-mh > .dk-gl { position: absolute; } /* must come AFTER — overrides the above */
```

If the second rule is ever removed or reordered, `.dk-gl` becomes a 340×340px flex item and the header balloon to ~380px. The `.dk-mh > .dk-gl` rule MUST remain after `.dk-mh > *`.

### 8e. Naplo / full-screen pages — SidebarKiller

`src/app/[locale]/naplo/layout.js` and `ClientDiaryView.jsx` have a `SidebarKiller` that hides the sidebar for full-screen diary view. It already handles BOTH the old `app-layout` / `app-main` classes AND the new `dk-root` / `dk-sd` / `dk-mn` classes. No changes needed when adding new screens.

### 8f. Old-style pages inside the new shell

Pages without a dedicated desktop design (most routes) render their existing `<div className="container page-body">` directly inside `<main className="dk-mn">`. This works because:
```css
.dk-mn > div:not(.dk-page) { flex: 1; min-height: 0; overflow-y: auto; background: #fff; color: #0E1116; }
```
They scroll, have a white background, and the sidebar + rounded container apply. Not pixel-perfect to design, but functional — their PR is "shell only, no new component needed."

### 8g. `app-layout` / `app-main` — no longer in use

The old `Sidebar.jsx` and `.app-layout` / `.app-main` CSS are no longer rendered for authenticated `[locale]` routes. The only remaining user of the old Sidebar is `src/app/demo/layout.jsx` (demo pages have their own layout). Do not reference `.app-main` in new code.

### 8h. Header height target

Keep the module header **under 100px**. With `padding: 14px 28px`, a 12px kicker, 4px gap, and 32px H1, the natural height is ~80px. Never add multi-line content (e.g. a date/subtitle row) to the header.

---

## 9. Lessons learned — DS1 Felmérések lista (apply to every list screen)

### 9a. Missing CSS classes — always verify before using

`dk-chip` and `dk-input` were documented in §3 but never added to `desktop.css`. Using an undefined class falls back to raw browser styles:
- `dk-input` on Safari: 3D inset border appears only on top and left edges (a classic macOS native input artefact). Fix: `border: 0; outline: none; -webkit-appearance: none; appearance: none`.
- `dk-chip`: renders as an unstyled block button with no shape or colour.

**Rule:** before writing `className="dk-*"` in a component, `grep` for it in `desktop.css`. If it's missing, add it first.

### 9b. Table card must have `overflow: hidden`

Row highlight backgrounds (e.g. the green `#D9F2EE` selected-row tint) bleed outside the card's `border-radius: 24px` unless the card container has `overflow: hidden`. The `.dk-card` class does NOT set this globally (dropdowns and tooltips need overflow). Add it inline on any `dk-card` used as a list/table container:

```jsx
<section className="dk-card" style={{ ..., overflow: 'hidden' }}>
```

### 9c. Side panel pattern for list + detail layouts

- **Hide the panel when nothing is selected.** Never show an empty "select a row" placeholder — it wastes ~40% of the screen. The list should fill the full width until the user clicks a row.
- **Always include an `×` close button** in the panel's top-right corner so the user can collapse it.
- Side panel: `width: 400px; flexShrink: 0; alignSelf: flex-start` — fixed width, top-aligned so it doesn't stretch to table height.
- Lazy-load detail data (e.g. rooms) with a cancellable `fetch` in `useEffect`. Use a derived `isLoading = selectedId !== loadedForId` boolean instead of calling `setState` synchronously in the effect (triggers `react-hooks/set-state-in-effect` lint error).

### 9d. Table column economy — less is more

Only show columns that **cannot be seen in the detail panel**. If rooms, area, status, or other details are shown in the side panel, omit them from the table. A good default for any list screen: **Name · Client · Date**. Additional columns are justified only if they help the user decide which row to click.

Remove `⋯` context menu buttons when clicking the row already opens a detail panel — they duplicate the interaction and clutter the row.

### 9e. Date formatting

`formatDate()` from `@/lib/constants` uses `month: 'short'` (abbreviated: "nov."). When the table has column space, use the full month name inline:

```js
function fullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}
// → "2026. november 12."
```

### 9f. Personal workspace pod dot colour (open bug)

`PERSONAL_COLOR.deep = '#0D0F13'` is nearly the same as the pod button background `#15181E` — the dot is barely visible. Per the brief §3, the personal dot should be `#2A2F3A`. Fix in `DesktopSidebar.jsx`: hardcode `#2A2F3A` for the personal pod dot span instead of using `PERSONAL_COLOR.deep`.
