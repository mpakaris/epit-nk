# Code Improvement Backlog

Audit date: 2026-10-29  
Audited by: Claude Code (analysis only — no changes made yet)

---

## File Size Overview (Top 15)

| File | Lines |
|------|-------|
| `src/app/projektek/[id]/ProjectDetailClient.jsx` | 3,020 |
| `src/app/weboldalam/page.js` | 2,236 |
| `src/app/felmeres/[id]/page.js` | 2,087 |
| `src/app/ajanlatok/[id]/page.js` | 2,021 |
| `src/app/kollektivak/page.js` | 1,809 |
| `src/context/AppContext.jsx` | 1,732 |
| `src/app/profil/page.js` | 1,356 |
| `src/app/szakemberek/[slug]/page.js` | 1,043 |
| `src/app/admin/projektek/[id]/AdminProjectDetailClient.jsx` | 869 |
| `src/app/projektek/[id]/feltoltes/page.js` | 756 |
| `src/app/portal/dashboard/page.jsx` | 678 |
| `src/app/dashboard/DashboardClient.jsx` | 663 |
| `src/app/admin/projektek/AdminProjectsClient.jsx` | 591 |
| `src/app/superadmin/page.js` | 578 |
| `src/app/superadmin/entitasok/[id]/page.js` | 532 |

Five files exceed 2,000 lines. `ProjectDetailClient.jsx` at 3,020 lines is not a page — it is an entire application.

---

## Issue 1 — AppContext is a 1,700-line monolith

**File:** `src/context/AppContext.jsx` (1,732 lines)  
**Severity:** High  
**Effort to fix:** Large (1–2 days dedicated sprint)

### What it manages today (11 domains, all in one file)

| Domain | State | Key functions |
|--------|-------|---------------|
| Auth | `currentUser`, `loading` | `login`, `logout`, `registerWithEmail`, `changePassword` |
| God Mode | `impersonating` | `startImpersonation`, `stopImpersonation` |
| Entities | `entities` | `createEntity`, `updateEntity`, `deleteEntity` |
| Users | `users` | `createUser`, `deleteUser`, `resetUserPassword` |
| Projects | `projects`, `projectRooms` | `createProject`, `updateProject`, `deleteProject`, `closeProject`, `updateProjectMembers` |
| Clients | `clients` | `createClient`, `updateClient`, `deleteClient` |
| Quotes | `quotes`, `quoteEntries`, `quoteSections` | full CRUD + `shareQuoteWith`, `convertQuoteToProject` |
| Surveys | `surveys`, `surveyEntriesBySurvey`, `surveyItemsBySurvey`, `surveyDrawingsBySurvey`, `surveyMediaBySurvey` | full CRUD + media + AI generation |
| Invoices | `invoices` | `createInvoice`, `updateInvoice`, `deleteInvoice`, `uploadInvoiceImage` |
| Labour | `labourEntries` | `createLabourEntry`, `updateLabourEntry`, `deleteLabourEntry` |
| Diary | — | `fetchDiaryEntries`, `createDiaryEntry`, `updateDiaryEntry`, `deleteDiaryEntry`, `uploadDiaryPhotos` |

### Problem

Every bug fix or feature touches the same 1,700-line file. Re-renders in any domain trigger context updates across all consumers. Impossible to lazy-load. Hard to reason about in isolation.

### Recommended fix

Split into domain-specific custom hooks, each ~100–200 lines:

```
src/hooks/
  useProjects.js       // projects + projectRooms
  useQuotes.js         // quotes + quoteEntries + quoteSections
  useSurveys.js        // surveys + entries + items + drawings + media
  useInvoices.js       // invoices
  useLabour.js         // labourEntries
  useDiary.js          // diary entries + photos
  useClients.js        // clients
  useAuth.js           // login/logout/register
```

AppContext becomes a thin provider that composes these hooks and exposes their values. Auth + workspace context remain central; domain hooks move out.

---

## Issue 2 — Permission check block copy-pasted 10+ times

**File:** `src/context/AppContext.jsx`  
**Severity:** High  
**Effort to fix:** Low (1–2 hours)

### The repeated block (appears with minor variable name swaps in all locations below)

```js
const isOwner          = doc.owner_id === uid || doc.created_by === uid;
const isKollektivOwner = collectives.some(c =>
  c.collective_id === doc.collective_id && (c.role === 'owner' || c.role === 'admin')
);
const isEntryCreator   = entry.created_by === uid;
const isCollMember     = collectives.some(c => c.collective_id === doc.collective_id);
if (!isAdmin && !isOwner && !isKollektivOwner && !(isCollMember && isEntryCreator))
  throw new Error('Nincs jogosultsága!');
```

