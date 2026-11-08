# Message & Notification Feature — User Stories

## Overview

Two parallel systems:

1. **Notifications** — in-app bell (sidebar) fed by system events. Always targeted at a specific logged-in user.
2. **Message Threads** — persistent chat between a contractor and their own client, or between members of the same collective.

## Actors

| Actor | Description |
|---|---|
| **Contractor** | Any logged-in user (owner / admin / contributor) |
| **Client** | Unauthenticated person accessing `/clients/[id]` — the contractor's own client |
| **Collective Member** | Any active member of the same collective as the contractor |
| **System** | Automated trigger (quote status change, DB event, etc.) |

## Scoping Rules (non-negotiable)

- A contractor can only message clients where `clients.owner_id = contractor.user_id`. Cross-owner client messaging is blocked at both API and UI level.
- A contractor can only message people who are active members of one of their own collectives (`collective_members.collective_id` intersection). No cross-collective messaging.
- These rules apply regardless of role. Even a collective owner cannot message a client they do not personally own.

---

## Phase 1 — Client Actions + Notifications

### US-MSG-001 — Client accepts a quote
**As a client**, I want to accept a quote from the client portal so that the contractor knows I want to proceed.

**Acceptance criteria:**
- An "Accept" button is visible on each non-draft, non-expired quote in the client portal.
- Clicking it shows a confirmation step (not immediate).
- On confirm: quote status changes to `accepted`; a `notification` row is written for the contractor; the contractor receives an email.
- The button is replaced by an "Accepted" badge — the client cannot un-accept unilaterally.
- If the quote is already accepted/rejected, the button is hidden.

---

### US-MSG-002 — Client rejects a quote
**As a client**, I want to reject a quote so that the contractor is informed I won't proceed with this offer.

**Acceptance criteria:**
- A "Reject" button is visible alongside the Accept button on eligible quotes.
- Clicking it shows a confirmation + optional short reason field (free text, max 300 chars).
- On confirm: quote status changes to `rejected`; a `notification` row is written for the contractor; the contractor receives an email including the reason if provided.
- The button is replaced by a "Rejected" badge.

---

### US-MSG-003 — Client asks a question about a quote
**As a client**, I want to send a question about a quote so that I can get clarification before deciding.

**Acceptance criteria:**
- A "Ask a question" button is visible on each eligible quote in the portal.
- Clicking opens an inline text area (not a new page).
- On submit: a `thread` is created linked to the `quote_id` and `client_id`; a `message` row is written with `sender_type = 'client'`; a `notification` row is written for the contractor; the contractor receives an email with the question text and a link back to `/ugyfelek/[client_id]`.
- The question appears immediately in the portal as a sent message in the thread.
- Multiple questions on the same quote go into the same thread (not new threads each time).

---

### US-MSG-004 — Contractor sees notification bell
**As a contractor**, I want to see a notification badge on my sidebar so that I know when something needs my attention.

**Acceptance criteria:**
- A bell icon appears in the sidebar with a red badge showing the count of unread notifications.
- Badge disappears when all notifications are read.
- Clicking the bell opens a slide-in panel listing the most recent 20 notifications, newest first.
- Each item shows: icon (type), title, short body, relative time, and a "mark as read" action.
- Clicking a notification item navigates to the relevant context (e.g. the quote, the client page) and marks it as read.
- Badge count is polled or refreshed on page focus (no WebSocket required in Phase 1).

---

### US-MSG-005 — Contractor marks notifications as read
**As a contractor**, I want to mark notifications as read individually or all at once so that my badge count stays accurate.

**Acceptance criteria:**
- Each notification item has a "Mark read" button.
- A "Mark all read" button is at the top of the panel.
- `read_at` is set server-side on mark; the notification is not deleted.
- Resolved notifications (actioned, not just read) can be archived/dismissed separately — they still appear in a "History" section at the bottom of the panel.

---

### US-MSG-006 — System sends email on client action
**As a contractor**, I want to receive an email when a client accepts, rejects, or asks a question so that I am informed even when I am not logged in.

**Acceptance criteria:**
- Emails use the existing branded wrapper (`wrapEmail`).
- Accept email: subject "Árajánlatot elfogadtak — [quote title]", body includes client name, quote title, link to `/ajanlatok/[id]`.
- Reject email: subject "Árajánlatot elutasítottak — [quote title]", body includes reason if provided.
- Question email: subject "Kérdés érkezett — [quote title]", body includes the full question text and a link to the client page.
- Emails are sent to `profiles.email` of the quote's `owner_id`. Rate-limited: max 20 notification emails per contractor per hour.

---

## Phase 2 — Client–Contractor Messaging

### US-MSG-010 — Contractor replies to a client question
**As a contractor**, I want to reply to a client's question from my client page so that the client receives my answer.

**Acceptance criteria:**
- Visiting `/ugyfelek/[client_id]` shows an open thread for each quote that has a conversation.
- A reply input is visible at the bottom of each thread.
- On send: a `message` row is written with `sender_type = 'user'`; the client receives an email with the reply text and a link back to their portal.
- The contractor cannot message a client they do not own (`clients.owner_id ≠ user.id` → 403 at API level and thread is not shown in UI).

---

### US-MSG-011 — Client sees contractor reply in portal
**As a client**, I want to see the contractor's reply in my portal so that I have the full conversation in one place.

