# Client Portal — Action Plan

## Goal

Each client gets a personal landing page (`/clients/[id]`) where they can:
- See project information, diary entries, and media
- Review published survey results
- Review, accept, or refuse offers (árajánlatok)
- See payment requests from the contractor and their payment status

---

## Current State

- `/clients/[id]` exists and shows quotes + project diary (read-only, no auth)
- Invoices in DB are contractor costs — not payment requests to the client
- No survey visibility to client
- No quote accept/refuse UI
- No payment request concept

---

## Auth Strategy

**Decision: URL-token access (no mandatory login)**

Clients access their portal via a secret link. No password required.

- Each `clients` row gets a `portal_token UUID` column (generated on creation, never exposed in admin URLs).
- Portal URL: `/p/[token]` (already exists as a route stub at `/p`) or keep `/clients/[id]` and add a `?token=xxx` param check.
- The server validates the token and renders the portal — no session, no cookie.
- **Optional upgrade path**: contractor can send a magic-link email (generate a signed URL with expiry). No full auth system needed now.
- Clients with no token never see the portal — contractor controls access by sharing the link.

**Why not email/password:** Clients "may use the portal but don't have to." Forcing account creation creates friction and support burden. A secret URL is standard for client-facing portals (Notion share links, invoice portals, etc.).

---

## Data Model Changes

### Migration: `payment_requests`

```sql
CREATE TABLE public.payment_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id   UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  amount_huf  INTEGER NOT NULL CHECK (amount_huf > 0),
  due_date    DATE,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at     TIMESTAMPTZ,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration: `portal_token` on clients

```sql
ALTER TABLE public.clients
  ADD COLUMN portal_token UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX clients_portal_token_idx ON public.clients(portal_token);
```

### Migration: `published` flag on surveys

```sql
ALTER TABLE public.surveys
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;
```

---

## User Stories

### US-1: Contractor publishes a survey for the client

> As a contractor, I want to mark a survey as "published" so the client can see the room layout and site photos in their portal.

**Acceptance criteria:**
- Toggle "Megosztás ügyféllel" on the survey detail page (`/felmeres/[id]`)
- Published surveys appear in the client portal under a "Felmérés" section
- Shows room name, size (m²), description, and photos

---

### US-2: Client accepts or refuses a quote

> As a client, I want to click "Elfogadom" or "Elutasítom" on a quote so the contractor knows my decision without a phone call.

**Acceptance criteria:**
- Quotes in status `sent` show two action buttons on the client portal
- Clicking "Elfogadom" → PATCH `/api/quotes/[id]/client-response` with `{ status: 'accepted', token }`
- Clicking "Elutasítom" → same endpoint with `{ status: 'rejected', token }`
- API validates that the token matches the client linked to the quote
- After action: status badge updates, buttons disappear, confirmation message shown
- Contractor sees updated status in the admin quote view

---

### US-3: Contractor creates a payment request

> As a contractor, I want to create a payment request for a project so the client sees what they owe and by when.

**Acceptance criteria:**
- "Fizetési kérelem" button in project detail (`/projektek/[id]`)
- Form: title, amount (HUF), due date, optional note
- Saved to `payment_requests` table
- Appears in the client portal under the relevant project

---

### US-4: Client views payment requests

> As a client, I want to see all payment requests, their amounts, due dates, and whether they've been paid.

**Acceptance criteria:**
- "Fizetési kérelmek" section visible on client portal per project
- Shows: title, amount, due date, status badge (Függőben / Fizetve / Lejárt)
- Overdue = `due_date < today AND status = 'pending'` — shown in red

---

### US-5: Contractor marks a payment request as paid

> As a contractor, I want to mark a payment request as paid after receiving the money.

**Acceptance criteria:**
- In project detail, each payment request has a "Megérkezett" button (admin only)
- Updates `status = 'paid'`, sets `paid_at = now()`
- Client portal reflects the new status immediately

---

### US-6: Client portal access via token

> As a contractor, I want to share a secret link with my client so they can view their portal without creating an account.

**Acceptance criteria:**
- Portal is accessible at `/p/[portal_token]` (or `/clients/[id]?token=[token]`)
- Server validates token — 404 if invalid or missing
- "Megosztható link" button in the admin client detail page copies the link
- Token can be rotated (generates new UUID) — old links break

---

## Tickets (Implementation Order)

| # | Ticket | Depends on | Est. |
|---|--------|-----------|------|
| T-1 | Migration: add `portal_token` to `clients` | — | XS |
| T-2 | Migration: create `payment_requests` table | — | XS |
| T-3 | Migration: add `is_published` to `surveys` | — | XS |
| T-4 | `/p/[token]` route — validate token, render existing `ClientPortal` | T-1 | S |
| T-5 | "Copy portal link" button in `/ugyfelek/[id]` admin view | T-1 | S |
| T-6 | "Publish survey" toggle in `/felmeres/[id]` | T-3 | S |
| T-7 | Fetch + display published surveys in `ClientPortal` | T-3 | M |
| T-8 | Quote accept/refuse API endpoint (`/api/quotes/[id]/client-response`) | T-1 | S |
| T-9 | Accept/refuse buttons in `ClientPortal` QuoteCard | T-8 | S |
| T-10 | "New payment request" form in project detail | T-2 | M |
| T-11 | Payment request list in project detail (admin view) | T-2 | S |
| T-12 | "Mark as paid" action in project detail | T-2 | S |
| T-13 | Fetch + display payment requests in `ClientPortal` | T-2 | M |

**Size guide:** XS = <30 min, S = 30-90 min, M = 1-3 hours

---

## Open Questions / Deferred

- Email notification when contractor sends a quote or payment request (requires SMTP/Resend setup)
- Client-side "notes" or comments on payment requests
- PDF export of payment request (similar to quote PDF)
- Token rotation UI (low priority until portal is in active use)
