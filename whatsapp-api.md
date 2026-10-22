# OkosSzaki — WhatsApp AI Assistant: User Stories

> Implementation order: **Owner functions → Member functions → Subbie functions**
> Each story is a small, independently testable unit. Do not start a story until its dependencies are marked ✅.
> The AI is a **conversational assistant** — it asks for clarification, remembers context within a session, and confirms before writing data.
> Every story includes an **Agent prompt** — a fully self-contained instruction for a fresh agent with no prior context.

---

## Codebase snapshot (read this before every story)

**Stack:** Next.js 16 App Router · Supabase Postgres · Cloudflare R2 · OpenAI GPT-4o (raw fetch, key: `OPEN_AI_OCR_KEY`) · Hungarian UI

**Key conventions:**
- All API routes use `createAdminClient()` from `src/lib/supabase/admin.js` (bypasses RLS)
- Auth check pattern: `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();`
- Webhook HMAC pattern: copy from `src/app/api/webhooks/creem/route.js`
- R2 helpers: `uploadToR2(key, buffer, mimeType)`, `r2PublicUrl(key)`, `toWebp(buffer)` — all in `src/lib/r2.js`
- Audit logging: `logAudit({ userId, userName, action, targetType, targetId, details })` in `src/lib/audit.js`
- All user-facing text must be in **Hungarian**
- GPT-4o calls use `response_format: { type: 'json_schema', json_schema: { strict: true, ... } }` — see `src/app/api/invoice-ai/route.js` lines 20–110 for the exact pattern
- No queue library — async work uses the `wa_processing_queue` DB table
- No middleware — every route does its own auth

**New env vars for WhatsApp:**
```
WHINSELF_BASE_URL=http://localhost:<PORT>
WHINSELF_WEBHOOK_SECRET=<secret>
INTERNAL_CRON_SECRET=<random-32-char>
```

---

## Media types supported

| Type | AI processing | Notes |
|---|---|---|
| **Audio** (.ogg, .mp3, .m4a) | OpenAI Whisper → Hungarian transcript | Voice notes from WhatsApp |
| **Image** (.jpg, .png, .webp) | GPT-4o Vision → classify: `invoice` \| `construction_site` \| `document` \| `unknown` | Auto-routes to the right action |
| **Video** (.mp4) | None — stored as-is | Attached to project diary or survey |
| **PDF** | GPT-4o (if ≤ 20 pages / ≤ 4MB) → extract key info | Helyrajz, permits, contracts |

---

## Conversation model

Every WhatsApp session has a **conversation state** stored in `wa_conversations`:
- `active_project_id` — the project currently being discussed
- `active_survey_id` — the survey currently being recorded
- `pending_clarification` — a question the bot asked, waiting for a reply
- `context_window` — last 6 message turns (user + assistant) sent to GPT for context
- Session expires after **4 hours** of inactivity

The bot **always asks before writing** when the destination is ambiguous. It **confirms after writing** so the user knows it worked.

---

## Story status legend

| Symbol | Meaning |
|---|---|
| 🔲 | Not started |
| 🔄 | In progress |
| ✅ | Done |

---

---

# PHASE 1 — Foundation (no AI yet)

> Goal: messages flow in and out. The bot can receive, store, and reply. No intelligence yet.

---

## WA-001 — Inspect Whinself API
**Status:** ✅
**As a** developer,
**I want to** document the exact Whinself webhook payload format and available send endpoints,
**so that** the webhook handler can be written against the real API.

**Tasks:**
- [ ] `docker inspect text-adventure` → find exposed port
- [ ] `docker exec text-adventure cat /app/README.md` (or check docs directory)
- [ ] Send a test WhatsApp message → log the raw webhook payload to console
- [ ] Document: webhook body shape, signature header name (if any), media URL format, sendText endpoint, sendFile endpoint

**Acceptance criteria:**
- A `whinself-api-notes.md` exists in repo root documenting confirmed payload format and endpoints
- We know whether Whinself supports HMAC webhook signatures

**Dependencies:** Docker running, `text-adventure` container healthy

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.
We are integrating WhatsApp via a self-hosted Whinself server running in a Docker container
named "text-adventure".

Your task is WA-001: inspect the Whinself container and document its API.

Steps:
1. Run: docker inspect text-adventure
   → find which host port is exposed (look for "HostPort" in the Ports section)

2. Run: docker exec text-adventure ls /app
   Then try: docker exec text-adventure cat /app/README.md
   Or: docker exec text-adventure find /app -name "*.md" | head -20

3. Try the health endpoint: curl http://localhost:<PORT>/api/health
   Or: curl http://localhost:<PORT>/health

4. Explore the API: curl http://localhost:<PORT>/api/
   Look for: webhook registration, sendText, sendFile, session status endpoints.

5. If a webhook URL can be configured in Whinself, note exactly how (env var, config file, or
   HTTP API call).

6. Note the exact JSON shape of an inbound message webhook payload. If you can trigger a test
   message, do so and capture the raw body.

Output: create a file at /Users/niko/Desktop/CODING/Epitek/whinself-api-notes.md containing:
- Confirmed base URL and port
- Webhook payload example (real or from docs)
- Signature header name and algorithm (or "none")
- sendText endpoint + required body fields
- sendFile/sendMedia endpoint + required body fields
- Media URL format for downloading received files
- Any session/auth requirements
- Any rate limits mentioned in docs

Do NOT start WA-002 until this file exists.
```

---

## WA-002 — Webhook receiver (inbound messages)
**Status:** ✅
**As a** developer,
**I want** a Next.js API route that receives Whinself webhook POST requests,
**so that** we have a stable entry point for all inbound WhatsApp messages.

**Tasks:**
- [ ] Parse Whinself webhook body (format confirmed in WA-001)
- [ ] Verify HMAC signature if Whinself supports it
- [ ] Extract: `wa_message_id`, `phone_number`, `content_type`, `content`, `media_url`
- [ ] Check `wa_messages` for duplicate `wa_message_id` → if exists, return 200 (idempotency)
- [ ] Insert into `wa_processing_queue` with `status: 'pending'`, `payload: rawBody`
- [ ] Return `{ received: true }` with 200 in < 200ms

**Acceptance criteria:**
- Sending a WhatsApp message creates a row in `wa_processing_queue`
- Sending the same message twice creates only one queue row
- Invalid signature returns 401 and nothing is queued

**Dependencies:** WA-001 ✅, Migrations 089–093 applied

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-002: create the WhatsApp webhook receiver.

FIRST read these files to understand existing patterns:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/webhooks/creem/route.js
  (HMAC verification pattern — reuse verifySignature() exactly)
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
  (how to get the admin Supabase client)
- /Users/niko/Desktop/CODING/Epitek/whinself-api-notes.md
  (confirmed webhook payload format from WA-001)

Then read the migration files to understand the DB schema:
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/091_wa_messages.sql
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/092_wa_processing_queue.sql

CREATE: /Users/niko/Desktop/CODING/Epitek/src/app/api/webhooks/whatsapp/route.js

The route must:
1. Export only POST handler
2. Read raw body as text (needed for HMAC): const rawBody = await request.text()
3. If WHINSELF_WEBHOOK_SECRET is set: verify HMAC-SHA256 signature using the header name
   confirmed in whinself-api-notes.md. If invalid: return Response.json({ error: 'Unauthorized' }, { status: 401 })
4. Parse body: const payload = JSON.parse(rawBody)
5. Extract from payload (adapt field names to actual Whinself format):
   - wa_message_id (unique message ID)
   - phone_number (sender, normalise to E.164: strip spaces, ensure starts with +)
   - content_type: 'text' | 'voice' | 'image' | 'video' | 'document'
   - content (text body if text message, caption if media)
   - media_url (if media message)
6. Idempotency: query wa_messages WHERE wa_message_id = extractedId
   If row exists: return Response.json({ received: true, duplicate: true })
7. Rate limit: count wa_processing_queue rows for this phone_number in last 1 hour
   If count >= 30: return Response.json({ received: true, rate_limited: true }) — still 200
8. Insert into wa_processing_queue: { payload: rawBody (as text), phone_number, status: 'pending' }
9. Return Response.json({ received: true }) — must complete in < 200ms total

Use createAdminClient() for all DB operations (bypasses RLS).
No auth check — this is a public webhook.
All errors should be caught and return 200 (prevents Whinself retries on our bugs).

New env vars needed (add to .env.local):
WHINSELF_WEBHOOK_SECRET=   (leave empty if Whinself has no signature support)
INTERNAL_CRON_SECRET=<generate a random 32-char string>
```

---

## WA-003 — Phone → user resolver
**Status:** ✅
**As a** developer,
**I want** a function that maps an inbound phone number to a `wa_accounts` row,
**so that** every subsequent action knows who is sending.

**Acceptance criteria:**
- Known phone → account object returned
- Unknown phone → null, bot sends Hungarian error

**Dependencies:** WA-002 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-003: create the phone → user resolver.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveAccount.js

Export one async function:
  resolveAccount(phoneNumber) → { waAccount, collectiveId, userId, permissions, displayName, accountType } | null

Implementation:
1. Normalise phoneNumber to E.164 (trim, ensure starts with +)
2. Query wa_accounts WHERE phone_number = normalised AND is_active = true
   Include: all columns + collective name via join: .select('*, collective:collectives(id, name)')
