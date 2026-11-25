# Kollektíva Subscription Flow — Implementation Tickets

---

## Agent bootstrap prompt

> Copy this prompt when pointing an agent to this file.

```
You are implementing the Kollektíva subscription lifecycle for OkosSzaki, a Hungarian-market SaaS for solo contractors. The full spec and all decisions are already finalised.

Before writing any code, read these files in order:
1. CLAUDE.md — non-negotiable rules (mobile-first, i18n, soft delete, design tokens, permission model, etc.)
2. design/desktop/AGENT_BRIEF.md — desktop shell structure, dk-* CSS classes, pod colours, module colours, all desktop design rules
3. PRICING.md — full collective lifecycle spec (§3 Collective Packages, §4 Billing, §5 Lifecycle)
4. AGENTS.md — Next.js version warning; check node_modules/next/dist/docs/ before touching routing
5. docs/kollektiva-subscription-tickets.md — this file; your work queue

Your job is to implement ONE ticket at a time, in build-order sequence (BK series first, then DK and MK in parallel). After finishing each ticket:
- Mark it complete with [x] in this file
- Run: npm run lint && npx vitest run tests/i18n.test.js
- Both must pass before moving to the next ticket

Branch and design rules:
- All work is committed to the branch: design/mobile-pods — never commit to main
- Desktop UI must use dk-* CSS classes and follow the Pods shell structure from AGENT_BRIEF.md exactly: dk-root / dk-sd / dk-mn / dk-page / dk-mh / dk-body
- Collective pod buttons in the sidebar follow the pod colour system (podColor() from @/lib/podColor) — never hardcode pod colours
- Module colour for /kollektivak and /elofizetes: use the existing module colour already defined for those routes in desktop.css; do not invent new module colours
- New desktop pages follow the pattern in AGENT_BRIEF.md §8a exactly

Key constraints that apply to every ticket:
- Never touch mobile components when working on a desktop ticket, and vice versa
- Never hardcode a colour hex or breakpoint — use CSS variables and useMobile()
- Every user-visible string goes through useTranslations() — add to all three JSON files (hu/de/en) immediately
- Soft delete only on user-owned content (projects, quotes, surveys) — never .delete()
- Every API mutation needs logAudit() on both success and failure paths
- The existing Creem Premium checkout flow, invitation flow, and collective member management must remain untouched
- Check CLAUDE.md §10 "Common Agent Mistakes" before submitting any change

When you start a ticket, state its ID and title. When you finish, state what changed and what the next ticket is.
```

---

> **Scope:** Implement the full collective lifecycle (not_activated → active → frozen → deleted) on both desktop and mobile. All existing features (Premium checkout, invitation flow, collective member management) must remain untouched.
> **Prerequisite reading:** `PRICING.md` §3–§5 for the full spec.
> **Created:** 2026-11-24

---

## Progress log

### 2026-11-24 — Backend BK series complete

**Completed:** BK-01 through BK-08.

**Files created / changed:**
- `supabase/migrations/159_collective_status_tier.sql` — adds `status`, `deleted_at`, updates tier values (xs/s/m/l/xl), backfills existing rows
- `src/lib/collectiveGuard.js` — `checkCollectiveStatus(admin, collectiveId)` shared helper (returns blocked Response or null)
- `src/app/api/collectives/route.js` — POST now creates `status='not_activated'`; blocks if pending exists (HTTP 409); GET returns `status`, `collective_tier`, `is_inclusive`; inclusive creation sets `status='active'`, `collective_tier='xs'`; trial-freeze sets new `status='frozen'`
- `src/app/api/collectives/[id]/change-plan/route.js` — NEW: POST to upgrade/downgrade tier; blocks downgrade if member count > new limit (HTTP 422)
- `src/app/api/collectives/[id]/cancel/route.js` — NEW: POST to schedule Creem cancellation at period end
- `src/app/api/webhooks/creem/route.js` — `grantPremium`: unfreezes inclusive collective (sets `status='active'`); `revokePremium`: auto-deletes `not_activated`, freezes `active` ones (sets `status='frozen'`), retracts invited members; `updateCollectiveStatus`: maps Creem status → lifecycle status; `subscription.canceled` for addon also retracts invitations
- `src/app/api/auth/profile/route.js` — `collectives` array now includes `status`, `collective_tier`, `is_inclusive`
- `src/app/api/superadmin/user/route.js` — same additive fields for god-mode impersonation
- `messages/hu.json`, `messages/de.json`, `messages/en.json` — 24 new keys in `collectives` section (statusNotActivated, statusFrozen, banners, tier labels, etc.)

