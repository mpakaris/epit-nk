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

---

## OFFER module (design drop 2) — violet

Routes: `[l]/ajanlatok/page.js`, `[l]/ajanlatok/uj/page.js`, `[l]/ajanlatok/[id]/page.js` (1.7k lines, + `components/SectionCard`, `SectionAddForm`, `SectionPhotoZone`, `AreaSummary`, `ClientComments`), `[l]/ajanlatok/[id]/nyomtatas/page.js`. i18n ns `quotes`, `offerPrint`. Status ids: `draft|sent|accepted|rejected` (`QUOTE_STATUSES`). Entry types: `QUOTE_ENTRY_TYPES`; units `QUANTITY_UNITS`.

### Offer list — `O1-Lista.dc.html`
`GET /api/quotes`, `components/mobile/DocumentListPage.jsx`. Status filter (Összes/Vázlat/Kiküldve/Elfogadva/Elutasítva), search by title/client, card: title, client, date, gross total, status, "visible on client portal" (sent), pending transfer (`useTransferRequests`, retract), locked (accepted/rejected), "project created". Row ⋯: open, preview/PDF (owner only), copy, transfer to collective (personal + owner + no pending + has collectives, not demo), retract transfer, delete (soft, owner/collective owner; contributor sees explanation). Basic-tier quote limit (rule 9).

### New offer — `O2-UjAjanlat.dc.html`
`[l]/ajanlatok/uj/page.js` (existing `mobileStep` 1/2), `POST /api/quotes`. Step 1 destination (contributor in collective ⇒ personal offer + later transfer, per CLAUDE.md table). Step 2: title*, optional survey (picker = `GET /api/surveys/for-offer-template`: personal + same-collective only, grouped, context text, inactive toggle, search; `?from_survey=` preset), client (`ClientSelect`, new client with GDPR), location, work type, description, planned start/end, VAT % (default `currentUser.default_tax_percent` ?? 27). Survey import: `POST /api/quotes/[id]/import-survey`, media copy: `copy-survey-media`, `duplicate-survey-media`.

### Offer detail — `O3-Reszletek.dc.html`
`PATCH/DELETE /api/quotes/[id]`. Totals net / VAT / gross; client + discount badge; client-portal link (copy / open `/clients/[id]`) once not draft; general data (offer number, valid until, payment deadline days, method, deposit %, warranty months, other terms footnote, dates, location, work type) edited in one sheet — saving on a `sent` offer asks to revert to draft (`statusRevert*` keys); sections (rooms) with entries sorted by type (`sortEntries`), own-vs-others ownership (contributors edit only own: `created_by`/`user_id`), area summary, client comments (`/api/quotes/[id]/client-comments`), history (`GET /api/quotes/[id]/history`, load more), duplicate (`duplicateTitle/What`; copies client and/or sections+entries), delete, locked banner + "Lehetőségeim" for accepted/rejected. Owner/Admin only: send, accept, reject, reset to draft, edit meta, preview/PDF.

### Items — `O4-Tetelek.dc.html`
`POST /api/quotes/[id]/entries`, `PATCH/DELETE .../entries/[entryId]`; dictation → `POST /api/quotes/[id]/parse-entry`; AI suggestions from the room → `POST /api/quotes/[id]/sections/[sectionId]/generate-entries`; queue several then add ("Hozzáadás (N db)", "+ Következő"); material/labour = qty × unit price, others flat `amount_huf`; contractor select (collective only, default self; `user_id` set server-side); notes; batch delete (`handleBatchDelete`, own entries only).

### New room / section — `O5-Helyiseg.dc.html`
`POST /api/quotes/[id]/sections`, `PATCH/DELETE .../sections/[sectionId]` (delete removes its entries — confirm shows count). Fields: name*, W/L/H, windows, doors, wall area (auto), dates, description, photos (`SectionPhotoZone`, R2 upload via `mediaGate`). Contributors may add their own section.

