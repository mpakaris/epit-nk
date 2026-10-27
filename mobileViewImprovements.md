# Mobile View Improvements — Epitek / OkosSzaki

**Status:** Audit complete, ready for implementation  
**Prepared by:** Mobile UX audit session  
**Stack:** Next.js 15 App Router · Supabase · Tailwind-free (CSS variables in `globals.css`) · Lucide icons · Plus Jakarta Sans  
**Primary working directory:** `/Users/niko/Desktop/CODING/Epitek`

---

## Context & Product

Epitek (OkosSzaki.hu) is a SaaS for solo contractors (plumbers, tilers, electricians) in Hungary. ~90 % of usage is on a phone, on a construction site — gloves, one free hand, direct sunlight. The app recently received a mobile UI overhaul (floating nav, ItemCard components, etc.) but several critical mobile UX gaps remain.

**Core user loop:**  
`Felmérés` (survey with photos) → `Ajánlat` (quote with line items) → `Projekt` (project with invoices + diary photos)

---

## Codebase Quick-Reference

| Item | Location |
|---|---|
| Main CSS tokens | `src/app/globals.css` |
| Mobile components | `src/components/mobile/` |
| App context (state, mutations) | `src/context/AppContext.jsx` |
| Survey list | `src/app/felmeres/page.js` |
| Survey detail | `src/app/felmeres/[id]/page.js` |
| Survey upload | `src/app/felmeres/[id]/feltoltes/page.js` |
| New survey | `src/app/felmeres/uj/page.js` |
| Quote list | `src/app/ajanlatok/page.js` |
| Quote detail | `src/app/ajanlatok/[id]/page.js` |
| New quote | `src/app/ajanlatok/uj/page.js` |
| Project list | `src/app/projektek/ProjectsListClient.jsx` |
| Project detail | `src/app/projektek/[id]/ProjectDetailClient.jsx` |
| Project upload / cost add | `src/app/projektek/[id]/feltoltes/page.js` |
| Media compression | `src/lib/mediaGate.js` |
| Upload to R2 | `src/lib/r2.js` |
| Upload API (surveys) | `src/app/api/surveys/upload/route.js` |

**Existing mobile components already built:**  
`FloatingNav`, `ItemCard`, `BottomSheet`, `ConfirmDialog`, `WorkspacePicker`, `SharingBanner`, `RoomChips`, `StatusBadge`, `TeamBadge`, `WorkspaceSectionHeader`, `ExpandButton`, `CompactRow`

**CSS utility classes available:**  
`.show-mobile` (display:none on desktop, block on mobile ≤768px)  
`.hide-mobile` (display:none on mobile)  
`.page-body` (adds 124px bottom padding for floating nav clearance)  
`.collective-inset-panel`, `.mobile-search-wrap`, `.list-page-mobile-header`  
`--shadow-card`, `--shadow-float-nav`, `--radius-2xl` (24px), `--radius-xl` (16px)

---

## Improvement #1 — Sticky Bottom Action Bar on All Form Pages

### Problem
Every form and create page has its primary save/submit button at the **bottom of the page content**, requiring the user to scroll past all fields to reach it. On a 375px screen with 4–6 form sections, this can mean 3–4 scrolls just to save.

### Affected pages (confirmed by code audit)

| Page | Current button position | Button label |
|---|---|---|
| `/ajanlatok/uj` | After 5 stacked card sections, `justify-content: space-between` row | "Ajánlat létrehozása" |
| `/ajanlatok/[id]` | Multiple `justify-content: flex-end` inline saves scattered per section | "Mentés", "Módosítás", "Küldés emailben" |
| `/felmeres/[id]/feltoltes` | Below file preview grid, bottom of page | "Feltöltés indítása" |
| `/felmeres/[id]/szerkesztes` | Bottom of form (edit page) | "Mentés" |
| `/projektek/[id]/szerkesztes` | Bottom of form | "Mentés" |
| `/kollektivak` | Inside modal footer | "Mentés" |

**Already fixed:** `/felmeres/uj` has a sticky bottom bar (implemented in previous session).