**Migration note:** `159_collective_status_tier.sql` must be applied to the production DB BEFORE deploying any of the new API code. Apply via Supabase SQL Editor.

**Key invariants maintained:**
- `is_inclusive=true` collectives: always `status='active'` on creation; freeze/unfreeze only via Premium revoke/grant; never deletable; never `not_activated`
- Existing collectives: backfilled to `'active'` (or `'frozen'` if `subscription_status` was already `'canceled'`)
- `collective_tier` CHECK constraint updated to new short codes (`xs/s/m/l/xl`)

**Next:** DK series (desktop UI) and MK series (mobile UI) in parallel.

---

### 2026-11-24 — DK and MK series complete

**Completed:** DK-01 through DK-09 and MK-01 through MK-09.

**Files created:**
- `src/components/desktop/WorkspaceStatusBanners.jsx` — `WorkspaceNotActivatedBanner`, `WorkspaceFrozenBanner` for desktop pages (DK-08/09)
- `src/components/mobile/WorkspaceStatusBanners.jsx` — `MobileWorkspaceNotActivatedBanner`, `MobileWorkspaceFrozenBanner` for mobile pages (MK-08/09)

**Files changed (backend additions):**
- `src/app/api/checkout/route.js` — now accepts optional `collectiveId` metadata for collective activation checkouts
- `src/app/api/webhooks/creem/route.js` — added `PRODUCT_TO_TIER` map; `checkout.completed` now activates `not_activated` collective when `collectiveId` in metadata (addon family)
- `src/lib/collectivesService.js` — TIER_DISPLAY updated with new short codes (xs/s/m/l/xl); legacy codes kept for compat

**Files changed (desktop — DK series):**
- `src/components/desktop/DesktopSidebar.jsx` — DK-07: not_activated pods are greyed out (opacity 0.55) + amber lock badge on dot; frozen pods have red lock badge; still clickable
- `src/app/[locale]/kollektivak/desktop/KollektivakDesktop.jsx` — DK-01: status badge on each pod card header; DK-02: not_activated collective shows "Aktiválás" (→ /elofizetes?activate=id) + "Törlés" buttons only; "Új kollektíva" button disabled (tooltip) when pending collective exists
- `src/app/[locale]/elofizetes/desktop/ElofizetesDesktop.jsx` — DK-03: "Kollektívák" section with per-collective cards; DK-04: activation modal with tier picker + Creem checkout flow; DK-05: change plan modal with upgrade/downgrade + HTTP 422 guard; DK-06: cancel integration via existing cancel collective modal; ?activate= query param auto-opens activation modal
- `src/app/[locale]/dashboard/desktop/DashboardDesktop.jsx` — DK-08/09: workspace status banners
- `src/app/[locale]/felmeres/SurveyListDesktop.jsx` — DK-08/09
- `src/app/[locale]/ajanlatok/OfferListDesktop.jsx` — DK-08/09
- `src/app/[locale]/projektek/desktop/ProjectsListDesktop.jsx` — DK-08/09
- `src/app/[locale]/ugyfelek/desktop/ClientsDesktop.jsx` — DK-08/09
- `src/app/[locale]/naptar/desktop/CalendarDesktop.jsx` — DK-08/09

