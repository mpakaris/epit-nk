# OkosSzaki mobile — design spec (Dashboard + Survey)

Companion to `AGENT_BRIEF.md` (what/how to build) and `FUNCTION_MAP.md` (code mapping). This file explains **what the design is and why**, so it can be implemented without guessing. The `screens/*.dc.html` files are the pixel reference; where this text and a screen disagree, the screen wins, except for the items under "Known deviations".

## 1. Use context and principles
Contractors on site: gloves, sun glare, one hand, interrupted. Therefore:
- Big targets: tap ≥ 48 px, primary buttons 56–60 px, keypad keys ≥ 56 px. Primary action always at the bottom (thumb zone), never in the header.
- High contrast: white cards on a dark body, text ≥ 15 px, labels 13 px bold caps. No light-grey-on-white body text.
- One job per screen, big numbers, few words. Dictation (mic) next to every free-text field.
- Never lose the user's place: bottom sheets over the screen instead of navigating away; confirmations for destructive actions.

## 2. Core concept: Pods
A **pod** is a workspace (Személyes + each collective) drawn as a stacked, colour-coded block. Opening a pod makes it the active context. This replaces a dropdown workspace picker.
- Pod strip: coloured block with a soft glow circle (top right), workspace name, role line (e.g. "Kollektíva · Tulajdonos"), counts.
- Closed pods stack compactly; the open pod expands to show its documents.
- Workspace colour appears only on: pod strip, the dock "+" button, the workspace chip on a document. Never on a document's header (that is the document-type colour).
- Collective Owner/Admin vs Contributor: contributors see the pod but "create" is disabled/hidden for documents (permission table in CLAUDE.md); the API stays authoritative.

## 3. Colour
Two channels, never mixed (tokens in `tokens.css`):
| Channel | Meaning | Where |
|---|---|---|
| Workspace | Who/where | pod strip, dock "+", workspace chip |
| Document type | What | document header, deep body, accents, keypad, selected states |
Document types: **Survey teal** `#0A7F72` (deep `#06302C`, tint `#D9F2EE`, ink `#0A5C53`); **Offer violet** (proposed); **Project slate-navy** `#263248` (deep `#0B0F17`, tint `#E3E7EE`; the most serious). Workspace palette: Személyes graphite `#15181E`, cobalt `#2F5BFF`, orange `#FF8A2B`, each with a very dark "deep" body variant.
Status colours are independent of both: OK green `#14532D`/`#E7F4EC`, danger `#B71C1C`/`#FDECEC`, warning orange tint `#FFF1E0`, neutral `#F1F1F3`.

## 4. Layout system
- Frame 390×844 reference; fluid width, min 360.
- **Document screen** = rounded header (`border-radius: 0 0 32px 32px`, type colour, white text) + dark deep body with white cards (radius 26) + sticky bottom action bar (fades from the deep colour) with one primary button (60 px, radius 30).
- Header content: top row (back/close round button 48 px, optional pill, menu ⋯ round button), kicker (13 px caps), title (Bricolage Grotesque 30/700), subtitle/meta, optional avatar stack of members.
- Cards: white, shadow `inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.7), 0 3px 6px -2px rgba(0,0,0,.3)` on dark bodies.
- Fonts: Bricolage Grotesque (titles/numbers), Plus Jakarta Sans (UI). Add via the app's font setup, not a CSS `@import`.
- Dock (list/home screens): floating, 5 slots (home, search/calendar, raised "+", messages, notifications/menu); raised "+" is 64 px, coloured by the **open pod**, labelled "Új elem · <pod>"; badges for unread counts. Bottom safe-area padding.
- Bottom sheets: cream `#FBFAF7`, top radius 32, grab handle, 76 px rows with 44 px icon tile; destructive rows in danger colour. Use the existing `BottomSheet`/`Modal`/`ConfirmModal` (no new overlay types).