### User Story
> As a contractor filling out a quote on site, I need the Save button to always be visible at the bottom of the screen — even while typing — so I don't have to scroll to save after each change.

### Technical Implementation Notes

**The pattern to apply** (copy from `src/app/felmeres/uj/page.js` lines ~300–315):

```jsx
{/* Mobile sticky bottom bar */}
<div className="show-mobile" style={{
  position: 'sticky',
  bottom: 0,
  left: 0, right: 0,
  padding: '12px 16px calc(16px + env(safe-area-inset-bottom))',
  background: 'linear-gradient(to top, #f8fafc 80%, transparent)',
  zIndex: 10,
}}>
  <button
    type="submit"
    disabled={isSubmitting}
    style={{
      width: '100%', height: 56, borderRadius: 999,
      background: '#0f172a', border: 'none', color: '#fff',
      fontSize: 17, fontWeight: 700, cursor: 'pointer',
    }}
  >
    {isSubmitting ? 'Mentés...' : 'Ajánlat létrehozása'}
  </button>
</div>

{/* Desktop buttons — keep existing layout, just hide on mobile */}
<div className="hide-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
  <button ...>Mégse</button>
  <button type="submit" ...>Ajánlat létrehozása</button>
</div>
```

**For the quote detail page** (`/ajanlatok/[id]/page.js`), the primary mobile actions are:
1. "Ajánlat küldése" (send to client) — this is the most important action, should be in a sticky bar
2. "Mentés" (save edits) — only visible when something is dirty (unsaved)

The quote detail already has a `sendProgress` state and a `isSendModalOpen` pattern. The sticky bar should show "Küldés" as the primary action, with a `hasUnsavedChanges` flag triggering a "Mentés" variant.

### Acceptance Criteria
- [ ] On screens ≤768px, the primary action button is always visible without scrolling
- [ ] Button is 56px tall, full-width, `border-radius: 999px`, dark `#0f172a` background
- [ ] Safe-area insets respected (`env(safe-area-inset-bottom)`)
- [ ] Desktop layout unchanged (existing buttons remain for ≥769px)
- [ ] When keyboard is open, the sticky bar stays above the keyboard (use `position: sticky` not `position: fixed` inside a scrollable container — or apply `bottom: env(keyboard-inset-height, 0)` if available)

---

## Improvement #2 — Background Upload Queue (Don't Block User)

### Problem
**This is the highest-impact fix.** The current upload flow is completely blocking:

```
User selects photos
  → processMediaFiles() compresses all in parallel (fast, ~1–2s per image)
  → SINGLE batch POST to /api/surveys/upload with all files in one FormData
  → Spinner until ALL done
  → User can do nothing
```

On a construction site with 2-bar 4G and 10 photos to upload, this blocks the user for 30–60 seconds. They cannot take the next photo, navigate, or do anything.

**Compression code** (`src/lib/mediaGate.js`):
- `processMediaFile(file)` — async, uses canvas → WebP, ~400KB target
- `processMediaFiles(files)` — `Promise.all(files.map(processMediaFile))` — already parallel

**Upload API** (`/api/surveys/upload/route.js`):
- Accepts a `FormData` POST with `files[]`, `survey_id`, optional `entry_id`, `media_type`
- Already supports single-file uploads (the files array can have 1 item)
- Returns `{ media: [...] }` with the uploaded URLs

### User Story
> As a contractor taking 10 photos of a bathroom on site, I need to be able to take the next photo immediately after the shutter click — without waiting for the previous photo to upload. Photos should upload automatically in the background while I keep shooting.

### Technical Implementation — `useUploadQueue` hook

Create `src/hooks/useUploadQueue.js`:

```js
// Manages a queue of files to upload in the background.
// - New files are added to the queue via enqueue(files, { surveyId, entryId, mediaType })
// - Each file is compressed then uploaded independently
// - Caller receives onSuccess(media) callback per file
// - Queue drains automatically; multiple files can compress in parallel but uploads are sequential
//   (prevents overwhelming the connection on poor mobile signal)
//
// Returns: { enqueue, queue, totalPending, totalUploading, totalDone, totalError }
```