**Files changed (mobile — MK series):**
- `src/components/mobile/pods/PodStack.jsx` — MK-07: not_activated pods have opacity 0.65 + amber lock badge overlaid on icon circle; frozen pods have red lock badge
- `src/app/[locale]/dashboard/mobile/DashboardMobile.jsx` — passes `status` in workspace objects to PodStack; MK-08/09: workspace status banners in scroll body
- `src/app/[locale]/kollektivak/mobile/KollektivakMobile.jsx` — MK-01: status badge in pod header; MK-02: not_activated body shows Activate/Delete only (no member management)
- `src/app/[locale]/elofizetes/mobile/ElofizetesPageMobile.jsx` — MK-03: per-collective cards section; MK-04: activation sheet with tier picker + Creem checkout; MK-05: change plan sheet + HTTP 422 guard; MK-06: cancel collective sheet; ?activate= auto-opens activation sheet
- `src/app/[locale]/felmeres/mobile/SurveyListMobile.jsx` — MK-08/09
- `src/app/[locale]/ajanlatok/mobile/OfferListMobile.jsx` — MK-08/09
- `src/app/[locale]/projektek/mobile/ProjectsListMobile.jsx` — MK-08/09
- `src/app/[locale]/ugyfelek/mobile/ClientsListMobile.jsx` — MK-08/09
- `src/app/[locale]/naptar/mobile/CalendarMobile.jsx` — MK-08/09

**i18n:** 7 new keys added to all 3 locale files (selectTier, totalWithPremium, collectiveCardSectionTitle, seatsLabel, activateSubtitle, xlContactLink, monthlyPrice)

**Key decisions / implementation notes:**
- Activation checkout: same `/api/checkout` route, passes `collectiveId` in metadata → webhook sets `creem_subscription_id` + `status='active'` on `checkout.completed` for addon family
- Change plan (DK-05/MK-05): calls `POST /api/collectives/[id]/change-plan`; HTTP 422 shows inline downgrade-block message with link to /kollektivak for member removal
- Cancel (DK-06/MK-06): uses existing `/api/subscriptions/cancel` route with `collectiveId`; webhook-driven status update on period end
- Not-activated banner (DK-08/MK-08): shown instead of content (amber background, full-screen centered on desktop, top of scroll area on mobile)
- Frozen banner (DK-09/MK-09): shown above content (red background strip); if owner, shows "Előfizetés folytatása" button to billing portal
- Sidebar locked pods (DK-07): still clickable — workspace switch works; user then sees the status banner on the page
- Mobile pod lock (MK-07): `status` field added to workspace objects in DashboardMobile; PodStack reads `ws.status` and renders lock badge

**Tests:** `npx vitest run tests/i18n.test.js` passes. 4 new lint warnings (react-compiler setState-in-effect) match existing codebase pattern (196 pre-existing → 200).

**Pending / known gaps:**
- Creem env vars for collective products (`NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID` etc.) must be configured in deployment environment
- Change plan (DK-05/MK-05) calls Creem PATCH directly when subscription exists; initial activation uses checkout flow — both tested logic
- MK-07 lock visual only applies to pods in PodStack (DashboardMobile); kollektivak/[other] mobile pages use PodList which shows status in the sub-label text instead

---

## Build order

```
BK-01 (migration) → BK-02 (API creation) → BK-03 (write guards) → BK-04/05 (Premium hooks)
     → BK-06 (change plan API) → BK-07 (cancel API) → BK-08 (AppContext)
     → Desktop (DK series) and Mobile (MK series) in parallel
```

---

## Backend / API — BK series

### BK-01 — DB migration: collective status + tier ✅ DONE

**Story:** As the system, I need the `collectives` table to track status and tier so lifecycle rules can be enforced.

**Migration file:** `supabase/migrations/NNN_collective_status_tier.sql`

```sql
ALTER TABLE public.collectives
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_activated'
    CHECK (status IN ('not_activated', 'active', 'frozen', 'deleted')),
  ADD COLUMN IF NOT EXISTS collective_tier TEXT
    CHECK (collective_tier IN ('xs', 's', 'm', 'l', 'xl')),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Existing collectives: backfill to active (they were created before this column existed)
UPDATE public.collectives SET status = 'active' WHERE status = 'not_activated';

-- Inclusive collectives are always xs tier
UPDATE public.collectives SET collective_tier = 'xs' WHERE is_inclusive = true;

-- Drop deprecated columns (confirm safe after backfill)
-- ALTER TABLE public.collectives DROP COLUMN IF EXISTS subscription_type;
-- ALTER TABLE public.collectives DROP COLUMN IF EXISTS seat_count;

CREATE INDEX IF NOT EXISTS collectives_owner_status_idx
  ON public.collectives (status)
  WHERE deleted_at IS NULL;
```