3. If no row: return null
4. Return: {
     waAccount: full row,
     collectiveId: row.collective_id,
     userId: row.user_id,           // null for Subbies
     permissions: row.permissions,  // JSONB object
     displayName: row.display_name,
     accountType: row.account_type, // 'owner_member' | 'subbie'
   }

Also create the unregistered-user reply text as a named export:
  export const UNREGISTERED_REPLY = 'Szia! Ez a szám nincs regisztrálva az OkosSzakiban. Kérj hozzáférést a mesterembertől.'

Use createAdminClient() — no auth session available for WhatsApp callers.
```

---

## WA-004 — Queue worker + echo bot
**Status:** ✅
**As a** developer,
**I want** a queue worker that processes items and sends echo replies,
**so that** the full round-trip is confirmed working.

**Acceptance criteria:**
- "szia" → bot replies "Üzenet fogadva: szia" within 5 seconds
- Unregistered number → Hungarian error reply
- Messages appear in `wa_messages`

**Dependencies:** WA-003 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-004: create the queue worker (echo bot) and the Whinself send helper.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/091_wa_messages.sql
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/092_wa_processing_queue.sql
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveAccount.js (from WA-003)
- /Users/niko/Desktop/CODING/Epitek/whinself-api-notes.md (Whinself sendText endpoint)

CREATE file 1: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/send/route.js

POST handler — internal only:
1. Verify Authorization header: Bearer ${process.env.INTERNAL_CRON_SECRET}
   If missing/wrong: return 401
2. Parse body: { chatId, text?, mediaUrl?, caption? }
3. If text: POST to ${WHINSELF_BASE_URL}/api/sendText (or confirmed endpoint from whinself-api-notes.md)
   Body: { chatId, message: text } — adapt to actual Whinself field names
4. Insert into wa_messages: { phone_number: chatId, direction: 'outbound', content_type: 'text', content: text }
5. Return { sent: true }

CREATE file 2: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js

POST handler:
1. Verify Authorization: Bearer INTERNAL_CRON_SECRET — return 401 if wrong
2. Claim up to 3 pending items:
   UPDATE wa_processing_queue
   SET status = 'processing', locked_until = NOW() + interval '60 seconds'
   WHERE id IN (
     SELECT id FROM wa_processing_queue
     WHERE status = 'pending'
       AND (locked_until IS NULL OR locked_until < NOW())
     ORDER BY enqueued_at
     LIMIT 3
   )
   RETURNING *
3. For each item:
   a. Parse item.payload (JSON string)
   b. Extract phone_number, wa_message_id, content_type, content from payload
   c. Insert into wa_messages: { wa_message_id, phone_number, direction: 'inbound', content_type, content }
   d. Call resolveAccount(phone_number)
   e. If null (unregistered): send UNREGISTERED_REPLY via /api/wa/send, mark status='done', continue
   f. Otherwise: send echo reply "Üzenet fogadva: [content]" via /api/wa/send
   g. Update wa_processing_queue: status='done', processed_at=NOW(), message_id=<inserted wa_message id>
4. On any error for an item:
   - increment attempts
   - if attempts >= 3: status = 'failed', last_error = error.message
   - else: status = 'pending', locked_until = null (retry)
5. Return { processed: N }

Important: /api/wa/send must be called as an internal fetch, not imported directly.
Use fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/wa/send`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.INTERNAL_CRON_SECRET}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: phone, text: replyText }) })

Test manually: POST to /api/wa/process with the correct Authorization header.
```

---

## WA-005 — Supabase DB Webhook trigger
**Status:** ✅
**As a** developer,
**I want** a Supabase Database Webhook that fires on queue INSERT,
**so that** messages are processed near-instantly.

**Acceptance criteria:**
- Message processed within 3 seconds of WhatsApp send
- 30-second fallback cron covers retries

**Dependencies:** WA-004 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-005: configure a Supabase Database Webhook to trigger the queue worker.

This is a configuration task, not a code task. Guide the user through these steps:

1. In the Supabase dashboard (the project URL is in NEXT_PUBLIC_SUPABASE_URL from .env.local):
   Go to: Database → Webhooks → Create a new webhook

   Settings:
   - Name: wa_queue_processor
   - Table: wa_processing_queue
   - Events: INSERT only
   - Type: HTTP Request
   - Method: POST
   - URL: ${NEXT_PUBLIC_APP_URL}/api/wa/process
     (use the actual production or ngrok URL — localhost won't work from Supabase cloud)
   - Headers: Authorization = Bearer <value of INTERNAL_CRON_SECRET from .env.local>
   - HTTP timeout: 5000ms

2. If running locally (no public URL yet):
   - Install ngrok: brew install ngrok
   - Run: ngrok http 3000
   - Use the https ngrok URL as NEXT_PUBLIC_APP_URL in .env.local
   - Use that URL in the Supabase webhook

3. As a fallback (for retrying failed items), set up an external cron:
   - Go to cron-job.org (free), create an account
   - New cronjob: URL = ${APP_URL}/api/wa/process, every 30 seconds
   - Method: POST, Header: Authorization = Bearer <INTERNAL_CRON_SECRET>

4. Test: send a WhatsApp message and verify the wa_processing_queue row is created
   and then picked up within 3 seconds. Check wa_messages for the logged entry.

Document the webhook ID and the ngrok/production URL in whinself-api-notes.md.
```

---

## WA-006 — Rate limiting
**Status:** ✅
**As a** developer,
**I want** per-phone rate limiting in the webhook handler.

**Acceptance criteria:**
- 31st message in one hour silently dropped
- First 30 processed normally

**Dependencies:** WA-002 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-006: add rate limiting to the WhatsApp webhook handler.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/webhooks/whatsapp/route.js  (created in WA-002)

EDIT that file to add, after the idempotency check and before the queue insert:

  // Rate limit: max 30 messages per phone per hour
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await admin
    .from('wa_processing_queue')
    .select('id', { count: 'exact', head: true })
    .eq('phone_number', phoneNumber)
    .gte('enqueued_at', oneHourAgo);

  if (count >= 30) {
    // Insert a wa_messages row for audit, but do not enqueue
    await admin.from('wa_messages').insert({
      wa_message_id: waMessageId,
      phone_number: phoneNumber,
      direction: 'inbound',
      content_type: contentType,
      content: content,
      action_taken: 'rate_limited',
    });
    return Response.json({ received: true, rate_limited: true });
  }

The response must still be 200 so Whinself does not retry.
Do not add any other changes. Keep the rest of the route exactly as it was.

Test: you cannot easily trigger 30 messages, so verify the logic is correct by code review.
```

---

---

# PHASE 2 — Conversation Context

---

## WA-010 — Conversation state (create/load/expire)
**Status:** ✅

**Acceptance criteria:**
- After 4h silence, next message starts fresh context
- Context survives across messages within session

**Dependencies:** WA-004 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-010: create conversation state management.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/090_wa_conversations.sql

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js

Export these async functions:

1. loadConversation(phoneNumber)
   - Query wa_conversations WHERE phone_number = phoneNumber
   - If not found: return a blank state object (do NOT insert yet):
     { phone_number: phoneNumber, active_project_id: null, active_survey_id: null,
       pending_clarification: null, context_window: [], expires_at: null }
   - If found AND expires_at < NOW(): call expireConversation(phoneNumber), return blank state
   - If found AND not expired: return the row

2. saveConversation(phoneNumber, updates)
   - Upsert into wa_conversations with:
     { phone_number: phoneNumber, ...updates,
       last_message_at: new Date().toISOString(),
       expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
       updated_at: new Date().toISOString() }
   - Use .upsert(..., { onConflict: 'phone_number' })

3. expireConversation(phoneNumber)
   - Update wa_conversations SET:
     active_project_id = null, active_survey_id = null,
     pending_clarification = null, context_window = []
   - WHERE phone_number = phoneNumber

4. appendToContextWindow(phoneNumber, role, content)
   - role is 'user' or 'assistant'
   - Load current context_window (array of {role, content})
   - Append new entry
   - Trim to last 12 entries (6 user + 6 assistant combined)
   - Save via saveConversation(phoneNumber, { context_window: trimmed })

All functions use createAdminClient().
Export all four functions as named exports.
```

---

## WA-011 — Active project resolver
**Status:** ✅

**Acceptance criteria:**
- "A Kovács projekthez" → project resolved, active_project_id set
- Ambiguous → triggers WA-012 clarification

**Dependencies:** WA-010 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-011: create the project context resolver.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js (from WA-010)
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — look at the projects table columns

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js

Export one async function:
  resolveProject(messageText, waAccount, conversation)
  → { projectId, projectName, source, needsClarification, clarificationOptions }

Logic (in priority order):

Step 1 — Explicit mention in message text:
  Extract hint using regex. Look for these Hungarian patterns:
    /a\s+(.+?)\s+projekt/i
    /(.+?)\s+projekthez/i
    /(.+?)\s+projektre/i
    /(.+?)\s+projekthez/i
    /(.+?)\s+-hoz\b/i
    /(.+?)\s+-hez\b/i
  If a hint is found:
    Query projects WHERE collective_id = waAccount.collectiveId
      OR (collective_id IS NULL AND owner_id = waAccount.userId)
    AND name ILIKE '%{hint}%'
    AND deleted_at IS NULL
    ORDER BY created_at DESC
  If 1 result: return { projectId, projectName, source: 'explicit_text', needsClarification: false }
  If 2+ results: return { needsClarification: true, clarificationOptions: results.map(p => ({ id: p.id, name: p.name })) }
  If 0 results: fall through to Step 2

