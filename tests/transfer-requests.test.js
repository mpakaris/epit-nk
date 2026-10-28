/**
 * Transfer Requests — moving personal documents into a collective.
 *
 * Users:
 *   owner  — collective owner; direct move (no approval needed)
 *   member — contributor; must request approval from the owner
 *
 * Scenarios covered:
 *   1.  Owner moves their own personal survey directly (no request row created)
 *   2.  Contributor creates a pending request; owner can list it via GET
 *   3.  Duplicate pending request for the same document is blocked (400)
 *   4.  GET ?outgoing=true returns the requester's own pending requests
 *   5.  Contributor cannot respond to (accept/reject) their own request (403)
 *   6.  Owner accepts → document moves, owner_id transfers to the collective owner
 *   7.  Accepted request disappears from the GET list
 *   8.  Owner rejects → document stays personal, owner_id unchanged
 *   9.  Already-in-collective document cannot be transferred again (400)
 *   10. Contributor cannot transfer a document they do not own (403)
 *   11. Contributor can retract a pending request → status 'retracted', doc unlocks
 *   12. Owner cannot retract a request they did not create (403)
 *   13. PATCH on a locked document returns 423
 *   14. DELETE on a locked document returns 423
 *   15. After retraction PATCH/DELETE succeed again
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let collectiveId

// Documents created during the run
let ownerSurveyId    // owner's personal survey → direct move
let ownerSurvey2Id   // owner's second personal survey → edge-case (not-your-doc)
let memberSurveyId   // member's personal survey → request → accept
let memberQuoteId    // member's personal quote  → request → reject
let lockSurveyId     // member's personal survey → API lock test
let retractSurveyId  // member's personal survey → retract test
let permSurveyId     // member's personal survey → retract permission test

// Transfer-request IDs
let acceptRequestId
let rejectRequestId
let lockRequestId
let retractRequestId
let permRequestId

beforeAll(async () => {
  const [ownerSession, memberSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId

  // Locate the non-inclusive test collective owned by the owner
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
  // Remove all transfer requests created during this suite
  const uids = [ownerUserId, memberUserId].filter(Boolean)
  if (uids.length) {
    await admin.from('transfer_requests').delete().in('from_user_id', uids)
  }

  // Remove documents (delete by id — safe even if owner_id changed after acceptance)
  const surveyIds = [ownerSurveyId, memberSurveyId, ownerSurvey2Id,
                     lockSurveyId, retractSurveyId, permSurveyId].filter(Boolean)
  for (const id of surveyIds) {
    await admin.from('survey_entries').delete().eq('survey_id', id)
    await admin.from('surveys').delete().eq('id', id)
  }
  if (memberQuoteId) {
    await admin.from('quote_entries').delete().eq('quote_id', memberQuoteId)
    await admin.from('quote_sections').delete().eq('quote_id', memberQuoteId)
    await admin.from('quotes').delete().eq('id', memberQuoteId)
  }
})

// ─── DIRECT MOVE (owner) ─────────────────────────────────────────────────────

describe('Transfer — owner direct move', () => {
  it('owner creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Személyes felmérés (közvetlen áthelyezés)',
      collective_id: null,
    }, ownerCookie)
    expect(status).toBe(201)
    expect(body.survey.collective_id).toBeNull()
    expect(body.survey.owner_id).toBe(ownerUserId)
    ownerSurveyId = body.survey.id
  })

  it('owner moves their personal survey directly — no approval needed', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   ownerSurveyId,
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.moved).toBe(true)
    expect(body.requested).toBeUndefined()
  })

  it('collective_id is set and owner_id is unchanged in DB', async () => {
    const { data } = await admin
      .from('surveys')
      .select('collective_id, owner_id')
      .eq('id', ownerSurveyId)
      .single()
    expect(data.collective_id).toBe(collectiveId)
    expect(data.owner_id).toBe(ownerUserId)
  })

  it('no transfer_request row was created for the direct move', async () => {
    const { data } = await admin
      .from('transfer_requests')
      .select('id')
      .eq('document_id', ownerSurveyId)
      .maybeSingle()
    expect(data).toBeNull()
  })
})

// ─── CONTRIBUTOR REQUEST → ACCEPT ────────────────────────────────────────────

describe('Transfer — contributor request → owner accepts', () => {
  it('member creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Közreműködő személyes felmérés (elfogadásra)',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    expect(body.survey.owner_id).toBe(memberUserId)
    expect(body.survey.collective_id).toBeNull()
    memberSurveyId = body.survey.id
  })

  it('member submits a transfer request', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   memberSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.requested).toBe(true)
    expect(body.request.status).toBe('pending')
    expect(body.request.document_type).toBe('survey')
    acceptRequestId = body.request.id
  })

  it('GET ?outgoing=true returns the pending request to the requester', async () => {
    const { status, body } = await api('GET', '/api/transfer-requests?outgoing=true', null, memberCookie)
    expect(status).toBe(200)
    const found = (body.requests || []).find(r => r.id === acceptRequestId)
    expect(found).toBeTruthy()
    expect(found.document_id).toBe(memberSurveyId)
    expect(found.status).toBe('pending')
  })

  it('duplicate pending request for the same document is blocked', async () => {
    const { status } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   memberSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(400)
  })

  it('GET /api/transfer-requests returns the pending request to the collective owner', async () => {
    const { status, body } = await api('GET', '/api/transfer-requests', null, ownerCookie)
    expect(status).toBe(200)
    const found = (body.requests || []).find(r => r.id === acceptRequestId)
    expect(found).toBeTruthy()
    expect(found.document_title).toBe('[TEST] Közreműködő személyes felmérés (elfogadásra)')
    expect(found.requester?.display_name).toBe('Test Member')
  })

  it('GET /api/transfer-requests returns empty list to the contributor', async () => {
    const { status, body } = await api('GET', '/api/transfer-requests', null, memberCookie)
    expect(status).toBe(200)
    expect(body.requests).toHaveLength(0)
  })

  it('contributor cannot accept their own pending request', async () => {
    const { status } = await api('PATCH', `/api/transfer-requests/${acceptRequestId}`, {
      action: 'accept',
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('owner accepts the transfer request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${acceptRequestId}`, {
      action: 'accept',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('survey is now in collective with owner_id changed to the collective owner', async () => {
    const { data } = await admin
      .from('surveys')
      .select('collective_id, owner_id')
      .eq('id', memberSurveyId)
      .single()
    expect(data.collective_id).toBe(collectiveId)
    expect(data.owner_id).toBe(ownerUserId)
  })

  it('transfer_request row is marked accepted in DB', async () => {
    const { data } = await admin
      .from('transfer_requests')
      .select('status, resolved_at')
      .eq('id', acceptRequestId)
      .single()
    expect(data.status).toBe('accepted')
    expect(data.resolved_at).toBeTruthy()
  })

  it('accepted request no longer appears in GET list', async () => {
    const { status, body } = await api('GET', '/api/transfer-requests', null, ownerCookie)
    expect(status).toBe(200)
    const found = (body.requests || []).find(r => r.id === acceptRequestId)
    expect(found).toBeUndefined()
  })
})

// ─── CONTRIBUTOR REQUEST → REJECT ────────────────────────────────────────────

describe('Transfer — contributor request → owner rejects', () => {
  it('member creates a personal quote', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST] Személyes ajánlat (visszautasításra)',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    expect(body.quote.collective_id).toBeNull()
    expect(body.quote.owner_id).toBe(memberUserId)
    memberQuoteId = body.quote.id
  })

  it('member submits a transfer request for the quote', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'quote',
      document_id:   memberQuoteId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.requested).toBe(true)
    rejectRequestId = body.request.id
  })

  it('owner rejects the transfer request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${rejectRequestId}`, {
      action: 'reject',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('quote remains personal — collective_id and owner_id unchanged', async () => {
    const { data } = await admin
      .from('quotes')
      .select('collective_id, owner_id')
      .eq('id', memberQuoteId)
      .single()
    expect(data.collective_id).toBeNull()
    expect(data.owner_id).toBe(memberUserId)
  })

  it('transfer_request row is marked rejected in DB', async () => {
    const { data } = await admin
      .from('transfer_requests')
      .select('status, resolved_at')
      .eq('id', rejectRequestId)
      .single()
    expect(data.status).toBe('rejected')
    expect(data.resolved_at).toBeTruthy()
  })
})

// ─── EDGE CASES ──────────────────────────────────────────────────────────────

describe('Transfer — edge cases', () => {
  it('cannot transfer a document that is already in a collective', async () => {
    // ownerSurveyId was moved to the collective in the direct-move test
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   ownerSurveyId,
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(400)
    expect(body.error).toMatch(/kollektívában/)
  })

  it('contributor cannot transfer a document they do not own', async () => {
    // Owner creates a second personal survey; member tries to transfer it
    const { status: createStatus, body: createBody } = await api('POST', '/api/surveys', {
      title: '[TEST] Tulajdonos másik személyes felmérése',
      collective_id: null,
    }, ownerCookie)
    expect(createStatus).toBe(201)
    ownerSurvey2Id = createBody.survey.id

    const { status } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   ownerSurvey2Id,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('invalid action on PATCH returns 400', async () => {
    const { status } = await api('PATCH', `/api/transfer-requests/${rejectRequestId}`, {
      action: 'approve',
    }, ownerCookie)
    expect(status).toBe(400)
  })
})

// ─── RETRACT ─────────────────────────────────────────────────────────────────

describe('Transfer — retract (requester withdraws pending request)', () => {
  it('member creates a personal survey for retract test', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Visszavonandó felmérés',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    retractSurveyId = body.survey.id
  })

  it('member submits a transfer request', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   retractSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.requested).toBe(true)
    retractRequestId = body.request.id
  })

  it('member retracts the request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${retractRequestId}`, {
      action: 'retract',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('transfer_request row is marked retracted in DB', async () => {
    const { data } = await admin
      .from('transfer_requests')
      .select('status, resolved_at')
      .eq('id', retractRequestId)
      .single()
    expect(data.status).toBe('retracted')
    expect(data.resolved_at).toBeTruthy()
  })

  it('GET ?outgoing=true no longer includes the retracted request', async () => {
    const { status, body } = await api('GET', '/api/transfer-requests?outgoing=true', null, memberCookie)
    expect(status).toBe(200)
    const found = (body.requests || []).find(r => r.id === retractRequestId)
    expect(found).toBeUndefined()
  })

  it('survey remains personal after retraction', async () => {
    const { data } = await admin
      .from('surveys')
      .select('collective_id, owner_id')
      .eq('id', retractSurveyId)
      .single()
    expect(data.collective_id).toBeNull()
    expect(data.owner_id).toBe(memberUserId)
  })
})

// ─── API LOCK (PATCH / DELETE blocked while pending) ─────────────────────────

describe('Transfer — API lock (PATCH/DELETE return 423 while pending)', () => {
  it('member creates a personal survey for lock test', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Zárolásra kerülő felmérés',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    lockSurveyId = body.survey.id
  })

  it('member submits a transfer request — survey is now locked', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   lockSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    lockRequestId = body.request.id
  })

  it('document owner can PATCH their own pending-transfer survey (owner always editable)', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${lockSurveyId}`, {
      title: '[TEST] Zárolásra kerülő felmérés — szerkesztve',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Zárolásra kerülő felmérés — szerkesztve')
  })

  it('DELETE on a pending-transfer survey returns 423', async () => {
    const { status, body } = await api('DELETE', `/api/surveys/${lockSurveyId}`, null, memberCookie)
    expect(status).toBe(423)
    expect(body.error).toMatch(/átadás alatt/)
  })

  it('survey is still not deleted after blocked DELETE attempt', async () => {
    const { data } = await admin
      .from('surveys')
      .select('title, deleted_at')
      .eq('id', lockSurveyId)
      .single()
    expect(data.deleted_at).toBeNull()
  })

  it('member retracts the request — survey unlocks', async () => {
    const { status } = await api('PATCH', `/api/transfer-requests/${lockRequestId}`, {
      action: 'retract',
    }, memberCookie)
    expect(status).toBe(200)
  })

  it('PATCH succeeds after retraction', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${lockSurveyId}`, {
      title: '[TEST] Zárolás feloldva — módosítva',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Zárolás feloldva — módosítva')
  })
})

// ─── RETRACT PERMISSIONS ─────────────────────────────────────────────────────

describe('Transfer — retract permissions (only requester can retract)', () => {
  it('member creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Visszavonási jogosultság teszt',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    permSurveyId = body.survey.id
  })

  it('member submits a transfer request', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   permSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    permRequestId = body.request.id
  })

  it('collective owner cannot retract a request they did not create', async () => {
    const { status } = await api('PATCH', `/api/transfer-requests/${permRequestId}`, {
      action: 'retract',
    }, ownerCookie)
    expect(status).toBe(403)
  })

  it('request is still pending after the failed retract attempt', async () => {
    const { data } = await admin
      .from('transfer_requests')
      .select('status')
      .eq('id', permRequestId)
      .single()
    expect(data.status).toBe('pending')
  })

  it('requester (member) can retract their own request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${permRequestId}`, {
      action: 'retract',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })
})