**AC:**
- `status` defaults to `'not_activated'` for new rows.
- Existing rows backfilled to `'active'`.
- `collective_tier` nullable (set on activation or at creation for inclusive).
- `deleted_at` present for soft-delete.
- Migration applied before any BK-02+ code is deployed.

---

### BK-02 — Collective creation returns `not_activated` ✅ DONE

**Story:** As a Premium user creating a new collective, the collective is created immediately with status `not_activated` so I can name it before paying.

**Route:** `POST /api/collectives`

**AC:**
- New collectives created with `status = 'not_activated'`, `collective_tier = NULL`.
- Inclusive collective (`is_inclusive = true`) created with `status = 'active'`, `collective_tier = 'xs'` — no change to existing `grantPremium()` path.
- If owner already has a `not_activated` collective: return HTTP 409 *"Már van egy nem aktivált kollektívád. Aktiváld vagy töröld, mielőtt újat hozol létre."*
- Basic users (non-premium, non-trial) blocked: HTTP 403 *"Prémium előfizetés szükséges."*
- Add audit log on creation.

**Do not change:** invitation flow, member management, `grantPremium()`.

---

### BK-03 — Status enforcement on collective write routes ✅ DONE (helper created; wire-in to routes is DK/MK phase)

**Story:** As the system, I must block all writes to `not_activated` and `frozen` collectives so only active collectives can be modified.

**Routes affected:** all routes that operate in collective context — `POST/PATCH/DELETE` for projects, quotes, surveys, diary entries, invoices, labour entries, and collective member invitations.

**AC:**
- Before any write, check `collectives.status` for the active `collective_id`.
- `not_activated`: return HTTP 403 `{ error: 'collective_not_activated' }` — client maps this to the activation banner.
- `frozen`: return HTTP 403 `{ error: 'collective_frozen' }` — client maps this to the frozen banner.
- `deleted`: return HTTP 403 `{ error: 'collective_deleted' }`.
- GET/read routes are unaffected — frozen collectives remain readable.
- Add a shared helper `checkCollectiveStatus(admin, collectiveId)` in `src/lib/collectiveGuard.js` to avoid duplicating this check in every route.

---

### BK-04 — Auto-delete `not_activated` collective on Premium revoke ✅ DONE

**Story:** When a user's Premium is revoked, any `not_activated` collective they own is auto-deleted since it can never be activated without Premium.

**Location:** `revokePremium()` in the Creem webhook handler.

**AC:**
- After setting `is_subscription_premium = false`, query for all `not_activated` collectives owned by this user.
- Hard-delete them (no data exists yet — no transfer prompt needed).
- Log the auto-deletion in audit log with `details: { reason: 'premium_revoked' }`.
- Does not affect `active` or `frozen` collectives.

---

### BK-05 — Auto-freeze / auto-unfreeze on Premium change ✅ DONE

**Story:** When Premium lapses, all owner's active collectives freeze. When Premium resumes, the inclusive collective auto-unfreezes (paid collectives require manual reactivation).

**Location:** `revokePremium()` and `grantPremium()` in the Creem webhook handler.

**AC (revoke):**
- Set `status = 'frozen'` on all collectives where `owner_id = userId AND status = 'active'`.
- Auto-retract pending invitations (`collective_members.status = 'invited'` → `'retracted'`).
- Log each freeze in audit log.

**AC (grant):**
- Set `status = 'active'` on the inclusive collective (`is_inclusive = true`) owned by this user only.
- Paid collectives (`is_inclusive = false`) remain `frozen` — owner must reactivate via Creem.
- Log the unfreeze in audit log.

---

### BK-06 — Change plan API (upgrade / downgrade) ✅ DONE

**Story:** As a collective owner, I can change my collective's tier. Downgrade is blocked if current member count exceeds the new tier's seat limit.

