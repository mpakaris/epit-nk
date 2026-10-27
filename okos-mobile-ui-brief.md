# Task: implement the OkosSzaki mobile-first UI (unified personal + collective view)

You are working in the OkosSzaki.hu codebase. Implement the mobile UI described below. Read this whole file first, then inspect the repo (framework, routing, existing components, design tokens, i18n setup, Lucide usage) and adapt to what is already there. Reuse existing components and tokens where they exist; do not introduce a new UI library. If something here conflicts with the codebase's conventions, follow the codebase and tell me what you changed.

Visual reference (private Claude design canvas, may not be reachable): https://claude.ai/artifact/RLxoUYHYpzMc2X9T6d6rs3

## 1. Product context

- OkosSzaki.hu is a Hungarian SaaS for solo contractors and small crews (2–6 people): plumbers, tilers, electricians, carpenters. Not tech workers.
- About 90% of use is on a phone, on a construction site: gloves, direct sunlight, one free hand, dirty screens. Targets must be big, text high-contrast, flows short.
- Core loop: **Felmérés** (Survey: photos, room sketches, measurements) → **Ajánlat** (Quote: itemised offer) → **Projekt** (Project: costs, invoices, daily diary photos).
- Everything is built on **rooms/sections** (Nappali, Fürdő, Konyha, Kert…). Each room has its own gallery and notes. Rooms carry over from Survey to Quote (enriched with *tételek* and prices) to Project (enriched with invoices and labour costs).
- Secondary: client list (Ügyfél), public website sharing, collective (small team).
- Workspaces: every user has a **personal** workspace and optionally one or more **collectives** (e.g. "Kovács és Társai"). The old UI made users switch workspace like switching Google accounts. The new UI shows both in one list, in labelled sections. The user must always know "is this MY job or OUR job", and must pick the workspace explicitly when creating something.

## 2. Scope

Build mobile layouts (target 375 px width, must work from 360 to 430) for:

1. Global shell: floating bottom navigation.
2. Home / dashboard.
3. List pages for Felmérés, Ajánlat, Projekt (same pattern, Felmérés is the reference). Clients list can reuse the row style.
4. Create flow: workspace picker → minimal form (shown for Felmérés; Ajánlat and Projekt follow the same pattern).
5. Card, section header, badges, buttons, chips, inputs, banner, bottom sheet, confirm dialog as reusable components.

Desktop layouts are out of scope except where shared components must not break.

## 3. Design tokens

Respect the existing tokens. Add only what is missing, as CSS variables or the project's token mechanism.

Colour
- Ink / primary: `#0f172a` (text, primary button)
- Secondary text: `#475569` (client names, descriptions)
- Tertiary text: `#64748b` (dates, overlines)
- Page: `#f8fafc`; Card: `#ffffff`; Inset: `#f1f5f9`; Hairline: `#e2e8f0` (on inset panels `#cbd5e1`)
- Personal accent: `#2563eb` (icons, links, selection ring). Chip bg `#eff6ff`.
- Collective accent: `#16a34a` for icons, fills, check marks ONLY (3.3:1, fails for text). For green text use `#15803d`. Chip bg `#dcfce7`. Team badge: bg `#f0fdf4`, text `#166534`.
- Sharing banner: bg `#fff7ed`, text `#9a3412`
- Danger: `#b91c1c` (text in menus; solid only in the confirm dialog)
- Do NOT use `#94a3b8` for text (2.6:1, fails outdoors).

Status badges (26 px tall pill, 13/16, weight 700). They deliberately avoid blue and green, which are reserved for workspace identity:
- Piszkozat: bg `#f1f5f9`, text `#475569`
- Folyamatban: bg `#fffbeb`, text `#92400e`
- Elküldve: bg `#f5f3ff`, text `#5b21b6`
- Kész: bg `#e2e8f0`, text `#0f172a`, with a leading check icon (never hue alone)

Radius: card 16, input 16, inset panel 24, icon chip 12–16, button / badge / chip / pill 999. (Existing tokens: 4 / 8 / 12 / pill; add 16 and 24 if missing.)