Step 2 — Use existing conversation context:
  If conversation.active_project_id is not null:
    Verify project still exists (quick SELECT id)
    If exists: return { projectId, source: 'conversation', needsClarification: false }

Step 3 — Single project shortcut:
  Query all projects for this user (same scope as Step 1)
  If exactly 1: return { projectId, source: 'auto_single', needsClarification: false }

Step 4 — No context:
  Query all projects (limit 10)
  Return { needsClarification: true, clarificationOptions: results.map(p => ({ id: p.id, name: p.name })) }

Notes:
- For Subbies (waAccount.accountType === 'subbie'): only query projects via subbie_project_assignments
  WHERE wa_account_id = waAccount.waAccount.id AND is_active = true
- Use createAdminClient()
```

---

## WA-012 — Clarification flow (numbered choices)
**Status:** ✅

**Acceptance criteria:**
- Ambiguous message → numbered list sent
- Reply "2" → second option selected, original intent resumes
- "mégse" → cancelled cleanly
- Stale/expired choice → ignored, fresh start

**Dependencies:** WA-011 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-012: create the clarification flow helpers.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js  (WA-010)

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js

Export these functions:

1. formatClarificationMessage(question, options)
   options = [{ id, name }]
   Returns a Hungarian numbered-list string:
   "${question}\n\n1. ${options[0].name}\n2. ${options[1].name}\n...\n\nVálaszolj egy számmal, vagy írd: mégse"

2. async saveClarification(phoneNumber, type, options, originalIntent, originalPayload)
   Calls saveConversation(phoneNumber, {
     pending_clarification: {
       type,            // e.g. 'project_choice', 'survey_choice', 'confirm_entry'
       options,         // [{ id, name }]
       original_intent: originalIntent,
       original_payload: originalPayload,
       asked_at: new Date().toISOString(),
       attempts: 0,
     }
   })

3. async resolveClarification(phoneNumber, replyText, conversation)
   Returns: { resolved: true, chosenOption } | { resolved: false, cancel: true } | { resolved: false, invalid: true }

   Logic:
   a. If conversation.pending_clarification is null: return { resolved: false, invalid: true }
   b. Check expiry: if asked_at > 10 minutes ago: clear pending_clarification, return { resolved: false, invalid: true }
   c. normalise replyText: trim, lowercase
   d. If replyText === 'mégse' or 'nem' or 'cancel':
      await saveConversation(phoneNumber, { pending_clarification: null })
      return { resolved: false, cancel: true }
   e. Parse as integer: const choice = parseInt(replyText)
      If isNaN(choice) or choice < 1 or choice > options.length:
        Increment attempts in pending_clarification (update via saveConversation)
        If attempts >= 2: clear pending_clarification, return { resolved: false, invalid: true }
        return { resolved: false, invalid: true }  // caller re-sends the question
   f. const chosen = options[choice - 1]
      await saveConversation(phoneNumber, { pending_clarification: null })
      return { resolved: true, chosenOption: chosen }

Import saveConversation and loadConversation from ./conversation.js.
All text output must be in Hungarian.
```

---

---

# PHASE 3 — Owner: Create Survey

---

## WA-020 — Intent classifier (GPT-4o)
**Status:** ✅

**Acceptance criteria:**
- "8 óra burkolás" → `create_labour_entry`, hours: 8, labourType: 'burkolás'
- "felmérés a Kovács projekthez" → `create_survey`
- "konyha 3.5 x 4.2 m" → `add_survey_entry`, dimensions extracted
- Confidence < 0.6 → `unknown`

**Dependencies:** WA-010 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-020: create the GPT-4o intent classifier.

FIRST read CAREFULLY — you must copy these exact patterns:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/invoice-ai/route.js
  (GPT-4o call pattern: raw fetch, response_format json_schema, strict: true)
- /Users/niko/Desktop/CODING/Epitek/.env.local  (OPEN_AI_OCR_KEY)

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveIntent.js

Export one async function:
  resolveIntent({ messageText, contentType, contextWindow, activeProjectName, activeSurveyName })
  → IntentResult

The function calls GPT-4o (model: 'gpt-4o') using the OPEN_AI_OCR_KEY env var.

System prompt (Hungarian, pass as system message):
---
Te az OkosSzaki építési asszisztens vagy. Magyar anyanyelvű kivitelezőkkel kommunikálsz.
Az üzenetből azonosítsd a szándékot és nyerd ki a strukturált adatokat.

Aktív projekt: {activeProjectName || 'nincs kiválasztva'}
Aktív felmérés: {activeSurveyName || 'nincs aktív felmérés'}

Szándék-kategóriák:
- create_survey: új felmérés indítása ("felmérés", "kezdjük a felmérést", "új felmérés")
- add_survey_entry: helyiség/terület méreteinek rögzítése ("konyha 3.5x4.2m", "fürdőszoba méretei")
- create_labour_entry: munkaidő rögzítése ("8 óra burkolás", "ma 6 óra festés")
- create_invoice: számla/költség rögzítése ("45000 Ft csempe", "anyagszámla")
- attach_media: fotó/videó/dokumentum csatolása
- query_costs: projekt költségeinek lekérdezése ("mennyit költöttünk?", "mi az egyenleg?")
- query_survey: felmérési adatok lekérdezése ("mit mértünk a konyhában?")
- create_client: ügyfél rögzítése
- list_projects: projektek listázása ("mutasd a projektjeimet")
- list_surveys: felmérések listázása
- set_active_project: projektre váltás ("a Kovács projekthez", "válts Péter projektjére")
- set_active_survey: felmérésre váltás
- greeting: üdvözlés, általános kérdés
- unknown: nem egyértelmű szándék

Mezők kinyerése:
- survey_entry: name (helyiség neve), widthM (szám), lengthM (szám), heightM (szám), windowCount (egész), doorCount (egész)
- labour: labourType (munkafajta), hours (szám), hourlyRate (szám vagy null), workDate (YYYY-MM-DD vagy null)
- invoice: amountHuf (szám), description (szöveg), category ('Anyag'|'Szerszám/Eszköz'|'Szállítás'|'Engedély/Hatóság'|'Egyéb')
- project_hint: projekt neve/részlete az üzenetből

FONTOS: ne találj ki adatokat. Ha egy mező hiányzik, hagyd null-ra.
Magyar szám-szavak konvertálása: "három és fél" → 3.5, "négyezer" → 4000, "negyvenpétezer" → 45000
---

JSON schema for response_format (strict: true):
{
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['create_survey','add_survey_entry','create_labour_entry','create_invoice','attach_media','query_costs','query_survey','create_client','list_projects','list_surveys','set_active_project','set_active_survey','greeting','unknown'] },
    confidence: { type: 'number' },
    extracted: { type: 'object', additionalProperties: true },
    requires_clarification: { type: 'boolean' },
    clarification_reason: { type: 'string' }
  },
  required: ['intent','confidence','extracted','requires_clarification','clarification_reason'],
  additionalProperties: false
}

User message to GPT: messageText
Also include contextWindow (last 6 turns) as prior conversation messages.

If the GPT call fails or returns unparseable JSON: return { intent: 'unknown', confidence: 0, extracted: {}, requires_clarification: false, clarification_reason: null }

Env: process.env.OPEN_AI_OCR_KEY
Model: 'gpt-4o'
Max tokens: 500
Temperature: 0
```

---

## WA-021 — Owner: Start a new survey (text)
**Status:** ✅

**Acceptance criteria:**
- Survey row created with correct `owner_id` and `collective_id`
- `active_survey_id` set in conversation
- User prompted to start adding rooms

**Dependencies:** WA-020 ✅, WA-012 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-021: implement the "create survey" action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/surveys/route.js  (POST handler — understand required fields)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — look at surveys table columns
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/audit.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createSurvey.js

Export one async function:
  createSurvey({ waAccount, conversation, extracted, phoneNumber })
  → { reply: string, needsClarification: false }
    | { reply: string, needsClarification: true, clarificationOptions, originalPayload }

Flow:
1. Resolve project context using resolveProject() from resolveProject.js
   If needsClarification: return clarification needed result

2. If conversation has no active project after resolution:
   This should not happen after step 1 — but guard with: return { reply: 'Melyik projekthez szeretnéd a felmérést?', needsClarification: false }

3. Ask for survey title if not in extracted.surveyTitle:
   BUT — since we can't do multi-turn in a single function call, check if extracted.surveyTitle exists.
   If it does not exist: we need to ask. Store the pending intent first, then return a question.
   Use saveClarification(phoneNumber, 'survey_title_needed', [], 'create_survey', { projectId: resolvedProjectId })
   Return: { reply: 'Milyen nevű legyen a felmérés? (pl. "Fürdőszoba felmérés")', needsClarification: false }
   NOTE: the next message from the user will be caught as a pending_clarification of type 'survey_title_needed'
   and routed back here with the title.

4. Insert into surveys table directly via createAdminClient():
   {
     owner_id: waAccount.userId || null,
     collective_id: waAccount.collectiveId || null,
     project_id: resolvedProjectId,
     title: extracted.surveyTitle,
     created_at: new Date().toISOString(),
     created_by: waAccount.userId || waAccount.waAccount.id,
   }
   (Check schema.sql for exact column names — adapt if different)

5. Update conversation: saveConversation(phoneNumber, { active_survey_id: newSurveyId, active_project_id: resolvedProjectId })

6. Call logAudit({ userId: waAccount.userId, userName: waAccount.displayName, action: 'Felmérés létrehozva (WhatsApp)', targetType: 'survey', targetId: newSurveyId, targetName: extracted.surveyTitle, details: { channel: 'whatsapp' } })

7. Return reply:
   '✓ Felmérés létrehozva: *${title}* — ${projectName} projekt.\n\nMondj helyiségeket és méreteket, én rögzítem. Pl: _Konyha, 3,5 × 4,2 m_'

Error handling: if DB insert fails, return reply: 'Sajnos nem sikerült létrehozni a felmérést. Kérlek próbáld újra.'
```