**Acceptance criteria:**
- The portal shows the full thread for each quote — client messages and contractor replies in chronological order.
- New contractor replies are shown without requiring a page reload (polling every 30 s is acceptable in Phase 2).
- Unread replies are visually highlighted.
- The client does not need a login — they access via the portal URL.

---

### US-MSG-012 — Contractor initiates a message to client (not in reply)
**As a contractor**, I want to send a proactive message to a client from their client page so that I can share updates without sending a formal quote.

**Acceptance criteria:**
- A "New message" button on `/ugyfelek/[client_id]` opens a message composer.
- The thread is not tied to a specific quote (`quote_id` is NULL — a general conversation thread per client).
- On send: message is stored; client receives an email notification with the message text.
- The contractor can only do this for clients they own (`clients.owner_id = user.id`).

---

### US-MSG-013 — Contractor sees all client conversations in one view
**As a contractor**, I want a "Messages" section that shows all open client conversations so that I don't have to visit each client page individually.

**Acceptance criteria:**
- A "Üzenetek" (Messages) entry appears in the sidebar (below Ügyfelek).
- It lists all threads where there is at least one unread message, grouped by client.
- Each row shows: client name, last message preview, relative time, unread count badge.
- Clicking a row navigates to `/ugyfelek/[client_id]` with the relevant thread expanded.
- The sidebar entry itself shows a badge count for total unread messages across all clients.

---

## Phase 3 — Collective Chat

### US-MSG-020 — Collective member sends a message to the team
**As a collective member**, I want to send a message to everyone in my collective so that I can share updates without leaving the app.

**Acceptance criteria:**
- A "Csapat chat" (Team chat) section is accessible from within the collective context.
- Any active member of the collective can post.
- Messages are visible to all active members of that collective only — not to members of other collectives.
- Cross-collective messaging is blocked at API level: `collective_id` is validated against the sender's membership before insert.

---

### US-MSG-021 — Collective member receives in-app notification on new team message
**As a collective member**, I want to see a notification when a teammate posts a message so that I don't miss updates.

**Acceptance criteria:**
- A `notification` row is written for every active member of the collective except the sender.
- The notification links to the collective chat context.
- Notification type: `collective_message`.
- Email is NOT sent for collective chat messages (too noisy). In-app notification only.

---

### US-MSG-022 — Collective chat scoped to a project or quote
**As a collective owner**, I want to have a focused conversation thread attached to a specific project or quote so that the discussion stays in context.

**Acceptance criteria:**
- Threads can optionally be linked to a `project_id` or `quote_id`.
- A "Csapat megbeszélés" (Team discussion) section appears at the bottom of a project or quote detail page when the user is in a collective context.
- Only members of the collective that owns the project/quote can see and post in that thread.
- General collective chat and project-specific threads are separate.

---

### US-MSG-023 — Collective member cannot contact members of other collectives
**As a system**, members of one collective must never be able to send messages to members of a different collective.

**Acceptance criteria:**
- Thread creation API validates that all participants share at least one `collective_id`.
- The UI never surfaces members of other collectives as message recipients.
- A direct API call attempting to create a cross-collective thread returns 403.

---

## DB Schema (target)

```sql
-- In-app notifications
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,          -- 'quote_accepted' | 'quote_rejected' |
                                          -- 'client_question' | 'client_message' |
                                          -- 'collective_message' | 'collective_activity'
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,                   -- navigation target on click
  source_type     TEXT,                   -- 'quote' | 'project' | 'thread' | 'collective'
  source_id       UUID,
  read_at         TIMESTAMPTZ DEFAULT NULL,
  resolved_at     TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation threads
CREATE TABLE public.threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,          -- 'client' | 'collective'
  client_id       UUID REFERENCES clients(id),
  quote_id        UUID REFERENCES quotes(id),
  project_id      UUID REFERENCES projects(id),
  collective_id   UUID REFERENCES collectives(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Messages within threads
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL,          -- 'user' | 'client'
  sender_user_id  UUID REFERENCES profiles(id),
  sender_client_id UUID REFERENCES clients(id),
  body            TEXT NOT NULL,
  read_at         TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Notification Types Reference

| `type` | Trigger | Email | In-app |
|---|---|---|---|
| `quote_accepted` | Client accepts via portal | ✅ | ✅ |
| `quote_rejected` | Client rejects via portal | ✅ | ✅ |
| `client_question` | Client asks question via portal | ✅ | ✅ |
| `client_message` | Client sends message via portal | ✅ | ✅ |
| `collective_message` | Team member posts in collective chat | ❌ | ✅ |
| `collective_activity` | Member adds section/entry to shared doc | ❌ | ✅ |
| `member_invited` | Owner invites a new member | ✅ (to invitee) | ❌ |
| `member_joined` | Invitee accepts invitation | ❌ | ✅ (to owner) |

---

## Out of Scope (explicitly excluded)

- Real-time WebSocket / Supabase Realtime in Phase 1 and 2 — polling is sufficient
- File attachments in messages (Phase 1 and 2 — text only)
- Read receipts shown to the other party
- Message editing or deletion
- Messaging clients owned by other contractors
- Messaging members of other collectives
- Push notifications (browser or mobile)