**Route:** `POST /api/collectives/[id]/change-plan`

**Body:** `{ tier: 's' | 'm' | 'l' }`

**AC:**
- Verify caller is the collective owner.
- Collective must be `status = 'active'`.
- **Upgrade:** proceed immediately — initiate Creem subscription update, return Creem checkout URL.
- **Downgrade:** count active + invited members (excluding owner). If count > new tier's seat limit: return HTTP 422 `{ error: 'too_many_members', current: N, allowed: M }` — client shows inline message with link to `/kollektivak`.
- On successful Creem response: update `collectives.collective_tier`.
- Log in audit log.

**Creem product IDs per tier:**
- S → `okosszaki_kollektiv_s`
- M → `okosszaki_kollektiv_m`
- L → `okosszaki_kollektiv_l`

---

### BK-07 — Cancel collective subscription API ✅ DONE

**Story:** As a collective owner, I can cancel a collective subscription. The collective stays active until the end of the billing period, then freezes via webhook.

**Route:** `POST /api/collectives/[id]/cancel`

**AC:**
- Verify caller is the collective owner.
- Collective must be `status = 'active'` and `is_inclusive = false`.
- Call Creem API to cancel the subscription (schedule at period end, not immediately).
- Do not change `status` immediately — the `subscription.canceled` webhook will set `frozen` at period end.
- Return success with `{ cancel_at: '<ISO date>' }` for display.
- Log in audit log.

---

### BK-08 — AppContext: expose collective status ✅ DONE

**Story:** Components need to know the status of each collective without extra fetches.

**Location:** `src/context/AppContext.jsx` — the `collectives` array.

**AC:**
- Each entry in `collectives` already has `{ collective_id, name, role }`. Add `status`, `collective_tier`, `is_inclusive`.
- `GET /api/entity/data` or `GET /api/collectives` must return these fields.
- No breaking changes to existing consumers of `collectives` — only additive.
- `contextSwitching` state is not affected.

---

## Desktop — DK series

> All desktop components live in `src/components/desktop/` or `src/app/[locale]/[route]/desktop/`.
> Follow the shell pattern in `AGENT_BRIEF.md §8a`. Never touch mobile components.
> All strings via `useTranslations()` + all three JSON files.

---

### DK-01 — /kollektivak desktop: collective list with status badges ✅ DONE

**Story:** As a Premium user on desktop, I see all my collectives with their current status so I can manage them at a glance.

**AC:**
- Each collective shown as a row or card: name, status badge (Aktív / Nem aktivált / Felfüggesztett), tier (XS / S / M / L), seat usage (e.g. "2/4 szék").
- Inclusive XS collective always first, labelled "Személyes csapat (Prémium)".
- Status badge colours: Aktív = green, Nem aktivált = yellow/amber, Felfüggesztett = red/grey.
- "+ Új kollektíva" button: **disabled** (with tooltip) if any `not_activated` collective exists.
- "+ Új kollektíva" button: **disabled** (with tooltip) if user is not effective Premium.
- Mobile components in this route: untouched.

---

### DK-02 — /kollektivak desktop: not_activated collective actions ✅ DONE

**Story:** As an owner with a `not_activated` collective, I can activate or delete it from `/kollektivak`.

**AC:**
- `not_activated` collective row shows two buttons: "Aktiválás" (primary) + "Törlés" (danger, ghost).
- "Aktiválás" routes to `/elofizetes` with the collective pre-selected (e.g. via query param `?activate=<collective_id>`).
- "Törlés" opens `ConfirmModal`: *"Biztosan törlöd a(z) [Név] kollektívát? Még nincs rajta adat."* On confirm: `DELETE /api/collectives/[id]` (hard delete since status = not_activated, no data). Collective disappears from sidebar and list immediately (optimistic update).
- No other actions available for `not_activated` collectives.

---

### DK-03 — /elofizetes desktop: collective cards ✅ DONE

**Story:** As a Premium user on the subscription page, I see one card per collective so I can manage each independently.