---

## WA-022 — Owner: Add survey entry (text)
**Status:** ✅

**Acceptance criteria:**
- "Konyha 3.5 x 4.2 m" → `survey_entries` row created
- Floor area calculated in JS (not by AI)
- Missing dimension → bot asks

**Dependencies:** WA-021 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-022: implement the "add survey entry" action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/surveys/[id]/entries/route.js  (POST — understand schema)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — survey_entries table
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/audit.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/addSurveyEntry.js

Export one async function:
  addSurveyEntry({ waAccount, conversation, extracted, phoneNumber })
  → { reply: string }

The 'extracted' object comes from resolveIntent() and may contain:
  { name, widthM, lengthM, heightM, windowCount, doorCount }

Flow:
1. Check conversation.active_survey_id — if null:
   Return: { reply: 'Nincs aktív felmérés. Írj "új felmérés" hogy egyet létrehozz, vagy add meg melyikhez szeretnéd hozzáadni.' }

2. Validate extracted fields:
   - name is required. If missing: return { reply: 'Melyik helyiség ez? (pl. konyha, fürdőszoba, nappali)' }
   - widthM and lengthM are both needed for floor area. If one is missing, ask:
     return { reply: 'Add meg a(z) ${name} méreteit: szélesség × hossz (pl. 3.5 × 4.2 m)' }

3. Calculate floor area IN JAVASCRIPT — never trust AI for this:
   const floorAreaM2 = (extracted.widthM && extracted.lengthM)
     ? Math.round(extracted.widthM * extracted.lengthM * 100) / 100
     : null

4. Insert into survey_entries via createAdminClient():
   {
     survey_id: conversation.active_survey_id,
     name: extracted.name,
     width_m: extracted.widthM || null,
     length_m: extracted.lengthM || null,
     height_m: extracted.heightM || null,
     floor_area_m2: floorAreaM2,
     window_count: extracted.windowCount || 0,
     door_count: extracted.doorCount || 0,
   }
   (Check exact column names in schema.sql — adapt if different)

5. Format confirmation reply. Example:
   '✓ Rögzítve: *Konyha* — 3,5 × 4,2 m (14,7 m²), 2,7 m mennyezet, 1 ajtó, 1 ablak\n\nKövetkező helyiség?'
   Only include dimensions that were actually provided.
   Format numbers Hungarian style: use comma for decimal (3.5 → 3,5), space for thousands.

6. Call logAudit for the entry creation.

Helper: format a number for Hungarian display
  const fmtNum = n => n != null ? String(n).replace('.', ',') : null
```

---

## WA-023 — Owner: Add survey entry via voice note
**Status:** 🔲

**Acceptance criteria:**
- Voice note transcribed, transcript shown in reply
- Dimensions extracted from natural Hungarian speech
- Audio stored in R2
- Whisper failure → helpful Hungarian error

**Dependencies:** WA-022 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-023: create the Whisper transcription module and wire it into the queue worker.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/r2.js  (uploadToR2, r2PublicUrl)
- /Users/niko/Desktop/CODING/Epitek/.env.local  (OPEN_AI_OCR_KEY, R2 vars)
- /Users/niko/Desktop/CODING/Epitek/whinself-api-notes.md  (how to download media from Whinself)
- /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js  (the queue worker from WA-004)

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/transcribe.js

Export one async function:
  transcribeVoiceNote(mediaUrl, phoneNumber)
  → { transcript: string, r2Key: string }

Implementation:
1. Download audio from mediaUrl:
   const audioRes = await fetch(mediaUrl)
   const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
   Detect mimeType from response Content-Type header (default: 'audio/ogg')
   Detect extension: ogg → .ogg, mp4 → .mp4, mpeg → .mp3 (default .ogg)

2. Upload to R2:
   const r2Key = `wa/${phoneNumber.replace(/\+/g, '')}/${Date.now()}${ext}`
   await uploadToR2(r2Key, audioBuffer, mimeType)

3. Send to OpenAI Whisper:
   Use FormData + Blob (works in Node.js 18+, no extra packages needed):

   const { FormData, Blob } = await import('node:buffer') — actually in Node 18+:
   const formData = new FormData()
   formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio${ext}`)
   formData.append('model', 'whisper-1')
   formData.append('language', 'hu')
   formData.append('response_format', 'text')
   formData.append('prompt', 'Építési felmérés. Helyiség méretek, méteres értékek, burkolás, festés, csempe, vakolás.')

   const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
     method: 'POST',
     headers: { Authorization: `Bearer ${process.env.OPEN_AI_OCR_KEY}` },
     body: formData,
   })

   If !response.ok: throw new Error(`Whisper error: ${response.status}`)
   const transcript = await response.text()  // response_format: 'text' returns plain string

4. Return { transcript, r2Key }

On any error: throw — caller handles with Hungarian error message.

ALSO EDIT: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js

In the processItem function, after extracting content_type from the payload:
  if (contentType === 'voice' || contentType === 'audio') {
    try {
      const { transcript, r2Key } = await transcribeVoiceNote(mediaUrl, phoneNumber)
      // Update messageText with transcript for intent classification
      content = transcript
      // Store transcript in wa_messages
      await admin.from('wa_messages').update({ transcript, r2_key: r2Key }).eq('wa_message_id', waMessageId)
    } catch (err) {
      await sendReply(phoneNumber, 'Sajnos nem sikerült átírni a hangüzenetet. Kérlek írj szöveget.')
      return  // stop processing this item
    }
  }

The transcript then flows into resolveIntent() as messageText.
When sending the reply after a successful voice-based action, prepend the transcript:
  reply = `🎤 _"${transcript}"_\n\n${actionReply}`
```

---

## WA-024 — Owner: Attach construction photo to survey
**Status:** 🔲

**Acceptance criteria:**
- Construction photo classified correctly, stored in R2, linked to survey
- Photo visible in web app on correct survey
- Ambiguous context → numbered choice
- WebP conversion applied

**Dependencies:** WA-023 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-024: classify inbound images and attach construction photos to surveys.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/r2.js  (uploadToR2, toWebp, r2PublicUrl)
- /Users/niko/Desktop/CODING/Epitek/src/app/api/surveys/upload/route.js  (how survey media is stored — copy the DB insert pattern)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — survey_media table columns
- /Users/niko/Desktop/CODING/Epitek/src/app/api/invoice-ai/route.js  (GPT-4o vision call pattern — lines 20–110)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/classifyImage.js

Export one async function:
  classifyImage(imageBase64, mimeType)
  → 'invoice' | 'construction_site' | 'document' | 'unknown'

Uses GPT-4o vision (same pattern as invoice-ai/route.js but simpler schema):
  System prompt: 'Milyen típusú ez a kép? Válaszolj egyszóval.'
  JSON schema response: { type: 'string', enum: ['invoice','construction_site','document','unknown'] }
  Pass image as base64 data URL in the messages content array (copy the vision pattern from invoice-ai).

---

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/attachMedia.js

Export one async function:
  attachMedia({ waAccount, conversation, mediaUrl, mimeType, caption, phoneNumber })
  → { reply: string } | { needsClarification: true, reply: string, clarificationOptions, originalPayload }

Flow:
1. Download image from mediaUrl:
   const imgRes = await fetch(mediaUrl)
   const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

2. Convert to WebP using toWebp() from r2.js:
   const webpBuffer = await toWebp(imgBuffer)  // max 2400px, 82% quality

3. Classify the image using classifyImage(imgBuffer.toString('base64'), mimeType)

4. Based on classification:
   'invoice' → return { handoffToInvoice: true }  // caller should route to createInvoice action
   'unknown' → proceed as construction_site (assume on-site photo)
   'construction_site' or 'document' → attach to survey or diary

5. Determine destination:
   - If conversation.active_survey_id: attach to survey_media
   - Else if conversation.active_project_id: attach to diary_photos
   - Else: needsClarification = true → return clarification options (WA-012 pattern)
     Query user's projects and surveys for the options list

6. Upload WebP to R2:
   const r2Key = `wa/${phoneNumber.replace(/\+/g,'')}/${Date.now()}.webp`
   await uploadToR2(r2Key, webpBuffer, 'image/webp')
   const publicUrl = r2PublicUrl(r2Key)

7. Insert into survey_media OR diary_photos:
   For survey_media — copy column names from schema.sql
   For diary_photos — check diary upload route for column names

8. Return reply:
   survey: '✓ Fotó csatolva a *${surveyTitle}* felméréshez.'
   diary: '✓ Fotó csatolva a *${projectName}* projekt naplójához.'

On error: 'Sajnos nem sikerült menteni a fotót. Kérlek próbáld újra.'
```