Shadow: card `0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04)`; floating nav `0 8px 24px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)`. Prefer shadows to borders.

Font: Plus Jakarta Sans, weights 500–800.

Spacing (4 px base): 4, 8, 12, 16, 24, 32, 48. Screen gutter 16. Card inner padding 16. Between cards 12, between rows 8. Between sections 24. Section header to first card 12. Inset panel padding 12. Reserve 124 px bottom padding under scrolling content for the floating nav.

Type scale
- Screen title 32/38, 800, -0.025em
- Greeting (Home) 28/34, 800
- Choice title 20/26, 800
- Section label / card title 17/22–23, 700–800
- Body / inputs 16–17/24, 500 (never below 16)
- Metadata 15/20: client 600 `#475569`, date 500 `#64748b`
- Status badge 13/16, 700
- Overline 13/16, 700, +0.06em, uppercase, `#64748b`
- Nav label and team badge 12/14, 700 (only allowed below 13, always beside an icon)

Icons: Lucide, stroke 1.75, never filled. Used: user (personal), users (collective), clipboard-list (Felmérés), file-text (Ajánlat), folder (Projekt), contact (Ügyfél), plus, ellipsis, chevron-left/right/down, search, camera, map-pin, info, arrow-right, x, check, trash-2, copy, pen-line.

## 4. Touch targets and accessibility (hard requirements)

- Whole card is the primary action, min 64 px tall (real height about 157 px).
- Primary button 56 px, pill, dark `#0f172a` / white text, full width, one per screen.
- Icon buttons 48×48 including hit area. Chips and toggles 48 px tall. Nav items 56 px tall. List rows min 72 px.
- At least 8 px between neighbouring targets.
- No gesture is the only way to do something: swipe-to-delete may exist, but the ⋯ menu offers the same actions. No long-press, hover or pinch dependencies.
- All text meets 4.5:1 on its background. Selected and status states must not depend on colour alone (use check icons, fills, labels).
- Use real `<a>`, `<button>`, `<input>` + `<label>`. Icon-only buttons need `aria-label`. The "whole card is a link" pattern: an absolutely positioned overlay `<a>` with `aria-label="Megnyitás: <title>"`, and the ⋯ button above it with a higher z-index. Do not nest a button inside an anchor.
- Decorative SVG `aria-hidden="true"`.

## 5. Components

### 5.1 Floating bottom nav
- Detached, not edge-anchored: 12 px from left/right, 16 px from bottom, height 72, radius 28, white, nav shadow, 5-column grid, `z-index` above content.
- Order: **Felmérés, Ajánlat, [+], Projekt, Ügyfél**.
- Items: icon 24 above label 12/700. Inactive `#64748b`. Active: `#0f172a` on an inset pill (`#f1f5f9`, radius 20), `aria-current="page"`.
- Centre **+** is a 56 px dark circle with a soft shadow, the only dark circle in the app. It opens the create flow. On a list page it presets the type to that list's type; from Home it opens a bottom sheet with four 56+ px rows: Felmérés, Ajánlat, Projekt, Ügyfél.
- Home is NOT a tab. It is the launch screen; list pages show a "‹ Kezdőlap" link (44 px tall) above the title.
- Respect `env(safe-area-inset-bottom)`.

### 5.2 Section header (label + hairline)
- Personal: 32 px round chip (`#eff6ff`, blue user icon), label **Személyes** 17/800, count 14/700 `#475569`, hairline filling the rest.
- Collective: 32 px round chip (`#dcfce7`, green users icon), label = **collective name** (e.g. Kovács és Társai), count, hairline `#cbd5e1`, then a small avatar stack (26 px circles, 2 px `#f1f5f9` ring, overlap -9, up to 3 with a "+N").
- The collective section sits inside an **inset panel** (`#f1f5f9`, radius 24, padding 12). The personal section sits directly on the page. Four signals separate mine from ours: icon shape, colour, surface, label. Any one is enough.
- If the user has several collectives, render one inset panel per collective.