### Locations

| Function | ~Line |
|----------|-------|
| `updateInvoice` | 695 |
| `deleteInvoice` | 717 |
| `updateLabourEntry` | 752 |
| `deleteLabourEntry` | 774 |
| `updateQuoteSection` | 1335 |
| `deleteQuoteSection` | 1358 |
| `updateQuoteEntry` | 1428 |
| `deleteQuoteEntry` | 1452 |
| `updateSurveyEntry` | 1118 |
| `deleteSurveyEntry` | 1144 |

### Problem

A bug in the permission logic (like the one we just fixed — missing `isCollMember` check) must be found and corrected in all 10 places independently. This is exactly how the original bug existed: it was fixed in some places but not others.

### Recommended fix

```js
// src/lib/permissions.js
export function canMutateEntry({ doc, entry, uid, isAdmin, collectives }) {
  if (!doc) return true; // no local data → let API decide
  const isOwner          = doc.owner_id === uid || doc.created_by === uid;
  const isShared         = (doc.shared_with || []).includes(uid);
  const isKollektivOwner = collectives.some(c =>
    c.collective_id === doc.collective_id && (c.role === 'owner' || c.role === 'admin')
  );
  const isEntryCreator   = entry?.created_by === uid;
  const isCollMember     = collectives.some(c => c.collective_id === doc.collective_id);
  return isAdmin || isOwner || isShared || isKollektivOwner || (isCollMember && isEntryCreator);
}
```

All 10 call sites reduce to:
```js
if (!canMutateEntry({ doc: quote, entry, uid, isAdmin, collectives }))
  throw new Error('Nincs jogosultsága!');
```

---

## Issue 3 — Three list pages are 80% identical

**Files:**
- `src/app/felmeres/page.js`
- `src/app/ajanlatok/page.js`
- `src/app/projektek/ProjectsListClient.jsx`
- `src/app/ugyfelek/page.js`

**Severity:** Medium-High  
**Effort to fix:** Medium (1 day)

### Repeated blocks across all three

#### A. Hungarian search normalization (identical in all pages)
```js
// felmeres/page.js:107 | ajanlatok/page.js:98 | ugyfelek/page.js:76
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const q = norm(search);
```
→ Extract to `src/lib/utils.js` as `normalizeHU(str)`.

#### B. Outgoing transfer fetch (identical in 3 pages)
```js
// felmeres:39-45 | ajanlatok:35-41 | projektek/ProjectsListClient:134-140
useEffect(() => {
  if (!dataReady || isDemoMode) return;
  fetch('/api/transfer-requests?outgoing=true')
    .then(r => r.ok ? r.json() : { requests: [] })
    .then(d => setOutgoingTransfers(d.requests || []))
    .catch(() => {});
}, [dataReady, isDemoMode]);
```
→ Extract to `src/hooks/useTransferRequests.js`.

#### C. Retract transfer handler (identical in 3 pages)
```js
// felmeres:68-81 | ajanlatok:64-77 | projektek/ProjectsListClient:70-83
const handleRetract = async (requestId) => {
  const res = await fetch(`/api/transfer-requests/${requestId}`, { method: 'DELETE' });
  if (res.ok) setOutgoingTransfers(prev => prev.filter(r => r.id !== requestId));
};
```
→ Part of the same `useTransferRequests` hook.

#### D. Collective nudge banner (copy-pasted with minor text changes)
```
felmeres:282-293  ←→  ajanlatok:265-276
```
→ Extract to `<CollectiveNudgeBanner />` component.

#### E. Card render pattern (same structure, different field names)
All pages define a local `renderXCard(item)` that:
1. Finds the client
2. Checks `isOwner`
3. Checks `canTransfer`
4. Finds `pendingReq` from `outgoingTransfers`
5. Returns a card with `href`, `onDelete`, `onTransfer`

→ Extract to `<DocumentCard type="survey|quote|project" item={...} ... />` or a shared `useDocumentCard(item)` hook.

---

## Issue 4 — Detail pages are too large to maintain

**Files:**
- `src/app/projektek/[id]/ProjectDetailClient.jsx` — 3,020 lines
- `src/app/felmeres/[id]/page.js` — 2,087 lines
- `src/app/ajanlatok/[id]/page.js` — 2,021 lines

**Severity:** Medium-High  
**Effort to fix:** Large (2–3 days per file)

### Extractable sub-components common to all three