---

## WA-025 — Owner: Attach video to survey/project
**Status:** 🔲

**Acceptance criteria:**
- Video stored in R2, linked to correct record
- Size > 10 MB rejected with Hungarian error
- No AI call for videos

**Dependencies:** WA-024 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-025: store videos sent via WhatsApp.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/r2.js  (uploadToR2, r2PublicUrl)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — diary_photos or survey_media columns (check which supports video)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js

EDIT: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/attachMedia.js
(created in WA-024)

Add video handling to the attachMedia function, before the image classification step:

  if (mimeType.startsWith('video/')) {
    // Download to check size
    const videoRes = await fetch(mediaUrl)
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

    const maxBytes = 10 * 1024 * 1024  // 10 MB
    if (videoBuffer.length > maxBytes) {
      return { reply: 'A videó túl nagy (max 10 MB). Kérlek rövidebb videót küldj.' }
    }

    const ext = mimeType.includes('mp4') ? '.mp4' : '.mp4'
    const r2Key = `wa/${phoneNumber.replace(/\+/g,'')}/${Date.now()}${ext}`
    await uploadToR2(r2Key, videoBuffer, 'video/mp4')
    const publicUrl = r2PublicUrl(r2Key)

    // Determine destination (same logic as image: survey_media or diary_photos)
    // Insert record with storage_path: r2Key, media_type: 'video'
    // ... (copy pattern from image attachment, adapt for video)

    return { reply: '✓ Videó csatolva.' }
  }

No GPT-4o call is made for videos. No classification. Just store and attach.
```

---

## WA-026 — Owner: Attach PDF to survey
**Status:** 🔲

**Acceptance criteria:**
- Small PDF (≤ 4MB, ≤ 20 pages) → AI summary in reply
- Large PDF → stored without summary
- PDF linked to active survey

**Dependencies:** WA-024 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-026: store and optionally analyse PDFs sent via WhatsApp.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/r2.js  (uploadToR2, r2PublicUrl)
- /Users/niko/Desktop/CODING/Epitek/src/app/api/invoice-ai/route.js  (GPT-4o call pattern)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — survey_media table (check if there is an ai_summary column; if not, store it in a 'notes' or 'description' column)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/attachPdf.js

Export one async function:
  attachPdf({ waAccount, conversation, mediaUrl, phoneNumber })
  → { reply: string }

Flow:
1. Download PDF:
   const pdfRes = await fetch(mediaUrl)
   const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
   const sizeBytes = pdfBuffer.length
   const sizeMB = sizeBytes / (1024 * 1024)

2. Upload to R2 regardless of size:
   const r2Key = `wa/${phoneNumber.replace(/\+/g,'')}/${Date.now()}.pdf`
   await uploadToR2(r2Key, pdfBuffer, 'application/pdf')

3. Determine if AI analysis is possible:
   const canAnalyse = sizeMB <= 4  // page count hard to check without parsing — use size as proxy

4. If canAnalyse:
   Send to GPT-4o. Encode PDF as base64 and send as a text message asking for summary.
   NOTE: GPT-4o cannot directly read PDFs as file attachments — you must extract text first.
   Use this approach: send the base64 of the PDF as a document message type if the API supports it,
   OR use the text: 'Ez egy PDF dokumentum (helyrajz, engedély, vagy szerződés). Az alábbi base64 tartalom egy PDF fájl. Magyar nyelven írd le: mi ez a dokumentum, mik a fő adatok?'
   Actually: GPT-4o vision accepts images not PDFs. Use a simpler approach:
   - Send a message to GPT-4o WITHOUT the file, just with the filename/context:
     System: 'A felhasználó egy PDF dokumentumot töltött fel az OkosSzaki rendszerbe. A fájl neve és mérete alapján add meg a valószínű dokumentumtípust.'
     User: 'PDF fájl, méret: ${sizeMB.toFixed(1)} MB, leírás: "${caption || 'nincs leírás'}". Mi ez valószínűleg?'
   - This gives a rough summary without reading the file.
   - Store the GPT response as ai_summary.
   Better alternative: skip GPT for PDFs entirely and just store. Leave a TODO comment for a future
   PDF text extraction approach (e.g. using a PDF parser library).

   For now: skip GPT analysis for PDFs. Store the file and return a simple confirmation.

5. Insert into survey_media (if active_survey_id) or skip if no context:
   { survey_id: conversation.active_survey_id, storage_path: r2Key, media_type: 'document', ... }

6. Return reply:
   If active_survey: '✓ PDF csatolva a felméréshez. Megtalálod a felmérés dokumentumai között.'
   If no context: '✓ PDF tárolva. Nyisd meg az alkalmazást a csatoláshoz.'
```

---

## WA-027 — Owner: List active surveys
**Status:** ✅

**Acceptance criteria:**
- Lists surveys for active project
- User can reply with number to switch active_survey_id
- Empty state: helpful Hungarian message

**Dependencies:** WA-021 ✅, WA-012 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-027: list surveys and allow switching the active survey via WhatsApp.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/admin.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — surveys table columns

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/listSurveys.js

Export one async function:
  listSurveys({ waAccount, conversation, phoneNumber })
  → { reply: string }

Flow:
1. Require active_project_id. If null:
   Return { reply: 'Előbb válassz projektet. Írd: "mutasd a projektjeimet"' }

2. Query surveys WHERE project_id = conversation.active_project_id AND deleted_at IS NULL
   ORDER BY created_at DESC
   Include: id, title, created_at, entry count (if easy via join or count query)

3. If no surveys:
   Return { reply: 'Még nincs felmérés ehhez a projekthez.\n\nÍrd: "új felmérés" hogy egyet létrehozz.' }

4. Format list:
   'Felmérések — [projektNév]:\n\n'
   For each survey (max 10): '${i+1}. ${survey.title} (${formattedDate})\n'
   Append: '\nMelyiket folytassuk? Válaszolj egy számmal.'

5. Save clarification so the next numeric reply switches the active survey:
   await saveClarification(phoneNumber, 'survey_choice',
     surveys.map(s => ({ id: s.id, name: s.title })),
     'set_active_survey', {})

6. Return { reply: formattedList }

When the clarification resolves (in the main orchestrator), call:
  await saveConversation(phoneNumber, { active_survey_id: chosenOption.id })
  Send: '✓ Aktív felmérés: *${chosenOption.name}*'
```

---

---

# PHASE 4 — Owner: Cost Tracking

---

## WA-030 — Owner: Log labour entry (text)
**Status:** ✅

**Acceptance criteria:**
- Labour entry created with correct project_id, hours, labour_type, value_huf
- Missing hourly rate → bot asks, waits, then saves
- Date defaults to today if not stated

**Dependencies:** WA-020 ✅, WA-012 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-030: implement the "create labour entry" action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/labour-entries/route.js  (POST — understand required fields and schema)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — labour_entries table columns
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/audit.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createLabourEntry.js

Export one async function:
  createLabourEntry({ waAccount, conversation, extracted, phoneNumber })
  → { reply: string }

The 'extracted' object may contain: { labourType, hours, hourlyRate, workDate }

Flow:
1. Resolve project context (resolveProject). If needsClarification: return clarification.

2. Validate:
   - hours is required. If missing: return { reply: 'Hány óra munkát rögzítsek?' }
   - labourType is required. If missing: return { reply: 'Milyen munkát végzett? (pl. burkolás, festés, villanyszerelés)' }
   - hourlyRate: optional. If missing, ask ONCE using pending_clarification:
     If extracted.hourlyRate is null or undefined:
       await saveClarification(phoneNumber, 'labour_rate_needed', [],
         'create_labour_entry', { ...extracted, projectId: resolvedProjectId })
       return { reply: 'Mi az órabér? (pl. 5000 Ft/óra — vagy írd: "kihagyom")' }

3. If pending_clarification type is 'labour_rate_needed':
   Parse the user reply:
   - "kihagyom" or "skip" → hourlyRate = null
   - A number → hourlyRate = parsed number
   - Otherwise → re-ask once, then skip

4. Calculate value_huf:
   const valueHuf = extracted.hourlyRate ? Math.round(extracted.hours * extracted.hourlyRate) : null

5. workDate: use extracted.workDate if present, otherwise today's date in ISO format

6. Insert into labour_entries via createAdminClient():
   {
     project_id: resolvedProjectId,
     labour_type: extracted.labourType,
     hours: extracted.hours,
     hourly_rate: extracted.hourlyRate || null,
     value_huf: valueHuf,
     work_date: workDate,
     uploaded_by: waAccount.userId || waAccount.waAccount.id,
     uploader_name: waAccount.displayName,
   }
   Check schema.sql for exact column names.

7. logAudit(...)

8. Return reply:
   With rate: '✓ Munkaidő rögzítve: ${hours} óra ${labourType} — ${formatHUF(valueHuf)} (${projectName})'
   Without rate: '✓ Munkaidő rögzítve: ${hours} óra ${labourType} — órabér nélkül (${projectName})'

Use formatHUF from src/lib/constants.js if it exists, otherwise: n.toLocaleString('hu-HU') + ' Ft'
```

---

## WA-031 — Owner: Log labour entry (voice)
**Status:** 🔲

**Acceptance criteria:**
- Voice note transcribed → correct labour entry created
- Transcript shown in reply