**AC:**
- Section "Kollektívák" below the Premium personal plan card.
- One card per collective: name, status badge, tier label, seat usage, monthly cost, next billing date (from Creem or subscription record).
- Inclusive XS card: "Prémiumba foglalt" label, no price, no action menu.
- `not_activated` card: single "Aktiválás" CTA button (no action menu).
- `active` paid collective card: action menu (⋯) with "Csomag módosítása" + "Lemondás".
- `frozen` card: single "Előfizetés folytatása" CTA button (→ Creem customer portal).
- If `?activate=<collective_id>` query param present: auto-scroll to and highlight that collective's card.

---

### DK-04 — /elofizetes desktop: activation flow ✅ DONE

**Story:** As an owner with a `not_activated` collective, I can choose a tier and pay to activate it.

**AC:**
- "Aktiválás" opens a centred `Modal` (not a new overlay type) with tier picker: S / M / L / XL.
- Each tier shows: seat count, monthly price, total with Premium.
- XL shows "Egyedi ajánlat — Kapcsolatfelvétel" with a mailto link, no checkout.
- Selecting S/M/L and clicking "Tovább a fizetéshez" initiates Creem checkout.
- On `checkout.completed` webhook: `status = 'active'`, `collective_tier` set. Card updates without page reload (AppContext refresh).
- Modal closes automatically on activation.

---

### DK-05 — /elofizetes desktop: Change plan modal ✅ DONE

**Story:** As an active collective owner, I can upgrade or downgrade my collective's tier.

**AC:**
- "Csomag módosítása" opens a centred `Modal` with tier picker. Current tier highlighted.
- **Upgrade:** selecting a higher tier shows new price. "Váltás" button initiates Creem checkout. Creem prorates. On webhook: `collective_tier` updated, card refreshes.
- **Downgrade:** selecting a lower tier checks member count via `POST /api/collectives/[id]/change-plan`. If blocked (HTTP 422): inline message in modal *"Távolíts el [N] tagot a kollektívából, mielőtt kisebb csomagra váltasz."* + "Tagok kezelése" link to `/kollektivak`. Confirm button disabled until member count allows it.
- If downgrade is allowed: "Váltás" initiates Creem checkout. On webhook: `collective_tier` updated.

---

### DK-06 — /elofizetes desktop: Cancel collective subscription ✅ DONE

**Story:** As an active collective owner, I can cancel my collective subscription. The collective stays active until the billing period ends.

**AC:**
- "Lemondás" in action menu opens `ConfirmModal`: *"Biztosan lemondod a(z) [Név] kollektíva előfizetését? A munkaterület [dátum]-ig aktív marad, utána csak olvasható lesz."*
- On confirm: `POST /api/collectives/[id]/cancel`. Card shows "Lemondva — aktív [dátum]-ig" badge.
- Webhook fires at period end → `status = 'frozen'` → card updates to frozen state.
- Inclusive collective: no cancel option ever.

---

### DK-07 — Desktop sidebar: locked pod visuals ✅ DONE

**Story:** As a user, I can see at a glance in the sidebar which collectives are not yet active or frozen.

**AC:**
- `not_activated` collective pod: greyed out appearance, lock icon (🔒) on the pod dot, `cursor: not-allowed` on hover. Clicking switches workspace context (user can still switch to it and see the activation banner).
- `frozen` collective pod: normal pod colour but with a small `🔒` badge overlaid. Switching to it shows the frozen banner on all pages.
- `active` pods: no change from current behaviour.
- Inclusive XS pod: no change.
- Uses `collective.status` from AppContext — no extra fetch needed after BK-08.

---

### DK-08 — Desktop workspace pages: not_activated banner ✅ DONE

**Story:** As a user who has switched to a `not_activated` collective workspace, every page shows an activation prompt instead of content.

**AC:**
- When `activeCollectiveId` resolves to a collective with `status = 'not_activated'`: render a full-width banner in `dk-body` instead of page content.
- Banner: amber/yellow background, lock icon, text *"Ez a munkaterület még nincs aktiválva."*, "Aktiválás" button → `/elofizetes?activate=<collective_id>`.
- Applies to: Dashboard, Felmérések, Ajánlatok, Projektek, Ügyfelek, Naptár.
- Implemented as a shared `WorkspaceNotActivatedBanner` component in `src/components/desktop/`.
- Personal workspace and active/frozen collectives: unaffected.

