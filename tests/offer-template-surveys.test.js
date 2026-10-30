/**
 * Survey template access rules for /api/surveys/for-offer-template
 *
 * Matrix enforced here:
 *   Personal offer (no collective_id)           → own personal surveys only
 *   Collective offer (owner/admin)              → own personal + same-collective surveys
 *   Collective offer (contributor/member)       → own personal + same-collective surveys
 *   Any offer, other collective's surveys       → never visible
 *   Non-member requesting a collective          → 403
 *   Unauthenticated                             → 401
 *
 * Users (created by seed.js):
 *   owner  — TEST_OWNER_EMAIL  — owner of the test collective
 *   member — TEST_MEMBER_EMAIL — contributor of the test collective
 *   solo   — TEST_SOLO_EMAIL   — not in any collective
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let soloCookie, soloUserId
let collectiveId

// Survey IDs created during this run
const created = {
  ownerPersonal: null,
  ownerCollective: null,
  memberPersonal: null,
  soloPersonal: null,
}

beforeAll(async () => {
  const [ownerSession, memberSession, soloSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
    signIn(process.env.TEST_SOLO_EMAIL,  process.env.TEST_SOLO_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId
  soloCookie   = soloSession.cookie
  soloUserId   = soloSession.userId

  // Resolve the test collective (non-inclusive, owned by owner)
  const { data: rows } = await admin
    .from('collective_members')
    .select('collective_id, collectives!inner(is_inclusive)')
    .eq('user_id', ownerUserId)
    .eq('role', 'owner')
    .eq('status', 'active')
  const row = (rows || []).find(r => r.collectives?.is_inclusive === false)
  if (!row) throw new Error('Test collective not found — run: node tests/seed.js')
  collectiveId = row.collective_id

  // Create test surveys directly in the DB (bypasses active-workspace scoping)
  const now = new Date().toISOString()

  const insert = async (owner_id, collective_id, title) => {
    const { data, error } = await admin
      .from('surveys')
      .insert({ owner_id, collective_id, title, created_at: now, updated_at: now })
      .select('id')
      .single()
    if (error) throw new Error(`Survey insert failed: ${error.message}`)
    return data.id
  }

  ;[
    created.ownerPersonal,
    created.ownerCollective,
    created.memberPersonal,
    created.soloPersonal,
  ] = await Promise.all([
    insert(ownerUserId,  null,          '[TEST-TMPL] Owner personal survey'),
    insert(ownerUserId,  collectiveId,  '[TEST-TMPL] Collective survey'),
    insert(memberUserId, null,          '[TEST-TMPL] Member personal survey'),
    insert(soloUserId,   null,          '[TEST-TMPL] Solo personal survey'),
  ])
})

afterAll(async () => {
  const ids = Object.values(created).filter(Boolean)
  if (ids.length) {
    await admin.from('surveys').delete().in('id', ids)
  }
})

// ─── Unauthenticated ──────────────────────────────────────────────────────────

describe('for-offer-template — auth guard', () => {
  it('rejects unauthenticated requests', async () => {
    const { status } = await api('GET', '/api/surveys/for-offer-template', null, null)
    expect(status).toBe(401)
  })
})

// ─── Personal offer ───────────────────────────────────────────────────────────

describe('for-offer-template — personal offer (no collective_id)', () => {
  it('returns own personal surveys', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.ownerPersonal)
  })

  it('does NOT return collective surveys', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).not.toContain(created.ownerCollective)
  })

  it('does NOT return surveys from other users', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).not.toContain(created.memberPersonal)
    expect(ids).not.toContain(created.soloPersonal)
  })

  it('all returned surveys are tagged _source=personal', async () => {
    const { body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(body.surveys.every(s => s._source === 'personal')).toBe(true)
  })

  it('member personal offer also returns only own personal surveys', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, memberCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.memberPersonal)
    expect(ids).not.toContain(created.ownerPersonal)
    expect(ids).not.toContain(created.ownerCollective)
  })
})

// ─── Collective offer — owner ─────────────────────────────────────────────────

describe('for-offer-template — collective offer (owner)', () => {
  it('returns collective surveys', async () => {
    const { status, body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, ownerCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.ownerCollective)
  })

  it('also returns own personal surveys', async () => {
    const { status, body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, ownerCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.ownerPersonal)
  })

  it('collective surveys are tagged _source=collective', async () => {
    const { body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, ownerCookie)
    const collective = body.surveys.find(s => s.id === created.ownerCollective)
    expect(collective?._source).toBe('collective')
  })

  it('personal surveys are tagged _source=personal', async () => {
    const { body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, ownerCookie)
    const personal = body.surveys.find(s => s.id === created.ownerPersonal)
    expect(personal?._source).toBe('personal')
  })

  it('does NOT return other members personal surveys', async () => {
    const { body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, ownerCookie)
    const ids = body.surveys.map(s => s.id)
    expect(ids).not.toContain(created.memberPersonal)
    expect(ids).not.toContain(created.soloPersonal)
  })
})

// ─── Collective offer — contributor (member) ──────────────────────────────────

describe('for-offer-template — collective offer (contributor)', () => {
  it('returns collective surveys', async () => {
    const { status, body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, memberCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.ownerCollective)
  })

  it('also returns own personal surveys', async () => {
    const { status, body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, memberCookie)
    expect(status).toBe(200)
    const ids = body.surveys.map(s => s.id)
    expect(ids).toContain(created.memberPersonal)
  })

  it('does NOT return the owner personal surveys', async () => {
    const { body } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, memberCookie)
    const ids = body.surveys.map(s => s.id)
    expect(ids).not.toContain(created.ownerPersonal)
  })
})

// ─── Access control — non-member ──────────────────────────────────────────────

describe('for-offer-template — non-member cannot access collective surveys', () => {
  it('returns 403 when solo user requests a collective they are not in', async () => {
    const { status } = await api('GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`, null, soloCookie)
    expect(status).toBe(403)
  })
})