**Dependencies:** WA-030 ✅, WA-023 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-031: ensure the queue worker correctly routes voice notes to labour entry creation.

This story requires NO new files. The Whisper transcription was added in WA-023.
The intent classifier (WA-020) already handles 'create_labour_entry' from transcribed text.

VERIFY by testing end-to-end:
1. Send a voice note: "Tegnap nyolc óra burkolást csináltam a Kovács projektnél, ötezer forint az órabér."
2. Confirm the queue worker:
   a. Downloads the audio
   b. Transcribes via Whisper
   c. Passes transcript to resolveIntent
   d. Routes to createLabourEntry action
   e. Replies with the transcript preview + confirmation

EDIT: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js

Ensure the main orchestrator (processItem function) includes a transcript prefix in the reply
when the original message was a voice note. Find where the action reply is constructed and add:

  const replyText = wasVoiceNote
    ? `🎤 _"${transcript}"_\n\n${actionReply}`
    : actionReply

Also ensure 'wasVoiceNote' and 'transcript' variables are set when content_type === 'voice'.

This story is done when a voice note for labour logging works end-to-end.
```

---

## WA-032 — Owner: Upload invoice image
**Status:** 🔲

**Acceptance criteria:**
- Receipt → amount extracted, confirmation sent
- User confirms → invoice row created
- User corrects amount → updated amount saved
- OCR failure → helpful question asked

**Dependencies:** WA-024 ✅, WA-030 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-032: implement invoice creation from a WhatsApp image.

FIRST read CAREFULLY:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/invoice-ai/route.js
  Lines 1–120: this is the EXACT GPT-4o vision extraction logic to reuse.
  Note: it takes imageBase64 and returns { currency, lineItems, grandTotal }
- /Users/niko/Desktop/CODING/Epitek/src/app/api/invoices/route.js  (POST — DB insert fields)
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — invoices table columns
- /Users/niko/Desktop/CODING/Epitek/src/lib/r2.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createInvoice.js

Export one async function:
  createInvoice({ waAccount, conversation, mediaUrl, mimeType, extractedFromIntent, phoneNumber })
  → { reply: string }

'extractedFromIntent' may contain amountHuf, description, category if the user typed it.
mediaUrl is provided if an image was sent.

Flow:
1. Resolve project context. If needsClarification: return clarification.

2. If mediaUrl is provided (image invoice):
   a. Download image: const imgRes = await fetch(mediaUrl); const imgBuffer = Buffer.from(...)
   b. Convert to base64: const imageBase64 = imgBuffer.toString('base64')
   c. Run the GPT-4o invoice extraction (copy the logic from invoice-ai/route.js, same API call structure)
      Get: { grandTotal, lineItems, currency }
   d. Store image in R2: uploadToR2(`wa/${phone}/${Date.now()}.webp`, await toWebp(imgBuffer), 'image/webp')
   e. If grandTotal is null/0: skip to step 3 with amountHuf = null

   Set amountHuf = grandTotal (converted from currency to HUF if needed — for now assume HUF)
   Set description = lineItems.map(i => i.name).join(', ') || 'WhatsApp számla'

3. If amountHuf is null or undefined (OCR failed or no image):
   Store pending_clarification: { type: 'invoice_amount_needed', ...context }
   Return { reply: 'Nem sikerült kiolvasni az összeget. Mennyi a számla végösszege (Ft-ban)?' }

4. Ask for confirmation before saving:
   const preview = `Számla felismerve:\n💰 *${formatHUF(amountHuf)}* (${category || 'Anyag'})\n${description ? '_' + description + '_\n' : ''}\nHelyes? Válaszolj *igen* vagy add meg a helyes összeget.`
   Store pending_clarification: { type: 'invoice_confirm', amount: amountHuf, description, category, projectId, r2Key }
   Return { reply: preview }

5. When pending_clarification type is 'invoice_confirm':
   - "igen" or "ok" or "rendben" → proceed with stored amount
   - A number → use that number as corrected amount
   - "mégse" → cancel

6. Insert into invoices via createAdminClient():
   {
     project_id: resolvedProjectId,
     value_huf: amountHuf,
     category: category || 'Egyéb',
     description: description || null,
     storage_path: r2Key || null,
     uploaded_by: waAccount.userId || waAccount.waAccount.id,
     uploader_name: waAccount.displayName,
     ai_line_items: lineItems || null,
     ai_total: grandTotal || null,
   }
   Check exact schema columns in schema.sql.

7. logAudit(...)

8. Return: '✓ Számla rögzítve: ${formatHUF(amountHuf)}, ${category} — ${projectName}'
```

---

## WA-033 — Owner: Invoice via voice/text description
**Status:** 🔲

**Acceptance criteria:**
- Verbal invoice logged correctly
- Category defaults: materials → Anyag, delivery → Szállítás

**Dependencies:** WA-032 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-033: ensure text/voice invoice descriptions are handled by createInvoice.

This story requires minimal changes. The createInvoice action from WA-032 already handles
the case where extractedFromIntent contains amountHuf, description, category (no mediaUrl).

VERIFY that the intent classifier (WA-020) correctly extracts these fields from text like:
"Vettem csempét 45 ezer forintért a Kovács projekthez"

Expected intent result:
{ intent: 'create_invoice', extracted: { amountHuf: 45000, description: 'csempe', category: 'Anyag' } }

EDIT /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createInvoice.js:

In the system prompt for GPT-4o (if you have a local GPT call in createInvoice for text-only invoices),
add category auto-detection rules:
- csempe, festék, cement, ragasztó, fa, szeg, csavar, anyag → Anyag
- szállítás, fuvar, fuvardíj, kiszállítás → Szállítás
- állványzat, szerszám, eszköz → Szerszám/Eszköz
- engedély, hatóság, díj, illeték → Engedély/Hatóság
- everything else → Egyéb

These category rules should be in the resolveIntent.js system prompt so the classifier
already outputs the correct category. Add these rules to the intent classifier prompt.

Test: send "Vettem csempét 45 ezer forintért" → confirm category is 'Anyag', amount is 45000.
```

---

## WA-034 — Owner: Query project costs
**Status:** ✅

**Acceptance criteria:**
- Correct totals from calculateProjectFinancials()
- Offer vs actual shown if quote exists
- No LLM arithmetic — pure DB + JS

**Dependencies:** WA-020 ✅, WA-012 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-034: implement the project cost query.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/calculations.js  — calculateProjectFinancials() signature and return value
- /Users/niko/Desktop/CODING/Epitek/src/lib/constants.js  — formatHUF() function
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — invoices, labour_entries, quotes tables

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/queryProjectCosts.js

Export one async function:
  queryProjectCosts({ waAccount, conversation, phoneNumber })
  → { reply: string }

Flow:
1. Resolve project context. If needsClarification: return clarification.

2. Fetch from DB (all via createAdminClient()):
   a. Project row: SELECT * FROM projects WHERE id = projectId
   b. All invoices: SELECT * FROM invoices WHERE project_id = projectId AND deleted_at IS NULL
   c. All labour entries: SELECT * FROM labour_entries WHERE project_id = projectId AND deleted_at IS NULL
   d. Quote (if exists): SELECT id, total_price FROM quotes WHERE project_id = projectId
      AND status != 'draft' ORDER BY created_at DESC LIMIT 1

3. Calculate using calculateProjectFinancials():
   Import: import { calculateProjectFinancials } from '@/lib/calculations.js'
   const financials = calculateProjectFinancials(project, invoices, labourEntries, members, waAccount.userId)

4. Format Hungarian reply:
   Lines to include (only if value > 0):
   - Project name as bold header
   - Anyagköltség: sum of invoices by category
   - Munkabér: totalLabourValue from financials
   - **Összesen: ${formatHUF(totalCost + totalLabourValue)}**
   - If quote exists: 'Ajánlat: ${formatHUF(quoteTotal)}'
   - If quote exists: 'Eltérés: ${deviation > 0 ? '+' : ''}${formatHUF(deviation)} (${pct}%)'

5. IMPORTANT: no GPT call in this function. All numbers come from DB + calculateProjectFinancials().
   The reply is formatted with JS string templates only.

6. Return { reply: formattedSummary }

Deviation calculation (pure JS):
  const totalActual = financials.totalCost + financials.totalLabourValue
  const deviation = quoteTotal ? totalActual - quoteTotal : null
  const pct = quoteTotal ? Math.round((deviation / quoteTotal) * 100) : null
```

---

---

# PHASE 5 — Owner: Query & Retrieve

---

## WA-040 — Owner: Query survey notes
**Status:** 🔲

**Acceptance criteria:**
- All rooms listed with recorded dimensions
- Calculated floor area shown (JS only)
- No AI arithmetic

**Dependencies:** WA-027 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-040: implement the survey notes query.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — survey_entries columns
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/querySurveyNotes.js

Export one async function:
  querySurveyNotes({ waAccount, conversation, phoneNumber })
  → { reply: string }

Flow:
1. Require active_survey_id. If null:
   Return { reply: 'Nincs aktív felmérés. Válassz egyet: "felmérések listája"' }

2. Fetch survey row (for title) and all survey_entries for this survey_id.
   ORDER BY created_at ASC.

3. If no entries:
   Return { reply: 'Ez a felmérés még üres. Mondj helyiségeket és méreteket.' }