### Send / accept / reject — `O6-Muveletek.dc.html`
`POST /api/quotes/[id]/send` (Puppeteer PDF + SMTP, rate limit 10/h, audit log; steps: PDF → message → recipients → sending), blocked when client has no email; profile-incomplete warning (company name, city, tax no.); terms (ÁSZF) attached indicator; demo mode never sends. `POST /api/quotes/[id]/accept` creates the project (personal or collective workspace); success → view project; error → retry. Reject / reset-to-draft via `PATCH`. Status changes are Owner/Admin only.

### PDF preview — `O7-Pdf.dc.html`
`[l]/ajanlatok/[id]/nyomtatas/page.js`, `GET /api/quotes/[id]/pdf` (`lib/generateOfferPdf.js`). Accent colour picker (10 colours), missing-data checklist (company name, tax no., phone, bank account, client, offer number, valid until, terms) with "where to fix" links, download PDF (demo: unavailable). Owner only.

---

## PROJECT module (design drop 3) — slate-navy

Routes: `[l]/projektek/page.js` + `ProjectsListClient.jsx`, `[l]/projektek/uj/page.js`, `[l]/projektek/[id]/page.js` + `ProjectDetailClient.jsx` (1.7k lines) + `components/` (`BurndownCard`, `CostBreakdownCard`, `CombinedStatsCard`, `InvoiceDetailDrawer`, `LabourEditModal`, `RoomModal`, `ProjectEditModal`, `PaymentPlanModal`, `PortalShareSection`, `DiaryDetailSheet`, `EditDiaryEntryModal`, `WorkTypeSelector`, `EntryMediaGrid`), `[id]/feltoltes/page.js` (invoice upload), `[id]/naplo/uj/page.js` + `[id]/naplo/[entryId]/page.js` (diary). i18n ns `projects`, `projectDetail`, `diary`. Rule 4: projects, invoices, diary entries are soft-deleted; labour entries and payment items follow the existing routes.

### List — `P1-Lista.dc.html`
`GET /api/projects` (via AppContext). Filter Összes/Nyitott/Lezárt (detail status Aktív/Szünetel/Lejárt shown as badge), search name/client, card: name, client · place, spent, progress vs linked quote, status, pending transfer (`useTransferRequests`, retract), read-only lock. ⋯: open, transfer to collective, retract, delete (soft; contributors cannot delete team projects). Basic tier: 1 project.

### New — `P2-UjProjekt.dc.html`
`POST /api/projects`. Destination step (same rules as offers; contributor ⇒ personal + transfer). Fields: name*, client* (required, `ClientSelect` + new client with GDPR), optional linked quote (search; excludes rejected unless toggled), location, work type, start/end, description, members (collective: chips, "én" fixed). `POST /api/projects/[id]/members`.

### Detail — `P3-Reszletek.dc.html`
`PATCH/DELETE /api/projects/[id]`; status flow Aktív ⇄ Szünetel → Lezárt → újranyitás, every change requires a written reason and notifies the collective (`status*Prompt` keys; reason is stored in history: `GET /api/projects/[id]/history?limit=15&offset=`). Cards: financial summary (`CombinedStatsCard`/`calculateProjectFinancials`: total expenses, labour, paid by you, balance credit/debt/settled), burndown vs linked quote, cost breakdown by category, client + client-link copy, member contributions (owner/you/left badges), data (dates, description, linked survey), sections (rooms): `POST/PATCH/DELETE /api/projects/[id]/rooms[/roomId]`, import from accepted quote `POST /api/projects/[id]/rooms/sync-from-quote` (button shows count of new rooms), sub-pages Kiadások/Napló/Fizetési terv/Portál. Read-only banner + "Lehetőségeim" when closed. Contributors: add own invoices/labour/diary only; owner/admin edit project, status, rooms, payment plan, delete.

