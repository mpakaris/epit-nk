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

## Phase 2 — God Component Splits (Round 1)

| # | File | Before | After | Extracted to `components/` | Status |
|---|------|--------|-------|----------------------------|--------|
| 11 | `felmeres/[id]/page.js` | 2,087 | **912** | TételekSection, SurveyEntryCard, PropertyInfoSection, MediaGrid, InlineUpload, AreaSummary | ✅ Done |
| 12 | `ajanlatok/[id]/page.js` | 2,021 | **1,231** | SectionCard, SectionAddForm, SectionPhotoZone, ClientComments, AreaSummary, constants | ✅ Done |
| 13 | `ProjectDetailClient.jsx` | 3,020 | **1,541** | BurndownCard, CostBreakdownCard, CombinedStatsCard, EntryMediaGrid, EditDiaryEntryModal, LabourEditModal, InvoiceDetailDrawer, PaymentPlanModal, WorkTypeSelector, RoomModal, ProjectEditModal | ✅ Done |
| 14 | `weboldalam/page.js` | 2,229 | **754** | HeroEditor, AboutEditor, ServicesEditor, CertificationsEditor, PricingEditor, TestimonialsEditor, FaqEditor, ContactEditor, ListEditor, ImagePickerModal, SlugSetup, TradeSelect, PillToggle, CharCount, ContactPremiumField, GalleryEditor, BannerEditor, ServiceAreaEditor, SectionCard, SectionContentEditor, QrModal + utils | ✅ Done |
| 15 | `AppContext.jsx` | 1,679 | **474** | Action factories in `src/context/actions/`: authActions, godModeActions, entityUserActions, projectActions, invoiceActions, labourActions, clientActions, surveyActions, quoteActions, diaryActions | ✅ Done |

---

## Phase 3 — Utility Cleanup

| # | Issue | Status |
|---|-------|--------|
| 16 | `MAX_PHOTOS` magic number | `MAX_DIARY_PHOTOS` exported from `src/lib/constants.js`; replaced in 3 diary files | ✅ Done |
| 17 | `useScrollLock` adoption | Replaced inline overflow logic in BottomSheet, ConfirmDialog, QuickCostSheet (Modal/Sidebar use iOS position:fixed pattern — not replaced) | ✅ Done |
| 18 | `ErrorBanner` adoption | Replaced 14 inline danger banners across felmeres/uj, ajanlatok/uj, TételekSection, 4 projektek modals, AdminProjectsClient (4×), admin/felhasznalok (2×), otletek | ✅ Done |
| 19 | `fetchJson()` adoption — missing `.ok` checks | All client-side fetch calls already had `.ok` checks — no changes needed | ✅ Done |

---

## Phase 4 — God Component Splits (Round 2)

All files still above 500 lines after Phase 2. Same rules apply: pure extraction, no logic changes, all UI text stays Hungarian.

### Priority 1 — Untouched god-files (largest wins)

| # | File | Lines | Extractable components | Target |
|---|------|-------|------------------------|--------|
| 20 | `kollektivak/page.js` | 1,809 | `CreateCollectiveModal` (multi-step wizard ~300L), `InviteMemberModal` (~80L), `CollectiveCard` (single card with member list, name edit, actions ~250L), `MemberRow` (~60L), `SubscriptionModals` (cancel + upgrade + seatLimit + reactivate grouped ~200L) | **< 500L** |
| 21 | `profil/page.js` | 1,356 | `UpgradeModal` (already named fn, ~73L), `ProfileEditSection` (display name + avatar ~150L), `PasswordSection` (~80L), `TaxSection` (~60L), `WebsiteSection` (~50L), `SubscriptionSection` (~120L), `GdprSection` (~60L) | **< 400L** |
| 22 | `szakemberek/[slug]/page.js` | 1,018 | All section renderers already named fns — move to `components/`: `HeroSection` (~115L), `ContactSection` (~160L), `GallerySection` (~55L), `PricingSection` (~40L), `ServicesSection` (~25L), `CertificationsSection` (~30L), `TestimonialsSection` (~30L), `FaqSection` (~50L), `ServiceAreaSection` (~20L), `AboutSection` (~40L), `BannerSection` (~15L), `Footer` (~15L). Move theme helpers + social icons + `makeThemeCss` + `GLOBAL_CSS` to `components/themeHelpers.js`. | **< 250L** |