**Queue item shape:**
```js
{
  id: crypto.randomUUID(),
  file: File,
  surveyId: string,
  entryId: string | null,
  mediaType: 'photo' | 'layout' | 'video',
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error',
  preview: string,   // local object URL for immediate display
  errorMsg: string | null,
  result: media object | null,
}
```

**Queue logic:**
1. `enqueue(files, opts)` — adds items with status `'pending'`, creates local preview URLs immediately (user sees photos instantly)
2. A `useEffect` watches the queue: when any item is `'pending'` and fewer than `MAX_CONCURRENT` (=2) items are `'uploading'`, it picks the next pending item and starts it
3. Start = set status to `'compressing'`, call `processMediaFile(file)`, then set to `'uploading'`, call the upload API, then set to `'done'`
4. `MAX_CONCURRENT = 2` — two files upload simultaneously; more would saturate a poor mobile connection

**Upload progress indicator (UI):**  
A small pill badge overlaid on the camera button or at the top of the photo grid:
- "⬆ 3 / 7" — uploading 3 of 7
- Green checkmark when all done
- Red "!" with retry button on error

**Files to create/modify:**
- Create `src/hooks/useUploadQueue.js`
- Modify `src/app/felmeres/[id]/page.js` — the section photo capture button should use the queue instead of `uploadSurveyMedia` directly
- Modify `src/app/felmeres/[id]/feltoltes/page.js` — replace the blocking upload with the queue
- The upload page can become a "queue status" view rather than a separate page

### Upload Progress Component

Create `src/components/mobile/UploadProgressBadge.jsx`:
```jsx
// Props: { pending, uploading, done, error, onRetry }
// Shows nothing when all done and no errors
// Shows a small floating pill in corner of the photo grid:
//   "⬆ 2" (grey, uploading)
//   "✓" (green, all done — fades after 2s)
//   "⚠ 1 hiba" (red, with retry)
```

### Acceptance Criteria
- [ ] User can take/select a new photo immediately after selecting the previous one — no blocking spinner
- [ ] Photos appear in the gallery with a local preview instantly, before upload completes
- [ ] A non-intrusive indicator shows upload progress (e.g., small badge "⬆ 2/5")
- [ ] If an upload fails, the photo stays visible with a retry option — does not disappear
- [ ] On success, AppContext state is updated (the `setSurveyMediaBySurvey` call already exists in the upload function)
- [ ] Max 2 concurrent uploads to respect poor mobile connections

---

## Improvement #3 — Quote Line Items: Keyboard-Safe on Mobile

### Problem
When adding a line item to a quote on mobile (`/ajanlatok/[id]/page.js`):
1. Tapping the "Tétel hozzáadása" button opens a form (currently a bottom sheet or inline form)
2. The form has numeric input fields (quantity, unit price)
3. On iOS, the keyboard pushes the viewport up — the "Mentés / Tétel hozzáadása" save button is behind the keyboard and unreachable

### Additional UX problem
The line item entry form currently requires:
- Type selection (anyag/munkadíj/eszköz/szállítás/egyéb)
- Work description (text)
- Unit (m², m, db, etc.)
- Quantity
- Unit price
- Total (auto-calculated)

On a phone this is 6 fields. Too many for a quick on-site entry.

### User Story
> As a contractor on site creating a quote, I need to quickly add line items — type a description, enter qty × price — without the keyboard covering the Save button.

### Technical Implementation Notes

**The save button** in the line item modal is currently at:
```js
// ajanlatok/[id]/page.js ~line 1383
<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
  <button ... onClick={handleSaveEntry}>
    {savingEntry ? 'Mentés…' : editingEntryId ? 'Módosítás' : 'Tétel hozzáadása'}
  </button>
</div>
```

**Fix:** The entry form modal (currently `position: fixed, bottom: 0`) should have its save button **inside the scrollable area, before the numeric inputs**, OR use `padding-bottom: env(keyboard-inset-height, 260px)` on the modal container so the button scrolls into view above the keyboard.