### Expenses + labour — `P4-Kiadasok.dc.html`
`/api/invoices` (+`[id]`, `[id]/media`, `[id]/media/[mediaId]`), `/api/invoice-splits` (section split with remaining/over indicator), `/api/labour-entries` (+`[id]`). Filters: search, category (`INVOICE_CATEGORIES`), section, uploader. Invoice drawer: amount, description, date, paid-by, category, split, AI line items table, receipts (add/download/delete), PDF download, delete. Labour: type (`WorkTypeSelector`), date, unit (`LABOUR_UNITS`), quantity, unit price, live total, section, delete. Contributors edit only their own rows (others dimmed).

### Add invoice — `P5-SzamlaUj.dc.html`
`[id]/feltoltes/page.js`: camera/file/multi upload → `POST /api/ocr` + `POST /api/invoice-ai` (rate limited, no DB side effects) → review per invoice (amount, foreign-currency notice: amount must be entered in HUF, description, category, payer in collectives, section split, items) → save all. Failure → manual entry. Media goes through `processMediaFiles`.

### Diary — `P6-Naplo.dc.html`
`/api/diary` (+`[id]`, `upload`, `photos/[id]`), share links `/api/diary/share` (+`[id]`, `resolve`) → public `/p/[token]`. List with photo strip, public/private badge, filters; detail sheet; form: date, work type, title, text (dictation → `/api/transcribe`), section, camera/image/video, public toggle (+ client message when public), internal note. Edit/delete own entries only (contributors).

### Payment plan — `P7-Fizetes.dc.html`
`/api/payment-plan` (+`[id]`, `[id]/files`, `[id]/files/[fileId]`). Items: name, amount, trigger (project start / milestone / date / project end), note, attachments, status Függőben/Fizetve/Törölve, "mark paid", edit, delete; 3-step add flow (Összeg → Mikor? → Részletek). Owner/admin only.

### Portal sharing — `P8-Portal.dc.html`
`PortalShareSection.jsx`, `/api/media-items?document_type=project&document_id=`; per-item share toggles for Számlák, Munkadíj, Média, Napló, "share all", client link `/clients/[id]`; hint when no client is assigned. Owner/admin only.


# Clients (C1–C5)
Routes: `[l]/ugyfelek/page.js`, `ugyfelek/uj/page.js`, `ugyfelek/[id]/page.js`, `components/ClientDetailModal.jsx`, `ClientSelect`. APIs: `/api/clients` (+`[id]`). i18n namespace `clients`. Rules: clients are ALWAYS personal (`owner_id`, GDPR); soft delete; contributors never own/manage clients.

### C1 List — `C1-Lista.dc.html`
Tabs `myClients` / `sharedClients`, search (`searchPlaceholder`), card: name, company, phone, badges quotesCount/projectsCount/collectivesCount, loyalty discount. Empty states `emptyMine`/`noResults`. Actions sheet: open, edit, copy portal link, delete (`deleteConfirmTitle/Message`, soft delete, `successDeleted`). Shared clients: no edit/delete.

### C2 Form — `C2-Urlap.dc.html`
`POST/PATCH /api/clients`. Fields: contactName*, companyName, taxNumber, address, phone, email*, discount %, notes. Required `gdprConfirmText` (`gdprRequired`). Optional share with collectives (`shareWithCollectives`, per-collective checkboxes, required `shareGdprConfirmText` → `shareConsentRequired`). Notice `gdprNotice`. CTA createClient/modify; creating/modifying states; `createError` via AlertModal.

### C3 Detail — `C3-Reszletek.dc.html`
Stats totalQuoteValue / detailInvoiced / totalExpenses, contact (`detailNoContact`), loyalty badge, tabs detailTabQuotes/Projects/Surveys/Messages with empty strings (`noQuotesForClient`, `noProjectsForClient`, `noSurveysForClient`), quote `detailsBtn`, portal block.

