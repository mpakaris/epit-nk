# Function map — design screen → existing code

Paths relative to repo root. `[l]` = `src/app/[locale]`. i18n namespaces are in `messages/*.json`. Verify each row against the code before changing it.

## Dashboard — `A-Pods.dc.html`
| Function | Existing code |
|---|---|
| Whole page | `[l]/dashboard/page.js`, `[l]/dashboard/DashboardClient.jsx` (ns `dashboard`) |
| Workspace switch (pods) | `useApp().setActiveContext`, `collectives`, `activeCollectiveId`; `PATCH /api/auth/context`; `components/mobile/WorkspacePicker.jsx` |
| Pending invitations | `GET /api/collectives/my-invitations` (banner at DashboardClient ~L230) |
| Pending transfer requests | `GET /api/transfer-requests` (~L272), `components/TransferToCollectiveModal.jsx` |
| Stats (cost / active projects / invoices) | `components/StatCard.jsx`, `calculateProjectFinancials`, `formatMoney` |
| Latest activity | `activityItems` in DashboardClient (~L477) |
| Latest projects / surveys / quotes | `recentProjects/recentSurveys/recentQuotes` |
| Calendar / upcoming | `components/CalendarWidget.jsx`, `UpcomingEvents.jsx`, `/naptar` |
| Dock "+" quick actions | `components/MobileFAB.jsx`, `QuickCostSheet`, `QuickDiarySheet`, `QuickSnapModal` |

## Survey list — `S1-Lista.dc.html`
`[l]/felmeres/page.js`, `GET/POST /api/surveys`, `components/mobile/DocumentListPage.jsx`, `ItemCard`, `StatusBadge`, `TeamBadge`. Row ⋯ sheet: open, transfer (`TransferToCollectiveModal`), delete (soft: `DELETE /api/surveys/[id]` sets `deleted_at`). Filters/grouping by workspace (rule 5 scoping). Basic tier limit 5 surveys (rule 9, `isEffectivePremium`).

## New survey — `F1-UjFelmeres.dc.html`
`[l]/felmeres/uj/page.js`, `POST /api/surveys`; workspace choice (contributors cannot create collective documents); client select + new client with GDPR consent: `components/ClientSelect.jsx`, `clients` always personal.

## Survey detail — `S3-Reszletek.dc.html`
`[l]/felmeres/[id]/page.js` + `components/`: `PropertyInfoSection` (`/api/surveys/[id]/fill-property`), `SurveyEntryCard`, `AreaSummary`, `MediaGrid`, `InlineUpload` (`/api/surveys/upload`, `/api/surveys/[id]/media/[mediaId]`), `DrawingsSection`/`DrawingPad` (`/api/surveys/[id]/drawings`), linked quotes/projects, status/lock (`LockedDocumentModal`). ns `surveys`, `surveyDetail`, `drawings`.

## Room editor — `S4-Helyiseg.dc.html`
`/api/surveys/[id]/entries` (+ `[entryId]`, `fill-entry`); dimensions w×l×h, doors/windows, photos. Entry ownership via `created_by/user_id` set server-side (rule 3).

## Items — `S5-Tetelek.dc.html`
`components/TételekSection.jsx`; `/api/surveys/[id]/items` (+ `[itemId]`; table from migration 130 must be applied), `/api/surveys/[id]/entries/[entryId]/generate-items` (AI), `AudioRecorder.jsx` + transcribe. Item types: Anyag, Munkadíj, Eszközbérlés, … (`QUOTE_ENTRY_TYPES` in `lib/constants.js`).

## Floor-plan AI — `S6-Alaprajz.dc.html`
`LayoutAnalysisModal.jsx`, `POST /api/surveys/[id]/analyze-layout`; creates rooms from detected areas.

## Not in this drop
Offers, Projects (+ diary, invoices), Clients, Calendar, Messages, Ideas, Catalogue, Profile, Collectives, Subscription, Website builder, Client portal.