### Priority 2 — Already partially split (continued)

| # | File | Lines | What's still extractable | Target |
|---|------|-------|--------------------------|--------|
| 23 | `ProjectDetailClient.jsx` | 1,541 | The render still has 4 large inline tab sections: `ProjectFinancialsTab` (~200L), `ProjectDiaryTab` (~250L), `ProjectCostTab` (~200L), `ProjectMembersTab` (~100L) | **< 600L** |
| 24 | `ajanlatok/[id]/page.js` | 1,231 | `QuoteEntryForm` (inline add/edit entry form ~200L), `QuoteTransferBanner` (~50L), `QuoteSendModal` (~80L), `QuoteHeaderBar` (status + action buttons ~100L) | **< 600L** |
| 25 | `felmeres/[id]/page.js` | 912 | `SurveyHeaderBar` (~60L), `SurveyRoomsPanel` (room list + room add form ~200L), `SurveyDrawingPanel` (~80L) | **< 500L** |

### Priority 3 — Medium files (untouched)

| # | File | Lines | Extractable | Target |
|---|------|-------|-------------|--------|
| 26 | `AdminProjectDetailClient.jsx` | 834 | `EntryMediaGrid` (already named fn, ~25L), `EditProjectModal` (already named fn, ~120L), `MembersSection` (~100L), `InvoiceTable` (~120L), `LabourTable` (~100L) | **< 400L** |
| 27 | `feltoltes/page.js` | 756 | `InvoiceUploadForm` (file pick + OCR + AI + category fields ~350L), `LabourEntryForm` (labour fields ~150L) | **< 200L** |
| 28 | `DashboardClient.jsx` | 663 | `QuotesWidget` (~100L), `ProjectsWidget` (~100L), `SurveysWidget` (~80L), `MobileQuickCards` (already named fn ~30L) | **< 300L** |

### Priority 4 — Small files (diminishing returns)

| # | File | Lines | Notes |
|---|------|-------|-------|
| 29 | `portal/dashboard/page.jsx` | 649 | Client portal — worth splitting if logic is complex, otherwise leave |
| 30 | `DemoContext.jsx` | 659 | Seed data + mock mutations — `buildSeed()` (~200L) could move to existing `src/context/demo/seed.js` |
| 31 | `superadmin/page.js` | 578 | Superadmin dashboard — borderline, leave unless actively worked on |
| 32 | `AdminProjectsClient.jsx` | 588 | Already improved in Phase 3; borderline |
| 33 | `ProjectsListClient.jsx` | 512 | Borderline — only extract if it causes friction |
| 34 | `waAssistant/agentTools.js` | 867 | Tool definition data — intentionally large, **skip** |

---

## File Sizes Snapshot (start of Phase 4)

| File | Lines |
|------|-------|
| `kollektivak/page.js` | 1,809 |
| `projektek/[id]/ProjectDetailClient.jsx` | 1,541 |
| `profil/page.js` | 1,356 |
| `ajanlatok/[id]/page.js` | 1,231 |
| `szakemberek/[slug]/page.js` | 1,018 |
| `felmeres/[id]/page.js` | 912 |
| `waAssistant/agentTools.js` | 867 (skip) |
| `AdminProjectDetailClient.jsx` | 834 |
| `weboldalam/page.js` | 754 |
| `feltoltes/page.js` | 756 |
| `DashboardClient.jsx` | 663 |
| `DemoContext.jsx` | 659 |
| `portal/dashboard/page.jsx` | 649 |
| `AdminProjectsClient.jsx` | 588 |
| `superadmin/page.js` | 578 |
| `superadmin/entitasok/[id]/page.js` | 532 |
| `ProjectsListClient.jsx` | 512 |
| `AppContext.jsx` | 474 ✅ |

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

src/context/
  cookieHelpers.js
  actions/authActions.js
  actions/godModeActions.js
  actions/entityUserActions.js
  actions/projectActions.js
  actions/invoiceActions.js
  actions/labourActions.js
  actions/clientActions.js
  actions/surveyActions.js
  actions/quoteActions.js
  actions/diaryActions.js

src/app/weboldalam/components/
  (22 files — see Phase 2 item 14)
```