## 5. Screens
### 5.1 Dashboard (A-Pods)
Pod stack + weekly calendar strip ("Heti naptár") with daily events list, notifications and messages entries, dock. Must additionally host (not yet drawn): invitation banner, transfer-request banner, stat cards, latest activity — as full-width cards in the open pod's body; banner layout per CLAUDE.md rule 11.
### 5.2 Survey list (S1)
Pod stack; inside the open pod: search, filter chips, survey cards (title, address, status badge, room/photo counts, team badge). Card tap opens; ⋯ opens the action sheet (open, move to collective, delete). "Move" shows a destination sheet (personal ↔ collectives the user may create in). Delete shows a confirm sheet. Dock "+" starts a new survey for the open pod.
### 5.3 New survey (F1)
Step 1: choose destination pod (radio cards; contributors cannot pick collectives where they cannot create). Step 2: form (name, client select, address). "Új ügyfél" opens a sheet with name, contact and the **GDPR consent** checkbox; the client is saved to the user's personal list. Header shows the survey teal; the chosen workspace is shown as a chip. Subscription limit check before create.
### 5.4 Survey detail (S3)
Header: title, status pill, member avatars, ⋯ menu. Sections as cards: property info (with dictation to fill), floor plans/sketches, rooms list (expandable, per-room quick stats and ⋯), area summary (total m², walls, floor, ceiling), linked offers/projects. Sticky bar: primary action by state (add room / create offer). Status flow: active → closed ("Lezárás") → reopened ("Újranyitás"); rooms added after reopening are marked separately. Archive/inactivate and delete via the menu. **Locked** state (document in use/owned elsewhere) shows a lock banner, disables editing.
### 5.5 Room editor (S4)
Name field with dictation; dimension fields W × L × H as large tappable fields; tapping a field attaches the **custom numeric keypad** (digits, decimal comma, delete, next, done; accent keys in survey teal). Counters for doors/windows with ±1 buttons (56 px). Live m² (floor, wall) readout. Photo capture row. Save in bottom bar.
### 5.6 Items (S5)
Entry types: Anyag (material), Munkadíj (labour), Eszközbérlés (equipment), plus transport/other from `QUOTE_ENTRY_TYPES`. Type chips with tint colours. Add flow: dictate → transcript shown → AI suggests items (checklist with quantity/unit; select to accept) → bulk add. Manual add via item drawer: name, type, quantity with −/+ steppers, unit chips (m², m, db, …). States: idle, listening, working, done, error (error = danger tint with retry).
### 5.7 Floor-plan analysis (S6)
Upload/photograph → confirm sheet ("Elemezzük az alaprajzot AI-val…") → scanning animation (teal scan line) → detected rooms as selectable rows with editable name and measured cells (Sz, H, m², door, window); confirm creates rooms. Rooms already existing are dimmed and not re-created.

### 5.8 Offer module (violet)
Same document-screen frame as Survey, type colour **violet** `#6D3FD1` (deep `#1C1038`, tint `#EDE7FB`, ink `#4A2796`). Status badge colours: Vázlat grey, Kiküldve orange, Elfogadva green, Elutasítva red; the same colours are the thin top bar of each list card.
- **List (O1):** pod stack like Survey; filter chips by status; card = title, client · date, large gross total, status badge, optional lines (portal-visible, pending transfer, read-only, project created).
- **New (O2):** step 1 destination (contributors get a note: personal offer, transfer later); step 2 form; survey picker is a bottom sheet with a context sentence and grouped lists.
- **Detail (O3):** header shows the gross total (36 px) and status. Cards in order: totals, client + portal link, general data, rooms (expandable, entries as tinted type tiles, own rooms tagged "Saját"), areas, client comments, history. Sticky bar primary changes with status: Küldés (draft) → Elfogadás → Projekt (sent; resend as secondary round button) → Projekt megtekintése (accepted) / Lehetőségeim (rejected). Contributors see a violet explanatory note and a disabled primary.
- **Items (O4):** large dictation button, AI-suggest button, queue of pending items, type chips, qty stepper (60 px buttons) + unit chips, live line total. Select mode for batch delete.
- **Room (O5):** big numeric fields for W/L/H, steppers for windows/doors, live floor and wall area, photo strip.
- **Flows (O6):** send confirm → 4-step progress → done; blocked states (no email, incomplete profile); accept confirm → progress → success/error; reject confirm.
- **PDF (O7):** paper preview on the dark body, colour dots, collapsible missing-data card, one download button.
Entry type tiles: Anyag blue `#E4ECFA/#2B4C9B`, Munkadíj green `#E2F3E8/#14532D`, Eszköz amber `#FFF1E0/#8A4200`, Szállítás violet-tint `#EDE7FB/#4A2796`, Egyéb grey `#F1F1F3/#2B3038`. These replace the hardcoded `TYPE_COLORS` in `ajanlatok/[id]/components/constants.js` — tokenise them.

