# Epitünk – Feature Tickets

---

## TICKET-01 · Bug Fix: Labour entries incorrectly treated as expenses

**Priority:** High (affects current users)

**Problem:**
When a member adds a labour/work invoice, the app treats it as a cost (subtracted from balance). Labour is income/value contributed — it should work in the opposite direction.

**Fix:**
- Invoices stay as costs only (materials, tools, transport, permits, etc.)
- Labour gets its own separate entry type and data model
- Remove the ability to enter negative invoice values (current workaround users tried)

---

## TICKET-02 · Labour Logging

**Priority:** High

**Description:**
Members need to log their own labour contributions to a project separately from costs.

**Data model — `labour_entries` table:**
- `id`
- `project_id`
- `uploaded_by` (always the logged-in user)
- `date` (date labour was performed)
- `labour_type` (free text, e.g. "plumbing", "drywall")
- `hours` (decimal)
- `hourly_rate` (Ft/h — set per entry, varies by work type)
- `value_huf` (computed: hours × hourly_rate)
- `description` (optional notes)
- `created_at`

**Rules:**
- Any member can log labour, but only for themselves
- Value = hours × hourly rate
- Labour value is split equally among all project members (same logic as costs, reversed direction)

**UI changes:**
- Upload page (`/projektek/[id]/feltoltes`): add toggle "Számla (költség)" vs "Munka (saját díj)"
- Each toggle shows a different form
- Labour form fields: date, type (free text), hours, hourly rate, description
- Auto-calculates and previews total value before saving

**Financials (`calculations.js`):**
- Add labour totals per project
- Per-member labour breakdown (hours, rate, value, balance)
- Combined settlement at the bottom factors in both cost balance and labour balance

**Project detail page:**
- Separate "Munka" section alongside existing "Számlák" section
- Updated settlement card combining both dimensions

---

## TICKET-03 · Calendar & Timeline View

**Priority:** Medium

**Description:**
Projects and quotes should be placeable in time and visualised on a calendar.

**Data model additions:**
- `projects`: add `start_date`, `end_date`
- `quotes`: add `start_date`, `end_date` (tentative)

**Calendar rules:**
- Projects (confirmed) → displayed in **green**
- Quotes (tentative) → displayed in **orange**
- Both appear on the same calendar so conflicts are visible at a glance

**Views to build:**
1. **Month-grid calendar** — full calendar view, desktop-friendly
2. **Timeline/list view** — chronological list of upcoming projects & quotes, mobile-friendly
3. Both views available, user can toggle between them

**Homepage/Dashboard:**
- Mobile: show "Upcoming" list (next 5 events, timeline style)
- Desktop: show mini month-grid widget or upcoming list — decide based on available space

**Conflict detection (for Quotes module):**
- When scheduling a quote, warn if dates overlap with an existing confirmed project
- Warning is advisory only — user can proceed anyway

---

## TICKET-04 · Quotes Module

**Priority:** Medium

**Description:**
Members can create multi-contributor quotes for potential projects. Accepted quotes convert into full projects.

**Data model — `quotes` table:**
- `id`
- `title`
- `location`
- `work_type` (e.g. "bathroom renovation", "fence construction")
- `description` (detailed notes)
- `start_date`, `end_date` (proposed time interval)
- `status`: `draft` | `sent` | `accepted` | `rejected`
- `client_id` (FK to clients table — see TICKET-05)
- `created_by`
- `created_at`

**Data model — `quote_entries` table (multi-contributor):**
- `id`
- `quote_id`
- `user_id` (the contributor)
- `work_description` (what this person is quoting)
- `amount_huf`
- `notes`
- `created_at`

**Multi-contributor flow:**
- Quote creator starts the quote (fills header: client, location, dates, work type)
- Creator can **invite** other members to contribute their own line item
- Each invited member adds their own entry (e.g. User 1: water & pipes, User 2: drywall, User 3: electrical)
- Total quote value = sum of all entries

**Status flow:**
- `draft` → creator assembles entries
- `sent` → quote delivered to client (manual status change)
- `accepted` → converts to a Project (see below)
- `rejected` → archived, visible in history

**Quote → Project conversion (on "Accepted"):**
- All quote fields carry over: title, location, work type, description, dates, client info
- Quote entries map to initial labour/cost expectations (for reference)
- Project is created and appears in the Projects tab
- Quote is archived but linked to the project for history

**Visibility:**
- All project members can view quotes
- Only the creator or an admin can change status

---

## TICKET-05 · Client Database

**Priority:** Medium (dependency for Quotes module)

**Description:**
Clients may return for future projects. A client database enables history tracking and potential loyalty discounts.

**Data model — `clients` table:**
- `id`
- `name`
- `address`
- `phone`
- `email`
- `notes`
- `discount_percent` (optional loyalty discount, default 0)
- `created_at`

**Features:**
- Admin can create/edit/delete clients
- When creating a quote, select an existing client or create a new one inline
- Client detail view shows: all quotes and projects linked to that client, total value of work done
- Optional: flag returning clients as eligible for discount (surfaced when creating a quote)

**UI:**
- New admin section: `/admin/ugyfelek`
- Client list with search
- Client detail page with history

---

## TICKET-06 · Supabase Schema Updates

**Priority:** Dependency for all above tickets

**Description:**
All new data models need to be reflected in `supabase/schema.sql` and applied to the live database.

**Tables to add/modify:**
- `labour_entries` (TICKET-02)
- `projects`: add `start_date`, `end_date` columns (TICKET-03)
- `quotes` (TICKET-04)
- `quote_entries` (TICKET-04)
- `clients` (TICKET-05)

**Also:**
- Update RLS (Row Level Security) policies for all new tables
- Members can read all entries within their projects
- Members can only insert/delete their own entries
- Admins have full access

---

## Build Order

1. **TICKET-06** — Schema first (everything depends on it)
2. **TICKET-01** — Bug fix (unblocks current users)
3. **TICKET-02** — Labour logging (highest user impact)
4. **TICKET-05** — Client database (dependency for quotes)
5. **TICKET-04** — Quotes module
6. **TICKET-03** — Calendar & timeline view
