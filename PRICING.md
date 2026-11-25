# OkosSzaki — Pricing, Roles & Permissions

> **Status:** Active reference. Creem.io integration live for Premium. Collective tier enforcement, freeze logic, seed documents, and media limits pending.
> **Last updated:** 2026-11-25
> **Payment provider:** Creem.io — Merchant of Record, handles billing, tax, and payouts.

---

## Table of Contents

1. [Subscription Tiers](#1-subscription-tiers)
2. [Trial Logic](#2-trial-logic)
3. [Collective Packages](#3-collective-packages)
4. [Billing Model](#4-billing-model)
5. [Collective Lifecycle](#5-collective-lifecycle)
6. [Roles & Permissions](#6-roles--permissions)
7. [Resource Limits](#7-resource-limits)
8. [DB Schema](#8-db-schema)
9. [User Stories](#9-user-stories)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Subscription Tiers

### Personal account tiers

| Tier | Monthly price | Documents | Media | Collectives |
|---|---|---|---|---|
| **Bázis** (Basic) | Ingyenes | 1 Survey · 1 Quote · 1 Project (seed only) | 3 photos/section · no video | None (read-only on inclusive) |
| **Próba** (Trial) | Ingyenes (14 nap) | Unlimited | Same as Premium | Same as Premium |
| **Prémium** | 7.990 Ft + ÁFA | Unlimited | 20 photos · 5 videos/section | 1 inclusive XS collective |

### Key rules

- Trial is identical to Premium in every way. It auto-assigns to every first-time registrant for 14 days.
- After Trial expires: account drops to Basic. No data deleted. Excess documents become read-only (see §7).
- Basic users **can be invited as contributors** into someone else's collective without upgrading.
- Inside a collective, contributors use the **owner's media limits** (not their own Basic limits).
- Basic document limits and media limits apply only in the **personal workspace** (`collective_id IS NULL`).
- Basic users cannot access any collective workspace — including the inclusive XS — which stays frozen until they upgrade.
- Premium includes 1 XS inclusive collective (owner + 1 collaborator), auto-created on registration.
- Additional collectives or upgrading the inclusive collective requires a paid package (§3).
- Superadmin can manually override `is_subscription_premium` and `subscription_tier` for any user.

---

## 2. Trial Logic

- Every **first-time registration** gets a 14-day free Trial.
- Trial is tracked at the **email level** in `trial_emails` — prevents re-registration abuse.
- Trial behaves identically to Premium: unlimited resources, collective access, full media limits.
- `isEffectivePremium(profile)` in `src/lib/subscriptionLimits.js` returns `true` for both paid Premium and an active Trial.
- On expiry: account silently downgrades to Basic. No data is deleted. Downgrade write-lock applies (see §7).
- Trial days configurable in `pricing_config` (key: `trial_days`, default: 14).

### Trial expiry UX

- `/elofizetes` shows a yellow banner with days remaining while on Trial.
- On expiry, upgrade prompt shown when user next hits a Basic limit.

---

## 3. Collective Packages

### Inclusive collective (XS — in every Premium)

- Auto-created on registration (during the Trial period).
- **Cannot be deleted — ever.** (marked `is_inclusive = true` in DB)
- Goes read-only (frozen) when Premium lapses; auto-reactivates when Premium resumes.
- Default size: owner + 1 collaborator (2 total). No separate charge.
- Can be upgraded to S / M / L by purchasing a collective package subscription. Full package price applies — no discount for the included free seat. Downgrading back to XS cancels the package subscription; collective reverts to 1+1.

### Paid packages (add-on on top of Premium)

Fixed price per package. Owner is never counted as a seat.

| Package | Collaborators (excl. owner) | Total members | Monthly price | Total with Premium |
|---|---|---|---|---|
| **S** | 3 | 4 | 4.500 Ft + ÁFA | 12.490 Ft + ÁFA |
| **M** | 6 | 7 | 9.000 Ft + ÁFA | 16.990 Ft + ÁFA |
| **L** | 9 | 10 | 13.500 Ft + ÁFA | 21.490 Ft + ÁFA |

For teams larger than L: custom quote (contact us).

### Seat counting rules

- Owner is never counted as a seat.
- Both `active` and `invited` members count toward the seat limit.
- Basic users count as a full seat when invited.
- At capacity: invite is blocked with an upgrade prompt.

### Changing plan (upgrade or downgrade)

Both handled via "Csomag módosítása" in `/elofizetes` — one modal showing all tiers with the current one highlighted. Owner picks the new tier → Creem checkout → `subscription.updated` webhook → `collectives.collective_tier` updated.

**Upgrade (e.g. S → M):** no checks required. New seats available immediately after payment.

**Downgrade (e.g. M → S):** blocked if current active member count exceeds the target tier's seat limit. Owner must remove excess members in `/kollektivak` first. Error shown inline in the modal: *"Távolíts el X tagot a kollektívából, mielőtt kisebb csomagra váltasz."* with a link to `/kollektivak`. Once member count fits, downgrade proceeds.

---

## 4. Billing Model

### Two separate Creem subscriptions per owner

| Subscription | Creem product | What it covers |
|---|---|---|
| Premium personal | `okosszaki_premium` | Personal account + 1 included XS collective |
| Collective package | `okosszaki_kollektiv_s` / `_m` / `_l` | Paid collective workspace (or inclusive collective upgrade) |

Separate subscriptions so the owner can dissolve a paid collective without canceling Premium.

### Payment UX flow for collectives

- **Discovery:** in `/kollektivak` — blocked action triggers in-context upgrade prompt.
- **Payment:** always completed in `/elofizetes` (single billing hub). No payment UI in `/kollektivak`.

### Webhook events (Creem)

| Event | Action in app |
|---|---|
| `checkout.completed` | Activate Premium or collective tier |
| `subscription.paid` | Confirm active, clear grace period |
| `subscription.active` | Ensure correct tier active |
| `subscription.updated` | Update `collective_tier` on upgrade/downgrade |
| `subscription.canceled` | Freeze at end of billing period |
| `subscription.expired` | Freeze immediately |
| `subscription.paused` | Freeze |
| `subscription.payment_failed` | Start grace period (default 5 days) |

### Grace period on payment failure

- Do not freeze immediately on first failure — Creem retries automatically.
- Set `subscription_grace_until = NOW() + grace_days` on profiles/collectives.
- Freeze only when `grace_until < NOW()` without a successful payment.
- Dashboard shows warning: *"Fizetési probléma — rendezd a számlázást X napon belül."*

---

## 5. Collective Lifecycle

### Statuses

| Status | Meaning |
|---|---|
| `not_activated` | Created by owner, never paid for |
| `active` | Live, subscription paid |
| `frozen` | Was active; subscription ended or Premium lapsed |
| `deleted` | Soft-deleted, permanent |

The inclusive collective (`is_inclusive = true`) is always created as `active` and only transitions to `frozen`. It never has `not_activated` status and can never be deleted.

### Creation flow for paid collectives

1. Owner clicks "+ Új kollektíva" in `/kollektivak` → names it → confirms.
2. Collective created with `status = 'not_activated'`. Appears as a pod in the sidebar (visually locked).
3. All pages in that workspace context show: *"Ez a munkaterület nincs aktiválva."* + "Aktiválás" button → `/elofizetes`.
4. Invite flow also blocked: *"Aktiváld a kollektívát az első meghívás előtt."*
5. In `/elofizetes`: collective shown with its name, status "Nem aktivált", tier picker (S / M / L) + Creem checkout.
6. After payment: Creem `checkout.completed` webhook → `status = 'active'`, `collective_tier` set. Collective fully unlocked.

**Only 1 `not_activated` collective allowed at a time.** The "+ Új kollektíva" button is disabled while any `not_activated` collective exists. Owner must either activate or delete it first.

### State transitions

```
[Owner creates collective]
         │
         ▼
   NOT_ACTIVATED ──── Owner deletes ──► hard delete (no data exists)
         │
         │ Payment completed (Creem webhook)
         ▼
      ACTIVE ──── Owner cancels subscription (in /elofizetes) ────► FROZEN (read-only)
    (full r/w)    OR Premium lapses                                       │
                                                                         │── Reactivate ──► ACTIVE
                                                                         │
                                                                         └── Delete ──► DELETED (permanent)

      ACTIVE ──── Owner attempts delete ──► BLOCKED ("Lemondás szükséges a törléshez")

Inclusive (XS) collective: ACTIVE ↔ FROZEN only. Never not_activated, never deletable.
```

### Rules

- **Not activated** → owner can delete it (hard delete — no data). Cannot invite, cannot use. Only 1 allowed at a time.
- **Active** → cannot be deleted. Must cancel subscription in `/elofizetes` first.
- **Frozen** → all members can read; nobody can write. Owner can delete.
- **Deleted** → permanent. Owner prompted to transfer documents to personal workspace as permanently read-only.
- Reactivating Premium **auto-unfreezes the inclusive XS collective** but does NOT auto-unfreeze paid collectives (owner must reactivate the collective subscription separately).
- **Premium revoked with a `not_activated` collective pending** → auto-delete it (it has no data and cannot be activated without Premium).

### Activation flow in /elofizetes

- Collective shown with name + "Nem aktivált" badge.
- Owner picks tier: S / M / L.
- Creem checkout launched for the chosen package.
- On `checkout.completed` webhook: `status = 'active'`, `collective_tier` set, seats available.

### On deletion of a frozen collective: document transfer

- Prompt: *"Átmásolod az adatokat a személyes munkaterületedre?"*
- If yes: projects, quotes, surveys transfer to owner's personal workspace as **permanently read-only**. Irreversible regardless of future subscription status.
- If no: soft-delete all collective documents.
- Cascade soft-delete `collective_members` (status → `'left'`).

### Access matrix per status

| Action | Not activated | Active | Frozen | Deleted |
|---|---|---|---|---|
| Read collective data | ❌ | ✅ all members | ✅ all members | ❌ |
| Create document | ❌ | ✅ owner only | ❌ | ❌ |
| Add diary entry / upload | ❌ | ✅ all members | ❌ | ❌ |
| Edit own entries | ❌ | ✅ all members | ❌ | ❌ |
| Edit others' entries | ❌ | ✅ owner only | ❌ | ❌ |
| Delete document | ❌ | ✅ owner only | ❌ | ❌ |
| Invite new members | ❌ | ✅ owner | ❌ | ❌ |
| Delete the collective | ✅ owner (hard delete) | ❌ (cancel sub first) | ✅ owner | — |
| Activate | ✅ owner → /elofizetes | — | — | ❌ |
| Reactivate | — | — | ✅ owner (via Creem) | ❌ permanent |

### Not-activated UX

- Sidebar pod visible but visually locked (greyed, lock icon).
- Every page in that workspace: *"Ez a munkaterület nincs aktiválva."* + "Aktiválás" button → `/elofizetes`.
- In `/kollektivak`: "Aktiválás" + "Törlés" buttons. No other actions.

### Frozen UX

- Sidebar: 🔒 "Felfüggesztett" badge.
- Banner: *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- Owner sees: "Előfizetés folytatása" (→ Creem portal) + "Kollektíva törlése".
- Pending invitations auto-retracted on freeze.

---

## 6. Roles & Permissions

### Collective roles

| Role | Description |
|---|---|
| `owner` | Created the collective; pays the bill; full control |
| `contributor` | Invited worker; can add their own work, cannot create/delete documents |

No `admin` role. The owner is the single authority in a collective.

### Permission matrix

| Action | Owner | Contributor |
|---|---|---|
| Create project / survey / quote | ✅ | ❌ |
| Read everything in collective | ✅ | ✅ |
| Add diary entry / upload file | ✅ | ✅ (owner's media limits apply) |
| Edit own entries | ✅ | ✅ |
| Edit others' entries | ✅ | ❌ |
| Delete anything | ✅ | ❌ |
| Change quote status (send / accept / reject) | ✅ | ❌ |
| Toggle show_to_client | ✅ | ❌ |
| Invite / remove members | ✅ | ❌ |
| Delete the collective | ✅ | ❌ |

### Client ownership (GDPR)

- `clients.owner_id` is always personal — never shared across a collective.
- Contributors never own or manage clients.
- The Owner is the single point of contact toward the client.

### Dormant features (schema ready, logic not active)

- **Approval queue** (`status: pending | approved`) — defaults to `approved` for everyone.
- **Per-project assignment** — all contributors see all collective projects by default.

---

## 7. Resource Limits

### Document limits (personal workspace only)

Enforced at the **API level** in POST handlers. Client-side also disables creation buttons and shows upgrade prompts. Limits do **not** apply inside collectives (owner's Premium covers collective usage).

| Resource | Basic | Trial / Premium | Config key |
|---|---|---|---|
| Felmérések (Surveys) | 1 | Unlimited | `basic_max_surveys` |
| Ajánlatok (Quotes) | 1 | Unlimited | `basic_max_quotes` |
| Projektek (Projects) | 1 | Unlimited | `basic_max_projects` |
| Sections per document | 10 | Unlimited | `basic_max_sections` |
| Items per section | 100 | 100 | `max_items_per_section` |

- Soft-deleted records (`deleted_at IS NOT NULL`) do **not** count toward the limit.
- Superadmins are never limited.
- `checkPersonalLimit(admin, userId, table, configKey)` in `src/lib/subscriptionLimits.js` performs count + config lookup in parallel.
- Seed documents (`is_seed = true`) count toward the limit but are always writable (see §7c).
- The 100-item cap per section applies to **all tiers** — it is a safety ceiling, not a tier differentiator.

### Error response on limit reached (HTTP 403)

```json
{ "error": "Bázis csomagban maximum 1 felmérés hozható létre. Váltj Prémiumra a korlátlan használathoz." }
```

### Media limits (per section)

Images are always converted to WebP on upload (via `sharp`). Videos are stored as-is; size is enforced server-side at upload time.

| Tier | Photos per section | Videos per section | Max photo size | Max video size |
|---|---|---|---|---|
| **Basic** | 3 | ❌ | 5 MB | — |
| **Trial / Premium** | 20 | 5 | 10 MB | 50 MB |

- In collective context: **owner's limits apply** regardless of contributor's personal tier.
- Read-only documents (see §7c): no new uploads permitted.
- Config keys: `basic_max_photos`, `premium_max_photos`, `premium_max_videos`, `basic_photo_size_mb`, `premium_photo_size_mb`, `premium_video_size_mb`.

### Seed documents

On every new user registration, **3 seed documents** are created in the personal workspace:
- 1 Survey (`is_seed = true`)
- 1 Quote (`is_seed = true`)
- 1 Project (`is_seed = true`)

On inclusive collective creation, the same 3 seed documents are created in the collective workspace.

Seed documents are **pre-populated with example content** (1–2 sections, 2–3 items each) so the app is never empty on first login.

**Seed documents cannot be deleted.** The delete button is hidden in the UI; the API blocks soft-delete on `is_seed = true` records. The user can fully edit their content — rename, clear sections, replace all items — but the document itself persists.

Seed documents count as the user's 1 allowed document per type on Basic. They serve as the permanently writable document on downgrade (see §7c).

### Downgrade write-lock

When a user downgrades from Trial/Premium to Basic and has more than 1 document of a given type:

- The **oldest document per type** (`created_at ASC`) becomes the **writable document** — always.
- All other documents of that type become **read-only** (`is_read_only = true`).
- Read-only means: no edits, no new entries, no uploads. Full read access retained. "Insert coins to continue" UX.
- Documents transferred from a deleted collective are also permanently read-only, regardless of subscription.

Since seed documents are always the oldest (created at registration), they are always the writable document on Basic. This is intentional.

The write-lock is applied by the downgrade handler (triggered by `revokePremium()` or Trial expiry).

---

## 8. DB Schema

### profiles (key subscription fields)

```sql
subscription_tier        TEXT NOT NULL DEFAULT 'basic'
                         CHECK (subscription_tier IN ('basic', 'trial', 'premium'))
is_subscription_premium  BOOLEAN DEFAULT false
trial_started_at         TIMESTAMPTZ
trial_ends_at            TIMESTAMPTZ
subscription_grace_until TIMESTAMPTZ      -- payment failure grace period
creem_customer_id        TEXT             -- stored on first activation/webhook
```

### trial_emails

```sql
CREATE TABLE public.trial_emails (
  email            TEXT PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

One row per email address, ever. Prevents re-registration from re-triggering the Trial.

### surveys / quotes / projects (new fields)

```sql
is_seed      BOOLEAN NOT NULL DEFAULT false   -- seed document, cannot be deleted
is_read_only BOOLEAN NOT NULL DEFAULT false   -- set by downgrade handler or collective transfer
```

### collectives (key fields)

```sql
id               UUID PRIMARY KEY
name             TEXT
is_inclusive     BOOLEAN DEFAULT false
status           TEXT NOT NULL DEFAULT 'not_activated'
                 CHECK (status IN ('not_activated', 'active', 'frozen', 'deleted'))
                 -- inclusive collective is always created as 'active', never 'not_activated'
collective_tier  TEXT CHECK (collective_tier IN ('xs', 's', 'm', 'l'))
                 -- xs = owner+1 (included), s = owner+3, m = owner+6, l = owner+9
deleted_at       TIMESTAMPTZ
created_at       TIMESTAMPTZ
```

### pricing_config (seeded values)

| key | value | label |
|---|---|---|
| `premium_monthly_huf` | 7990 | Prémium előfizetés (Ft/hó) |
| `collective_s_huf` | 4500 | S csomag — 3 együttműködő |
| `collective_m_huf` | 9000 | M csomag — 6 együttműködő |
| `collective_l_huf` | 13500 | L csomag — 9 együttműködő |
| `collective_s_seats` | 3 | S csomag: max együttműködők |
| `collective_m_seats` | 6 | M csomag: max együttműködők |
| `collective_l_seats` | 9 | L csomag: max együttműködők |
| `basic_max_surveys` | 1 | Bázis: max felmérések száma |
| `basic_max_quotes` | 1 | Bázis: max ajánlatok száma |
| `basic_max_projects` | 1 | Bázis: max projektek száma |
| `basic_max_sections` | 10 | Bázis: max szekció/dokumentum |
| `max_items_per_section` | 100 | Minden csomag: max tétel/szekció (biztonsági korlát) |
| `basic_max_photos` | 3 | Bázis: max fotó/szekció |
| `premium_max_photos` | 20 | Prémium: max fotó/szekció |
| `premium_max_videos` | 5 | Prémium: max videó/szekció |
| `basic_photo_size_mb` | 5 | Bázis: max fotó mérete (MB) |
| `premium_photo_size_mb` | 10 | Prémium: max fotó mérete (MB) |
| `premium_video_size_mb` | 50 | Prémium: max videó mérete (MB) |
| `trial_days` | 14 | Ingyenes próbaidő (nap) |
| `payment_grace_days` | 5 | Fizetési hiba türelmi idő (nap) |

---

## 9. User Stories

### US-01 — New registration gets Trial + seed documents + inclusive collective
> As a new user, I get 14 days of free Trial, 3 pre-populated seed documents, and 1 XS inclusive collective with its own 3 seed documents.

AC:
- `subscription_tier = 'trial'`, `trial_ends_at = NOW() + 14 days`
- 3 seed documents created in personal workspace (`is_seed = true`, pre-populated with example content)
- Inclusive collective (`is_inclusive = true`) created as `active` with owner as sole member
- 3 seed documents created in inclusive collective workspace
- All Premium features available; no credit card required

---

### US-02 — Re-registration does not reset Trial
> Re-registering with the same email starts directly on Basic.

AC: `trial_emails` check; `subscription_tier = 'basic'`; seed documents still created; no error shown to user.

---

### US-03 — Trial expiry → downgrade write-lock applied
> When Trial expires, Basic plan applies. Documents beyond the 1-per-type limit become read-only.

AC:
- `isEffectivePremium` returns false
- For each document type: oldest document stays writable; all others set `is_read_only = true`
- Read-only documents show a lock indicator + upgrade prompt
- Inclusive collective frozen (Basic cannot access collectives)
- `/elofizetes` shows Basic with upgrade CTA

---

### US-04 — Premium upgrade
> User upgrades via `/elofizetes` → Creem checkout → webhook sets premium.

AC: Creem webhook sets `is_subscription_premium = true`; `is_read_only` cleared on personal documents; inclusive collective unfrozen; UI reflects without page reload.

---

### US-05 — Basic document creation blocked
> Basic user cannot create a second survey/quote/project in personal workspace.

AC: HTTP 403 + *"Bázis csomagban maximum 1 felmérés hozható létre. Váltj Prémiumra a korlátlan használathoz."* Client-side button disabled with upgrade tooltip.

---

### US-06 — Basic media upload blocked (photos over limit)
> Basic user cannot upload a 4th photo to a section.

AC: Upload rejected (HTTP 403); client-side shows *"Bázis csomagban szekciónként maximum 3 fotó tölthető fel."* + upgrade CTA.

---

### US-07 — Basic video upload blocked
> Basic user cannot upload any video.

AC: Upload rejected on file type check (HTTP 403); *"Videó feltöltés csak Prémium csomagban elérhető."*

---

### US-08 — Read-only document cannot be edited
> Basic user (post-downgrade) cannot edit a read-only document.

AC: All inputs disabled; banner: *"Ez a dokumentum csak olvasható. Prémium csomagra váltva újra szerkeszthetővé válik."* No new uploads permitted.

---

### US-09 — Seed document cannot be deleted
> User cannot delete a seed document.

AC: Delete button hidden in UI; API returns HTTP 403 on soft-delete attempt for `is_seed = true`.

---

### US-10 — Creating an additional collective requires Premium
> Basic users cannot create additional collectives.

AC: Blocked at API + UI with *"Prémium előfizetés szükséges."*

---

### US-11 — Invite up to seat limit
> Owner is blocked from inviting beyond the collective tier's seat count.

AC: HTTP 403 + *"Elérted a csomag taglétszám-korlátját."* + upgrade CTA. Active + invited both count.

---

### US-12 — Downgrade blocked by seat count
> Owner cannot downgrade collective package if active members exceed the target tier's seat count.

AC: Downgrade blocked; UI shows *"Távolíts el X tagot a csomag csökkentéséhez."* with link to `/kollektivak`.

---

### US-13 — Cancel collective subscription → frozen
> Owner cancels in `/elofizetes` → collective goes read-only at end of billing period.

AC: `collectives.status = 'frozen'`; pending invitations retracted; frozen banner shown; write operations return HTTP 403; owner sees "Előfizetés folytatása" + "Kollektíva törlése".

---

### US-14 — Premium lapses → inclusive collective frozen
> When Premium is cancelled/expired, the inclusive XS collective goes read-only.

AC: Webhook sets `is_subscription_premium = false` → auto-freeze inclusive collective. Reactivating Premium auto-unfreezes inclusive collective only; paid collectives require manual reactivation.

---

### US-15 — Delete a frozen collective (with document transfer)
> Owner deletes a frozen collective. Prompted to transfer documents to personal as read-only.

AC: Only available when `status = 'frozen'`. ConfirmModal. Transfer sets `is_read_only = true` on transferred documents (irreversible). `collectives.status = 'deleted'`, `deleted_at = NOW()`. Soft-delete non-transferred collective documents. All members lose access.

---

### US-16 — Active collective cannot be deleted
> Owner must cancel the collective subscription before deleting.

AC: Delete button disabled when `status = 'active'`. Message: *"Lemondás szükséges a törléshez."*

---

### US-17 — Inclusive collective cannot be deleted
> The XS inclusive collective has no delete option, ever.

AC: Delete action not shown for `is_inclusive = true` collectives.

---

### US-18 — Reactivate a frozen paid collective
> Owner reactivates via Creem → collective resumes from where it left off.

AC: `collectives.status = 'active'`; existing data accessible; members regain write access; retracted invitations NOT auto-resent.

---

### US-19 — Payment failure grace period
> Transient payment failure gives a 5-day grace period before freeze.

AC: `subscription_grace_until = NOW() + 5 days`; account functional during grace; dashboard warning banner; freeze only if grace expires without successful payment.

---

### US-20 — Basic user as contributor in collective
> Basic user can join a collective and contribute without hitting personal limits inside it.

AC: No paywall on invitation acceptance; collective context uses owner's Premium limits for media; contributor cannot create or delete documents; personal workspace remains capped.

---

### US-21 — Member leaves a collective
> Member can leave voluntarily; their entries remain in the collective.

AC: `collective_members.status = 'left'`; member loses access; their entries stay; vacated seat immediately available.

---

### US-22 — Upgrade inclusive collective to paid package
> Owner upgrades the inclusive XS collective to S/M/L to invite more collaborators.

AC: Creem checkout for chosen package → `collective_tier` updated; additional seats available immediately. Full package price charged — no discount for the included free seat. On package cancellation: `collective_tier` reverts to `xs`, excess members blocked from access (not auto-removed — owner must manage).

---

## 10. Implementation Checklist

### Done

- [x] `profiles.subscription_tier`, `trial_started_at`, `trial_ends_at` added
- [x] `trial_emails` table created
- [x] `pricing_config` table created and seeded
- [x] `handle_new_user` trigger for Trial assignment + email-level abuse prevention
- [x] `isEffectivePremium()` and `checkPersonalLimit()` in `src/lib/subscriptionLimits.js`
- [x] Basic limits enforced in `POST /api/surveys`, `/api/quotes`, `/api/projects`
- [x] AppContext passes `subscription_tier`, `trial_ends_at`
- [x] `/elofizetes` with Creem checkout + webhooks live for Premium
- [x] `profiles.creem_customer_id` stored on activation
- [x] `/superadmin/pricing` and `/superadmin/subscriptions`
- [x] Superadmin premium toggle syncs `subscription_tier`

### Pending — DB (migration needed)

- [x] Add `is_seed BOOLEAN DEFAULT false` to `surveys`, `quotes`, `projects` — migration 163
- [x] Add `is_read_only BOOLEAN DEFAULT false` to `surveys`, `quotes`, `projects` — migration 163
- [x] Add `collectives.status` CHECK ('not_activated' | 'active' | 'frozen' | 'deleted') — migration 159
- [x] Add `collectives.collective_tier` CHECK ('xs' | 's' | 'm' | 'l') — migration 159
- [x] Add `collectives.deleted_at` — migration 159
- [x] Add `profiles.subscription_grace_until` — migration 163
- [x] Update `pricing_config`: set `basic_max_surveys/quotes/projects = 1`, add all media limit keys, remove deprecated `seat_monthly_huf` — migration 163
- [x] Remove deprecated `collectives.subscription_type` and `collectives.seat_count` — migration 164

### Pending — Seed documents

- [x] Seed docs created in `handle_new_user` trigger — personal + collective (migration 163)
- [x] Block soft-delete on `is_seed = true` in surveys/quotes/projects DELETE API routes
- [x] Hide delete button in UI for seed documents (all desktop + mobile views)
- [x] Pre-populate seed docs with example content — trigger updated in migration 164

### Pending — Downgrade write-lock

- [x] `applyDowngradeLock(userId, admin)` in `src/lib/downgradeLock.js`
- [x] `clearDowngradeLock(userId, admin)` in `src/lib/downgradeLock.js`
- [x] Trial expiry detection in `GET /api/auth/profile` → calls `applyDowngradeLock` lazily
- [x] `revokePremium()` calls `applyDowngradeLock`; `grantPremium()` calls `clearDowngradeLock`
- [x] `is_read_only` guard on PATCH in surveys/[id], quotes/[id], projects/[id] (HTTP 403)
- [x] `ReadOnlyBanner` component + shown in survey/quote/project detail pages (mobile + desktop)
- [x] `canEdit`/`canManage` flags updated to include `!isReadOnly` in all detail views
- [x] Read-only guard in sub-resource POST routes (sections, entries, media uploads)

### Pending — Media limits

- [x] Image upload route: check `basic_max_photos` / `premium_max_photos` per section, enforce `basic_photo_size_mb` / `premium_photo_size_mb` — `surveys/upload` + `quotes/[id]/media`
- [x] Image conversion: `sharp` → WebP, resize to max 2000px width
- [x] Video upload route: check `premium_max_videos` per section, enforce `premium_video_size_mb`; reject video for Basic
- [x] `getMediaLimits(profile, inCollective, ownerProfile)` helper — `src/lib/subscriptionLimits.js`
- [x] Client-side: disable upload button when at limit, show tier-aware error

### Pending — Basic limits (update from 5→1)

- [x] Update `pricing_config` rows: `basic_max_surveys = 1`, `basic_max_quotes = 1`, `basic_max_projects = 1` — migration 163
- [x] Add `pricing_config` rows: `basic_max_sections = 10`, `max_items_per_section = 100` — migration 163
- [x] Enforce `basic_max_sections` in section POST handlers for Basic users (personal workspace)
- [x] Enforce `max_items_per_section = 100` in item POST handlers for all tiers (quote_entries only; survey_items table pending migration)
- [x] Error messages use dynamic `limit` from pricing_config

### Pending — Collective lifecycle

- [x] `not_activated` status: all write routes + invite return 403 with activation prompt
- [x] `not_activated` status: disable "+ Új kollektíva" button when one exists (API 409 + UI disabled)
- [x] `not_activated` collective: hard delete allowed (no data, no sub to cancel)
- [x] Auto-delete `not_activated` collectives when `revokePremium()` fires
- [x] Activation flow in `/elofizetes`: tier picker → Creem checkout → webhook sets `active`
- [x] Block delete on active collective; show "Lemondás szükséges" message (API 409)
- [x] Block delete on inclusive collective (`is_inclusive = true`) — no delete button shown
- [x] Document transfer prompt on deletion of frozen collective — `KollektivakDesktop` + `DELETE /api/collectives/[id]`
- [x] All collective write routes: check `status = 'active'` before mutations (HTTP 403 if frozen/not_activated)
- [x] Auto-retract pending invitations on freeze
- [x] Auto-freeze owner's inclusive collective when `is_subscription_premium` becomes false
- [x] Auto-unfreeze inclusive collective when Premium resumes (paid collectives: manual reactivation only)
- [x] Not-activated pod in sidebar: visually locked (greyed, lock icon) — desktop + mobile
- [x] Not-activated workspace pages: "Aktiválás" banner instead of content
- [x] Frozen banner component in collective layout

### Pending — /elofizetes UI

- [x] One card per collective: name, status badge, tier, seat usage (e.g. "2/4 szék"), monthly cost, next billing date
- [x] Inclusive XS collective card: "Included in Premium" label — no action menu unless upgrading
- [x] Active paid collective card: action menu with "Csomag módosítása" + "Lemondás"
- [x] "Csomag módosítása" modal: all tiers listed, current highlighted; downgrade blocked inline if member count exceeds target tier
- [x] "Lemondás": ConfirmModal → Creem API cancel → frozen at billing period end
- [x] Not-activated collective card: "Aktiválás" button (tier picker → Creem checkout)
- [x] Frozen collective card: "Előfizetés folytatása" button (→ Creem portal)

### Pending — /kollektivak UI

- [x] In-context upsell when creating additional collective (Basic user) → route to /elofizetes
- [x] Seat usage shown per collective
- [x] Delete button: hidden for inclusive; active blocked with modal
- [x] Frozen state: read-only badge + reactivation CTA — non-inclusive frozen banner added

### Pending — Creem products (create in dashboard)

- [ ] `okosszaki_premium` — 7.990 Ft/month
- [ ] `okosszaki_kollektiv_s` — 4.500 Ft/month (3 collaborators)
- [ ] `okosszaki_kollektiv_m` — 9.000 Ft/month (6 collaborators)
- [ ] `okosszaki_kollektiv_l` — 13.500 Ft/month (9 collaborators)
