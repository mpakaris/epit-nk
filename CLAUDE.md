@AGENTS.md

# Epitek — Architecture Reference for Claude

## Stack
- **Next.js** (App Router) + **Supabase** (Postgres + Auth)
- **Language:** All UI text must be in **Hungarian**
- All API routes use `createAdminClient()` (service role, bypasses RLS)
- RLS exists but is NOT enforced by the app — access control is done at application level

---

## User Roles (global)
| Role | Description |
|---|---|
| `superadmin` | Cross-entity god mode, `entity_id = NULL` in profiles |
| `admin` | Collective owner/admin — full access within their collective |
| `user` | Regular user — personal workspace only (free tier) |

Superadmin uses `/api/superadmin/data` (all entities).
Everyone else uses `/api/entity/data` (scoped to their active workspace).

---

## Workspace Model ("Google Drive meets Basecamp")

Every user has:
1. **Personal workspace** — private, always exists, identified by `user.id`
2. **Collective workspace** — shared team space, optional, paid subscription

```
profiles.active_collective_id = NULL   → personal context (default)
profiles.active_collective_id = UUID   → viewing a collective
```

Context switching is done via `PATCH /api/auth/context` with `{ collective_id }`.

---

## Key DB Tables

### New architecture (migration 052+)
```
collectives          id, name, created_at
collective_members   collective_id, user_id, role (owner|admin|contributor),
                     auto_approve, status (invited|active)
profiles             id (= user UUID), display_name, role, email,
                     active_collective_id, gdpr_consented_at,
                     must_change_password, is_subscription_premium
projects             id, owner_id, collective_id (nullable), created_by, ...
quotes               id, owner_id, collective_id (nullable), created_by, ...
surveys              id, owner_id, collective_id (nullable), created_by, ...
clients              id, owner_id (ALWAYS personal, never shared — GDPR), ...
```

### Old tables kept (migrations 052+053 — tables NOT dropped yet)
```
entities             still exists — personal + collective types
memberships          still exists — old role values: owner|admin|member
```
Migration 053 drops all old `entity_id` columns from profiles/projects/quotes/surveys/clients.
Migration 054 (pending) will drop the `entities` and `memberships` tables once god-mode
code is updated to use `collective_members` / `collectives`.

### Data scoping rules
- `projects/quotes/surveys`: personal = `owner_id = user.id AND collective_id IS NULL`
- collective context = `collective_id = X` only (separated views — no personal bleedthrough)
- `clients`: ALWAYS `owner_id = user.id` — never shared across collective (GDPR)
- `invoices/labour_entries`: scoped via `project_id` (inherit from project)

---

## Superadmin God Mode

SA impersonates any user:
- Cookie `god_mode_user` = impersonated user's UUID
- Cookie `god_mode_entity` = their active collective UUID (empty = personal)
- `entity/data` route reads these cookies when `profile.role === 'superadmin'`
- `refreshSupabaseData` checks `sessionStorage.getItem('god_mode')` to confirm active impersonation before overwriting SA's global state

---

## Subscription Tiers
| Tier | Price | Notes |
|---|---|---|
| Free / Basic | free | max 1 project, limited uploads |
| Premium | 5.000 Ft/month | unlimited, required to create collective |
| Collective | Premium + 3.000 Ft + 2.000 Ft/seat | owner pays everything; invited contributors pay nothing and don't need Premium |

Field: `profiles.is_subscription_premium` (boolean)

---

## Self-Registration Flow
- `/` landing page has `AuthModal` with login/register/forgot views
- `registerWithEmail(name, email, password, gdprConsentedAt)` calls `supabase.auth.signUp()`
- `handle_new_user` DB trigger creates the profile row on signup
- No personal entity is created for new users — personal workspace = `user.id` directly
- GDPR: `profiles.gdpr_consented_at` stored from signup metadata

---

## Collective Membership (collective_members)
```
role: 'owner'       — created the collective, pays the bill
role: 'admin'       — promoted by owner (Phase 4, not yet active)
role: 'contributor' — invited worker; can add but not edit/delete others' data
```
Old `memberships` table uses `owner|admin|member` (FK constraint — 'contributor' not valid there).

---

## API Patterns

### Auth check (all routes)
```js
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();  // verifies JWT
const admin = createAdminClient();                          // bypasses RLS
const { data: profile } = await admin.from('profiles').select('role, active_collective_id').eq('id', user.id).single();
```

### Data scoping in entity/data
```js
// personal context
.eq('owner_id', userId).is('collective_id', null)
// collective context (shows personal + collective)
.or(`collective_id.eq.${collectiveId},and(owner_id.eq.${userId},collective_id.is.null)`)
```

---

## AppContext (src/context/AppContext.jsx)
Key exported values:
- `currentUser` — effective user (real or impersonated)
- `activeCollectiveId` — null = personal, UUID = active collective
- `collectives` — list of user's collective memberships `{ collective_id, name, role }`
- `effectiveCollectives` — for impersonation picker
- `setActiveContext(collectiveId)` — switches workspace context
- `isSuperAdmin`, `isAdmin`, `impersonating`
- All data arrays: `projects`, `quotes`, `clients`, `invoices`, `surveys`, etc.

---

## File Structure (key paths)
```
src/
  app/
    page.js                        Landing page + AuthModal
    api/entity/data/route.js       Main data fetcher (scoped per user/context)
    api/auth/context/route.js      Context switcher (sets active_collective_id)
    api/auth/profile/route.js      Returns profile + collective memberships
    api/superadmin/data/route.js   SA global data (all entities/users)
    api/projects/route.js          Create project
    api/projects/[id]/route.js     Read/update/delete project
    api/quotes/[id]/route.js       Read/update/delete quote
    api/clients/route.js           Create client
    api/surveys/route.js           Create survey
    superadmin/page.js             Entity management + God Mode impersonation
    admin/felhasznalok/page.js     Collective member management
    projektek/page.js              Projects list (server component)
    projektek/[id]/page.js         Project detail (server component)
  components/
    Sidebar.jsx                    Nav + context switcher dropdown
  context/
    AppContext.jsx                 Global state + all data fetching
supabase/
  migrations/
    052_workspace_refactor.sql     New workspace model (collectives, owner_id, etc.)
    051_self_registration.sql      gdpr_consented_at, handle_new_user update
roles-permissions-pricing.md      Full permission matrix + future phases
```

---

## Known Issues / In Progress
- Migration 053 written — apply via Supabase SQL editor to drop old entity_id columns
- RLS policies still reference old `current_entity_id()` function — not enforced, rewrite pending
- `admin` role in collective_members exists in schema but no UI to promote yet
- Approval workflow (`status: pending|approved`) schema exists, logic not active
- Per-project contributor assignment schema exists, logic not active