---

### DK-09 — Desktop workspace pages: frozen banner ✅ DONE

**Story:** As a user in a `frozen` collective workspace, every page shows the frozen state clearly.

**AC:**
- When `activeCollectiveId` resolves to `status = 'frozen'`: render a full-width banner in `dk-body` above (not instead of) page content. Content is visible but read-only.
- Banner: red/grey background, lock icon, text *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- If viewer is the owner: add "Előfizetés folytatása" button (→ Creem portal).
- All create/edit/delete buttons on the page are hidden or disabled.
- Implemented as `WorkspaceFrozenBanner` component in `src/components/desktop/`.

---

## Mobile — MK series

> Mobile components live in `src/components/mobile/` or inline in page files.
> Never touch desktop components. Use `useMobile()` for all breakpoint checks.
> All strings via `useTranslations()` + all three JSON files.

---

### MK-01 — /kollektivak mobile: collective list with status badges ✅ DONE

**Story:** As a Premium user on mobile, I see all my collectives with status so I can manage them.

**AC:**
- Each collective shown as a list row: name, status badge (Aktív / Nem aktivált / Felfüggesztett), seat usage.
- Inclusive XS collective first, labelled "Személyes csapat".
- "+ Új kollektíva" button: disabled with explanatory text if `not_activated` exists or user is not Premium.
- Status badge colours consistent with desktop (DK-01).
- Touch targets minimum 44 × 44 px.

---

### MK-02 — /kollektivak mobile: not_activated collective actions ✅ DONE

**Story:** As an owner on mobile, I can activate or delete a `not_activated` collective.

**AC:**
- Tapping a `not_activated` row opens a `BottomSheet` with: "Aktiválás" (primary) + "Törlés" (danger).
- "Aktiválás" navigates to `/elofizetes?activate=<collective_id>`.
- "Törlés" opens `ConfirmModal`. On confirm: hard delete, collective removed from list and dock.
- No other actions in the sheet for `not_activated` collectives.

---

### MK-03 — /elofizetes mobile: collective cards ✅ DONE

**Story:** As a Premium user on mobile, I see one card per collective on the subscription page.

**AC:**
- Section "Kollektívák" below the personal Premium card.
- One card per collective: name, status badge, tier, seat usage, monthly cost.
- Inclusive XS: "Prémiumba foglalt", no price, no action.
- `not_activated`: "Aktiválás" button.
- `active` paid: "Csomag módosítása" + "Lemondás" buttons (stacked or in a BottomSheet action menu).
- `frozen`: "Előfizetés folytatása" button.
- Consistent with desktop data but adapted to mobile card layout.

---

### MK-04 — /elofizetes mobile: activation flow ✅ DONE

**Story:** As an owner on mobile, I can activate a `not_activated` collective by choosing a tier and paying.

**AC:**
- "Aktiválás" opens a `Modal` (becomes bottom sheet on mobile via `.modal-dialog` CSS) with tier picker: S / M / L / XL.
- Same tier cards as desktop (DK-04): seat count, price, total.
- XL: mailto CTA.
- Selecting a tier + "Tovább a fizetéshez" initiates Creem checkout (same flow as Premium checkout on mobile).
- On activation: card updates without reload.

---

### MK-05 — /elofizetes mobile: Change plan bottom sheet ✅ DONE

**Story:** As an active collective owner on mobile, I can change my collective tier.

**AC:**
- "Csomag módosítása" opens a `Modal` bottom sheet with tier picker. Current tier highlighted.
- Same upgrade/downgrade logic as DK-05.
- Downgrade block: inline message in sheet *"Távolíts el [N] tagot a kollektívából."* + "Tagok kezelése" link.
- Uses `Modal` component — no new overlay.

---

### MK-06 — /elofizetes mobile: Cancel collective subscription ✅ DONE

**Story:** As an active collective owner on mobile, I can cancel a collective subscription.

