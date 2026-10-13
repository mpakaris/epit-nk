# Multi-Context Architecture
**Status:** Partially implemented — DB + context switcher done, personal workspace UI pending

---

## What was built

### Problem
A user needed to operate in two independent workspaces:
1. **Personal** — private solo contractor work (canvases, quotes, projects nobody else sees)
2. **Collective** — shared workspace with other contractors under a common entity (admin-led, admin pays)

One login, multiple contexts. The user must always know which context they are working in.

---

## Database changes

### Migration 033 — `memberships` table

```
memberships(
  id, user_id → profiles, entity_id → entities,
  role: 'owner' | 'admin' | 'member',
  status: 'active' | 'invited' | 'suspended',
  invited_by → profiles,
  joined_at, created_at
  UNIQUE(user_id, entity_id)
)
```

**What it replaced:** `profiles.entity_id` was a single static FK. Now a user can belong to multiple entities. `profiles.entity_id` is kept as legacy fallback — it is NOT removed.

**New column on `profiles`:** `current_entity_id` — tracks the user's currently active context (the context switcher writes here). Defaults to their existing `entity_id` from migration, so day-1 behavior is unchanged.

**New column on `entities`:** `type: 'personal' | 'collective'` — distinguishes private solo entities from shared ones. Default is `'collective'` so all existing entities are unaffected.

**RLS policies on `memberships`:**
- Superadmin: full access
- User: can read their own memberships
- Entity admin/owner: can read and manage all memberships within their entity

### Migration 034 — Personal entities

**Backfill (runs once):** For every existing non-superadmin user without a personal entity, creates `"<display_name> – Személyes"` entity (`type='personal'`) and an `owner` membership. Does not touch `current_entity_id` — existing users keep their collective as active context.

**Updated `handle_new_user` DB trigger:** Every new user created (via any method) now automatically gets:
1. Profile upserted (same as before)
2. Personal entity created (`"<name> – Személyes"`, `type='personal'`)
3. Personal membership inserted (`role='owner'`)
4. If assigned to a collective at creation: collective membership inserted + `current_entity_id = collective`
5. If no collective: `current_entity_id = personal`

---

## Code changes

### `/api/auth/profile` GET
Now also returns `memberships[]` alongside the profile:
```json
{
  "profile": { ...existing fields..., "current_entity_id": "uuid" },
  "memberships": [
    { "entity_id": "uuid", "entity_name": "Acme Kft.", "entity_type": "collective", "role": "admin" },
    { "entity_id": "uuid", "entity_name": "Niko – Személyes", "entity_type": "personal", "role": "owner" }
  ]
}
```

### `/api/auth/context` PATCH (new)
Switches the user's active context. Validates the user is an active member of the target entity before writing `current_entity_id` to the DB.

### `/api/entity/data` GET
Now resolves entity as `current_entity_id ?? entity_id`. Context switches take effect on the next data fetch.

### `AppContext.jsx`
- `memberships` state — loaded from profile API on init and login
- `current_entity_id` added to the in-memory user object
- `effectiveEntityId` now uses `current_entity_id ?? entity_id` instead of just `entity_id`
- `setActiveContext(entityId)` — optimistic UI update → PATCH API → re-fetch data

### `Sidebar.jsx`
A `ContextSwitcher` component renders a styled native `<select>` showing all the user's memberships. It appears in:
- Desktop sidebar (expanded only, below the brand header)
- Mobile bottom-sheet drawer (top of nav section)

**It is invisible when the user has only 1 membership** — no noise for users who aren't part of a collective yet.

---

## How context switching works end-to-end

```
User picks a different entity in the dropdown
  → setActiveContext(entityId) [AppContext]
    → optimistic: setCurrentUser({ ...user, current_entity_id: entityId })
    → PATCH /api/auth/context { entity_id }
      → DB validates membership exists and is active
      → UPDATE profiles SET current_entity_id = entityId
    → setDataReady(false)
    → refreshSupabaseData()
      → GET /api/entity/data
        → reads profile.current_entity_id from DB
        → returns all data scoped to new entity
    → state updated, UI re-renders with new entity's data
```

---

## What is NOT yet built

### 1. Creating a Collective (entity)
Currently only superadmin can create entities. A regular user (future: "collective founder") cannot create one. Needed:
- UI for any user to create a new collective entity
- They become `owner` of that entity automatically
- Billing association: the owner's subscription covers all members

### 2. Invitations
No invitation flow exists. Needed:
- Admin/owner can invite by email (existing user or new)
- Invitation creates a `memberships` row with `status='invited'`
- New: email dispatch (Supabase edge function or external service)
- Invited user sees a notification and can accept/decline
- On accept: `status → 'active'`, `current_entity_id` stays unchanged (user chooses when to switch)

### 3. Subscription / billing gate
The owner of a collective pays. Members are free rides. Currently there is no billing model in the DB. Needed:
- `subscriptions` table keyed to `entity_id` + `user_id` (owner)
- Gate: only entities with an active subscription can have data written to them
- Personal workspace: its own subscription tier (or a permanent free tier)

### 4. Per-item entity override on creation forms
Currently all new items (canvas/quote/project) get `entity_id = effectiveEntityId` (active context). Option C from the design discussion was to also allow a per-item override: the creation form pre-fills the active context but lets the user pick a different entity from a dropdown.

To implement: add an `entityId` field to each create form (Canvas, Quote, Project, Survey) populated from `memberships`, pre-selected to `effectiveEntityId`.

### 5. Personal context data isolation
When a user is in personal context (`entity_id = personal entity`), the `/api/entity/data` endpoint already scopes all data to that entity — so isolation is technically correct. However:
- The `visibleUsers` computed list will only show the user themselves (correct)
- There is no UI indication that data is private (a "Private" badge or lock icon on cards would help)
- Superadmin can still see personal entities in their entity list — should filter to `type='collective'` only

### 6. Collective admin panel
Currently `isAdmin` is derived from `profiles.role`. In the new model, a user can be `owner/admin` in one collective and `member` in another. Role should be derived from `memberships.role` for the active entity, not from `profiles.role` globally. This is a significant change that should be done carefully.

### 7. Leaving / removing from a collective
- Member can leave: `status → 'suspended'` or row deleted
- Admin can remove a member: same
- If the removed user's `current_entity_id` was that collective: auto-switch to personal
- Items created under that collective stay there (they belong to the entity, not the user)

---

## Current state summary

| Layer | Status |
|---|---|
| DB schema (memberships, personal entities, trigger) | Done |
| Context stored in DB (`current_entity_id`) | Done |
| Context switcher UI (sidebar + mobile) | Done — hidden until user has >1 membership |
| Data fetching respects active context | Done |
| Personal entity created for existing + new users | Done |
| Creating collectives | Not built |
| Invitation flow | Not built |
| Billing/subscription gate | Not built |
| Per-item entity selector on forms | Not built |
| Superadmin entity list filtered to collectives | Not built |
| Role derived from membership (not profile.role) | Not built |
| Leave/remove from collective | Not built |