**Better approach for mobile:** Reorder the form fields so numeric inputs (qty, price) come LAST, and the save button is above the description field. This way, after the user types the description and qty×price, the keyboard is already up but the save button was visible before they started typing.

**Simpler fix first:** Add to the modal container:
```css
padding-bottom: max(20px, env(keyboard-inset-height, 0px));
```

Or use the `visualViewport` API to reposition:
```js
window.visualViewport.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - window.visualViewport.height;
  setKeyboardHeight(keyboardHeight);
});
```

### Acceptance Criteria
- [ ] The "Tétel hozzáadása" save button is always reachable on mobile when keyboard is open
- [ ] Form fields are ordered logically for mobile: description first, qty × price last
- [ ] Numeric fields use `inputMode="decimal"` (not `type="number"`) to get the numeric keyboard without arrows
- [ ] Unit selector is a horizontal chip row (not a `<select>`) for easier tapping

---

## Improvement #4 — Quick Cost Item via Bottom Sheet (Not Separate Page)

### Problem
Adding an invoice or labour entry to a project requires navigating to a **separate page** (`/projektek/[id]/feltoltes/`):
1. Project detail → tap "Hozzáadás" button (in page header)
2. Full page navigation to `/projektek/[id]/feltoltes`
3. Fill form (invoice photo + OCR, OR labour entry)
4. Save → navigate back to project

**That's 2 navigation hops** (away + back) for a task that should feel instantaneous.

### User Story
> As a contractor on site, when I scan a receipt or log a work hour, I need it added to the current project in 3 taps — without leaving the project page.

### Technical Implementation Notes

**The `feltoltes/page.js` is already well-built for mobile** — it has:
- Camera/gallery buttons with `btn-touch` sizing
- OCR scanning for invoice values
- AI line-item extraction
- Invoice vs labour entry toggle (`mode` state)

**What to change:**
1. Add a `QuickCostSheet` component (`src/components/mobile/QuickCostSheet.jsx`) that wraps the core invoice/labour logic from `feltoltes/page.js` in a bottom sheet
2. The sheet opens from a floating action button on the project detail page — OR from the FloatingNav `+` button when on a project page
3. The separate `/feltoltes` page remains for desktop (unchanged)

**FloatingNav integration** (already exists at `src/components/mobile/FloatingNav.jsx`):  
The `+` button currently context-switches based on which list page you're on. When on `/projektek/[id]/*`, the `+` should open `QuickCostSheet` instead of navigating to create a new project.

```jsx
// In FloatingNav.jsx, detect if we're on a project detail page:
const projectDetailMatch = pathname.match(/^(?:\/demo)?\/projektek\/([^/]+)(?:\/|$)/);
if (projectDetailMatch) {
  // Open QuickCostSheet with projectId = projectDetailMatch[1]
}
```

**`QuickCostSheet` props:**
```jsx
<QuickCostSheet
  isOpen={bool}
  onClose={fn}
  projectId={string}
  onSuccess={(entry) => {
    // Refresh project data in AppContext
    refreshSupabaseData();
  }}
/>
```

**The sheet should contain** (simplified from `feltoltes/page.js`):
- Toggle: `[📷 Számla]  [🔨 Munka]`
- Invoice mode: Camera button → preview → OCR auto-fill → amount input → category chips → Save
- Labour mode: Work type input → hours × rate → date → Save
- No full page layout — just the core inputs in a 90vh bottom sheet

### Acceptance Criteria
- [ ] From any project detail page, the FloatingNav `+` opens a QuickCostSheet
- [ ] Invoice can be added: photo → OCR fills amount → confirm → saved in ≤ 5 taps
- [ ] Labour can be added: type + hours + rate → saved in ≤ 4 taps
- [ ] The sheet does NOT navigate away from the project page
- [ ] The existing `/projektek/[id]/feltoltes` page remains working for desktop
- [ ] After saving, the project financials update without a full page reload

---

## Improvement #5 — Survey → Quote Shortcut Action Bar

### Problem
The survey → quote conversion is the core business flow but it's buried:
- The "Ajánlatot készítek ebből" button exists on the survey detail page but is not prominent
- On mobile, a contractor finishes a survey and doesn't immediately see "make a quote from this"