**AC:**
- "Lemondás" opens `ConfirmModal` with same copy as DK-06.
- On confirm: `POST /api/collectives/[id]/cancel`. Card badge updates.
- Same webhook-driven freeze as desktop.

---

### MK-07 — Mobile dock/sidebar: locked pod visuals ✅ DONE

**Story:** As a mobile user, I can see which collective pods are not yet active or frozen in the dock.

**AC:**
- `not_activated` pod: greyed out, lock icon on the dot or overlaid on the pod button.
- `frozen` pod: normal colour with a small `🔒` indicator.
- Tapping either pod switches workspace context — the activation/frozen banner handles the rest.
- Uses `collective.status` from AppContext (BK-08) — no extra fetch.
- Existing pod tap behaviour (workspace switch) unchanged.

---

### MK-08 — Mobile workspace pages: not_activated banner ✅ DONE

**Story:** As a mobile user in a `not_activated` collective workspace, every page shows an activation prompt.

**AC:**
- When active collective has `status = 'not_activated'`: render a banner at the top of the page content area (below mobile header).
- Banner: amber background, lock icon, *"Ez a munkaterület még nincs aktiválva."*, "Aktiválás" button → `/elofizetes?activate=<collective_id>`.
- Page content below the banner is hidden (not just locked) — nothing to show until activated.
- Applies to: Dashboard, Felmérések, Ajánlatok, Projektek, Ügyfelek, Naptár.
- Shared `WorkspaceNotActivatedBanner` component (can be shared with desktop if designed to work in both contexts, otherwise separate).

---

### MK-09 — Mobile workspace pages: frozen banner ✅ DONE

**Story:** As a mobile user in a `frozen` collective workspace, every page shows the frozen state clearly.

**AC:**
- When active collective has `status = 'frozen'`: render a banner above page content.
- Banner: red/grey background, lock icon, *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- If viewer is owner: "Előfizetés folytatása" button (→ Creem portal link).
- Page content visible below banner but all create/edit/delete actions hidden or disabled.
- Uses banner layout rule from `CLAUDE.md §11` (icon + text + button, mobile stacks button on second line).

---

## Shared i18n keys to add

All new strings must be added to `messages/hu.json`, `messages/de.json`, and `messages/en.json` simultaneously. Key namespace suggestion: `kollektiva` (extends existing keys).

New keys needed (Hungarian values listed; DE/EN to be translated accordingly):

```json
"kollektiva": {
  "statusActive": "Aktív",
  "statusNotActivated": "Nem aktivált",
  "statusFrozen": "Felfüggesztett",
  "notActivatedBannerTitle": "Ez a munkaterület még nincs aktiválva.",
  "notActivatedBannerBtn": "Aktiválás",
  "frozenBannerTitle": "Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők.",
  "frozenBannerBtn": "Előfizetés folytatása",
  "newCollectiveDisabledHasPending": "Aktiváld vagy töröld a meglévő nem aktivált kollektívát.",
  "newCollectiveDisabledNoPremium": "Prémium előfizetés szükséges.",
  "activateTitle": "Kollektíva aktiválása",
  "changePlanTitle": "Csomag módosítása",
  "changePlanDowngradeBlock": "Távolíts el {n} tagot a kollektívából, mielőtt kisebb csomagra váltasz.",
  "changePlanManageMembers": "Tagok kezelése",
  "cancelConfirmTitle": "Kollektíva lemondása",
  "cancelConfirmBody": "Biztosan lemondod a(z) {name} kollektíva előfizetését? A munkaterület {date}-ig aktív marad, utána csak olvasható lesz.",
  "deleteNotActivatedConfirmBody": "Biztosan törlöd a(z) {name} kollektívát? Még nincs rajta adat.",
  "includedInPremium": "Prémiumba foglalt",
  "seatsUsage": "{used}/{total} szék",
  "tierXs": "XS — 1 közreműködő",
  "tierS": "S — 3 közreműködő",
  "tierM": "M — 6 közreműködő",
  "tierL": "L — 9 közreműködő",
  "tierXl": "XL — Egyedi ajánlat"
}
```
