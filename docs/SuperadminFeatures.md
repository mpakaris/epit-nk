# Superadmin / God Mode — Feature Spec & Bug Backlog

This document covers every required change to the superadmin impersonation ("God Mode") system.
Bugs first, new features after. Each item is a self-contained user story with implementation detail.

---

## Background — How the System Works Today

### Identity layers

| State | Lives in | Meaning |
|---|---|---|
| `currentUser` | AppContext React state | SA's **own** profile. Must always be SA. |
| `impersonating` | AppContext React state | Impersonated user's profile. `null` = not impersonating. |
| `effectiveUser` | Derived: `impersonating \|\| currentUser` | What the UI sees. |

The context value exposes `currentUser: effectiveUser` to consumers, plus `realUser: currentUser`
as the escape hatch for SA's own identity.

`isSuperAdmin` is derived from `currentUser.role`, not `effectiveUser.role` — this is the correct
anchor; the bugs below break this invariant.

### Cookies

| Cookie | Value | Lifetime | Used by |
|---|---|---|---|
| `god_mode_user` | Impersonated user UUID | Session (tab close) | `/api/entity/data`, `/api/auth/profile` |
| `god_mode_entity` | Active collective UUID (empty = personal) | Session | `/api/entity/data` |

### SessionStorage

`sessionStorage['god_mode']` — JSON snapshot of the `impersonating` profile object. Written by a
`useEffect` that watches `impersonating` state. Read on page reload to restore cookies and
re-hydrate `setImpersonating`.

### Server-side resolution

`resolveEffectiveUserId(request, user, admin)` in `src/lib/godMode.js` — reads `god_mode_user`
from the cookie header. If the caller is superadmin AND the cookie is a valid UUID, returns the
impersonated user's ID. Otherwise returns the caller's own ID. Used in `/api/entity/data` and
`/api/auth/profile` GET.

---

## Bugs

---

### BUG-1 — Critical: SA loses `isSuperAdmin` on page reload while impersonating

**Severity:** Critical. After reload, SA cannot access `/superadmin` and the god-mode exit button
disappears.

**Reproduction:**
1. SA logs in, clicks "Enter" on any user card — impersonation starts.
2. SA reloads the page (F5 / Cmd+R).
3. SA is now inside the impersonated user's dashboard with no way to exit.

**Root cause:**

Two `useEffect([], ...)` hooks run on mount in `AppContext.jsx`:

1. `sessionStorageRestore` (line 279) — synchronous. Reads `sessionStorage['god_mode']`,
   calls `setGodCookie('god_mode_user', id)`. Cookie is **live immediately**.
2. `init()` (line 199) — async. Calls `fetchProfile()` → `GET /api/auth/profile`.

By the time `fetchProfile()` sends the request, the `god_mode_user` cookie is already set.
`/api/auth/profile` calls `resolveEffectiveUserId()`, reads the cookie, and returns the
**impersonated user's profile** instead of SA's own.

`init()` then builds `currentUser` using `role: profile.role` from that response. If the
impersonated user has `role: 'user'`, then `currentUser.role = 'user'` and
`isSuperAdmin = false`.

**Files:**
- `src/context/AppContext.jsx` — `init()` function, lines ~199–262
- `src/app/api/auth/profile/route.js` — GET handler

**Fix:**

Option A (recommended): Change `fetchProfile()` in `init()` to call
`/api/auth/profile?real=1`. Add a check in the GET handler: if `?real=1` is present, skip
`resolveEffectiveUserId` and always return the authenticated caller's own profile.

```js
// AppContext.jsx — fetchProfile()
const res = await fetch('/api/auth/profile?real=1');

// /api/auth/profile GET handler
const real = url.searchParams.get('real');
const effectiveId = real ? user.id : await resolveEffectiveUserId(request, user, admin);
```

Option B: In `init()`, after `setCurrentUser(user)`, check whether `user.role !== 'superadmin'`
but `sessionStorage['god_mode']` exists. If so, the profile was resolved against the impersonated
user — ignore the profile's role and re-fetch with `?real=1`.

Option A is cleaner. The `?real=1` flag also self-documents intent at the call site.

---

### BUG-2 — Medium: `setActiveContext` writes SA's own DB record during impersonation

**Severity:** Medium. SA accidentally changes their own `profiles.active_collective_id` in the
database when using the workspace switcher while in god mode.