### User Story
> As a contractor who just finished a survey, I want a prominent one-tap button to start a quote from this survey — with all measurements and client info pre-filled.

### Technical Implementation Notes

In `src/app/felmeres/[id]/page.js`, add a **persistent action strip** at the bottom (above the floating nav) when the survey status is `'active'` (not done):

```jsx
{/* Mobile conversion CTA — shown when survey is active/not-done */}
{survey.status !== 'done' && (
  <div className="show-mobile" style={{
    position: 'sticky', bottom: 0,
    padding: '12px 16px calc(16px + env(safe-area-inset-bottom))',
    background: 'linear-gradient(to top, #f8fafc 85%, transparent)',
    display: 'flex', gap: 8,
  }}>
    <Link
      href={`${navPrefix}/ajanlatok/uj?survey=${survey.id}`}
      style={{
        flex: 1, height: 56, borderRadius: 999,
        background: '#0f172a', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, textDecoration: 'none',
      }}
    >
      → Ajánlat készítése
    </Link>
  </div>
)}
```

The `/ajanlatok/uj` page already handles `?survey=` query param to pre-fill the form (check `useSearchParams` usage in that file — it imports survey data).

### Acceptance Criteria
- [ ] When viewing a non-done survey on mobile, a sticky "→ Ajánlat készítése" button is visible
- [ ] Tapping it opens the new quote form with the survey pre-selected
- [ ] The button disappears when the survey is marked as done
- [ ] Desktop layout unchanged

---

## Improvement #6 — Quote Creation Form: Simplify for Mobile

### Problem
`/ajanlatok/uj/page.js` has **5 stacked card sections** before the save button:
1. CollectiveSelector (workspace)
2. Survey picker (search dropdown)
3. Basic fields (name, location, work type, description, start/end dates, VAT %)
4. Client selector
5. Submit buttons

On a 375px screen this is ~8 scrolls. A contractor on site just needs: **name + client = done**.

### User Story
> As a contractor, I need to create a quote in under 30 seconds on my phone — just give it a name and pick the client. I can fill in the rest later.

### Technical Implementation Notes

**Approach:** Progressive disclosure — show only required fields first, put optional sections in an expandable "További beállítások" (More settings) section.

**Required fields (always visible):**
- Quote name (text input)
- Client selector

**Optional (collapsed by default on mobile, expanded on desktop):**
- Survey link
- Location
- Work type  
- Description
- Start/end dates
- VAT rate (default to last used, stored in localStorage)

```jsx
const [showAdvanced, setShowAdvanced] = useState(false);

// Mobile: show only name + client by default
// Desktop: show everything (no toggle)
```

**VAT rate persistence:**
```js
// Save last used VAT to localStorage so it's pre-filled next time
useEffect(() => {
  const last = localStorage.getItem('last_tax_percent');
  if (last) setTaxPercent(last);
}, []);

const handleTaxChange = (v) => {
  setTaxPercent(v);
  localStorage.setItem('last_tax_percent', v);
};
```

### Acceptance Criteria
- [ ] On mobile, the minimum required fields (name + client) are immediately visible
- [ ] Optional fields are behind a "További beállítások ▾" toggle
- [ ] VAT rate is remembered from the last quote
- [ ] Desktop layout unchanged (all fields visible)
- [ ] The form can be submitted with only a name (client is optional — quotes can exist without a client)

---

## Improvement #7 — Survey Upload Page: Remove Separate Page, Embed in Survey

### Problem
Taking photos for a survey currently requires:
1. Open survey detail (`/felmeres/[id]`)
2. Tap "Fotók hozzáadása" → navigates to `/felmeres/[id]/feltoltes`
3. Take photos on that page
4. Tap "Feltöltés" → navigates back to survey

This is 2 navigation hops and a blocking upload step.

### User Story
> As a contractor doing a site survey, I want to tap the camera button directly within the room/section I'm measuring and have the photo appear instantly — without leaving the survey page or waiting for upload.

### Technical Implementation Notes