4. Format each entry (NO GPT — pure JS):
   const lines = entries.map(e => {
     let line = `🏠 *${e.name}*`
     if (e.width_m && e.length_m) {
       const area = Math.round(e.width_m * e.length_m * 100) / 100
       line += `: ${fmtN(e.width_m)} × ${fmtN(e.length_m)} m (${fmtN(area)} m²)`
     }
     if (e.height_m) line += `, ${fmtN(e.height_m)} m mennyezet`
     if (e.door_count > 0) line += `, ${e.door_count} ajtó`
     if (e.window_count > 0) line += `, ${e.window_count} ablak`
     return line
   })
   where fmtN = n => String(n).replace('.', ',')

5. Total floor area (JS only):
   const totalArea = entries
     .filter(e => e.width_m && e.length_m)
     .reduce((sum, e) => sum + e.width_m * e.length_m, 0)

6. Build reply:
   '*${surveyTitle}* — helyiségek:\n\n'
   + lines.join('\n')
   + (totalArea > 0 ? `\n\nÖsszes alapterület: ${fmtN(Math.round(totalArea*100)/100)} m²` : '')
```

---

## WA-041 — Owner: List projects
**Status:** ✅

**Acceptance criteria:**
- Lists projects scoped to user's collective/personal workspace
- User picks a number → active_project_id set
- Closed projects labelled

**Dependencies:** WA-010 ✅, WA-012 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-041: implement the project list action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql  — projects table (columns: id, name, closed_at, owner_id, collective_id)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/conversation.js
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/clarification.js
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql

CREATE: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/listProjects.js

Export one async function:
  listProjects({ waAccount, conversation, phoneNumber })
  → { reply: string }

Flow:
1. Query projects for this user:
   For owner_member: WHERE (collective_id = waAccount.collectiveId OR (owner_id = waAccount.userId AND collective_id IS NULL)) AND deleted_at IS NULL
   For subbie: JOIN subbie_project_assignments WHERE wa_account_id = waAccount.waAccount.id AND is_active = true

2. If no projects:
   Return { reply: 'Még nincs projekted. Hozz létre egyet az alkalmazásban.' }

3. Split into active and closed:
   const active = projects.filter(p => !p.closed_at)
   const closed = projects.filter(p => p.closed_at)

4. Format list (active first, then closed, max 10 total):
   'Projektjeid:\n\n'
   active.map((p, i) => `${i+1}. ${p.name}`)
   closed.map((p, i) => `${active.length + i + 1}. ${p.name} _(lezárt)_`)
   '\n\nMelyikkel dolgozzunk? Írj számot.'

5. Save clarification so numeric reply sets active_project_id:
   const allOptions = [...active, ...closed].map(p => ({ id: p.id, name: p.name }))
   await saveClarification(phoneNumber, 'project_choice', allOptions, 'set_active_project', {})

6. Return { reply: formattedList }

When clarification resolves in the main orchestrator:
  await saveConversation(phoneNumber, { active_project_id: chosenOption.id, active_survey_id: null })
  Send: '✓ Aktív projekt: *${chosenOption.name}*'
```

---

---

# PHASE 6 — Member Functions

> Members = full collective contributors with web access. WhatsApp access is same as Owner **except**: cannot create clients.

---

## WA-050 — Member: Link WhatsApp number to account
**Status:** ✅

**Acceptance criteria:**
- Verification code flow works end-to-end
- wa_accounts row created with correct user_id and collective_id
- Wrong code → Hungarian error

**Dependencies:** WA-004 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-050: let existing Members (full web users) link their WhatsApp number.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/auth/profile/route.js  (GET/PATCH pattern for profiles)
- /Users/niko/Desktop/CODING/Epitek/src/lib/supabase/server.js  (auth check for web API routes)
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql
- /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js  (queue worker — you will add VERIFY handling here)

CREATE file 1: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/link/route.js

POST handler (requires web auth):
1. Standard auth check (copy pattern from profile/route.js)
2. Parse body: { phone_number: string }  (E.164 format)
3. Validate phone: must start with + and contain only digits after that
4. Generate 6-digit code: Math.floor(100000 + Math.random() * 900000).toString()
5. Upsert into wa_accounts:
   { phone_number, user_id: user.id, account_type: 'owner_member',
     verified_at: null, is_active: false,
     permissions: JSON.stringify({ _pending_code: code, _code_expires: new Date(Date.now() + 15*60*1000).toISOString() }),
     registered_by: user.id,
     collective_id: profile.active_collective_id,
     display_name: profile.display_name }
6. Send WhatsApp verification message via internal fetch to /api/wa/send:
   Text: 'Szia! Az OkosSzaki WhatsApp összekapcsolási kódod: *${code}*\n\nKüld vissza: VERIFY ${code}\n\nA kód 15 percig érvényes.'
7. Return { sent: true }

EDIT: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js

In processItem, before calling resolveIntent, check for the VERIFY command:
  if (content && content.trim().toUpperCase().startsWith('VERIFY ')) {
    const code = content.trim().split(' ')[1]
    // Look up wa_accounts by phone_number
    const account = await admin.from('wa_accounts').select('*').eq('phone_number', phoneNumber).maybeSingle()
    if (!account) { sendReply(phoneNumber, 'Nincs függőben lévő összekapcsolás ehhez a számhoz.'); return }
    const storedCode = account.permissions?._pending_code
    const expires = account.permissions?._code_expires
    if (!storedCode || new Date(expires) < new Date()) { sendReply(phoneNumber, 'A kód lejárt. Kérj újat az alkalmazásban.'); return }
    if (code !== storedCode) { sendReply(phoneNumber, 'Érvénytelen kód. Ellenőrizd és próbáld újra.'); return }
    // Clear code, activate account
    const cleanPermissions = { ...account.permissions }
    delete cleanPermissions._pending_code
    delete cleanPermissions._code_expires
    await admin.from('wa_accounts').update({ verified_at: new Date().toISOString(), is_active: true, permissions: cleanPermissions }).eq('phone_number', phoneNumber)
    sendReply(phoneNumber, '✓ WhatsApp fiókod összekapcsolva. Mostantól használhatod az asszisztenst!')
    return
  }
```

---

## WA-051 — Member: Log labour, upload invoice, add survey entry
**Status:** 🔲

**Acceptance criteria:**
- Member can use all Owner cost/survey features
- Member cannot create clients (intent 'create_client' returns refusal)
- Member restricted to projects they are assigned to

**Dependencies:** WA-030 ✅, WA-032 ✅, WA-022 ✅, WA-050 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-051: ensure Members have the same WhatsApp capabilities as Owners except client creation.

This story is mostly a VERIFICATION task — no new files needed.

EDIT: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/process/route.js  (the main orchestrator)

In the main intent dispatch (where you call different action handlers based on intent),
add a check for the 'create_client' intent:

  if (intent === 'create_client') {
    if (waAccount.accountType === 'owner_member') {
      // Check if this user is the collective owner or just a member
      const membership = await admin.from('collective_members')
        .select('role')
        .eq('collective_id', waAccount.collectiveId)
        .eq('user_id', waAccount.userId)
        .maybeSingle()
      if (membership?.role !== 'owner') {
        return 'Ügyfél létrehozáshoz kérjük használd az OkosSzaki alkalmazást.'
      }
    }
  }

Also ensure project access checks in resolveProject.js work for Members:
Members can access projects where they appear in project_members table OR where collective_id matches.
Read /Users/niko/Desktop/CODING/Epitek/supabase/schema.sql for project_members table structure.

Update resolveProject.js — in the project query for 'owner_member' account type,
also include projects via project_members JOIN:
  WHERE id IN (SELECT project_id FROM project_members WHERE user_id = userId)
  OR collective_id = collectiveId
  OR (owner_id = userId AND collective_id IS NULL)

Test: a Member (not owner) sends "Új ügyfél: Nagy Béla" → receives the refusal message.
Test: a Member sends "8 óra burkolás" → labour entry created correctly.
```

---

---

# PHASE 7 — Subbie Functions

> Subbies = WhatsApp-only subcontractors. No web login. Always free. Permission-gated per project.

---

## WA-060 — Owner: Register a Subbie
**Status:** 🔲

**Acceptance criteria:**
- Subbie registered with verification + GDPR consent message
- Subbie verifies code → is_active: true
- Owner can see Subbies and permissions in web UI

**Dependencies:** WA-004 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-060: implement Subbie registration (Owner registers, Subbie verifies via WhatsApp).

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/link/route.js  (WA-050 — similar verification pattern)
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/093_subbie_project_assignments.sql
- /Users/niko/Desktop/CODING/Epitek/src/app/api/collectives/[id]/members/route.js  (auth pattern for collective owner actions)

CREATE: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/accounts/route.js

GET handler (auth required, collective owner/admin only):
  Returns all wa_accounts WHERE collective_id = profile.active_collective_id
  Include subbie_project_assignments via join

