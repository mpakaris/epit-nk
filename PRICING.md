# OkosSzaki — Pricing Strategy & Implementation Spec

> **Status:** Design finalized. Creem.io integration wired for Premium checkout + webhooks. Collective tier enforcement and freeze logic pending.
> **Last updated:** 2026-10-20
> **Payment provider:** Creem.io (test mode). Products live in test dashboard. Set `CREEM_WEBHOOK_SECRET` in `.env.local` after registering the webhook URL in the Creem dashboard.

---

## Table of Contents

1. [Subscription Tiers](#1-subscription-tiers)
2. [Trial Logic](#2-trial-logic)
3. [Collective Packages](#3-collective-packages)
4. [Billing Model](#4-billing-model)
5. [Collective Lifecycle](#5-collective-lifecycle)
6. [Basic Plan Limit Enforcement](#6-basic-plan-limit-enforcement)
7. [DB Schema](#7-db-schema)
8. [User Stories](#8-user-stories)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Open Questions](#10-open-questions)

---

## 1. Subscription Tiers

### Personal account tiers

| Tier | Monthly price | Limits | Notes |
|---|---|---|---|
| **Bázis** (Basic) | Ingyenes | max 5 felmérés, max 5 ajánlat, max 1 projekt | Default after trial expires |
| **Próba** (Trial) | Ingyenes | Full Premium features | 14 days, auto-assigned on first registration |
| **Prémium** | 6.999 Ft + ÁFA | Unlimited everything | Required to create a Kollektíva |

### Key rules

- Basic users **can be invited** into a Kollektíva without upgrading their personal account.
- Inside a Kollektíva, Basic members work without limits (collective resources are the owner's).
- Basic limits only apply to a user's **personal workspace** (`collective_id IS NULL`).
- Premium is always **required** to create or own a Kollektíva — not to join one.
- Superadmin can manually override `is_subscription_premium` and `subscription_tier` for any user.

---

## 2. Trial Logic

- Every **first-time registration** with a given email address gets a 14-day free Premium trial.
- Trial is tracked at the **email level** in the `trial_emails` table, not just the profile.
  - This prevents re-registering with the same email to reset the trial clock.
  - If someone deletes their account and re-registers with the same email: no trial — they go directly to Basic.
- Trial tier behaves identically to Premium: unlimited resources, can create a Kollektíva.
- `isEffectivePremium(profile)` in `src/lib/subscriptionLimits.js` returns `true` for both paid Premium and an active trial.
- When the trial expires: account silently downgrades to Basic. No data is deleted.
- Trial days configurable in `pricing_config` table (key: `trial_days`, default: 14).

### Trial expiry UX

- `/elofizetes` shows a yellow banner with days remaining while on trial.
- On expiry, user is shown an upgrade prompt the next time they hit a Basic limit.
- No email notification implemented yet (future: Creem/transactional email on day 11).

---

## 3. Collective Packages

Kollektíva is an **add-on** on top of a Premium personal subscription. The owner always pays both.

### Packages (fixed tiers — no per-seat granularity)

| Package | Extra seats | Total members incl. owner | Monthly price | Total cost incl. Premium |
|---|---|---|---|---|
| **Kis csapat** | 3 | 4 | 5.999 Ft + ÁFA | 12.998 Ft + ÁFA |
| **Közepes csapat** | 6 | 7 | 11.999 Ft + ÁFA | 18.998 Ft + ÁFA |
| **Nagy csapat** | 9 | 10 | 17.999 Ft + ÁFA | 24.998 Ft + ÁFA |
| **Vállalati** | 10+ | custom | Egyedi ajánlat | — |

### Seat counting rules

- The **owner is never counted** as a seat. They are always included for free.
- "3 extra seats" means 3 invited members beyond the owner.
- If the collective is at seat capacity, the invite flow blocks adding more members with a clear message and an upgrade prompt.
- A Basic user counts as a full seat when invited.

### Why fixed packages (not per-seat)

Per-seat (quantity-based) Creem subscriptions require prorated mid-cycle charges when a seat is added. This creates confusing partial invoices (e.g. "973 Ft charged today"). Fixed packages eliminate this: upgrading is a clean plan swap, prorated by Creem as a standard subscription change.

### Upgrading between packages

1. Owner clicks "Csomag bővítése" in the Kollektíva settings.
2. Redirected to Creem checkout for the higher tier.
3. Creem prorates the difference from the current billing date.
4. Creem fires a `subscription.updated` webhook → app updates `collectives.collective_tier`.
5. New seat slots immediately available for invitations.

---

## 4. Billing Model

### Two separate Creem subscriptions

The owner manages **two independent subscriptions**:

| Subscription | Creem product | What it covers |
|---|---|---|
| Premium personal | `okosszaki_premium` | Personal account unlimited access |
| Kollektíva package | `okosszaki_kollektiv_kis` / `_kozepes` / `_nagy` | Collective workspace + seat slots |

**Why separate:** The owner may want to dissolve a Kollektíva (e.g. a project ends) while keeping their personal Premium account. Bundling would force them to cancel Premium too.

### Creem webhook events to handle

| Event | Action in app |
|---|---|
| `subscription.created` | Set `is_subscription_premium = true` or activate collective tier |
| `subscription.updated` | Update `collective_tier` on seat upgrade/downgrade |
| `subscription.canceled` | Schedule freeze at end of billing period |
| `subscription.payment_failed` | Start grace period (3–7 days), notify owner |
| `subscription.payment_succeeded` | Clear any grace period flag |
| `customer.updated` | Sync email if changed |

### Grace period on payment failure

- Creem retries failed payments automatically (typically 3 attempts over ~5 days).
- App should **not immediately freeze** on first failure — wait until Creem confirms cancellation.
- Suggested: set `subscription_grace_until` on profiles/collectives. Freeze only when `grace_until < NOW()`.

---

## 5. Collective Lifecycle

### Status field

```sql
collectives.status TEXT CHECK (status IN ('active', 'frozen', 'deleted')) DEFAULT 'active'
```

### State transitions

```
[Registration + collective created]
        │
        ▼
     ACTIVE ──────────────────────────────────────────────┐
   (full r/w)                                              │
        │                                                  │
        │ Owner cancels collective subscription            │ Owner's Premium also lapses
        │ OR owner's Premium lapses                        │ (same outcome)
        ▼                                                  │
     FROZEN ◄─────────────────────────────────────────────┘
  (read-only)
        │                          │
        │ Owner reactivates        │ Owner deletes collective
        │ subscription             │
        ▼                          ▼
     ACTIVE                     DELETED
                              (soft-deleted)
```

### Access matrix per status

| Action | Active | Frozen | Deleted |
|---|---|---|---|
| Read all collective data | ✅ all members | ✅ all members | ❌ nobody |
| Create/edit/delete entries | ✅ all members | ❌ nobody | ❌ nobody |
| Invite new members | ✅ owner | ❌ | ❌ |
| Accept pending invitation | ✅ | ❌ (auto-retracted) | ❌ |
| Delete the collective + all data | ✅ owner | ✅ owner only | — |
| Reactivate | — | ✅ owner (via Creem) | ❌ permanent |

### Frozen state UX

- Collective remains visible in the sidebar with a `🔒 Felfüggesztett` badge.
- A yellow banner appears at the top of every collective view explaining the freeze and providing a link to reactivate.
- Members see: *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- Owner sees additional button: *"Előfizetés folytatása"* (links to Creem customer portal) and *"Kollektíva törlése"*.

### Pending invitations on freeze

- Any `status = 'invited'` records in `collective_members` are automatically set to `status = 'retracted'` when the collective is frozen.
- Invited users who click an old invitation link see: *"Ez a meghívó már nem érvényes."*

---

## 6. Basic Plan Limit Enforcement

Limits enforced at the **API level** in POST handlers. Client-side UI should also disable creation buttons and show upgrade prompts, but server-side is the authoritative check.

### Current limits (configurable in `pricing_config` table)

| Resource | Basic limit | Config key |
|---|---|---|
| Felmérések (Surveys) | 5 | `basic_max_surveys` |
| Ajánlatok (Quotes) | 5 | `basic_max_quotes` |
| Projektek (Projects) | 1 | `basic_max_projects` |

### Enforcement rules

- Limits apply **only in personal context** (`collective_id IS NULL`).
- In a collective context, limits are never checked — the owner's subscription covers it.
- Superadmins are never limited.
- Soft-deleted records (`deleted_at IS NOT NULL`) do **not** count toward the limit.
- `checkPersonalLimit(admin, userId, table, configKey)` in `src/lib/subscriptionLimits.js` performs the count + config lookup in parallel.

### Error response on limit reached (HTTP 403)

```json
{ "error": "Bázis csomagban maximum 5 felmérés hozható létre. Váltj Prémiumra a korlátlan használathoz." }
```

---

## 7. DB Schema

### profiles (additions from migration 076)

```sql
subscription_tier   TEXT        NOT NULL DEFAULT 'basic'
                    CHECK (subscription_tier IN ('basic', 'trial', 'premium'))
trial_started_at    TIMESTAMPTZ
trial_ends_at       TIMESTAMPTZ
-- existing:
is_subscription_premium  BOOLEAN DEFAULT false
```

### trial_emails

```sql
CREATE TABLE public.trial_emails (
  email            TEXT        PRIMARY KEY,
  user_id          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

One row per email address, ever. Prevents re-registration from re-triggering the trial.

### collectives (additions needed — not yet in migration 076)

```sql
-- Already exists (migration 062):
subscription_type   TEXT  -- legacy, was 'premium'|'seats'
seat_count          INTEGER

-- Needs to be added:
status              TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'frozen', 'deleted'))
collective_tier     TEXT CHECK (collective_tier IN ('small', 'medium', 'large', 'enterprise'))
                    -- small=3 seats, medium=6, large=9
deleted_at          TIMESTAMPTZ  -- soft delete timestamp
```

### pricing_config

```sql
CREATE TABLE public.pricing_config (
  key        TEXT    PRIMARY KEY,
  value      NUMERIC NOT NULL,
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seeded values:**

| key | value | label |
|---|---|---|
| `premium_monthly_huf` | 6999 | Prémium előfizetés (Ft/hó) |
| `seat_monthly_huf` | 1999 | Kollektíva szék (Ft/szék/hó) — reference only |
| `collective_small_huf` | 5999 | Kis csapat csomag (Ft/hó) |
| `collective_medium_huf` | 11999 | Közepes csapat csomag (Ft/hó) |
| `collective_large_huf` | 17999 | Nagy csapat csomag (Ft/hó) |
| `basic_max_surveys` | 5 | Bázis: max felmérések száma |
| `basic_max_quotes` | 5 | Bázis: max ajánlatok száma |
| `basic_max_projects` | 1 | Bázis: max projektek száma |
| `trial_days` | 14 | Ingyenes próbaidő (nap) |
| `collective_small_seats` | 3 | Kis csapat: extra tagok száma |
| `collective_medium_seats` | 6 | Közepes csapat: extra tagok száma |
| `collective_large_seats` | 9 | Nagy csapat: extra tagok száma |
| `payment_grace_days` | 5 | Fizetési hiba türelmi idő (nap) |

---

## 8. User Stories

### Personal account stories

**US-01 — New registration gets a trial**
> As a new user registering for the first time,
> I want to automatically get 14 days of free Premium access,
> so that I can evaluate the full product before deciding to pay.

Acceptance criteria:
- After registration, `subscription_tier = 'trial'` and `trial_ends_at = NOW() + 14 days`
- `/elofizetes` shows a yellow trial banner with the exact number of days remaining
- All Premium features (unlimited projects, surveys, quotes, collective creation) are accessible
- No credit card required at registration

---

**US-02 — Re-registration does not reset the trial**
> As a user who previously trialed and deleted their account,
> I want the system to remember my email was already trialed,
> so that the free trial cannot be exploited by re-registering.

Acceptance criteria:
- Re-registering with the same email gives `subscription_tier = 'basic'` immediately (no trial)
- `trial_emails` table has one row per email, permanent
- No error shown to the user — they just land on the Basic plan

---

**US-03 — Trial expiry**
> As a user whose 14-day trial has expired,
> I want to see a clear message explaining my account has reverted to Basic,
> so that I understand why I can no longer create more than 1 project.

Acceptance criteria:
- `isEffectivePremium` returns `false` after `trial_ends_at`
- Next time user tries to create a 2nd project, they receive: *"Próbaidőszakod lejárt. Váltj Prémiumra a korlátlan használathoz."*
- `/elofizetes` shows the Basic plan as current, with an upgrade CTA

---

**US-04 — Basic user hits project limit**
> As a Basic user who already has 1 project,
> I want to see a helpful error when I try to create a second one,
> so that I understand the limit and know how to upgrade.

Acceptance criteria:
- API returns HTTP 403 with Hungarian error message
- Frontend shows the error in a modal or toast (not a blank failure)
- Error message links or directs to `/elofizetes`
- Limit applies only in personal context — collective projects are unaffected

---

**US-05 — Premium upgrade**
> As a Basic or expired-trial user,
> I want to upgrade to Premium via the /elofizetes page,
> so that I can unlock unlimited projects, surveys, and quotes.

Acceptance criteria:
- "Váltás Prémiumra" button on `/elofizetes` initiates Creem checkout
- On successful payment, Creem webhook sets `is_subscription_premium = true`, `subscription_tier = 'premium'`
- User is immediately unblocked — no page refresh required (context refreshes on webhook or next login)
- *(Payment flow implementation: future)*

---

### Collective stories

**US-06 — Creating a Kollektíva requires Premium**
> As a Premium user,
> I want to create a Kollektíva and choose a seat package,
> so that I can invite my team to a shared workspace.

Acceptance criteria:
- Basic users see "Prémium előfizetés szükséges" and cannot proceed to collective creation
- Trial users CAN create a collective (trial = effective Premium)
- Owner selects one of: Kis csapat (3), Közepes csapat (6), Nagy csapat (9)
- After Creem checkout, `collectives.collective_tier` is set and `status = 'active'`
- Owner is NOT counted as a seat

---

**US-07 — Inviting members up to seat limit**
> As a Kollektíva owner with a Kis csapat package (3 seats),
> I want to invite up to 3 members,
> and be blocked with an upgrade prompt when I try to add a 4th.

Acceptance criteria:
- Invite flow counts `collective_members` where `status IN ('active', 'invited')` for this collective (excluding owner)
- On attempt to invite member #4: HTTP 403 + *"Elérted a csomag taglétszám-korlátját. Bővítsd a csomagot a további meghíváshoz."*
- Upgrade CTA shown in the invite modal
- Basic users can be invited (they count as a full seat)

---

**US-08 — Member quits the collective**
> As a collective member,
> I want to leave a collective I no longer work with,
> so that I no longer see it in my sidebar.

Acceptance criteria:
- Member can click "Kilépés a kollektívából" in collective settings
- `collective_members.status` set to `'left'` (or record deleted — TBD)
- Member immediately loses access to the collective workspace
- All entries the member created in the collective **remain** in the collective
- Member's personal workspace is completely unaffected
- The vacated seat is immediately available for a new invitation (seat count recalculated)
- Collective owner is notified (future: email/in-app notification)

---

**US-09 — Owner cancels collective subscription**
> As a Kollektíva owner who has finished a project and no longer needs the shared workspace,
> I want to cancel the collective subscription,
> so that my team can still read historical data but the workspace is locked for editing.

Acceptance criteria:
- Cancellation happens via Creem customer portal
- At end of billing period, Creem fires `subscription.canceled` webhook
- App sets `collectives.status = 'frozen'`
- All `status = 'invited'` invitations are auto-retracted
- Every collective page shows a frozen banner: *"Ez a kollektíva felfüggesztve. Az adatok olvashatók, de nem szerkeszthetők."*
- All write operations (POST/PATCH/DELETE) in collective context return HTTP 403
- Owner sees "Előfizetés folytatása" and "Kollektíva törlése" buttons
- Owner's Premium personal subscription is **not affected**

---

**US-10 — Owner's Premium lapses, collective auto-freezes**
> As a collective owner whose Premium subscription has lapsed (payment failure or cancellation),
> I want the collective to automatically freeze,
> so that members are not left in a broken half-accessible state.

Acceptance criteria:
- When `is_subscription_premium` becomes `false` for a collective owner, any `active` collectives they own are set to `frozen`
- This can happen via webhook (payment failure) or superadmin toggle
- UX is identical to US-09 (frozen banner, read-only)
- Reactivating Premium does NOT automatically unfreeze the collective — owner must also reactivate the collective subscription separately

---

**US-11 — Owner deletes the collective**
> As a Kollektíva owner of a frozen or active collective,
> I want to permanently delete the collective and all its data,
> so that the project history is fully removed.

Acceptance criteria:
- Only the owner can trigger deletion
- Confirmation modal: *"Biztosan törlöd a kollektívát és az összes adatát? Ez a művelet nem visszavonható."*
- On confirm: `collectives.status = 'deleted'`, `deleted_at = NOW()`
- Cascade soft-delete all `projects`, `quotes`, `surveys` with `collective_id = X` (set `deleted_at`)
- All `collective_members` records set to `status = 'left'`
- Collective disappears from all members' sidebars immediately
- If collective was `active` at time of deletion: Creem collective subscription is also canceled via API call
- Owner's Premium subscription is not affected

---

**US-12 — Reactivating a frozen collective**
> As a Kollektíva owner who previously canceled the collective subscription,
> I want to reactivate it,
> so that my team can resume editing where we left off.

Acceptance criteria:
- Owner clicks "Előfizetés folytatása" in frozen collective view
- Redirected to Creem checkout for their previous collective tier (or allow tier change)
- On successful payment, `collectives.status = 'active'`
- All existing data immediately accessible for editing again
- Previous members who were active (not `left`) regain access automatically
- Retracted invitations are NOT automatically re-sent — owner must re-invite if needed

---

**US-13 — Payment failure grace period**
> As an owner whose payment method has temporarily failed,
> I want a grace period before my account is frozen,
> so that a transient card issue doesn't disrupt my team mid-project.

Acceptance criteria:
- On `subscription.payment_failed` webhook: set `subscription_grace_until = NOW() + grace_days` (from `pricing_config.payment_grace_days`, default 5)
- Account remains fully functional during grace period
- Dashboard shows warning banner: *"Fizetési probléma — rendezd a számlázást X napon belül a megszakítás elkerüléséhez."*
- If payment succeeds before grace expires: `grace_until` cleared, no freeze
- If grace expires without successful payment: freeze triggered as per US-09/US-10

---

**US-14 — Superadmin manages subscriptions**
> As a superadmin,
> I want to manually toggle Premium status and view all users' subscription tiers,
> so that I can handle edge cases, refunds, and support requests.

Acceptance criteria:
- `/superadmin/subscriptions` shows all users with current tier, trial dates, owned collectives
- Toggle Premium on/off for any user (also syncs `subscription_tier`)
- `/superadmin/pricing` allows editing all `pricing_config` values inline
- Changes to pricing_config take effect immediately on next API call (no cache)

---

**US-15 — Basic user invited to a collective**
> As a Basic user who receives a collective invitation,
> I want to accept and work within the collective without needing a Premium subscription,
> so that I can contribute to a shared project without any personal cost.

Acceptance criteria:
- Invitation acceptance flow has no paywall for Basic users
- Inside the collective, Basic user can create projects, surveys, quotes without hitting their personal limits
- Basic user's personal workspace remains capped at Basic limits
- Basic user counts as one seat against the owner's collective package

---

## 9. Implementation Checklist

### Already done (migration 076 + current codebase)

- [x] `profiles.subscription_tier`, `trial_started_at`, `trial_ends_at` columns added
- [x] `trial_emails` table created
- [x] `pricing_config` table created and seeded (partial — needs collective tier prices added)
- [x] `handle_new_user` trigger updated for trial assignment and email-level abuse prevention
- [x] `isEffectivePremium()` helper in `src/lib/subscriptionLimits.js`
- [x] `checkPersonalLimit()` helper in `src/lib/subscriptionLimits.js`
- [x] Basic limits enforced in `POST /api/surveys`, `POST /api/quotes`, `POST /api/projects`
- [x] AppContext passes through `subscription_tier`, `trial_ends_at` to `currentUser`
- [x] `/elofizetes` updated with correct prices and trial banner
- [x] Landing page `FREE_ITEMS` updated to reflect actual limits (5/5/1)
- [x] `/superadmin/pricing` page for editing pricing_config
- [x] Superadmin premium toggle syncs `subscription_tier`

### Pending — next implementation session

#### DB (new migration needed)

- [ ] Add `collectives.status` ('active'|'frozen'|'deleted')
- [ ] Add `collectives.collective_tier` ('small'|'medium'|'large'|'enterprise')
- [ ] Add `collectives.deleted_at`
- [ ] Add `profiles.subscription_grace_until` (for payment failure grace period)
- [ ] Add collective tier prices to `pricing_config` (`collective_small_huf`, `collective_medium_huf`, `collective_large_huf`, `collective_small_seats`, etc.)
- [ ] Remove/deprecate `collectives.subscription_type` and `collectives.seat_count` (replaced by `collective_tier`)

#### Collective creation & seat enforcement

- [ ] Collective creation UI: seat package selection (Kis/Közepes/Nagy/Vállalati CTA)
- [ ] Block collective creation for Basic users (non-trial, non-premium)
- [ ] Invite flow: count active+invited members, block at tier limit
- [ ] `POST /api/collectives/[id]/invite` — enforce seat limit against `collective_tier`

#### Freeze logic

- [ ] `PATCH /api/collectives/[id]` — support `{ status: 'frozen' | 'active' | 'deleted' }`
- [ ] All collective write routes: check `collectives.status === 'active'` before allowing mutations
- [ ] Auto-retract pending invitations when collective is frozen
- [ ] Auto-freeze owner's collectives when `is_subscription_premium` is set to `false`
- [ ] Frozen banner component in collective layout
- [ ] Soft-delete cascade on collective deletion (projects, quotes, surveys, members)

#### Creem integration

- [ ] Create Creem products: `okosszaki_premium`, `okosszaki_kollektiv_kis`, `_kozepes`, `_nagy`
- [ ] Creem checkout buttons on `/elofizetes` and collective creation flow
- [ ] Webhook handler: `POST /api/webhooks/paddle`
  - [ ] `subscription.created` → activate tier
  - [ ] `subscription.updated` → update collective_tier
  - [ ] `subscription.canceled` → schedule freeze at period end
  - [ ] `subscription.payment_failed` → set grace period
  - [ ] `subscription.payment_succeeded` → clear grace period
- [ ] Store `paddle_subscription_id` on profiles and collectives for webhook reconciliation

#### UI updates

- [ ] `/elofizetes`: add Creem checkout buttons (currently buttons are inert)
- [ ] `/elofizetes`: show trial expiry warning with upgrade CTA
- [ ] Dashboard: show subscription status widget (trial days remaining / current plan)
- [ ] Collective settings: "Kollektíva törlése" button with confirmation modal
- [ ] Collective settings: "Előfizetés folytatása" button when frozen
- [ ] Sidebar: frozen badge on frozen collectives
- [ ] Invite modal: show seat usage (e.g. "2/3 szék foglalt") and upgrade CTA when full

---

## 10. Open Questions

- [ ] **Ownership transfer**: Can a collective owner transfer ownership to another member? Decision: not in Phase 1.
- [ ] **Downgrade between collective tiers**: If owner downgrades from Közepes (6) to Kis (3) but has 5 active members — what happens? Options: block downgrade until members are removed, or auto-remove newest members (bad). Likely: block and show which members to remove first.
- [ ] **VAT handling**: Creem/Cream handles ÁFA (VAT) automatically for EU customers. No app-side VAT logic needed.
- [ ] **Invoicing**: Creem/Cream acts as Merchant of Record — they issue invoices to customers. No custom invoice generation needed for subscriptions.
- [ ] **Annual billing**: Offer a discounted annual plan (e.g. 2 months free)? Not in Phase 1.
- [ ] **Notification emails**: Email on trial expiry (day 11 warning), collective freeze, payment failure. Not in Phase 1 — Creem handles payment emails; trial expiry email needs custom transactional setup.
- [ ] **Enterprise tier**: "Vállalati — Egyedi ajánlat" — contact form / email, no self-serve checkout. CTA links to `mailto:info@epitunk.hu` for now.
- [ ] **Collective across multiple owners**: Currently one owner per collective. Multi-owner not planned.