### 5.3 Item card (Felmérés / Ajánlat / Projekt)
- Container: white, radius 16, card shadow, overflow hidden, relative.
- Photo strip, 72 px (Home "continue" card may use 90): up to three thumbnails in a 3-column grid with 2 px gaps. With no photos: slate gradient (`#e2e8f0 → #cbd5e1`) with a camera icon and "Még nincs fotó". Photo count pill bottom-right: `rgba(15,23,42,.78)` bg, white 12/700, camera icon.
- **Team badge** on every shared card, top-left of the strip: solid white pill, 26 px tall, green users icon (`#16a34a`), text "Csapat" `#166534` 12/700, small shadow. Personal cards have no badge (silence means private).
- Body: padding 14/16/16. Row 1: title 17/23 700, one line, ellipsis, `padding-right: 44px`. Row 2 (26 px tall, space-between): left "client · date" (client 15/600 `#475569`, date 15/500 `#64748b`, ellipsis), right: status badge.
- ⋯ button: 48×48, absolutely positioned right 4, top just below the strip, `aria-label="További műveletek"`, opens the action sheet.
- Date format: Hungarian short, "okt. 24.", "ma".

### 5.4 Compact row (Home)
- 72 px min, white, radius 16: 44 px type icon chip (`#f1f5f9`, radius 12), title 16/700 + meta 14/500 `#475569` ("Tóth Anna · Felmérés"), trailing chevron. Collective rows show the "Csapat" badge before the chevron.

### 5.5 Expand control
- Each section shows **3 cards** by default, then a full-width ghost pill button, 52 px, 1 px `#cbd5e1` border, label "+ N további" with a chevron-down. Expanding reveals the rest in place; collapsed label becomes "Kevesebb".

### 5.6 Action sheet (⋯)
- Bottom sheet, radius 24 24 0 0, handle bar, header with item title and "client · type". Rows 56 px: **Megnyitás, Duplikálás, Átnevezés**, hairline, **Törlés** in `#b91c1c` (quiet, not a solid button).
- Törlés never deletes directly. It opens the confirm dialog.

### 5.7 Confirm dialog
- Title "Törlöd a felmérést?" (adapt to type), body "A fotók és jegyzetek is törlődnek." For shared items append "Ez az egész csapat számára törlődik."
- Buttons stacked, 56 px, pill. Destructive "Igen, törlés" solid `#b91c1c` on top; "Mégse" ghost on the bottom (safe choice nearest the thumb).
- Optional swipe-left on a card reveals the same Törlés and opens this same dialog; it must never delete on its own.

### 5.8 Inputs and chips
- Text input: 56 px, radius 16, white, card shadow, 17/500, placeholder `#64748b`, real `<label>` above (15/700).
- Selector row (client): 56 px button with leading icon, label, trailing chevron; beside it a 56×56 ghost "+" button (`aria-label="Új ügyfél"`).
- Room chips: 48 px pills, 16/600. Unselected: white with card shadow. Selected: `#0f172a` bg, white text, leading check icon, `aria-pressed="true"`. Final chip "+ Egyéb" is a ghost pill.

### 5.9 Sharing banner
- bg `#fff7ed`, text `#9a3412`, radius 16, padding 16, info icon. Copy: **"Ez a teljes csapattal meg lesz osztva."** with a second line "Minden tag látja, szerkesztheti és törölheti." Shown only when a collective is selected.

## 6. Screens

### 6.1 Home (Kezdőlap)
Top to bottom, 24 px between blocks, 16 px gutter:
1. Greeting: date line "Vasárnap, okt. 25." (14/600 `#64748b`), "Szia, <first name>" 28/800, 48 px dark avatar circle (initials) on the right.
2. Three pipeline tiles (equal columns, 8 px gap, min-height 140): icon, big count, label (Felmérés / Ajánlat / Projekt), and a split line: user icon + personal count (blue), users icon + collective count (green `#15803d`). Each links to its list.
3. "FOLYTASD" overline + hairline, then one large card for the most recently touched item (90 px strip, team badge if shared, title 18/700, client 16/600, status badge, "Felmérés · ma 14:20").
4. Personal section (header with "Mind" link, 44 px tall) with 2 compact rows.
5. Collective inset panel with 2 compact rows with "Csapat" badges and a "Mind" link in `#15803d`.
6. Floating nav (no active item).

