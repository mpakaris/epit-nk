# Epitek — Security Audit

**Date:** 2026-10-24  
**Current rating: 5/10**  
**Rating after all fixes: 8.5/10**

---

## CRITICAL

### 1. God Mode cookies are readable by JavaScript
**Files:** `src/context/AppContext.jsx` (lines 199, 207), `src/lib/godMode.js`  
`god_mode_user` and `god_mode_entity` are set as plain browser cookies (no `HttpOnly`). Any XSS anywhere in the app lets an attacker steal them and impersonate any user via `/api/entity/data`.  
**Fix:** Move god mode state to a server-side session or sign/encrypt the cookie. At minimum add `HttpOnly; Secure` flags and validate the UUID format strictly on the server.

### 2. Share token endpoint has no rate limiting
**File:** `src/app/api/diary/share/resolve/route.js`  
The public `/api/diary/share/resolve?token=…` endpoint has no throttle. An attacker can brute-force share tokens and access private project diaries.  
**Fix:** Rate-limit to 10 req/min per IP. Use 64-byte random tokens (current length may be too short).

### 3. Collective member added instantly without consent
**File:** `src/app/api/collectives/[id]/members/route.js`  
A collective owner can POST a victim's email and the victim is added with `status: active` immediately — no invite-accept step required.  
**Fix:** Set `status: invited` on insert. Only flip to `active` after the recipient clicks the email link (already built in the invitations flow — just enforce it here).

---

## HIGH

### 4. No CSRF protection on state-changing endpoints
All POST/PATCH/DELETE API routes rely on the Supabase JWT cookie alone. A forged cross-site request from a page the SA is viewing will authenticate successfully.  
**Fix:** Add a `X-CSRF-Token` header check or use SameSite=Strict on the auth cookie. Next.js middleware is the right place.

### 5. RLS is disabled — admin client used everywhere
**Files:** Every file in `src/app/api/`  
Every route calls `createAdminClient()` (service role key, bypasses RLS). One logic error in any auth check = full database access for the attacker.  
**Fix:** Enable RLS on all tables as a second enforcement layer. Use the JWT client (`createClient()`) for reads and only use the admin client for privileged writes that genuinely need it.

### 6. Superadmin data endpoint returns all users globally
**File:** `src/app/api/superadmin/data/route.js`  
Returns all emails, names, financials, projects with no pagination or scoping. Combined with a stolen god mode cookie this is a full data dump.  
**Fix:** Paginate the response. Return summary stats by default; require explicit collective selection before returning full records.

### 7. Invoice AI response not validated
**File:** `src/app/api/invoice-ai/route.js` (line 116)  
OpenAI response is parsed and forwarded to the client without schema validation. Malformed or malicious response can crash the route or inject unexpected data.  
**Fix:** Validate with zod — currency must be ISO 4217, lineItems max 100 items, grandTotal must be a finite positive number.

### 8. Invitation registration can overwrite existing accounts
**File:** `src/app/api/invitations/[token]/register/route.js`  
No check whether an account with that email already exists before creating a new one via invite token.  
**Fix:** If email already has an account, reject the registration and prompt the user to log in instead.

### 9. Temporary password returned in API response
**File:** `src/app/api/admin/reset-password/route.js` (line 59)  
`{ success: true, temporaryPassword }` is returned in the JSON body. If this response is logged anywhere it leaks credentials.  
**Fix:** Return only `{ success: true }`. The admin can set the password separately or use a magic link.

---

## MEDIUM

### 10. Text fields stored without sanitization (XSS in PDFs/emails)
**Files:** `src/app/api/diary/*/route.js`, `src/app/api/quotes/*/route.js`  
User-supplied text (titles, notes, body text) is trimmed but not sanitized before storage. If these fields are rendered in PDF generation (Puppeteer) or HTML emails, a `<script>` or `<img onerror>` payload can execute.  
**Fix:** Strip HTML on the server before storing. A simple tag-stripping regex is enough for plain-text fields; use DOMPurify for fields that intentionally allow rich text.

### 11. Personal quotes can be shared with arbitrary user IDs
**File:** `src/app/api/quotes/[id]/route.js`  
The `shared_with` array is only validated against collective membership when `collective_id` is set. Personal quotes (no collective) skip the check entirely.  
**Fix:** Always validate that users in `shared_with` exist in the `profiles` table.