The survey detail page (`/felmeres/[id]/page.js`) already has:
- Per-section media grids
- `uploadSurveyMedia(surveyId, files, { entryId })` in AppContext
- A `cameraInputRef` pattern elsewhere in the app

**What to add to the survey detail page:**
1. A `cameraInputRef` on the survey detail page itself (no navigation needed)
2. When user taps "Fotó" button within a section → triggers `<input type="file" capture="environment">`
3. The selected file feeds into `useUploadQueue` (Improvement #2)
4. Photo appears with a local preview immediately, uploads in background

**The `/felmeres/[id]/feltoltes` page** can remain for bulk-upload fallback but should not be the primary flow.

### Acceptance Criteria
- [ ] Camera button within each survey section opens the camera directly (no page navigation)
- [ ] Photo appears as a local preview in the section immediately after capture
- [ ] Upload happens in background (uses the queue from Improvement #2)
- [ ] The separate `/feltoltes` page remains available as a fallback

---

## Implementation Order (Recommended)

```
Phase 1 — Quick wins (low risk, high impact)
  1. Sticky bottom bar on all forms (#1)
  2. Survey → Quote shortcut bar (#5)
  3. Quote form progressive disclosure (#6)

Phase 2 — Core UX (medium effort)
  4. Background upload queue — useUploadQueue hook (#2)
  5. Quote line items keyboard-safe (#3)

Phase 3 — Architecture improvements (higher effort)
  6. QuickCostSheet bottom sheet (#4)
  7. Embedded camera in survey detail (#7)
```

---

## Design Tokens & Constraints (don't change these)

```css
/* From globals.css — use these, do not hardcode values */
--primary: #0f172a      /* dark nav button bg */
--accent:  #2563eb      /* personal / blue */
--collective: #16a34a   /* collective / green (icons only) */
--collective-text: #15803d
--radius-xl: 16px       /* card radius */
--radius-2xl: 24px      /* inset panel radius */
--radius-pill: 9999px   /* button/badge pill */
--shadow-card: 0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04)
--shadow-float-nav: 0 8px 24px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)
```

**Button rules (from the brief):**
- Primary action: 56px tall, `border-radius: 999px`, `#0f172a` bg, white text, full-width on mobile
- Touch targets: minimum 48×48px
- Icon-only buttons: always include `aria-label`

**All UI text must be in Hungarian.** No English strings in user-facing elements.

**No new heavy dependencies.** Work with what's installed: React, Next.js, Lucide, existing CSS.

---

## Files NOT to touch (working correctly)

- `src/components/mobile/FloatingNav.jsx` — already built and working
- `src/components/mobile/ItemCard.jsx` — already built
- `src/app/felmeres/page.js` — already updated (list page)
- `src/app/ajanlatok/page.js` — already updated (list page)
- `src/app/felmeres/uj/page.js` — already has sticky bottom bar
- `src/app/globals.css` — add new rules at bottom only, do not modify existing rules

---

## AppContext Mutation Functions Available

These exist in `src/context/AppContext.jsx` and are exported via context — use them, don't call APIs directly:

```js
createSurvey(fields)         // creates survey, updates local state
updateSurvey(id, fields)
deleteSurvey(id)
uploadSurveyMedia(surveyId, files, { entryId, mediaType })
                             // compresses + uploads, updates surveyMediaBySurvey state

createQuote(fields)
updateQuote(id, fields)
deleteQuote(id)

createInvoice(fields)        // project cost/invoice
uploadInvoiceImage(invoiceId, file)
createLabourEntry(fields)

createClient(fields)
refreshSupabaseData()        // re-fetches all data from API
```

---

## Improvement #8 — Button Label Strategy: Icons + Bottom Sheet Drawers

### Principle (confirmed against okos-mobile-ui-brief.md §5.1, §5.6)

The design brief explicitly defines bottom sheets for multi-action contexts and "one primary button per screen." This improvement applies that rule consistently across the entire app.

### The Rule

| Situation | Pattern | Notes |
|---|---|---|
| Single, obvious action on a surface | **Icon only** — `aria-label` for a11y | `+` in a section header inherits noun from heading |
| 2+ actions from one trigger point | **Icon trigger → bottom sheet** — rows are 56px with icon + label | Never show a row of 3+ small buttons |
| The one primary CTA per screen | **Full-width 56px pill, short label** (max 3 words) | "Mentés", "Küldés", "Felmérés indítása" |
| Destructive / irreversible | **Always labelled**, in confirm dialog | Never icon-only for delete |
| Actions with no universal icon | **Bottom sheet row** — icon + short Hungarian label | "Ajánlat ebből" with `<FileText>` icon |

### Where this is currently wrong (audit findings)

**Survey detail page** (`/felmeres/[id]/page.js`):
- Has individual buttons: "Fotó hozzáadása", "Alaprajz hozzáadása", "Vázlat hozzáadása" stacked or side by side
- **Fix:** Replace with a single `+` icon button per section → bottom sheet with three rows: `<Camera> Fotó`, `<LayoutPanelLeft> Alaprajz`, `<PenLine> Vázlat`

**Project detail page** (`/projektek/[id]/ProjectDetailClient.jsx`):
- Has "Hozzáadás" button in header that navigates to a separate page
- **Fix:** Single `+` → QuickCostSheet bottom sheet (see Improvement #4)

**Quote detail page** (`/ajanlatok/[id]/page.js`):
- Has multiple inline section buttons: "Tétel hozzáadása", "Szekció hozzáadása", "Küldés emailben"
- **Fix:** Primary action = "Küldés" in sticky bottom bar. Section/item add = `+` icon per section → sheet

**General rule for section headers across the app:**
```jsx
// BEFORE (wrong):
<button className="btn btn-primary btn-sm">
  <Plus size={14} /> Alaprajz hozzáadása
</button>

// AFTER (correct):
<button
  style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center' }}
  onClick={() => setSheetOpen(true)}
  aria-label="Tartalom hozzáadása"
>
  <Plus size={16} color="#475569" strokeWidth={1.75} />
</button>

// The sheet then lists options:
// <Camera>    Fotó hozzáadása
// <LayoutPanelLeft>  Alaprajz hozzáadása
// <PenLine>   Vázlat hozzáadása
```

### Bottom sheet row spec (from brief §5.6)
```
height: 56px
padding: 0 20px
icon: 20px, strokeWidth 1.75, color #475569
label: 17px, fontWeight 500, color #0f172a
destructive row: color #b91c1c (not solid background)
separator: 1px #e2e8f0 hairline before destructive rows
```

The existing `BottomSheet` component at `src/components/mobile/BottomSheet.jsx` already implements this spec. Use it.

### Internationalisation note
Icon-only buttons (with `aria-label`) are language-agnostic by default. When the app expands to other languages, only the `aria-label` and the bottom sheet row labels need translation. Primary pill buttons (max 3 words) are easy to translate. Long inline button labels like "Alaprajz hozzáadása" are the hardest to translate — eliminating them now future-proofs the UI.

### Acceptance Criteria
- [ ] No surface has more than one primary (filled dark) button visible at once on mobile
- [ ] Any group of 2+ actions is behind a single `+` or `⋯` icon → bottom sheet
- [ ] Section-header add buttons are icon-only (`+`, 32×32, `#f1f5f9` bg, `border-radius: 50%`)
- [ ] Primary CTA per page is a full-width 56px pill at the bottom
- [ ] All icon-only buttons have `aria-label` in Hungarian
- [ ] The existing `BottomSheet` component is used — no new sheet implementations

---

## Known Constraints

- **No test runner configured** — verify by running `npm run dev` and testing manually in browser DevTools mobile emulation (375px width)
- **RLS not enforced at DB level** — all access control is in application code / API routes
- **`createAdminClient()`** bypasses RLS — only use in API routes, never in client components
- **Demo mode** — every page must check `isDemoMode` from `useApp()` and prefix navigation with `navPrefix = isDemoMode ? '/demo' : ''`
- **Collective vs personal context** — creating items must use the `collectiveId` from state, never hardcode. Pattern: `const { effectiveCollectives, activeCollectiveId } = useApp()`
