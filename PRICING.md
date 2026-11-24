# OkosSzaki — Pricing, Roles & Permissions

> **Status:** Active reference. Creem.io integration live for Premium. Collective tier enforcement and freeze logic pending.
> **Last updated:** 2026-11-24
> **Payment provider:** Creem.io — Merchant of Record, handles billing, tax, and payouts.

---

## Table of Contents

1. [Subscription Tiers](#1-subscription-tiers)
2. [Trial Logic](#2-trial-logic)
3. [Collective Packages](#3-collective-packages)
4. [Billing Model](#4-billing-model)
5. [Collective Lifecycle](#5-collective-lifecycle)
6. [Roles & Permissions](#6-roles--permissions)
7. [Basic Plan Limit Enforcement](#7-basic-plan-limit-enforcement)
8. [DB Schema](#8-db-schema)
9. [User Stories](#9-user-stories)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Subscription Tiers

### Personal account tiers

| Tier | Monthly price | Limits | Notes |
|---|---|---|---|
| **Bázis** (Basic) | Ingyenes | max 5 felmérés, max 5 ajánlat, max 1 projekt | Default after trial expires |
| **Próba** (Trial) | Ingyenes (14 nap) | Full Premium features | Auto-assigned on first registration |
| **Prémium** | 7.990 Ft + ÁFA | Unlimited everything + 1 XS kollektíva | Required to own additional collectives |

### Key rules

- Basic users **can be invited** into a collective without upgrading their personal account.
- Inside a collective, Basic members work without limits (collective resources are the owner's).
- Basic limits apply only to the **personal workspace** (`collective_id IS NULL`).
- Premium includes 1 XS collective (owner + 1 collaborator), auto-created on registration.
- Additional collectives require Premium + a paid collective package.
- Superadmin can manually override `is_subscription_premium` and `subscription_tier` for any user.

---

## 2. Trial Logic

- Every **first-time registration** gets a 14-day free Premium trial.
- Trial is tracked at the **email level** in `trial_emails` — prevents re-registration abuse.
- Trial behaves identically to Premium: unlimited resources, collective access.
- `isEffectivePremium(profile)` in `src/lib/subscriptionLimits.js` returns `true` for both paid Premium and an active trial.
- On expiry: account silently downgrades to Basic. No data is deleted.
- Trial days configurable in `pricing_config` (key: `trial_days`, default: 14).

### Trial expiry UX

- `/elofizetes` shows a yellow banner with days remaining while on trial.
- On expiry, upgrade prompt shown when user next hits a Basic limit.

---

## 3. Collective Packages

### Included collective (XS — in every Premium)

- Auto-created on registration (during the 2-week trial).
- **Cannot be deleted — ever.** (marked `is_inclusive = true` in DB)
- Goes read-only when Premium lapses; auto-reactivates when Premium resumes.
- Size: owner + 1 collaborator (2 total). No separate charge.

### Paid packages (add-on on top of Premium)

**Rate: 1.500 Ft + ÁFA per seat per month.** Owner is never counted as a seat.

| Package | Seats (excl. owner) | Total members incl. owner | Monthly price | Total with Premium |
|---|---|---|---|---|
| **S** | 3 | 4 | 4.500 Ft + ÁFA | 12.490 Ft + ÁFA |
| **M** | 6 | 7 | 9.000 Ft + ÁFA | 16.990 Ft + ÁFA |
| **L** | 9 | 10 | 13.500 Ft + ÁFA | 21.490 Ft + ÁFA |
| **XL** | 10+ | custom | Egyedi ajánlat | — |

### Seat counting rules

- Owner is never counted as a seat.
- Both `active` and `invited` members count toward the seat limit.
- Basic users count as a full seat when invited.
- At capacity: invite is blocked with an upgrade prompt.

### Changing plan (upgrade or downgrade)

Both handled via a single "Csomag módosítása" action in `/elofizetes` — one modal showing all tiers with the current one highlighted. Owner picks the new tier → Creem checkout → `subscription.updated` webhook → `collectives.collective_tier` updated.

**Upgrade (e.g. S → M):** no checks required. New seats available immediately after payment.

**Downgrade (e.g. M → S):** blocked if current active member count exceeds the target tier's seat limit. Owner must remove excess members in `/kollektivak` first. Error shown inline in the modal: *"Távolíts el X tagot a kollektívából, mielőtt kisebb csomagra váltasz."* with a link to `/kollektivak`. Once member count fits the new tier, downgrade proceeds normally.

---

## 4. Billing Model

### Two separate Creem subscriptions per owner

| Subscription | Creem product | What it covers |
|---|---|---|
| Premium personal | `okosszaki_premium` | Personal account + 1 included XS collective |
| Collective package | `okosszaki_kollektiv_s` / `_m` / `_l` | Additional collective workspace + seat slots |

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

1. Owner clicks "+ New collective" in `/kollektivak` → names it → confirms.
2. Collective created with `status = 'not_activated'`. Appears as a pod in the sidebar (visually locked).
3. All pages in that workspace context show: *"Ez a munkaterület nincs aktiválva."* + "Aktiválás" button → `/elofizetes`.
4. Invite flow also blocked: *"Aktiváld a kollektívát az első meghívás előtt."*
5. In `/elofizetes`: collective shown with its name, status "Nem aktivált", tier picker (S / M / L / XL) + Creem checkout.
6. After payment: Creem `checkout.completed` webhook → `status = 'active'`, `collective_tier` set. Collective fully unlocked.

**Only 1 `not_activated` collective allowed at a time.** The "+ New collective" button is disabled while any `not_activated` collective exists. Owner must either activate or delete it first.

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
- Owner picks tier: S / M / L / XL.
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
| Create / edit / delete | ❌ | ✅ all members | ❌ | ❌ |
| Invite new members | ❌ | ✅ owner | ❌ | ❌ |
| Delete the collective | ✅ owner (hard delete) | ❌ (cancel sub first) | ✅ owner | — |
| Activate | ✅ owner → /elofizetes | — | — | ❌ |
| Reactivate | — | — | ✅ owner (via Creem) | ❌ permanent |

### Not-activated UX

- Sidebar pod visible but visually locked (greyed, lock icon).
- Every page in that workspace: *"Ez a munkaterület nincs aktiválva."* + "Aktiválás" button → `/elofizetes`.
- In `/kollektivak`: "Aktiválás" + "Törlés" buttons. No other actions.

### Frozen UX

- Sidebar: `🔒 Felfüggesztett` badge.
- Banner: *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- Owner sees: "Előfizetés folytatása" (→ Creem portal) + "Kollektíva törlése".
- Pending invitations auto-retracted on freeze.

---

## 6. Roles & Permissions

### Collective roles

| Role | Description |
|---|---|
| `owner` | Created the collective; pays the bill; full control |
| `admin` | Promoted by owner; full operational control *(Phase 4 — not yet active)* |
| `contributor` | Invited worker; can add their own work, cannot edit others' |

### Permission matrix

| Action | Owner | Admin | Contributor |
|---|---|---|---|
| Create project / survey / quote | ✅ | ✅ | ❌ |
| Read everything in collective | ✅ | ✅ | ✅ |
| Add diary entry / upload file | ✅ | ✅ | ✅ |
| Edit own entries | ✅ | ✅ | ✅ |
| Edit others' entries | ✅ | ✅ | ❌ |
| Delete anything | ✅ | ✅ | ❌ |
| Change quote status (send / accept / reject) | ✅ | ✅ | ❌ |
| Toggle show_to_client | ✅ | ✅ | ❌ |
| Invite / remove members | ✅ | ✅ | ❌ |
| Promote member to Admin | ✅ | ❌ | ❌ |
| Delete the collective | ✅ | ❌ | ❌ |

### Client ownership (GDPR)

- `clients.owner_id` is always personal — never shared across a collective.
- Contributors never own or manage clients.
- The Owner is the single point of contact toward the client.

### Dormant features (schema ready, logic not active)

- **Approval queue** (`status: pending | approved`) — defaults to `approved` for everyone.
- **Per-project assignment** — all contributors see all collective projects by default.
- **`auto_approve` flag** — always `true` for now.

---

## 7. Basic Plan Limit Enforcement

Enforced at the **API level** in POST handlers. Client-side also disables creation buttons and shows upgrade prompts.

| Resource | Basic limit | Config key |
|---|---|---|
| Felmérések (Surveys) | 5 | `basic_max_surveys` |
| Ajánlatok (Quotes) | 5 | `basic_max_quotes` |
| Projektek (Projects) | 1 | `basic_max_projects` |

- Limits apply **only in personal context** (`collective_id IS NULL`).
- Soft-deleted records (`deleted_at IS NOT NULL`) do **not** count.
- Superadmins are never limited.
- `checkPersonalLimit(admin, userId, table, configKey)` in `src/lib/subscriptionLimits.js` performs count + config lookup in parallel.

### Error response on limit reached (HTTP 403)

```json
{ "error": "Bázis csomagban maximum 5 felmérés hozható létre. Váltj Prémiumra a korlátlan használathoz." }
```

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

One row per email address, ever. Prevents re-registration from re-triggering the trial.

### collectives (key fields)

```sql
id               UUID PRIMARY KEY
name             TEXT
is_inclusive     BOOLEAN DEFAULT false   -- true = auto-created XS collective, never deletable
status           TEXT NOT NULL DEFAULT 'not_activated'
                 CHECK (status IN ('not_activated', 'active', 'frozen', 'deleted'))
                 -- inclusive collective is always created as 'active', never 'not_activated'
collective_tier  TEXT CHECK (collective_tier IN ('xs', 's', 'm', 'l', 'xl'))
                 -- xs = owner+1 (included), s = owner+3, m = owner+6, l = owner+9
deleted_at       TIMESTAMPTZ
created_at       TIMESTAMPTZ
```

### pricing_config (seeded values)

| key | value | label |
|---|---|---|
| `premium_monthly_huf` | 7990 | Prémium előfizetés (Ft/hó) |
| `seat_monthly_huf` | 1500 | Kollektíva szék (Ft/szék/hó) |
| `collective_s_huf` | 4500 | S csomag — 3 szék × 1.500 Ft |
| `collective_m_huf` | 9000 | M csomag — 6 szék × 1.500 Ft |
| `collective_l_huf` | 13500 | L csomag — 9 szék × 1.500 Ft |
| `collective_s_seats` | 3 | S csomag: extra tagok száma |
| `collective_m_seats` | 6 | M csomag: extra tagok száma |
| `collective_l_seats` | 9 | L csomag: extra tagok száma |
| `basic_max_surveys` | 5 | Bázis: max felmérések száma |
| `basic_max_quotes` | 5 | Bázis: max ajánlatok száma |
| `basic_max_projects` | 1 | Bázis: max projektek száma |
| `trial_days` | 14 | Ingyenes próbaidő (nap) |
| `payment_grace_days` | 5 | Fizetési hiba türelmi idő (nap) |

---

## 9. User Stories

### US-01 — New registration gets trial + inclusive collective
> As a new user, I get 14 days of free Premium and 1 XS collective auto-created.

AC:
- `subscription_tier = 'trial'`, `trial_ends_at = NOW() + 14 days`
- Inclusive collective (`is_inclusive = true`) created with owner as sole member
- All Premium features available (unlimited + collective access)
- No credit card required

---

### US-02 — Re-registration does not reset trial
> Re-registering with the same email starts directly on Basic.

AC: `trial_emails` check; `subscription_tier = 'basic'`; no error shown to user.

---

### US-03 — Trial expiry
> When trial expires, Basic plan applies. Upgrade prompt on next limit hit.

AC: `isEffectivePremium` returns false; `/elofizetes` shows Basic with upgrade CTA.

---

### US-04 — Premium upgrade
> User upgrades via `/elofizetes` → Creem checkout → webhook sets premium.

AC: Creem webhook sets `is_subscription_premium = true`; UI reflects without page reload.

---

### US-05 — Creating an additional collective requires Premium
> Basic users cannot create additional collectives (the inclusive XS is their only one).

AC: Blocked at API + UI with *"Prémium előfizetés szükséges."*

---

### US-06 — Invite up to seat limit
> Owner is blocked from inviting beyond the collective tier's seat count.

AC: HTTP 403 + *"Elérted a csomag taglétszám-korlátját."* + upgrade CTA. Active + invited both count.

---

### US-07 — Downgrade blocked by seat count
> Owner cannot downgrade if active members exceed the target tier's seat count.

AC: Downgrade blocked; UI shows *"Távolíts el X tagot a csomag csökkentéséhez."*

---

### US-08 — Cancel collective subscription → frozen
> Owner cancels in `/elofizetes` → collective goes read-only at end of billing period.

AC: `collectives.status = 'frozen'`; pending invitations retracted; frozen banner shown; write operations return HTTP 403; owner sees "Előfizetés folytatása" + "Kollektíva törlése".

---

### US-09 — Premium lapses → inclusive collective frozen
> When Premium is cancelled/expired, the inclusive XS collective goes read-only.

AC: Webhook sets `is_subscription_premium = false` → auto-freeze all owner's collectives. Reactivating Premium auto-unfreezes the inclusive collective only.

---

### US-10 — Delete a frozen collective (with document transfer)
> Owner deletes a frozen collective. Prompted to transfer documents to personal as read-only.

AC: Only available when `status = 'frozen'`. Confirmation modal. Transfer sets documents permanently read-only (irreversible). `collectives.status = 'deleted'`, `deleted_at = NOW()`. Soft-delete non-transferred collective documents. All members lose access.

---

### US-11 — Active collective cannot be deleted
> Owner must cancel the collective subscription before deleting.

AC: Delete button disabled when `status = 'active'`. Message: *"Lemondás szükséges a törléshez."*

---

### US-12 — Inclusive collective cannot be deleted
> The XS inclusive collective has no delete option, ever.

AC: Delete action not shown for `is_inclusive = true` collectives.

---

### US-13 — Reactivate a frozen paid collective
> Owner reactivates via Creem → collective resumes from where it left off.

AC: `collectives.status = 'active'`; existing data accessible; members regain access; retracted invitations NOT auto-resent.

---

### US-14 — Payment failure grace period
> Transient payment failure gives a 5-day grace period before freeze.

AC: `subscription_grace_until = NOW() + 5 days`; account functional during grace; dashboard warning banner; freeze only if grace expires without successful payment.

---

### US-15 — Basic user invited to collective
> Basic users can join a collective and work without hitting personal limits inside it.

AC: No paywall on invitation acceptance; collective context is unrestricted; personal workspace remains capped.

---

### US-16 — Member leaves a collective
> Member can leave voluntarily; their entries remain in the collective.

AC: `collective_members.status = 'left'`; member loses access; their entries stay; vacated seat immediately available.

---

## 10. Implementation Checklist

### Done

- [x] `profiles.subscription_tier`, `trial_started_at`, `trial_ends_at` added
- [x] `trial_emails` table created
- [x] `pricing_config` table created and seeded
- [x] `handle_new_user` trigger for trial assignment + email-level abuse prevention
- [x] `isEffectivePremium()` and `checkPersonalLimit()` in `src/lib/subscriptionLimits.js`
- [x] Basic limits enforced in `POST /api/surveys`, `/api/quotes`, `/api/projects`
- [x] AppContext passes `subscription_tier`, `trial_ends_at`
- [x] `/elofizetes` with Creem checkout + webhooks live for Premium
- [x] `profiles.creem_customer_id` stored on activation
- [x] `/superadmin/pricing` and `/superadmin/subscriptions`
- [x] Superadmin premium toggle syncs `subscription_tier`

### Pending — DB (migration needed)

- [ ] Add `collectives.status` ('active' | 'frozen' | 'deleted')
- [ ] Add `collectives.collective_tier` ('xs' | 's' | 'm' | 'l' | 'xl')
- [ ] Add `collectives.deleted_at`
- [ ] Add `profiles.subscription_grace_until`
- [ ] Update `pricing_config`: set `premium_monthly_huf = 7990`, `seat_monthly_huf = 1500`, add new collective package keys
- [ ] Remove deprecated `collectives.subscription_type` and `collectives.seat_count`

### Pending — Collective lifecycle

- [ ] `not_activated` status: all write routes + invite return 403 with activation prompt
- [ ] `not_activated` status: disable "+ New collective" button when one exists
- [ ] `not_activated` collective: hard delete allowed (no data, no sub to cancel)
- [ ] Auto-delete `not_activated` collectives when `revokePremium()` fires
- [ ] Activation flow in `/elofizetes`: tier picker → Creem checkout → webhook sets `active`
- [ ] Block delete on active collective; show "Lemondás szükséges" message
- [ ] Block delete on inclusive collective (`is_inclusive = true`) — no delete button shown
- [ ] Document transfer prompt on deletion of frozen collective
- [ ] All collective write routes: check `status = 'active'` before mutations (HTTP 403 if frozen/not_activated)
- [ ] Auto-retract pending invitations on freeze
- [ ] Auto-freeze owner's collectives when `is_subscription_premium` becomes false
- [ ] Auto-unfreeze inclusive collective when Premium resumes (paid collectives: manual reactivation only)
- [ ] Not-activated pod in sidebar: visually locked (greyed, lock icon)
- [ ] Not-activated workspace pages: "Aktiválás" banner instead of content
- [ ] Frozen banner component in collective layout

### Pending — /elofizetes UI

- [ ] One card per collective showing: name, status badge, tier, seat usage (e.g. "2/4 szék"), monthly cost, next billing date
- [ ] Inclusive XS collective card: "Included in Premium" label — no action menu
- [ ] Active paid collective card: action menu with "Csomag módosítása" + "Lemondás"
- [ ] "Csomag módosítása" modal: all tiers listed, current highlighted; upgrade proceeds immediately; downgrade blocked inline if member count exceeds target tier — message + link to /kollektivak
- [ ] "Lemondás": ConfirmModal → Creem API cancel → collective stays active until billing period ends → webhook fires → frozen
- [ ] Not-activated collective card: single "Aktiválás" button (tier picker → Creem checkout)
- [ ] Frozen collective card: single "Előfizetés folytatása" button (→ Creem portal)

### Pending — /kollektivak UI

- [ ] In-context upsell when creating additional collective (Basic or XS-only user) → routes to /elofizetes
- [ ] Seat usage shown per collective
- [ ] Delete button: hidden for inclusive and active collectives
- [ ] Frozen state: read-only badge + reactivation CTA

### Pending — Creem products (create in dashboard)

- [ ] `okosszaki_premium` — 7.990 Ft/month
- [ ] `okosszaki_kollektiv_s` — 4.500 Ft/month (3 seats)
- [ ] `okosszaki_kollektiv_m` — 9.000 Ft/month (6 seats)
- [ ] `okosszaki_kollektiv_l` — 13.500 Ft/month (9 seats)
