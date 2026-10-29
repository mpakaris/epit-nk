# Code Improvement Backlog

Audit date: 2026-10-29  
Last updated: 2026-10-29

Legend: ✅ Done · ⬜ Pending

---

## Phase 1 — Extractions & Deduplication

| # | Issue | Result | Status |
|---|-------|--------|--------|
| 1 | `canMutateEntry()` permission helper | `src/lib/permissions.js` — replaces 10 copy-pasted blocks in AppContext | ✅ Done |
| 2 | `useTransferRequests()` hook | `src/hooks/useTransferRequests.js` — used by 3 list pages | ✅ Done |
| 3 | `normalizeHU()` + `toSlug()` + date formatters | `src/lib/utils.js` | ✅ Done |
| 4 | `Lightbox.jsx` shared component | 9 inline copies replaced | ✅ Done |
| 5 | `useScrollLock.js` hook | `src/hooks/useScrollLock.js` — wired into Lightbox | ✅ Done |
| 6 | `ErrorBanner.jsx` | `src/components/ErrorBanner.jsx` — ready to adopt | ✅ Done |
| 7 | `StatusBadge.jsx` | `src/components/StatusBadge.jsx` — 4 inline STATUS_COLORS maps replaced | ✅ Done |
| 8 | `Badge.jsx` pill component | `src/components/Badge.jsx` — ready to adopt | ✅ Done |
| 9 | `EmptyState.jsx` component | `src/components/EmptyState.jsx` — ready to adopt | ✅ Done |
| 10 | `fetchJson()` API helper | `src/lib/api.js` — ready to adopt | ✅ Done |

---

## Phase 2 — God Component Splits

| # | File | Before | After | Extracted to `components/` | Status |
|---|------|--------|-------|----------------------------|--------|
| 11 | `felmeres/[id]/page.js` | 2,087 | **912** | TételekSection, SurveyEntryCard, PropertyInfoSection, MediaGrid, InlineUpload, AreaSummary | ✅ Done |
| 12 | `ajanlatok/[id]/page.js` | 2,021 | **1,231** | SectionCard, SectionAddForm, SectionPhotoZone, ClientComments, AreaSummary, constants | ✅ Done |
| 13 | `ProjectDetailClient.jsx` | 3,020 | **1,541** | BurndownCard, CostBreakdownCard, CombinedStatsCard, EntryMediaGrid, EditDiaryEntryModal, LabourEditModal, InvoiceDetailDrawer, PaymentPlanModal, WorkTypeSelector, RoomModal, ProjectEditModal | ✅ Done |
| 14 | `weboldalam/page.js` | 2,229 | **754** | HeroEditor, AboutEditor, ServicesEditor, CertificationsEditor, PricingEditor, TestimonialsEditor, FaqEditor, ContactEditor, ListEditor, ImagePickerModal, SlugSetup, TradeSelect, PillToggle, CharCount, ContactPremiumField, GalleryEditor, BannerEditor, ServiceAreaEditor, SectionCard, SectionContentEditor, QrModal + utils (extractSocialHandle, formatHunPhone, buildSuggestions, splitDisplayName, normalisePricingContent, PRICE_UNITS) | ✅ Done |
| 15 | `AppContext.jsx` | 1,679 | **474** | Action factories in `src/context/actions/`: authActions, godModeActions, entityUserActions, projectActions, invoiceActions, labourActions, clientActions, surveyActions, quoteActions, diaryActions | ✅ Done |

---

## Phase 3 — Utility Cleanup

| # | Issue | Status |
|---|-------|--------|
| 16 | `MAX_PHOTOS` and other magic numbers scattered | ⬜ Pending |
| 17 | `useScrollLock` adoption — 34 inline `document.body.style.overflow` sites | ⬜ Pending (adopt gradually) |
| 18 | `ErrorBanner`, `Badge`, `EmptyState` adoption across all pages | ⬜ Pending (adopt gradually) |
| 19 | `fetchJson()` adoption — 69+ fetch calls missing `.ok` check | ⬜ Pending (adopt gradually) |

---

## Current File Sizes (post-refactor)

| File | Lines | Notes |
|------|-------|-------|
| `src/app/weboldalam/page.js` | 754 | ✅ Extracted 22 components |
| `src/context/AppContext.jsx` | 474 | ✅ Extracted 10 action factories |
| `src/app/kollektivak/page.js` | 1,809 | Not yet audited |
| `src/app/projekte/[id]/ProjectDetailClient.jsx` | 1,541 | ✅ Extracted 11 components |
| `src/app/ajanlatok/[id]/page.js` | 1,231 | ✅ Extracted 6 components |
| `src/app/profil/page.js` | 1,356 | Not yet audited |
| `src/app/felmeres/[id]/page.js` | 912 | ✅ Extracted 6 components |

---

## New shared files created (summary)

```
src/lib/
  permissions.js      canMutateEntry(), canMutateDoc()
  utils.js            normalizeHU(), toSlug(), formatDateShort(), formatDateMedium()
  api.js              fetchJson()

src/hooks/
  useTransferRequests.js
  useScrollLock.js

src/components/
  Lightbox.jsx
  ErrorBanner.jsx
  EmptyState.jsx
  StatusBadge.jsx
  Badge.jsx

src/app/felmeres/[id]/components/
  TételekSection.jsx  ItemDrawer + ITEM_TYPE constants + inferType
  SurveyEntryCard.jsx
  PropertyInfoSection.jsx
  MediaGrid.jsx
  InlineUpload.jsx    + InlineUploadZone export
  AreaSummary.jsx

src/app/ajanlatok/[id]/components/
  SectionCard.jsx
  SectionAddForm.jsx
  SectionPhotoZone.jsx
  ClientComments.jsx
  AreaSummary.jsx
  constants.js        TYPE_ICONS, TYPE_COLORS, QUOTE_ENTRY_LABELS, sortEntries

src/app/projektek/[id]/components/
  BurndownCard.jsx
  CostBreakdownCard.jsx
  CombinedStatsCard.jsx
  EntryMediaGrid.jsx
  EditDiaryEntryModal.jsx
  LabourEditModal.jsx
  InvoiceDetailDrawer.jsx
  PaymentPlanModal.jsx  + TRIGGER_DISPLAY, STATUS_DISPLAY exports
  WorkTypeSelector.jsx  + WORK_TYPES export
  RoomModal.jsx
  ProjectEditModal.jsx
```
