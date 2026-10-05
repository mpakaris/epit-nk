# Agent Brief – Epitünk Feature Build

## What is Epitünk?

Epitünk is a Next.js 15 (App Router) web app for small consortiums of 4–5 independent contractors who collaborate on shared projects. They split costs equally and share labour contributions. The app manages projects, invoices (shared costs), and will soon manage labour logs, quotes, and client relationships.

**Stack:** Next.js 15 (App Router, `src/` directory), Supabase (Postgres + Auth + Storage), plain CSS (globals.css with CSS custom properties), no UI library.

**Key files:**
- `src/context/AppContext.jsx` — all data fetching, mutations, and demo-mode fallback (localStorage)
- `src/lib/calculations.js` — financial logic (costs split, member balances, settlement)
- `src/app/projektek/[id]/page.js` — project detail page (members view)
- `src/app/projektek/[id]/feltoltes/page.js` — mobile upload page for invoices
- `src/app/admin/` — admin-only pages
- `src/components/Modal.jsx` — exports `Modal` (default), `ConfirmModal`, `AlertModal`
- `supabase/schema.sql` — database schema
- `TICKETS.md` — all feature tickets with full specs

**Important — demo mode:** When `NEXT_PUBLIC_SUPABASE_URL` is not set, the app runs in demo mode using localStorage. All AppContext functions have an `if (isConfigured)` branch for Supabase and an `else` branch for localStorage. Every new feature must implement both branches.

**Design rules:**
- Mobile-first. The app is used on phones on construction sites.
- No browser `alert()` or `confirm()` — use `ConfirmModal` / `AlertModal` from `@/components/Modal`
- No comments in code unless the WHY is non-obvious
- Match existing CSS patterns — use CSS custom properties (`var(--accent)`, `var(--danger)`, etc.)
- All user-facing text is in Hungarian

---

## Your task

Work through the tickets in `TICKETS.md` **in build order**:

1. **TICKET-06** — Add new tables/columns to `supabase/schema.sql`
2. **TICKET-01** — Fix: labour entries were being treated as expenses (remove negative invoice support, clarify invoice = cost only)
3. **TICKET-02** — Labour logging feature (full implementation)
4. **TICKET-05** — Client database (admin CRUD + inline creation from quote form)
5. **TICKET-04** — Quotes module (multi-contributor, status flow, → Project conversion)
6. **TICKET-03** — Calendar & timeline view

For each ticket:
- Read the relevant existing source files before writing anything
- Update `supabase/schema.sql` for any new tables
- Add AppContext functions (with both Supabase + localStorage branches)
- Update `calculations.js` if financials are affected
- Build the UI following existing patterns
- Do not use `alert()`/`confirm()` — use the Modal components
- Commit changes per ticket with a clear message

Read `TICKETS.md` in full before starting.