### C4 Messages — `C4-Uzenetek.dc.html`
Threads `quoteThread` + `generalThread`, bubbles youLabel/clientLabel, reply (`replyPlaceholder`, `sendReply`, `sending`), `newMessage` sheet (`newMessageTitle`, `newMessagePlaceholder`), `msgSentOk`, `newMsgErr`, `noConversations`.

### C5 Portal — `C5-Portal.dc.html`
`clientPortalLabel`, `clientPortalLoginInfo`, `clientPortalUrlDesc`, `copyPortalLink`/`copiedBtn`, `openPortalBtn`, `previewBtn`, `ownViewLabel`, `noEmailForPortal`.

# Profile (U1–U6)
Route `[l]/profil/page.js` (1.5k lines, anchors `#elofizetes`, `#szamla`, `#aszf`, `#preferences`). APIs: `/api/auth/profile` (+`terms-pdf`), `/api/auth/account`, `/api/auth/request-password-reset`, `/api/subscriptions/{cancel,resume}`, `/api/checkout` (+`activate`), `/api/billing/portal`. i18n namespace `profile`. SA language toggle is cookie-only (GM-7); currency is write-once.

- **U1** hub: header badge `subscriptionBadge*`, `trialBannerText`, rows to every section, `logout`, `deleteAccount`, `contactQuestion`.
- **U2** `displayName`(+hint), `email`, invoice header: firstName, lastName, companyName(optional), street, streetNumber, zip, city, taxNumber, phone(in repo under invoice form), bankAccount, bankName, website. One save → `saved`/`invoiceSaved`. **Field-to-section mapping in repo differs slightly (phone, VAT sit in the invoice form); keep ONE form/PATCH.**
- **U3** defaultVat, offerValidity, paymentMethod, paymentDeadline, deposit, warranty, otherTerms; ÁSZF: uploadPdf/replacePdf/uploading/uploadedAt, delete, PDF error alert.
- **U4/U4b** plan cards (planBasicName/planPremiumName/planFree), `upgradeToPremium(Now)`, `planRedirecting`, `securePayment`, active subs (`subActive`, `subCancels`, `subNextRenewal`, `scheduledCancelNote`), `managePayment`, `premiumCancel*` (owned collectives warning), `cancelCollective*`, `premiumRestore`/`subResumeBtn`, result modals (`cancelSuccessModalTitle`, `premiumCanceledTitle`, `resumeSuccess*`, `upgradeSuccess*`/`upgradeError*`), collective sizes small/medium/large.
- **U5** languageLabel + `languageNote`, currencyLabel + `currencyNote` (write-once: disabled after set), collectiveWorkspaces* + `collectiveManageBtn`.
- **U6** passwordChange (current/new/confirm, min 8, 1 uppercase, 1 digit), `logout`, `dangerZone`, `deleteConfirmPrompt`/`deleteConfirmWord` (TÖRLÉS), `dangerWarningPremium`/`dangerWarningBasic`, `deleting`.


# Dashboard additions (H1–H2)
Files: `[l]/dashboard/DashboardClient.jsx`, `dashboard/page.js`. APIs: `GET /api/collectives/my-invitations`, `GET /api/transfer-requests`, `GET /api/workspace/combined`. i18n namespace `dashboard`. Demo mode skips invitation/transfer fetches.
- **Banners:** `invitedSingle` / `invitedMultiple`, `invitedBy`, `transferSingle` / `transferMultiple`, `requestedBy`, `view` → `/kollektivak`.
- **Folytasd** (`continueSection`): last survey, quote, project as cards (`CompactRow`).
- **Stats:** `statTotalCost`, `statActiveProjects`, `statInvoices` (+ `*Sub`).
- **Activity:** `latestActivity`, `noActivity`, `invoiceFallback`, `diaryFallback`.
- **Lists:** `projectsSection`, `latestSurveys`, `latestQuotes`, `viewAll`, quote status badges `quoteStatus.*`.
- **Empty:** `emptyTitle`, `emptySubtitle`, `quickCards.*`, `createFirst*`/`create`.
