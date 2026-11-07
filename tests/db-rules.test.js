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
  const FAIL_OPEN = /if\s*\(\s*process\.env\.\w+\s*&&[^)]*!==\s*process\.env\./

  it('no API route uses a fail-open env-var secret check', () => {
    const violations = []

    for (const file of allRoutes) {
      const src = read(file)
      const lines = src.split('\n')
      lines.forEach((line, i) => {
        if (FAIL_OPEN.test(line)) {
          violations.push(`${relative(file)}:${i + 1}  →  ${line.trim()}`)
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

      const hasVerify   = src.includes('verifySignature') || src.includes('timingSafeEqual')
      const isFailOpen  = /if\s*\(\s*\w+Secret\s*&&\s*\w+signature\s*\)/.test(src) ||
                          /if\s*\(\s*\w+\s*&&\s*\w+\s*\)/.test(src) // loose check

      if (!hasVerify) {
        violations.push(`${relative(file)} — no signature verification found`)
      } else if (isFailOpen) {
        violations.push(`${relative(file)} — signature check is fail-open (uses &&); change to fail-closed (!secret || !sig || !verify)`)
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
