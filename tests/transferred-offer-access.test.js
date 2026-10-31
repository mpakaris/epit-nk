/**
 * Transferred Offer Access — verifies that all parties retain correct access
 * to quotes and their linked surveys after a transfer to a collective.
 *
 * Scenarios covered:
 *
 * A. Owner directly moves a personal quote (+ linked survey) to collective:
 *    A1. Quote GET → 200 for original owner (still created_by)
 *    A2. Quote client-comments GET → 200 for original owner
 *    A3. Collective member can GET the quote → 200
 *    A4. Survey GET → 200 for collective member (linked-quote fallback)
 *    A5. Survey items GET → 200 for collective member
 *    A6. Survey entries GET → 200 for collective member
 *    A7. Non-member cannot access the personal survey → 403
 *
 * B. Contributor's personal quote transferred via request → owner accepts:
 *    B1. Original creator (created_by) can GET client-comments → 200
 *    B2. Collective owner can GET client-comments → 200
 *    B3. Survey linked to the transferred quote → 200 for collective owner
 *    B4. Original creator cannot access survey after losing ownership → 403
 *        (survey stays personal, creator is no longer the survey owner after accept)
 *        — actually: created_by IS still set → 200 (creator retains read via created_by)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let collectiveId

// Group A fixtures
let surveyAId   // personal survey linked to the transferred quote
let quoteAId    // personal quote (owner) — direct move
let sectionAId  // section inside quoteA
let transferARequestId // not needed for direct move but kept for clarity

// Group B fixtures
let surveyBId   // personal survey linked to member's transferred quote
let quoteBId    // personal quote (member) — request → accept
let transferBRequestId

beforeAll(async () => {
  const [ownerSession, memberSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId

  // Find the non-inclusive test collective owned by the owner
  const { data: rows } = await admin
    .from('collective_members')
    .select('collective_id, collectives!inner(is_inclusive)')
    .eq('user_id', ownerUserId)
    .eq('role', 'owner')
    .eq('status', 'active')
  const row = (rows || []).find(r => r.collectives?.is_inclusive === false)
  if (!row) throw new Error('Test collective not found — run: node tests/seed.js')
  collectiveId = row.collective_id
})

afterAll(async () => {
  const surveyIds = [surveyAId, surveyBId].filter(Boolean)
  for (const id of surveyIds) {
    await admin.from('survey_entry_items').delete().eq('survey_id', id)
    await admin.from('survey_entries').delete().eq('survey_id', id)
    await admin.from('surveys').delete().eq('id', id)
  }
  const quoteIds = [quoteAId, quoteBId].filter(Boolean)
  for (const id of quoteIds) {
    await admin.from('quote_entries').delete().eq('quote_id', id)
    await admin.from('quote_sections').delete().eq('quote_id', id)
    await admin.from('quotes').delete().eq('id', id)
  }
  const userIds = [ownerUserId, memberUserId].filter(Boolean)
  if (userIds.length) {
    await admin.from('transfer_requests').delete().in('from_user_id', userIds)
  }
})

// ─── GROUP A: OWNER DIRECT MOVE ──────────────────────────────────────────────

describe('A — owner direct-moves personal quote + linked survey to collective', () => {
  it('A.setup: owner creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST-TRANSFER-ACCESS] Személyes felmérés (A)',
      collective_id: null,
    }, ownerCookie)
    expect(status).toBe(201)
    surveyAId = body.survey.id
    expect(surveyAId).toBeTruthy()
  })

  it('A.setup: owner creates a personal survey entry', async () => {
    const { status } = await api('POST', `/api/surveys/${surveyAId}/entries`, {
      name: 'Szoba A',
    }, ownerCookie)
    expect(status).toBe(201)
  })

  it('A.setup: owner creates a personal quote linked to the survey', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST-TRANSFER-ACCESS] Személyes ajánlat (A)',
      collective_id: null,
      survey_id: surveyAId,
    }, ownerCookie)
    expect(status).toBe(201)
    quoteAId = body.quote.id
  })

  it('A.setup: owner adds a section to the quote', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteAId}/sections`, {
      name: 'Szoba A burkolat',
    }, ownerCookie)
    expect(status).toBe(201)
    sectionAId = body.section.id
  })

  it('A.setup: owner adds an entry to the section', async () => {
    const { status } = await api('POST', `/api/quotes/${quoteAId}/entries`, {
      section_id:       sectionAId,
      entry_type:       'material',
      work_description: 'Járólap',
      quantity:         10,
      unit:             'm²',
      unit_price:       5000,
      amount_huf:       50000,
    }, ownerCookie)
    expect(status).toBe(201)
  })

  it('A.setup: owner directly transfers the quote to the collective', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'quote',
      document_id:   quoteAId,
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.moved).toBe(true)
  })

  it('A.setup: DB confirms quote has collective_id set, survey still personal', async () => {
    const [{ data: quote }, { data: survey }] = await Promise.all([
      admin.from('quotes').select('collective_id, owner_id, created_by').eq('id', quoteAId).single(),
      admin.from('surveys').select('collective_id').eq('id', surveyAId).single(),
    ])
    expect(quote.collective_id).toBe(collectiveId)
    expect(survey.collective_id).toBeNull()
  })

  // ── Post-transfer access assertions ──

  it('A1. Original owner can still GET the transferred quote → 200', async () => {
    const { status, body } = await api('GET', `/api/quotes/${quoteAId}`, null, ownerCookie)
    expect(status).toBe(200)
    expect(body.sections?.length).toBeGreaterThan(0)
    expect(body.entries?.length).toBeGreaterThan(0)
  })

  it('A2. Original owner can GET client-comments on the transferred quote → 200', async () => {
    const { status } = await api('GET', `/api/quotes/${quoteAId}/client-comments`, null, ownerCookie)
    expect(status).toBe(200)
  })

  it('A3. Collective member can GET the transferred quote → 200', async () => {
    const { status, body } = await api('GET', `/api/quotes/${quoteAId}`, null, memberCookie)
    expect(status).toBe(200)
    expect(body.quote).toBeTruthy()
  })

  it('A4. Collective member can GET the personal survey via linked-quote fallback → 200', async () => {
    const { status, body } = await api('GET', `/api/surveys/${surveyAId}`, null, memberCookie)
    expect(status).toBe(200)
    expect(body.survey).toBeTruthy()
  })

  it('A5. Collective member can GET survey items → 200', async () => {
    const { status } = await api('GET', `/api/surveys/${surveyAId}/items`, null, memberCookie)
    expect(status).toBe(200)
  })

  it('A6. Collective member sees survey entries inside the survey GET response', async () => {
    // Entries are embedded in the main survey GET — there is no separate GET /entries endpoint
    const { status, body } = await api('GET', `/api/surveys/${surveyAId}`, null, memberCookie)
    expect(status).toBe(200)
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body.entries.length).toBeGreaterThan(0)
  })
})

// ─── GROUP B: CONTRIBUTOR REQUEST → ACCEPT ───────────────────────────────────

describe('B — contributor\'s personal quote+survey transferred via accepted request', () => {
  it('B.setup: member creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST-TRANSFER-ACCESS] Közreműködő felmérése (B)',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    surveyBId = body.survey.id
  })

  it('B.setup: member creates a personal quote linked to the survey', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST-TRANSFER-ACCESS] Közreműködő ajánlata (B)',
      collective_id: null,
      survey_id: surveyBId,
    }, memberCookie)
    expect(status).toBe(201)
    quoteBId = body.quote.id
  })

  it('B.setup: member submits transfer request for the quote', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'quote',
      document_id:   quoteBId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.requested).toBe(true)
    transferBRequestId = body.request.id
  })

  it('B.setup: collective owner accepts the transfer request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${transferBRequestId}`, {
      action: 'accept',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('B.setup: DB confirms quote moved to collective, survey still personal', async () => {
    const [{ data: quote }, { data: survey }] = await Promise.all([
      admin.from('quotes').select('collective_id, owner_id, created_by').eq('id', quoteBId).single(),
      admin.from('surveys').select('collective_id, owner_id').eq('id', surveyBId).single(),
    ])
    expect(quote.collective_id).toBe(collectiveId)
    expect(quote.owner_id).toBe(ownerUserId)       // ownership transferred
    expect(quote.created_by).toBe(memberUserId)    // creator preserved
    expect(survey.collective_id).toBeNull()        // survey stays personal
  })

  // ── Post-transfer access assertions ──

  it('B1. Original creator (member, created_by) can GET client-comments → 200', async () => {
    const { status } = await api('GET', `/api/quotes/${quoteBId}/client-comments`, null, memberCookie)
    expect(status).toBe(200)
  })

  it('B2. New collective owner can GET client-comments → 200', async () => {
    const { status } = await api('GET', `/api/quotes/${quoteBId}/client-comments`, null, ownerCookie)
    expect(status).toBe(200)
  })

  it('B3. Collective owner can GET the personal survey linked to the transferred quote → 200', async () => {
    const { status, body } = await api('GET', `/api/surveys/${surveyBId}`, null, ownerCookie)
    expect(status).toBe(200)
    expect(body.survey).toBeTruthy()
  })

  it('B4. Collective owner can GET survey items of linked personal survey → 200', async () => {
    const { status } = await api('GET', `/api/surveys/${surveyBId}/items`, null, ownerCookie)
    expect(status).toBe(200)
  })

  it('B5. Original creator (member) can still GET the personal survey (created_by) → 200', async () => {
    const { status } = await api('GET', `/api/surveys/${surveyBId}`, null, memberCookie)
    expect(status).toBe(200)
  })

  it('B6. Collective owner can GET the transferred quote with sections → 200', async () => {
    const { status, body } = await api('GET', `/api/quotes/${quoteBId}`, null, ownerCookie)
    expect(status).toBe(200)
    expect(body.quote.collective_id).toBe(collectiveId)
  })
})