**Root cause:**

`setActiveContext(collectiveId)` in `godModeActions.js` calls `PATCH /api/auth/context` which
updates `profiles.active_collective_id` for the JWT holder (= real SA). This is correct for
regular users. But the sidebar shows the workspace switcher to SA during impersonation too, and
calling `setActiveContext` there silently changes SA's own context, not the impersonated user's.

The correct function for impersonation context switching is `switchImpersonatingContext()`, which
is client-side only (updates cookie + reloads entity data, no DB write).

**Files:**
- `src/components/Sidebar.jsx` — workspace-switcher rendering, lines ~365–410
- `src/context/actions/godModeActions.js` — `setActiveContext` and `switchImpersonatingContext`

**Fix:**

In Sidebar, wherever the workspace/collective switcher is rendered, check `impersonating`:

```js
const handleContextSwitch = (collectiveId) => {
  if (impersonating) {
    switchImpersonatingContext(collectiveId);  // cookie-only, no DB
  } else {
    setActiveContext(collectiveId);            // writes DB
  }
};
```

Also check `src/context/AppContext.jsx` where `setActiveContext` is exposed in context value and
ensure there is no path where it is called while `impersonating !== null`.

---

### BUG-3 — Medium: Audit log actor is the impersonated user, not SA

**Severity:** Medium. Support cannot reconstruct who made a change because audit logs attribute
mutations to the impersonated user's ID when SA is acting in god mode.

**Root cause:**

Routes that use `resolveEffectiveUserId` get back the impersonated user's ID as `effectiveId`.
When those routes then call `logAudit({ userId: effectiveId, ... })`, the audit record shows the
impersonated user as the actor, hiding SA involvement.

**Files:**
- Any API route that calls both `resolveEffectiveUserId` AND `logAudit` — primarily under
  `src/app/api/` (quotes, projects, surveys, clients, invoices, diary, etc.)

**Fix:**

In every API route that calls `resolveEffectiveUserId`, the audit log must use the **real** caller
(`user.id` from JWT), not the effective ID. The impersonated user goes into `details`:

```js
const effectiveId = await resolveEffectiveUserId(request, user, admin);
// ... perform DB mutation ...
logAudit({
  userId:   user.id,               // real SA
  userName: profile.display_name,  // real SA's name (fetch SA's own profile for this)
  entityId: collectiveId || effectiveId,
  action:   'Project deleted',
  targetType: 'project',
  targetId:   project.id,
  details: {
    // include impersonation context when god mode is active
    ...(effectiveId !== user.id && {
      on_behalf_of:      effectiveId,
      impersonated_user: /* impersonated user's display_name */,
    }),
  },
});
```

Note: to get the impersonated user's display_name for the `details` field, a second profile fetch
is needed, or it can be omitted and replaced with just `on_behalf_of: effectiveId` (the UUID is
sufficient for support lookup).

---

## New Features

---

### FEAT-1 — SA Language Toggle (cookie-only, no DB write)

**User story:**
> As a Superadmin who does not speak Hungarian, I want to switch the page language to English (or
> German) so I can read the UI — without this change being saved to any user's profile in the
> database.

**Why this matters:**

The existing language switcher in `/profil` calls `PATCH /api/auth/profile` with `{ locale }`,
which writes permanently to `profiles.locale`. While the PATCH correctly uses the JWT `user.id`
(SA's real ID, not the impersonated user's), this is still undesirable:

- SA should not need to navigate to `/profil` to change language while in god mode.
- `/profil` while impersonating shows the impersonated user's profile settings — confusing.
- SA may not want to permanently change their DB locale; they just want to read the UI.

**What to build:**

Add a compact EN / DE / HU language toggle directly in the Sidebar — visible to SA in both states
(impersonating and non-impersonating). The toggle must:

1. Only set the `NEXT_LOCALE` cookie — no `PATCH /api/auth/profile`, no DB write.
2. Call `window.location.reload()` after setting the cookie.
3. Show the currently active locale as highlighted/bold.
4. Be present in both the **desktop sidebar** and the **mobile drawer**.

**Placement:**

- Desktop sidebar: add to the `sidebar-god-mode` section (lines 256–270 in `Sidebar.jsx`).
  When `isSuperAdmin && !impersonating`, render it in the same position (the god-mode strip is
  not shown when not impersonating — either add a new SA-only strip, or add the pills just below
  the god-mode banner in a separate `isSuperAdmin` conditional block).
