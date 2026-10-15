# Roles, Permissions & Pricing

## Guiding Principle

The architecture is designed for future enterprise complexity but implemented in the
simplest possible form first. Columns and tables are created once — UI controls and
enforcement logic are added incrementally without DB migrations.

---

## Subscription Tiers

| Tier | Price | Own Projects | Can Create Collective |
|---|---|---|---|
| Free / Basic | free | max 1 project, limited uploads | ❌ |
| Premium | 5.000 Ft/month | unlimited | ❌ |
| Collective | Premium + 3.000 Ft/month + 2.000 Ft/seat | unlimited | ✅ |

**Collective billing rules:**
- Paid entirely by the Collective Admin (owner)
- Invited contributors pay nothing
- Invited contributors do NOT need Premium to accept an invitation
- Free users get full contributor access to collective projects but remain limited on their own account

**Growth funnel:** workers who become contractors will naturally upgrade to Premium.

---

## Roles

| Role | Scope | Notes |
|---|---|---|
| `owner` | Entity-level | Created the collective, pays the bill |
| `admin` | Entity-level | Promoted by owner; manages day-to-day |
| `contributor` | Project-level | Invited collaborator (e.g. worker, subcontractor) |

> **Phase 1 (now):** `admin` role exists in schema but is not active. Owner = Admin for all purposes.

---

## Permission Matrix

| Action | Owner | Admin | Contributor |
|---|---|---|---|
| Create project / survey / quote | ✅ | ✅ | ❌ |
| Read everything in shared projects | ✅ | ✅ | ✅ |
| Add diary entry / upload file | ✅ | ✅ | ✅ |
| Edit own pending/fresh uploads | ✅ | ✅ | ✅ |
| Edit others' content | ✅ | ✅ | ❌ |
| Delete anything | ✅ | ✅ | ❌ |
| Toggle show_to_client | ✅ | ✅ | ❌ |
| Approve contributor submissions | ✅ | ✅ | ❌ |
| Invite / remove contributors | ✅ | ✅ | ❌ |
| Promote user to Admin | ✅ | ❌ | ❌ |

---

## Phase 1 — Current Implementation (Simple)

**What works now:**
- Owner invites someone → contributor gets access to all entity projects
- Contributor can add entries and upload files
- Contributor cannot edit or delete anything except their own fresh uploads
- Owner controls `show_to_client` on all items
- Owner removes access at any time

**What is NOT active yet (schema ready, logic dormant):**
- Approval queue (`status: 'pending' | 'approved'` — defaults to `approved` for everyone)
- Per-project assignment (all contributors see all shared projects by default)
- Admin role (owner acts as admin)
- `auto_approve` flag (always `true` for now)

---

## DB Schema (enterprise-ready from day 1)

```sql
-- memberships: tracks who is in the collective
memberships (
  id            uuid,
  entity_id     uuid references entities,
  user_id       uuid references auth.users,
  role          text  CHECK (role IN ('owner', 'admin', 'contributor')),
  invited_by    uuid references auth.users,
  created_at    timestamptz
)

-- project_contributors: which projects a contributor can access + trust level
project_contributors (
  project_id    uuid references projects,
  user_id       uuid references auth.users,
  assigned_by   uuid references auth.users,
  auto_approve  boolean default true,   -- false = entries need admin approval
  created_at    timestamptz
)

-- on diary_entries, uploads, invoices, etc.
status        text CHECK (status IN ('approved', 'pending', 'rejected'))  DEFAULT 'approved'
approved_by   uuid references auth.users   -- null until approval workflow activated
approved_at   timestamptz
```

---

## Phase 2 — Approval Workflow (future)

When enabled per contributor (`auto_approve = false`):
- Contributor uploads → `status = 'pending'`  (not client-visible)
- Admin sees pending queue → approves → `status = 'approved'`
- Once approved, contributor loses edit rights on that item

Use case: junior workers whose entries need review before the client sees them.

---

## Phase 3 — Per-Project Assignment (future)

Admin dashboard assigns contributors to specific projects:

```
Project 1–10  │  User B  │  auto_approve: true   (trusted senior)
Project 11–15 │  User C  │  auto_approve: false  (junior, needs review)
```

No migration needed — `project_contributors` table already exists.

---

## Phase 4 — Full Admin Role (future)

Owner can promote a contributor to Admin:
- Admin manages invitations and approvals
- Admin cannot promote others to Admin (owner-only)
- Multiple Admins per collective supported

---

## Open Questions

- [ ] Should contributors see each other's uploads, or only their own + owner's?
- [ ] Notification system when owner approves/rejects a submission?
- [ ] Can contributors view client-facing PDFs/reports, or only raw project data?
