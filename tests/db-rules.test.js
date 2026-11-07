/**
 * DB Rules — static code analysis
 *
 * No DB connection needed. Scans API route source files for security
 * anti-patterns that would violate the rules in CLAUDE.md §14–17.
 *
 * Run standalone: npx vitest run tests/db-rules.test.js
 *
 * What this catches:
 *  1. Fail-open secret guard pattern  (CLAUDE.md §15)
 *  2. Data reads via anon client       (CLAUDE.md §14 — service_role only for data)
 *  3. Hard delete on user-content tables (CLAUDE.md §4)
 *  4. Missing auth check before admin mutations (CLAUDE.md §3)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_DIR    = resolve(__dirname, '../src/app/api')

// ── helpers ──────────────────────────────────────────────────────────────────

function findRoutes(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...findRoutes(full))
    else if (entry === 'route.js') results.push(full)
  }
  return results
}

function relative(full) {
  return full.replace(resolve(__dirname, '..') + '/', '')
}

function read(file) {
  return readFileSync(file, 'utf8')
}

const allRoutes = findRoutes(API_DIR)

// Routes that are legitimately public — no auth.getUser() required
const ALLOWLIST_NO_AUTH = [
  '/api/webhooks/',
  '/api/webhook/',             // legacy path
  '/api/wa/',                  // internal service, protected by INTERNAL_CRON_SECRET
  '/api/cron/',                // protected by CRON_SECRET (checked separately)
  '/api/image-library',        // read-only platform images, no user data
  '/api/trades',               // read-only public taxonomy
  '/api/demo/',
  '/api/szakemberek/',         // public tradesperson pages + contact form
  '/api/invitations/',         // token-based, no session
  '/api/auth/request-password-reset',
  '/api/auth/confirm-password-reset',
  '/api/website/slug-check',
  '/api/diary/share/resolve',
  '/api/platform/',
  '/api/portal/',              // email-OTP flow, no cookie session
  '/api/audit/events',         // internal tool — TODO: add auth check
]

function isAllowlisted(path) {
  return ALLOWLIST_NO_AUTH.some(p => path.includes(p))
}

// User-content tables that must NEVER be hard-deleted via the API
const SOFT_DELETE_TABLES = [
  'projects',
  'quotes',
  'surveys',
  'clients',
  'invoices',
  'diary_entries',
  'ideas',
]

// ── Test 1: Fail-open secret guard ───────────────────────────────────────────
//
// Pattern that must NOT appear:
//   if (process.env.FOO && value !== process.env.FOO)
//
// Correct pattern:
//   if (!process.env.FOO || value !== process.env.FOO)

describe('Secret guard: fail-closed (CLAUDE.md §15)', () => {
  // Pattern 1: if (process.env.FOO && value !== process.env.FOO)   ← skips when var unset
  const FAIL_OPEN_AND = /if\s*\(\s*process\.env\.\w+\s*&&[^)]*!==\s*process\.env\./
  // Pattern 2: if (x !== `Bearer ${process.env.FOO}`)  ← resolves to 'Bearer undefined' when unset;
  //            safe only if preceded by: const secret = process.env.FOO; if (!secret || ...)
  //            Detect by: line contains the template comparison but the SAME function block
  //            has no "!secret" or "!process.env.FOO" guard in the 300 chars before it.
  const BEARER_TEMPLATE = /!==\s*`Bearer\s+\$\{process\.env\.\w+\}`/

  it('no API route uses a fail-open env-var secret check', () => {
    const violations = []

    for (const file of allRoutes) {
      const src = read(file)
      const lines = src.split('\n')

      lines.forEach((line, i) => {
        if (FAIL_OPEN_AND.test(line)) {
          violations.push(`${relative(file)}:${i + 1}  →  ${line.trim()}`)
        }
        // Bearer template: flag if no !secret guard appears in the 400 chars before this line
        if (BEARER_TEMPLATE.test(line)) {
          const precedingCode = src.slice(0, src.indexOf(line))
          const window = precedingCode.slice(-400)
          if (!window.includes('!secret') && !/!\s*process\.env\.\w/.test(window)) {
            violations.push(`${relative(file)}:${i + 1}  →  ${line.trim()} (Bearer template without !secret guard)`)
          }
        }
      })
    }

    if (violations.length) {
      throw new Error(
        'Fail-open secret check detected. Change to: if (!process.env.X || value !== process.env.X)\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 2: Anon client must not be used for data reads ──────────────────────
//
// createClient() from supabase/server or supabase/client may only be used for
// supabase.auth.* calls. All data queries (.from(...)) must use createAdminClient().

describe('Supabase client usage: service_role only for data (CLAUDE.md §14)', () => {
  // Pattern: imports non-admin client AND calls .from( on the same variable name
  // We detect: a file imports from supabase/server OR supabase/client (non-admin),
  // names the result (e.g. `const supabase = await createClient()`),
  // and then calls supabase.from(

  it('no API route uses the anon/server client for data reads or writes', () => {
    const violations = []

    // Regex: variable assigned from createClient() (not createAdminClient)
    const CLIENT_ASSIGN = /const\s+(\w+)\s*=\s*await\s+createClient\s*\(\s*\)/g
    // Then: that variable used with .from(
    const DATA_ACCESS    = (varName) => new RegExp(`\\b${varName}\\s*\\.from\\s*\\(`)

    for (const file of allRoutes) {
      const src = read(file)

      // Only files that import from supabase/server or supabase/client (not admin)
      if (!src.includes("from '@/lib/supabase/server'") && !src.includes("from '@/lib/supabase/client'")) continue

      let match
      CLIENT_ASSIGN.lastIndex = 0
      while ((match = CLIENT_ASSIGN.exec(src)) !== null) {
        const varName = match[1]
        if (DATA_ACCESS(varName).test(src)) {
          violations.push(
            `${relative(file)} — "${varName}" (from createClient) is used for a .from() data query. Use createAdminClient() instead.`
          )
        }
      }
    }

    if (violations.length) {
      throw new Error(
        'Anon/server Supabase client used for data access. All data queries must use createAdminClient().\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 3: Hard delete on user-content tables ───────────────────────────────
//
// .delete() is forbidden on the protected tables. Must use
// .update({ deleted_at: new Date().toISOString() }) instead.
// Sub-records (quote_entries etc.) are allowed to be hard-deleted.

describe('Soft delete: no hard .delete() on user-content tables (CLAUDE.md §4)', () => {
  it('no API route hard-deletes a user-content table', () => {
    const violations = []

    // Regex: .from('TABLE') followed within ~120 chars by .delete()
    // This covers single-line and tightly-chained multi-line calls while
    // avoiding false positives from table names appearing in unrelated SELECT/INSERT
    // nearby the same function.
    for (const file of allRoutes) {
      // Allow superadmin total-recall and admin entity-deletion routes
      if (
        file.includes('/superadmin/') ||
        file.includes('/admin/delete') ||
        file.includes('/admin/total-recall')
      ) continue

      const src = read(file)

      for (const table of SOFT_DELETE_TABLES) {
        // Match: .from('table') ... .delete( within 150 chars (covers multiline chains)
        const pattern = new RegExp(`\\.from\\(['"]${table}['"]\\)[\\s\\S]{0,150}\\.delete\\(`, 'g')
        let match
        while ((match = pattern.exec(src)) !== null) {
          // Find the line number of the match start
          const lineNum = src.slice(0, match.index).split('\n').length
          violations.push(`${relative(file)}:${lineNum}  →  hard delete on "${table}"`)
        }
      }
    }

    const unique = [...new Set(violations)]

    if (unique.length) {
      throw new Error(
        'Hard delete on user-content table detected. Use .update({ deleted_at: new Date().toISOString() }) instead.\n\n' +
        unique.join('\n')
      )
    }
    expect(unique).toHaveLength(0)
  })
})

// ── Test 4: Mutation routes must check auth ──────────────────────────────────
//
// Every route that exports POST, PATCH, PUT, or DELETE must call auth.getUser()
// before using createAdminClient() for a mutation, unless it is in the allowlist.

describe('Auth check: mutation routes must call getUser() (CLAUDE.md §3)', () => {
  const MUTATION_EXPORTS = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\s*\(/

  it('all non-allowlisted mutation routes call supabase.auth.getUser()', () => {
    const violations = []

    for (const file of allRoutes) {
      if (isAllowlisted(file)) continue

      const src = read(file)
      if (!MUTATION_EXPORTS.test(src)) continue  // no mutation handlers

      // Must import createClient (server) for auth
      const hasAuthImport = src.includes("from '@/lib/supabase/server'")
      // Must call auth.getUser()
      const hasGetUser    = src.includes('auth.getUser()')

      if (!hasAuthImport || !hasGetUser) {
        violations.push(`${relative(file)} — exports a mutation handler but does not call auth.getUser()`)
      }
    }

    if (violations.length) {
      throw new Error(
        'Mutation route missing auth check. Add: const { data: { user } } = await supabase.auth.getUser()\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 5: Webhook routes must have fail-closed signature verification ───────

describe('Webhook signature: fail-closed verification required (CLAUDE.md §16)', () => {
  const webhookRoutes = allRoutes.filter(f =>
    f.includes('/webhooks/') || f.includes('/webhook/')
  )

  it('all webhook routes verify signatures fail-closed', () => {
    const violations = []

    for (const file of webhookRoutes) {
      const src = read(file)

      // Skip re-export aliases — they delegate to the real handler which is checked separately
      if (/^\/\/[^\n]*\nexport\s*\{/.test(src.trim()) || src.trim().startsWith('export {')) continue

      const hasVerify = src.includes('verifySignature') || src.includes('timingSafeEqual')
      // Fail-open: signature check is guarded by an `if (secret)` or `if (secret && sig)` block
      // that is skipped entirely when the env var is unset.
      // The fail-closed pattern requires an explicit `if (!secret)` guard before verifySignature.
      // Accepts any variable name ending in secret/Secret/token/Token (or just 'secret').
      const hasFailClosedGuard =
        /if\s*\(\s*!\s*\w*(?:secret|Secret|token|Token|key|Key)\s*\)/.test(src) ||
        /if\s*\(\s*!\s*secret\s*\)/.test(src)
      const isFailOpen = !hasFailClosedGuard && (
        /if\s*\(\s*\w+[Ss]ecret\s*&&\s*\w+[Ss]ignature\s*\)/.test(src) ||  // if (secret && sig)
        /if\s*\(\s*\w+[Ss]ecret\s*\)\s*\{/.test(src) ||                     // if (secret) { ... }
        /if\s*\(\s*\w+\s*\)\s*\{[\s\S]*?verifySignature/.test(src)          // if (anyVar) { ...verifySignature }
      )

      if (!hasVerify) {
        violations.push(`${relative(file)} — no signature verification found`)
      } else if (isFailOpen) {
        violations.push(`${relative(file)} — signature check is fail-open; change to: if (!secret) return 500; if (!sig || !verify) return 401`)
      }
    }

    if (violations.length) {
      throw new Error(
        'Webhook route missing or fail-open signature verification.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 6: Rate limiting on expensive / public endpoints ─────────────────────
//
// Routes that call external paid APIs or accept unauthenticated user input
// must import globalRateLimit. This prevents both API cost abuse and spam.

describe('Rate limiting: expensive/public routes must use globalRateLimit (CLAUDE.md §17)', () => {
  const RATE_LIMITED_ROUTES = [
    '/api/auth/request-password-reset',
    '/api/quotes/',   // matches any quotes/[id]/send
    '/api/ocr',
    '/api/invoice-ai',
    '/api/szakemberek/',  // matches /api/szakemberek/[slug]/contact
  ]

  // Routes that must specifically have globalRateLimit (not just the in-process one)
  const MUST_HAVE_GLOBAL_RL = [
    // Public / identity endpoints
    'src/app/api/auth/request-password-reset/route.js',
    'src/app/api/szakemberek/[slug]/contact/route.js',
    // Expensive per-call: Puppeteer + SMTP
    'src/app/api/quotes/[id]/send/route.js',
    // External paid APIs: Google Vision, OpenAI
    'src/app/api/ocr/route.js',
    'src/app/api/invoice-ai/route.js',
    // AI routes: OpenAI GPT-4
    'src/app/api/surveys/[id]/analyze-layout/route.js',
    'src/app/api/surveys/[id]/fill-property/route.js',
    'src/app/api/surveys/[id]/entries/[entryId]/fill-entry/route.js',
    'src/app/api/surveys/[id]/entries/[entryId]/generate-items/route.js',
    'src/app/api/quotes/[id]/parse-entry/route.js',
    'src/app/api/quotes/[id]/sections/[sectionId]/generate-entries/route.js',
    'src/app/api/format-notes/route.js',
  ]

  it('high-risk routes import and call globalRateLimit', () => {
    const violations = []

    for (const relPath of MUST_HAVE_GLOBAL_RL) {
      const file = resolve(__dirname, '..', relPath)
      let src
      try { src = read(file) } catch { violations.push(`${relPath} — file not found`); continue }

      if (!src.includes('globalRateLimit')) {
        violations.push(`${relPath} — missing globalRateLimit call`)
      }
    }

    if (violations.length) {
      throw new Error(
        'Missing global rate limiting on expensive/public route.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 7: Soft-delete list queries must filter deleted_at ──────────────────
//
// Routes that return a collection (no .eq('id', ...) / .single() / .maybeSingle()
// narrowing to a known record) must include a deleted_at filter.
// Single-record lookups by ID are exempt — they should return 404, not silently
// omit; that check belongs at the app logic level, not in the query shape test.
//
// Specifically catches: routes that list all records for a user/workspace
// without filtering out soft-deleted rows.

describe('Soft delete: list queries on soft-delete tables must filter deleted_at (CLAUDE.md §4)', () => {
  // These are the routes whose main purpose is returning a collection —
  // they must have a deleted_at filter.
  // POST-only create routes (quotes/route.js, clients/route.js, invoices/route.js)
  // are excluded — they don't return lists to the client. The main list fetch goes
  // through entity/data. Add a route here whenever a new GET-collection endpoint is added.
  //
  // Each entry uses a proximity check: .from('TABLE') must be followed by
  // 'deleted_at' within ~500 chars (covers any reasonably long query chain).
  // This is more precise than a plain file-level include() and catches cases
  // where only one of several same-table queries lacks the filter.
  const LIST_ROUTE_PATTERNS = [
    // pattern → table that must have deleted_at filter near its .from() call
    { pattern: /src\/app\/api\/diary\/route\.js$/, table: 'diary_entries' },
    { pattern: /src\/app\/api\/ideas\/route\.js$/, table: 'ideas' },
    // Main bulk fetch
    { pattern: /src\/app\/api\/entity\/data\/route\.js$/, table: 'projects' },
    { pattern: /src\/app\/api\/entity\/data\/route\.js$/, table: 'quotes' },
    { pattern: /src\/app\/api\/entity\/data\/route\.js$/, table: 'surveys' },
    { pattern: /src\/app\/api\/entity\/data\/route\.js$/, table: 'clients' },
    { pattern: /src\/app\/api\/entity\/data\/route\.js$/, table: 'invoices' },
    // Public-facing diary feeds: share token view and email-OTP portal
    { pattern: /src\/app\/api\/diary\/share\/resolve\/route\.js$/, table: 'diary_entries' },
    { pattern: /src\/app\/api\/portal\/data\/route\.js$/, table: 'diary_entries' },
    { pattern: /src\/app\/api\/portal\/data\/route\.js$/, table: 'quotes' },
    { pattern: /src\/app\/api\/portal\/data\/route\.js$/, table: 'projects' },
    // Unified workspace list (survey picker + combined list pages)
    { pattern: /src\/app\/api\/workspace\/combined\/route\.js$/, table: 'surveys' },
    { pattern: /src\/app\/api\/workspace\/combined\/route\.js$/, table: 'quotes' },
    { pattern: /src\/app\/api\/workspace\/combined\/route\.js$/, table: 'projects' },
  ]

  // Returns true if the file contains at least one .from('table') that is
  // followed by 'deleted_at' within 500 chars (the typical length of a chained query).
  function hasProximityFilter(src, table) {
    const fromRe = new RegExp(`\\.from\\(['"]${table}['"]\\)`, 'g')
    let m
    while ((m = fromRe.exec(src)) !== null) {
      const window = src.slice(m.index, m.index + 500)
      if (window.includes('deleted_at')) return true
    }
    return false
  }

  it('known list routes include a deleted_at filter near each soft-delete table query', () => {
    const violations = []

    for (const { pattern, table } of LIST_ROUTE_PATTERNS) {
      const file = allRoutes.find(f => pattern.test(f))
      if (!file) continue  // route doesn't exist yet — skip

      const src = read(file)
      if (!hasProximityFilter(src, table)) {
        violations.push(`${relative(file)} — queries '${table}' but no .from('${table}') is followed by deleted_at within 500 chars`)
      }
    }

    if (violations.length) {
      throw new Error(
        'List route missing deleted_at filter. Add .is(\'deleted_at\', null) to the query.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 8: user_id must never be read from the request body ─────────────────
//
// Setting user_id from client input is a privilege escalation vector.
// user_id on inserted rows must always be set server-side from auth.getUser().

describe('Security: user_id must not be read from request body (CLAUDE.md §3)', () => {
  // Pattern: body.user_id or req.user_id used in an insert/upsert
  // We detect: body.user_id assigned in a context where createAdminClient is imported
  const BODY_USER_ID = /body\.user_id|req\.user_id|data\.user_id|json\.user_id/

  it('no API route trusts client-supplied user_id for inserts', () => {
    const violations = []

    for (const file of allRoutes) {
      if (isAllowlisted(file)) continue

      const src = read(file)
      if (!src.includes('createAdminClient')) continue  // only routes that do DB mutations

      const lines = src.split('\n')
      lines.forEach((line, i) => {
        if (BODY_USER_ID.test(line) && !line.trim().startsWith('//')) {
          violations.push(`${relative(file)}:${i + 1}  →  ${line.trim()}`)
        }
      })
    }

    if (violations.length) {
      throw new Error(
        'Client-supplied user_id detected. Set user_id: user.id server-side instead.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 9: New migration files must have RLS boilerplate ─────────────────────
//
// Every CREATE TABLE in the public schema requires ENABLE ROW LEVEL SECURITY
// and a deny-all policy (USING (false)). Checked for migration files >= 119
// (the cutoff when this standard was first applied).
// CLAUDE.md §14.

describe('DB migrations: new tables must enable RLS (CLAUDE.md §14)', () => {
  const MIGRATIONS_DIR = resolve(__dirname, '../supabase/migrations')

  // Migrations older than 119 predate the rule — they have known gaps that
  // are tracked separately (Tasks 1–3 in DB_Safety.md).
  const MIN_MIGRATION = 119

  // Known gaps that are covered by a later retroactive migration.
  // Format: 'filename' → 'fixed by migration NNN'
  const KNOWN_EXCEPTIONS = {
    '126_invoice_media.sql': 'fixed by 133_invoice_media_rls.sql',
  }

  function migrationNumber(filename) {
    const m = filename.match(/^(\d+)_/)
    return m ? parseInt(m[1], 10) : 0
  }

  it('migration files >= 119 with CREATE TABLE also enable RLS and add a deny-all policy', () => {
    const violations = []

    let files
    try {
      files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))
    } catch {
      // migrations directory doesn't exist in this environment — skip
      return
    }

    for (const filename of files) {
      if (migrationNumber(filename) < MIN_MIGRATION) continue
      if (KNOWN_EXCEPTIONS[filename]) continue

      const src = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
      const hasCreateTable = /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(\w+\.)?/i.test(src)
      if (!hasCreateTable) continue

      const hasRlsEnable = /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(src)
      const hasDenyAll   = /USING\s*\(\s*false\s*\)/i.test(src)

      if (!hasRlsEnable || !hasDenyAll) {
        violations.push(
          `supabase/migrations/${filename} — CREATE TABLE without RLS boilerplate (needs ENABLE ROW LEVEL SECURITY + USING(false) policy)`
        )
      }
    }

    if (violations.length) {
      throw new Error(
        'Migration creates a table without RLS. Add ENABLE ROW LEVEL SECURITY + deny-all policy.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 10: Gatekeeper lookups must exclude soft-deleted documents ───────────
//
// Routes that look up a document by ID as a gate before mutations must add
// .is('deleted_at', null) so soft-deleted documents return 404 rather than
// allowing reads and mutations on deleted data.

describe('Soft delete: gatekeeper ID lookups must filter deleted_at (CLAUDE.md §4)', () => {
  const GATEKEEPER_ROUTES = [
    // Top-level document routes
    { file: 'src/app/api/quotes/[id]/route.js',   table: 'quotes' },
    { file: 'src/app/api/projects/[id]/route.js', table: 'projects' },
    { file: 'src/app/api/surveys/[id]/route.js',  table: 'surveys' },
    { file: 'src/app/api/invoices/[id]/route.js', table: 'invoices' },
    { file: 'src/app/api/diary/[id]/route.js',    table: 'diary_entries' },
    { file: 'src/app/api/ideas/[id]/route.js',    table: 'ideas' },
    { file: 'src/app/api/clients/[id]/route.js',  table: 'clients' },
    // Sub-document routes — parent document lookup
    { file: 'src/app/api/quotes/[id]/sections/route.js',                      table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/entries/route.js',                        table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/entries/[entryId]/route.js',              table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/client-comments/route.js',                table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/accept/route.js',                         table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/pdf/route.js',                            table: 'quotes' },
    { file: 'src/app/api/quotes/[id]/import-survey/route.js',                  table: 'quotes' },
    { file: 'src/app/api/surveys/[id]/entries/route.js',                       table: 'surveys' },
    { file: 'src/app/api/surveys/[id]/entries/[entryId]/route.js',             table: 'surveys' },
    { file: 'src/app/api/surveys/[id]/drawings/route.js',                      table: 'surveys' },
    { file: 'src/app/api/surveys/[id]/items/route.js',                         table: 'surveys' },
    { file: 'src/app/api/surveys/[id]/items/[itemId]/route.js',                table: 'surveys' },
    { file: 'src/app/api/surveys/[id]/media/[mediaId]/route.js',               table: 'surveys' },
    { file: 'src/app/api/surveys/upload/route.js',                             table: 'surveys' },
    { file: 'src/app/api/projects/[id]/rooms/route.js',                        table: 'projects' },
    { file: 'src/app/api/projects/[id]/rooms/[roomId]/route.js',               table: 'projects' },
    { file: 'src/app/api/projects/[id]/members/route.js',                      table: 'projects' },
    { file: 'src/app/api/invoices/route.js',                                   table: 'projects' },
    { file: 'src/app/api/labour-entries/route.js',                             table: 'projects' },
    { file: 'src/app/api/diary/route.js',                                      table: 'projects' },
    { file: 'src/app/api/diary/share/route.js',                                table: 'projects' },
    { file: 'src/app/api/payment-plan/route.js',                               table: 'projects' },
  ]

  // Returns true if any .from('table')...single() chain in the file also
  // contains 'deleted_at' within the same 300-char window before .single().
  function gatekeeperHasFilter(src, table) {
    const singleRe = /\.single\(\)/g
    let m
    while ((m = singleRe.exec(src)) !== null) {
      const window = src.slice(Math.max(0, m.index - 300), m.index + 10)
      if (window.includes(`from('${table}')`) || window.includes(`from("${table}")`)) {
        if (window.includes('deleted_at')) return true
      }
    }
    return false
  }

  it('gatekeeper ID lookups on soft-delete tables include deleted_at filter', () => {
    const violations = []

    for (const { file, table } of GATEKEEPER_ROUTES) {
      const full = resolve(__dirname, '..', file)
      let src
      try { src = read(full) } catch { violations.push(`${file} — file not found`); continue }

      if (!gatekeeperHasFilter(src, table)) {
        violations.push(`${file} — .from('${table}')...single() lacks .is('deleted_at', null); soft-deleted documents would be accessible`)
      }
    }

    if (violations.length) {
      throw new Error(
        "Gatekeeper lookup missing deleted_at filter. Add .is('deleted_at', null) before .single().\n\n" +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})

// ── Test 11: No production code references legacy entities/memberships tables ──
//
// The entities and memberships tables are dropped by migration 139. Any remaining
// .from('entities') or .from('memberships') reference in API routes or context
// actions must be caught here before they cause runtime errors.

describe('Legacy tables: no code references dropped entities/memberships tables (Task 11d)', () => {
  const CONTEXT_DIR = resolve(__dirname, '../src/context')

  function findJsFiles(dir) {
    const results = []
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) results.push(...findJsFiles(full))
      else if (entry.endsWith('.js') || entry.endsWith('.jsx')) results.push(full)
    }
    return results
  }

  const contextFiles = findJsFiles(CONTEXT_DIR)
  const allProductionFiles = [...allRoutes, ...contextFiles]

  it('no API route or context file queries the dropped entities or memberships tables', () => {
    const violations = []

    for (const file of allProductionFiles) {
      const src = read(file)
      const tableRe = /\.from\s*\(\s*['"](?:entities|memberships)['"]\s*\)/g
      let match
      while ((match = tableRe.exec(src)) !== null) {
        const lineNum = src.slice(0, match.index).split('\n').length
        const tableName = match[0].match(/entities|memberships/)[0]
        violations.push(`${relative(file)}:${lineNum} — references legacy table '${tableName}'`)
      }
    }

    if (violations.length) {
      throw new Error(
        'Code references a dropped table (entities/memberships). Migrate to collectives/collective_members.\n\n' +
        violations.join('\n')
      )
    }
    expect(violations).toHaveLength(0)
  })
})