- Mobile drawer: add to the `drawer-god-mode` section (lines 431–443).

**Implementation:**

```js
// In Sidebar.jsx
import { useTranslations, useLocale } from 'next-intl';

// Inside Sidebar component
const currentLocale = useLocale();

const handleSALocale = (lang) => {
  document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000;SameSite=Lax`;
  window.location.reload();
};

// JSX — render when isSuperAdmin, in both collapsed=false and mobile drawer
{isSuperAdmin && !collapsed && (
  <div style={{ display: 'flex', gap: '0.25rem', padding: '0.3rem 0.6rem' }}>
    {['hu', 'en', 'de'].map(lang => (
      <button
        key={lang}
        type="button"
        onClick={() => handleSALocale(lang)}
        style={{
          background: currentLocale === lang ? 'var(--primary)' : 'var(--bg-subtle)',
          color: currentLocale === lang ? '#fff' : 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.15rem 0.45rem',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {lang}
      </button>
    ))}
  </div>
)}
```

**What NOT to do:**

- Do not call `PATCH /api/auth/profile` — no DB write.
- Do not add this toggle to the existing `/profil` language section. That section stays as-is for
  regular users changing their permanent locale.
- Do not use `setCurrentUser` or `completeOnboarding` — those would mutate profile state.

---

## God Mode Rules — Reference

These rules must be respected by any agent working on the superadmin system.

### Rule GM-1: `currentUser` is always SA's own profile

`currentUser` must never be populated from an impersonated user's data. After BUG-1 is fixed,
`fetchProfile()` in `init()` must always use `?real=1` to bypass god mode cookie resolution.

### Rule GM-2: Profile endpoint — real vs effective

`/api/auth/profile` GET must support a `?real=1` flag that bypasses `resolveEffectiveUserId`.
`init()` always uses `?real=1`. All other callers may omit it (existing behavior).

### Rule GM-3: Two context-switchers, never confused

| Function | When to use | Side effect |
|---|---|---|
| `setActiveContext(id)` | Regular user switching their own workspace | Writes `profiles.active_collective_id` to DB |
| `switchImpersonatingContext(id)` | SA switching the impersonated user's visible context | Cookie-only, no DB write |

The workspace switcher UI must call the right one based on `!!impersonating`.

### Rule GM-4: Audit log actor = real SA, not effective user

When a mutation occurs while SA is impersonating, audit logs must use:
- `userId: user.id` (JWT holder = real SA)
- `details: { on_behalf_of: effectiveId }` when `effectiveId !== user.id`

### Rule GM-5: SA direct actions from `/superadmin` — no `resolveEffectiveUserId`

SA-only routes under `/api/superadmin/` must not call `resolveEffectiveUserId`. They accept an
explicit `userId` / `entityId` from the request body and operate on that target directly.

### Rule GM-6: `resolveEffectiveUserId` — only on user-facing dual-mode routes

Only add it to routes explicitly designed to work for both regular users and SA-impersonating.
Currently: `/api/entity/data`. Do not add it to new routes by default.

### Rule GM-7: SA language change is cookie-only

SA's page-language preference must never be written to `profiles.locale`. The SA language toggle
sets `NEXT_LOCALE` cookie + reloads. No `PATCH /api/auth/profile`.

### Rule GM-8: Cookie lifecycle order

**Start impersonation:**
1. Set cookies (`setGodCookie`) first
2. Set React state (`setImpersonating`) — triggers sessionStorage write via useEffect
3. Fetch data (`_loadEntityData`)
4. Navigate

**Stop impersonation:**
1. Clear React state (`setImpersonating(null)`) — triggers sessionStorage removal
2. Clear cookies
3. Refresh SA's own data (`refreshSupabaseData(currentUser)`)
4. Navigate to `/superadmin`

---

## Implementation Order (recommended)

| Priority | Item | Effort | Risk |
|---|---|---|---|
| 1 | BUG-1 — SA loses role on reload | Small | Low — isolated to init() + profile route |
| 2 | FEAT-1 — SA language toggle | Small | None — UI-only, no API changes |
| 3 | BUG-2 — setActiveContext during impersonation | Small | Low — UI guard only |
| 4 | BUG-3 — Audit log attribution | Medium | Low — log-only change, no business logic |