### 6.2 Felmérés list
1. "‹ Kezdőlap" link, then H1 **Felmérések**, then search field (52 px, inset `#f1f5f9`, radius 16, search icon, placeholder "Keresés név vagy ügyfél szerint", `type="search"`).
2. Személyes section: header, 3 cards, "+ N további".
3. Collective inset panel: header, 3 cards, "+ N további".
4. Sorting: newest first. No filter builder or sort menu in v1. Search filters both sections at once.
5. Empty section: simple icon + one line of text + one button ("Új felmérés"). No illustrations.
6. Floating nav with Felmérés active.

Ajánlat and Projekt lists use the same layout. Status vocabularies per type are small (3–4 values), e.g. Ajánlat: Piszkozat, Elküldve, Elfogadva, Elutasítva; Projekt: Folyamatban, Kész. Use the existing domain statuses, mapped onto the badge styles above.

### 6.3 Create flow
**Step 1 of 2 – "Hova kerüljön?"**
- Top bar: 48 px white circle close button (X), "1 / 2" on the right.
- H1 "Új felmérés" (the type name changes), subtitle "Hova kerüljön?" 17/500 `#475569`.
- Two **large selectable buttons**, min-height 140, radius 20, white, card shadow, 2 px border (transparent when unselected):
  - **Személyes**: 56 px blue chip with user icon, 20/800 title, "Csak te látod ezt a munkát."
  - **<Collective name>**: 56 px green chip with users icon, 20/800 title, "Kollektíva · a csapat mind a N tagja látja."
  - Selected state: 2 px ring in the workspace colour (`#2563eb` / `#16a34a`) plus a filled 28 px check circle; unselected shows an empty 28 px ring. Use `aria-pressed`.
  - This is NOT a dropdown or a select.
- When the collective is selected, show the sharing banner (5.9) under the buttons. Nothing is shown for Személyes.
- Primary button "Tovább →" pinned 24 px from the bottom, 56 px.
- Preselect the last-used workspace. Users with no collective skip this step entirely.

**Step 2 of 2 – form**
- Top bar: back circle (48), centred title "Új felmérés", "2 / 2".
- Destination chip under the top bar, 44 px: collective = `#f0fdf4` bg, `#166534` text, green users icon, name, chevron-down; it links back to step 1. Personal variant: `#eff6ff` / `#1d4ed8` with the user icon and "Személyes".
- Fields: **Megnevezés** (text, placeholder "pl. Fürdőszoba felújítás"), **Ügyfél** (selector + "+"), **Helyszín** (optional, map-pin icon, placeholder "Cím"), **Helyiségek** (chips: Nappali, Fürdő, Konyha, Hálószoba, Kert, Folyosó, + Egyéb; Nappali and Fürdő preselected in the mock only, default none or sensible defaults).
- Only the name is required. Date is automatic.
- Sticky bottom zone with a transparent-to-`#f8fafc` gradient: primary button "Felmérés indítása" (56 px dark), and below it a centred 14/700 line in `#15803d` with the users icon: "Megosztva: Kovács és Társai" (omit for personal).
- After creating, open the new survey on its first room with the camera one tap away.

### 6.4 Workspace inheritance rule
- An Ajánlat created from a Felmérés, and a Projekt created from an Ajánlat, **inherit the workspace and the rooms**. No picker is shown. The picker appears only for the first item in a chain (a new Felmérés, a standalone Ajánlat or Projekt, a new Ügyfél). Never allow a derived item to silently land in a different workspace.

## 7. Copy (Hungarian, keep exactly unless the codebase has established terms)