### 5.9 Project module (slate-navy)
The **most serious** document type: header `#263248`, deep body `#0B0F17`, tint `#E3E7EE`, ink `#263248`. On the near-black body the primary bar button is **white with navy text** (navy buttons are used inside cream sheets). No second accent colour: progress bars, chips and selected states are navy/grey. Status badges: Aktív green, Szünetel orange, Lezárt slate, Lejárt red.
- **List (P1):** card = name, client · place, "Elköltve" amount, progress bar vs quote (turns red at ≥ 95%), status badge. Filter chips Összes/Nyitott/Lezárt.
- **New (P2):** destination → form with required client, optional quote picker (sheet), members chips (collective only).
- **Detail (P3):** header shows status + date range. Stack: financial summary 2×2, burndown, cost breakdown bars, client + link, member contributions, data, sections, sub-page rows (Kiadások, Napló, Fizetési terv, Portál). Sticky bar: ⋯ + white "Bejegyzés" (opens quick-add sheet: invoice / labour / diary / payment item). Status change = reason sheet (required).
- **Expenses (P4):** segmented Számlák/Munkaóra, filter chips, cards with category colour strip; invoice and labour editors are tall sheets.
- **Add invoice (P5):** big camera target → scan animation → review with AI summary banner; multiple invoices as thumbnails.
- **Diary (P6), Payment plan (P7), Portal sharing (P8):** list + sheet patterns as above; toggles are 64×38 switches.
Category colours (navy ramp, no rainbow): Anyag `#263248`, Munka `#4A6FA5`, Szerszám `#8A94A8`, Szállítás `#B7BFCC`, Engedély `#D5DAE3`, Egyéb `#E3E7EE`.

### 5.10 Clients module (rose — proposed)
Header `#B8456B`, deep body `#2A0F1A`, tint `#F8E4EC`, ink `#8A2B4C`. Avatar circles use a small colour set per client. List (C1): segmented Saját / Velem megosztott, search, cards with count badges, tap = action sheet. Form (C2): all fields, GDPR checkbox card (required), share switch reveals collective checkboxes + second consent. Detail (C3): 3 stat cards, contact card with badges, 4 tabs, portal card, bar CTA changes per tab. Messages (C4): thread chips, bubbles (you = rose, client = white), composer in the bar. Portal (C5): link actions in the bar; warning card when no e-mail.

### 5.11 Profile module (stone — proposed)
Header `#44413B`, deep body `#121110`, tint `#ECEAE5`. Hub (U1) with grouped rows; sub-screens use sticky Mentés bar and toast "Adatok elmentve!". Currency pills are disabled once set. Cancel/restore flows use sheets with a confirm + result sheet; delete-account requires typing TÖRLÉS before the red button activates.

## 6. States every screen must handle
Loading skeletons (not spinners on dark), empty (illustration-free, one sentence + primary action), error (danger card + retry), offline (changes queue; show banner — if not supported in code today, show error + retry and flag it), read-only/locked, contributor-restricted, free-tier limit reached (upgrade prompt via existing subscription flow).

## 7. Motion and feedback
Sheet slide-up 220 ms ease-out; pod expand 200 ms; no motion required for core flows; respect `prefers-reduced-motion`. Haptics not required. Feedback only via the existing AlertModal/ConfirmModal/BottomSheet.

## 8. Accessibility
Every icon button has an `aria-label` (the design files list them; use i18n keys). Visible focus ring in the type colour. Contrast ≥ 4.5:1 for text (teal `#0A7F72` on white is ~5:1; always white text on it). Dynamic text sizes must not break the 48 px targets.

## 9. Known deviations — fix when implementing
1. **Delete copy:** the S3 mock says deletion is permanent ("Véglegesen törlődik"). The app soft-deletes (`deleted_at`). Use the existing translated delete text/keys; do not claim permanence unless product wants that.
2. All copy in the mocks is demo Hungarian; replace with i18n keys in hu/en/de.
3. Hex colours in the mocks must become tokens.
4. Mock data (names, counts) is fake; wire to `useApp()` data.
5. Dashboard banners/stats/activity are not drawn yet (see §5.1).
6. Offer and Project colours are proposals pending owner approval.