### 12. Cookie regex accepts non-UUID values
**File:** `src/lib/godMode.js` (line 13)  
`/god_mode_user=([a-f0-9-]+)/` matches any hex-and-dash string. A crafted cookie value could cause unexpected DB query behaviour.  
**Fix:** Validate the extracted value matches the full UUID v4 pattern before using it: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`

### 13. No global API rate limiting
No middleware enforces per-user or per-IP request limits on any API route. Credential stuffing, brute-force on invite tokens, and resource exhaustion are all unthrottled.  
**Fix:** Add Vercel's built-in rate limiting or a middleware using `@upstash/ratelimit` + Redis. Start with 60 req/min per IP on all `/api/` routes.

### 14. Audit log missing IP address
**File:** `src/lib/audit.js`  
`logAudit()` records user and action but not the source IP. This makes incident investigation much harder.  
**Fix:** Pass `request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')` into the audit log row.

### 15. No Content Security Policy header
**File:** `next.config.js` / middleware  
There are no `Content-Security-Policy` headers. This means any injected script (XSS) runs without restriction.  
**Fix:** Add a CSP header in `next.config.js` under `headers()`. Start with a strict default-src and loosen as needed.

---

## LOW

### 16. `HttpOnly` and `Secure` missing on god mode cookies
Even if god mode moves to server-side sessions, the current cookies also lack `Secure` (HTTPS-only) and are therefore transmittable over plain HTTP.  
**Fix:** Always append `; Secure` to any sensitive cookie in production.

### 17. No request body size limit on file uploads
**Files:** `src/app/api/diary/upload/route.js`, `src/app/api/surveys/upload/route.js`  
Per-file size is checked, but total multipart body size is uncapped. A large multipart request can exhaust server memory.  
**Fix:** Set `export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }` (or equivalent for App Router) on upload routes.

### 18. R2 object keys include user-supplied filenames
**File:** `src/lib/r2.js`  
If any key construction includes unsanitized user input, path traversal could overwrite existing objects.  
**Fix:** Confirm all R2 keys are constructed from `crypto.randomUUID()` or a hash — never from raw user input.

---

## Database Access Assessment

| Layer | Status |
|---|---|
| RLS policies | Exist in schema but **not enforced** — app uses service role key everywhere |
| Application auth checks | Present on most routes, but inconsistent |
| Defense in depth | **None** — if app layer fails, DB is fully open |
| Query parameterisation | Good — Supabase JS client uses parameterised queries throughout |
| Principle of least privilege | Violated — single admin key used for all operations |

**Recommended DB changes:**
- Enable RLS on `projects`, `surveys`, `quotes`, `clients`, `invoices`, `labour_entries`
- Create a scoped read role for public/portal endpoints
- Keep admin client only for routes that genuinely need elevated access (user creation, impersonation, subscription management)
- Enable Supabase's built-in audit logging in the dashboard

---

## Action Plan (priority order)

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Rate limit share token endpoint | 1h | Critical → resolved |
| 2 | Collective invite flow: set status=invited, not active | 1h | Critical → resolved |
| 3 | Validate god mode cookie as strict UUID v4 | 30min | Critical (reduces) |
| 4 | Add `HttpOnly; Secure` to god mode cookies | 1h | Critical (reduces) |
| 5 | Return only `{ success: true }` from reset-password | 15min | High → resolved |
| 6 | Validate Invoice AI response with zod | 1h | High → resolved |
| 7 | Block invite registration if email already has account | 30min | High → resolved |
| 8 | Sanitize text fields before DB insert | 2h | Medium → resolved |
| 9 | Validate shared_with users exist for personal quotes | 30min | Medium → resolved |
| 10 | Add CSP header in next.config.js | 2h | Medium → resolved |
| 11 | Global rate limiting middleware (Upstash or Vercel) | 3h | Medium → resolved |
| 12 | Add IP to audit log | 30min | Low → resolved |
| 13 | Cap upload route body size | 15min | Low → resolved |
| 14 | Enable RLS on core tables | 4h | High (DB layer) |
| 15 | CSRF token middleware | 4h | High → resolved |
| 16 | Move god mode to server-side session | 8h | Critical → resolved |

**Total estimated effort: ~30 hours**

---

## Ratings

| Area | Now | After fixes |
|---|---|---|
| Authentication | 6/10 | 9/10 |
| Authorization | 5/10 | 8/10 |
| Input validation | 5/10 | 8/10 |
| Rate limiting | 2/10 | 8/10 |
| Database security | 4/10 | 8/10 |
| Session management | 3/10 | 8/10 |
| CSRF protection | 2/10 | 8/10 |
| Audit logging | 6/10 | 8/10 |
| **Overall** | **5/10** | **8.5/10** |