Felmérés / Felmérések, Ajánlat, Projekt, Ügyfél, Személyes, Kollektíva, Csapat, Kezdőlap, Folytasd, Mind, Új felmérés, Hova kerüljön?, Tovább, Felmérés indítása, Megosztva: <név>, Megnevezés, Ügyfél kiválasztása, Új ügyfél, Helyszín, Helyiségek, Még nincs fotó, + N további, Kevesebb, Megnyitás, Duplikálás, Átnevezés, Törlés, Mégse, Igen, törlés, Keresés név vagy ügyfél szerint, További műveletek, Piszkozat, Folyamatban, Elküldve, Kész.

All strings go through the project's i18n mechanism if one exists.

## 8. Simplifications relative to desktop (do not port these to mobile)

Keep: room-based capture (camera straight into the current room's gallery), Felmérés → Ajánlat → Projekt conversion in one button, sending the quote via the share sheet, daily diary photos in Projekt, call/navigate from client.
Simplify: create forms (name, optional client/address, room chips, nothing else); tételek added from a recent/favourites list with a quantity stepper instead of a table; measurements via numeric keypad with metric units preselected; 3–4 statuses per type; client picker is search-first with inline "new client" asking only name and phone; lists have one search field, newest first.
Move to desktop (link out, do not rebuild): public website editor, collective administration (invites, roles), price-list management, invoice/cost grids and reconciliation, bulk actions / import / export, reports and analytics, deep settings.

## 9. Implementation guidance

- First inspect: framework, router, state/data layer, existing list/card components, token files, i18n, how workspaces are currently modelled (the old UI used a switcher). Report a short plan before large edits.
- Data: list endpoints should return personal and collective items together, each item carrying its workspace (`personal` | collective id + name). Group client-side by workspace; if the API only serves one workspace at a time, fetch both and merge, and tell me.
- Keep components small and reusable: `WorkspaceSectionHeader`, `ItemCard`, `CompactRow`, `StatusBadge`, `TeamBadge`, `ExpandButton`, `WorkspacePicker`, `SharingBanner`, `BottomSheet`, `ConfirmDialog`, `FloatingNav`, `RoomChips`.
- Mobile-first CSS. The 375 px layout is the base; do not break desktop. Apply this UI below the existing mobile breakpoint, or behind a feature flag if that is the project's pattern.
- Use the existing icon set (Lucide) and Plus Jakarta Sans if already loaded.
- No new heavy dependencies. No emoji icons. No illustrations in empty states.
- Do not delete or rename existing routes. Add tests where the repo has a test setup (at least: grouping by workspace, 3-card collapse/expand, banner shown only for collective, picker skipped when no collective, derived items inherit workspace).

## 10. Acceptance checklist

- [ ] Bottom nav is floating, 5 items in the specified order, + is the only dark circle, active state uses an inset pill.
- [ ] Felmérés list shows Személyes and collective sections, 3 cards each with "+ N további" expand, collective inside an inset panel with team icon and green header.
- [ ] Every shared card has the "Csapat" badge; personal cards have none.
- [ ] Card is fully tappable (≥ 64 px), ⋯ is 48 px, delete goes through sheet then confirm, and shared deletes warn about the team.
- [ ] Create flow: large two-button workspace choice (not a dropdown), orange banner only for collective, primary button pinned, destination always visible afterwards.
- [ ] Derived Ajánlat/Projekt inherit workspace and rooms with no picker.
- [ ] Body text ≥ 16 px, all text ≥ 4.5:1, status and selection never rely on colour alone.
- [ ] Works at 360, 375 and 430 px, no horizontal scroll, safe-area insets respected.
- [ ] All labels in Hungarian.

## 11. Open questions to raise with me rather than guess

- Does the API already return items of both workspaces in one call?
- What are the exact status enums for Ajánlat and Projekt?
- Should Home or Ügyfél get the fifth nav slot if usage data says Ügyfél is rarely opened?
- How are multiple collectives per user presented in the picker (list of large buttons vs. a scrolling stack)?