| Component | Currently in | Lines saved |
|-----------|-------------|-------------|
| `<LockedDocumentBanner>` | All three detail pages (inline) | ~30/page |
| `<EntryFormModal>` | felmeres + ajanlatok (inline modal+form) | ~80/page |
| `<MediaGallerySection>` | felmeres + ajanlatok (inline) | ~120/page |
| `<ConfirmDeleteFlow>` | All three (identical state + modal pattern) | ~40/page |
| `<CollectiveMembersBadge>` | All three (inline) | ~25/page |

### Survey-specific candidates

The survey detail page `felmeres/[id]/page.js` contains 4 large function components defined inline:
- `InlineUpload` (~40 lines)
- `AreaSummary` (~30 lines)
- `TételekSection` (~350 lines) ← biggest, already has its own internal state
- `PropertyInfoSection` (~250 lines)
- `SurveyEntryCard` (~180 lines)

All five exist only inside `page.js`. Moving them to `src/app/felmeres/[id]/components/` would cut the main file by ~850 lines without changing any logic.

---

## Issue 5 — Inline styles dominate (58% of detail page styling)

**Sample file:** `src/app/felmeres/[id]/page.js` first 500 lines  
**Ratio:** ~72 inline `style={{}}` blocks vs ~53 `className=` uses

**Severity:** Low-Medium  
**Effort to fix:** Medium (gradual, file by file)

### Most egregious patterns

**Repeated flex row:**
```js
// appears 15+ times across detail pages
style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
```

**Repeated muted label:**
```js
style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
         letterSpacing: '0.04em', color: 'var(--text-muted)' }}
```

**Repeated pill badge:**
```js
style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
         fontSize: '0.78rem', fontWeight: 700, borderRadius: 'var(--radius-pill)',
         padding: '0.15rem 0.5rem' }}
```

### Recommended fix

Add utility classes to `globals.css`:
```css
.label-muted  { font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.04em; color: var(--text-muted); }
.pill         { display: inline-flex; align-items: center; gap: 0.25rem;
                font-size: 0.78rem; font-weight: 700; border-radius: var(--radius-pill);
                padding: 0.15rem 0.5rem; }
.row-center   { display: flex; align-items: center; }
```

---

## Issue 6 — Hardcoded hex colours in JSX

**Severity:** Low  
**Effort to fix:** Low (find & replace)

Several files bypass the CSS variable system with raw hex values:

```js
// felmeres/[id]/page.js
background: '#1e3a5f'       // ← should be var(--primary) or a named token
color: '#fff'               // ← should be var(--text-on-dark)
color: '#86efac'            // ← success green, should be var(--success)
color: '#fca5a5'            // ← danger red, should be var(--danger)
```

These bypass theme consistency and will cause problems if the colour scheme ever changes.

---

## Issue 7 — Cross-context document caching pattern needs standardising

**Files:** `src/app/felmeres/[id]/page.js`, `src/app/ajanlatok/[id]/page.js`  
**Severity:** Low (already working, but fragile)  
**Effort to fix:** Low

When a user navigates directly to a document URL in a different workspace context, the document is not in AppContext's local arrays. Both detail pages independently implement a `directFetch` / `fallbackQuote` pattern to handle this.

The fix we applied (`cacheSurvey`, `cacheQuote`) is correct but manually wired. If a third detail page (e.g. `projektek/[id]`) gains the same cross-context scenario, someone has to remember to add `cacheProject` too.

### Recommended fix

A generic `useCrossContextDocument(id, contextArray, apiPath, cacheFunc)` hook that encapsulates the fallback fetch + cache injection pattern once.

---

## Recommended Implementation Order

| Priority | Issue | Why now |
|----------|-------|---------|
| **1** | Permission helper (`canMutateEntry`) | Lowest effort, highest bug-prevention value. Every future fix benefits. |
| **2** | `useTransferRequests()` hook | Removes identical code from 3 files, easy to test in isolation. |
| **3** | Extract inline components from `felmeres/[id]/page.js` | Biggest single-file win, zero logic change. |
| **4** | Split AppContext into domain hooks | Most impactful long-term but needs a dedicated sprint — don't do this incrementally. |
| **5** | `<DocumentListPage>` shared list layout | Do after #4 because it shares the domain hook API. |
| **6** | Detail page sub-component extraction | Naturally follows from #3 once the pattern is established. |
| **7** | CSS utility classes + remove hardcoded hex | Do gradually alongside other work. |

---

## Notes

- All findings are analysis only. No code has been changed as part of this audit.
- Permission guards in this list refer to **client-side AppContext guards only**. API-level guards are separate and were already correct.
- `ProjectDetailClient.jsx` (3,020 lines) was not fully read during this audit — it likely contains additional duplication not captured here.
- The `weboldalam/page.js` (2,236 lines, website builder) was out of scope for this audit as it is a standalone editor with different UX patterns.