POST handler (auth required, collective owner/admin only):
  Body: { phone_number, display_name, project_ids: [], permissions: {} }
  1. Validate: phone_number E.164, display_name not empty
  2. Check no existing active wa_account for this phone
  3. Generate 6-digit verification code
  4. Insert wa_accounts: { phone_number, display_name, account_type: 'subbie',
       verified_at: null, is_active: false, collective_id, registered_by: user.id,
       permissions: { ...permissions, _pending_code: code, _code_expires: <15min from now> } }
  5. Insert subbie_project_assignments for each project_id
  6. Send WhatsApp verification message:
     'Szia ${display_name}! ${ownerDisplayName} hozzáadott téged az OkosSzaki rendszeréhez mint alvállalkozó.\n\nAdatkezelési tájékoztató: ${NEXT_PUBLIC_APP_URL}/adatkezeles\n\nA verifikációs kódod: *${code}*\nKüld vissza: VERIFY ${code}\n\nA kód 15 percig érvényes. Ha nem te kérted, hagyd figyelmen kívül.'
  7. Return { created: true, wa_account_id: newId }

The VERIFY flow is already handled in the queue worker (WA-050 edit) — no changes needed there.

CREATE: /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/accounts/[id]/route.js

GET: return single wa_account with project assignments
PATCH: update display_name or permissions JSON
DELETE: set is_active = false (soft delete)

Note: anonymise records on delete? No — on Subbie removal we keep records as-is.
Only anonymise 'uploader_name' if explicitly requested. Leave a TODO comment.
```

---

## WA-061 — Subbie: Log labour entry
**Status:** 🔲

**Acceptance criteria:**
- Subbie with can_log_labour: true → entry created
- Subbie with can_log_labour: false → Hungarian error
- Entry linked to Subbie's wa_account.id as uploader

**Dependencies:** WA-060 ✅, WA-030 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-061: add Subbie permission checks to the labour entry action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createLabourEntry.js  (WA-030)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/089_wa_accounts.sql  (permissions JSONB schema)
- /Users/niko/Desktop/CODING/Epitek/supabase/migrations/093_subbie_project_assignments.sql

EDIT: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createLabourEntry.js

At the top of the createLabourEntry function, add permission check for Subbies:

  if (waAccount.accountType === 'subbie') {
    if (!waAccount.permissions?.can_log_labour) {
      return { reply: 'Nincs munkaidő rögzítési jogosultságod. Kérd meg a mestert a hozzáférés megadásához.' }
    }
  }

Also verify that resolveProject.js already handles Subbies (query via subbie_project_assignments).
If not, update resolveProject.js Subbie branch:
  For accountType === 'subbie':
    Query projects via:
    SELECT p.* FROM projects p
    JOIN subbie_project_assignments spa ON spa.project_id = p.id
    WHERE spa.wa_account_id = waAccount.waAccount.id AND spa.is_active = true AND p.deleted_at IS NULL

Also ensure the labour_entries insert uses:
  uploaded_by: waAccount.userId || waAccount.waAccount.id
  uploader_name: waAccount.displayName

Test: a Subbie with can_log_labour: false sends a labour entry message → receives permission error.
Test: a Subbie with can_log_labour: true sends "4 óra burkolás" → entry created with subbie's name.
```

---

## WA-062 — Subbie: Upload invoice
**Status:** 🔲

**Acceptance criteria:**
- Invoice with can_upload_invoices: true → created
- Without permission → Hungarian error

**Dependencies:** WA-060 ✅, WA-032 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-062: add Subbie permission checks to the invoice creation action.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createInvoice.js  (WA-032)

EDIT: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/createInvoice.js

At the top of createInvoice, add:

  if (waAccount.accountType === 'subbie') {
    if (!waAccount.permissions?.can_upload_invoices) {
      return { reply: 'Nincs számla feltöltési jogosultságod. Kérd meg a mestert a hozzáférés megadásához.' }
    }
  }

No other changes needed — the rest of the createInvoice logic already handles null userId.

Test: Subbie without can_upload_invoices → permission error.
Test: Subbie with can_upload_invoices: true sends a receipt photo → invoice created, Subbie's name stored as uploader_name.
```

---

## WA-063 — Subbie: View own costs
**Status:** 🔲

**Acceptance criteria:**
- Subbie sees only their own records (filtered by uploaded_by = wa_account.id)
- No project totals or other member data shown

**Dependencies:** WA-061 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-063: implement a Subbie-scoped cost query (own records only).

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/queryProjectCosts.js  (WA-034)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveProject.js

EDIT: /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/actions/queryProjectCosts.js

Add a Subbie branch at the top:

  if (waAccount.accountType === 'subbie') {
    if (!waAccount.permissions?.can_view_own_costs) {
      return { reply: 'Nincs jogosultságod az adatok megtekintéséhez.' }
    }
    // Subbie-scoped query: only their own records
    const subbieId = waAccount.userId || waAccount.waAccount.id
    const { data: myInvoices } = await admin.from('invoices')
      .select('value_huf, category, description, created_at')
      .eq('project_id', resolvedProjectId)
      .eq('uploaded_by', subbieId)
      .is('deleted_at', null)

    const { data: myLabour } = await admin.from('labour_entries')
      .select('hours, value_huf, labour_type, work_date')
      .eq('project_id', resolvedProjectId)
      .eq('uploaded_by', subbieId)
      .is('deleted_at', null)

    const totalInvoices = myInvoices.reduce((s, i) => s + (i.value_huf || 0), 0)
    const totalLabour = myLabour.reduce((s, l) => s + (l.value_huf || 0), 0)
    const totalHours = myLabour.reduce((s, l) => s + (l.hours || 0), 0)

    const reply = [
      `*Saját feltöltéseim — ${projectName}:*`,
      myInvoices.length > 0 ? `\nSzámlák (${myInvoices.length} db): ${formatHUF(totalInvoices)}` : null,
      myLabour.length > 0 ? `Munkaidő: ${totalHours} óra — ${formatHUF(totalLabour)}` : null,
      `\n*Összesen: ${formatHUF(totalInvoices + totalLabour)}*`,
    ].filter(Boolean).join('\n')

    return { reply }
  }

  // For owner_member: continue with the existing full queryProjectCosts logic below
```

---

## WA-064 — Owner: Remove Subbie / revoke permissions
**Status:** 🔲

**Acceptance criteria:**
- Deactivated Subbie blocked immediately
- Records preserved
- Owner can re-activate

**Dependencies:** WA-060 ✅

---

**Agent prompt:**
```
You are working on OkosSzaki, a Next.js 16 + Supabase SaaS for Hungarian contractors.

Your task is WA-064: implement Subbie deactivation and permission revocation via web API.

FIRST read:
- /Users/niko/Desktop/CODING/Epitek/src/app/api/wa/accounts/[id]/route.js  (created in WA-060)
- /Users/niko/Desktop/CODING/Epitek/src/lib/waAssistant/resolveAccount.js  (WA-003)

The PATCH handler in /api/wa/accounts/[id]/route.js should already handle permissions updates.
Verify it correctly handles these cases:

1. PATCH { is_active: false } → sets is_active = false on wa_accounts row
   No other changes. Records in labour_entries and invoices are untouched.

2. PATCH { permissions: { can_upload_invoices: false, can_log_labour: true, ... } } → updates permissions JSONB

3. PATCH { is_active: true } → re-activates a Subbie (same PATCH handler)

The resolveAccount.js already filters WHERE is_active = true, so a deactivated Subbie
will immediately receive UNREGISTERED_REPLY on their next message. Verify this is the case.

If the Owner wants to revoke via WhatsApp:
The intent classifier may not yet handle "Vonjuk meg Tóth Gábortól a számlafeltöltést".
Add this intent as 'manage_subbie_permission' to the intent classifier in resolveIntent.js.
But implementing the full management flow via WhatsApp is optional for this story —
the web UI PATCH endpoint is the primary path.

Test via curl or the web UI:
  PATCH /api/wa/accounts/<id> { "permissions": { "can_upload_invoices": false, "can_log_labour": true } }
  → Subbie tries to upload invoice → "Nincs számla feltöltési jogosultságod."
  PATCH /api/wa/accounts/<id> { "is_active": false }
  → Subbie sends any message → "Szia! Ez a szám nincs regisztrálva az OkosSzakiban."
```

---

---

# Technical notes (cross-cutting)

## Migrations to run (in order)
| Migration | Creates |
|---|---|
| 089 | `wa_accounts` |
| 090 | `wa_conversations` |
| 091 | `wa_messages` |
| 092 | `wa_processing_queue` |
| 093 | `subbie_project_assignments` + drop FK on `uploaded_by` |

## New env vars needed
```
WHINSELF_BASE_URL=http://localhost:<PORT>   # from docker inspect text-adventure
WHINSELF_WEBHOOK_SECRET=<secret>            # if Whinself supports HMAC
INTERNAL_CRON_SECRET=<generate 32 chars>    # protects /api/wa/process
```

## R2 key prefix for WhatsApp media
`wa/{phone_e164_without_plus}/{timestamp}.{ext}` — follows existing `{entityId}/{folder}/{unique}.{ext}` convention.

## Survey entries — no new columns needed
Existing `survey_entries` schema supports: `name`, `width_m`, `length_m`, `height_m`, `window_count`, `door_count`, `description`. No migration needed.

## Confirmation pattern (all write actions)
The bot always sends a confirmation after writing. For financial data, it asks BEFORE writing. Never silently write without a response.

## Hungarian number formats
GPT-4o must normalise: "három és fél" → 3.5, "négyezer" → 4000, "negyvenötezer" → 45000. Include this instruction in all extraction system prompts.

## formatHUF helper
Use `formatHUF` from `src/lib/constants.js` if it exists. Otherwise: `n.toLocaleString('hu-HU') + ' Ft'`
