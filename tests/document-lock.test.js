/**
 * Document lock — rejected/expired transfer requests make documents read-only.
 *
 * Scenarios covered:
 *   1.  Owner rejects transfer → document gets locked_reason='transfer_rejected'
 *   2.  Locked document PATCH returns 423
 *   3.  Locked document DELETE is still allowed (user can choose to delete)
 *   4.  Document owner can unlock (quota check passes for test user)
 *   5.  After unlock, PATCH succeeds again and locked_reason is null
 *   6.  Transfer attempt cap: 3rd attempt after 2 rejections returns 400
 *   7.  3-day cooling period: re-submit within 3 days returns 429
 *       (tested by backdating resolved_at directly in DB)
 *   8.  Cron route auto-expires transfers older than 7 days + sets locked_reason
 *   9.  Owner (during pending) can still PATCH their own document
 *   10. Non-owner (during pending) cannot PATCH a locked document
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let collectiveId

// Documents created during the run
let lockSurveyId       // rejected → locked
let unlockSurveyId     // rejected → locked → unlocked
let capSurvey1Id       // 1st attempt (will be rejected)
let capSurvey2Id       // 2nd attempt (will be rejected, cap reached)
let coolingSurveyId    // tests 3-day cooling
let cronSurveyId       // tests cron auto-expire
let pendingEditSurveyId // tests owner can edit during pending

// Transfer request IDs
let lockReqId
let unlockReqId
let cap1ReqId
let cap2ReqId
let coolingReqId
let cronReqId
let pendingEditReqId

beforeAll(async () => {
  const [ownerSession, memberSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId

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
  const ids = [lockSurveyId, unlockSurveyId, capSurvey1Id, capSurvey2Id,
               coolingSurveyId, cronSurveyId, pendingEditSurveyId].filter(Boolean)

  // Remove all transfer requests for these documents
  if (ids.length) await admin.from('transfer_requests').delete().in('document_id', ids)

  // Hard-delete surveys
  for (const id of ids) {
    await admin.from('survey_entries').delete().eq('survey_id', id)
    await admin.from('surveys').delete().eq('id', id)
  }
})

// ─── REJECTION SETS LOCK ─────────────────────────────────────────────────────

describe('Document lock — rejection sets locked_reason', () => {
  it('member creates a personal survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Zárolásra kerülő felmérés (rejection)',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    lockSurveyId = body.survey.id
  })

  it('member submits transfer request', async () => {
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   lockSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.requested).toBe(true)
    lockReqId = body.request.id
  })

  it('owner rejects the request', async () => {
    const { status, body } = await api('PATCH', `/api/transfer-requests/${lockReqId}`, {
      action: 'reject',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('survey has locked_reason=transfer_rejected in DB', async () => {
    const { data } = await admin
      .from('surveys')
      .select('locked_reason, locked_at')
      .eq('id', lockSurveyId)
      .single()
    expect(data.locked_reason).toBe('transfer_rejected')
    expect(data.locked_at).toBeTruthy()
  })

  it('PATCH on locked survey returns 423', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${lockSurveyId}`, {
      title: '[TEST] Tilos módosítani',
    }, memberCookie)
    expect(status).toBe(423)
    expect(body.locked_reason).toBe('transfer_rejected')
  })

  it('DELETE on locked survey is allowed (user chose to delete)', async () => {
    // We will NOT actually delete here — just verify it does NOT return 423
    // Use a separate survey so we don't break subsequent tests that use lockSurveyId
    const { body: createBody } = await api('POST', '/api/surveys', {
      title: '[TEST] Törlendő zárolt felmérés',
      collective_id: null,
    }, memberCookie)
    const tmpId = createBody.survey.id
    // Lock it directly via DB
    await admin.from('surveys').update({ locked_reason: 'transfer_rejected', locked_at: new Date().toISOString() }).eq('id', tmpId)
    const { status } = await api('DELETE', `/api/surveys/${tmpId}`, null, memberCookie)
    expect(status).toBe(200)
  })
})

// ─── UNLOCK ──────────────────────────────────────────────────────────────────

describe('Document lock — unlock restores editability', () => {
  it('member creates a personal survey for unlock test', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Feloldásra kerülő felmérés',
      collective_id: null,
    }, memberCookie)
    expect(status).toBe(201)
    unlockSurveyId = body.survey.id
  })

  it('member submits and owner rejects — survey is now locked', async () => {
    const { body: reqBody } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey',
      document_id:   unlockSurveyId,
      collective_id: collectiveId,
    }, memberCookie)
    unlockReqId = reqBody.request.id

    await api('PATCH', `/api/transfer-requests/${unlockReqId}`, { action: 'reject' }, ownerCookie)

    const { data } = await admin.from('surveys').select('locked_reason').eq('id', unlockSurveyId).single()
    expect(data.locked_reason).toBe('transfer_rejected')
  })

  it('member unlocks the survey (_action=unlock)', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${unlockSurveyId}`, {
      _action: 'unlock',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.survey.locked_reason).toBeNull()
    expect(body.survey.locked_at).toBeNull()
  })

  it('locked_reason is null in DB after unlock', async () => {
    const { data } = await admin.from('surveys').select('locked_reason').eq('id', unlockSurveyId).single()
    expect(data.locked_reason).toBeNull()
  })

  it('PATCH succeeds after unlock', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${unlockSurveyId}`, {
      title: '[TEST] Feloldva — módosítva',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Feloldva — módosítva')
  })
})

// ─── TRANSFER ATTEMPT CAP ────────────────────────────────────────────────────

describe('Document lock — transfer attempt cap (max 2)', () => {
  it('member creates survey, submits + gets rejected (attempt 1)', async () => {
    const { body: c } = await api('POST', '/api/surveys', { title: '[TEST] Kísérletkorlát 1', collective_id: null }, memberCookie)
    capSurvey1Id = c.survey.id

    const { body: r } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: capSurvey1Id, collective_id: collectiveId,
    }, memberCookie)
    cap1ReqId = r.request.id
    await api('PATCH', `/api/transfer-requests/${cap1ReqId}`, { action: 'reject' }, ownerCookie)
  })

  it('unlock survey so it can be re-submitted', async () => {
    const { status } = await api('PATCH', `/api/surveys/${capSurvey1Id}`, { _action: 'unlock' }, memberCookie)
    expect(status).toBe(200)
  })

  it('second attempt after 3-day cooling (bypass via DB backdate)', async () => {
    // Backdate the first rejection so cooling period is satisfied
    await admin.from('transfer_requests')
      .update({ resolved_at: new Date(Date.now() - 4 * 86400000).toISOString() })
      .eq('id', cap1ReqId)

    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: capSurvey1Id, collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(200)
    cap2ReqId = body.request.id
    await api('PATCH', `/api/transfer-requests/${cap2ReqId}`, { action: 'reject' }, ownerCookie)
  })

  it('unlock again for 3rd attempt test', async () => {
    await api('PATCH', `/api/surveys/${capSurvey1Id}`, { _action: 'unlock' }, memberCookie)
  })

  it('3rd attempt is blocked — cap reached', async () => {
    // Backdate 2nd rejection too
    await admin.from('transfer_requests')
      .update({ resolved_at: new Date(Date.now() - 4 * 86400000).toISOString() })
      .eq('id', cap2ReqId)

    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: capSurvey1Id, collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(400)
    expect(body.error).toMatch(/maximális/)
  })
})

// ─── 3-DAY COOLING PERIOD ────────────────────────────────────────────────────

describe('Document lock — 3-day cooling period after rejection', () => {
  it('member creates survey, submits + gets rejected', async () => {
    const { body: c } = await api('POST', '/api/surveys', { title: '[TEST] Várakozási idő teszt', collective_id: null }, memberCookie)
    coolingSurveyId = c.survey.id

    const { body: r } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: coolingSurveyId, collective_id: collectiveId,
    }, memberCookie)
    coolingReqId = r.request.id
    await api('PATCH', `/api/transfer-requests/${coolingReqId}`, { action: 'reject' }, ownerCookie)
  })

  it('unlock survey', async () => {
    await api('PATCH', `/api/surveys/${coolingSurveyId}`, { _action: 'unlock' }, memberCookie)
  })

  it('re-submit within 3 days returns 429', async () => {
    // resolved_at is recent (just happened) — cooling period still active
    const { status, body } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: coolingSurveyId, collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(429)
    expect(body.error).toMatch(/nap/)
  })
})

// ─── CRON AUTO-EXPIRE ────────────────────────────────────────────────────────

describe('Document lock — cron auto-expires old pending transfers', () => {
  it('member creates survey and submits transfer request', async () => {
    const { body: c } = await api('POST', '/api/surveys', { title: '[TEST] Automatikus lejárat', collective_id: null }, memberCookie)
    cronSurveyId = c.survey.id

    const { body: r } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: cronSurveyId, collective_id: collectiveId,
    }, memberCookie)
    cronReqId = r.request.id
  })

  it('backdate request to 8 days ago so cron will pick it up', async () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString()
    await admin.from('transfer_requests').update({ created_at: old }).eq('id', cronReqId)
  })

  it('cron route expires the request and locks the document', async () => {
    const { status, body } = await api(
      'GET',
      '/api/cron/expire-transfers',
      null,
      null,
      { 'x-cron-secret': process.env.CRON_SECRET || 'test-secret' },
    )
    expect(status).toBe(200)
    expect(body.expired).toBeGreaterThanOrEqual(1)
  })

  it('survey has locked_reason=transfer_expired in DB', async () => {
    const { data } = await admin.from('surveys').select('locked_reason').eq('id', cronSurveyId).single()
    expect(data.locked_reason).toBe('transfer_expired')
  })

  it('transfer_request row is marked transfer_expired', async () => {
    const { data } = await admin.from('transfer_requests').select('status').eq('id', cronReqId).single()
    expect(data.status).toBe('transfer_expired')
  })
})

// ─── OWNER CAN EDIT DURING PENDING ───────────────────────────────────────────

describe('Document lock — owner can edit own doc while transfer is pending', () => {
  it('member creates survey and submits transfer request', async () => {
    const { body: c } = await api('POST', '/api/surveys', { title: '[TEST] Szerkesztés várakozás közben', collective_id: null }, memberCookie)
    pendingEditSurveyId = c.survey.id

    const { body: r } = await api('POST', '/api/transfer-requests', {
      document_type: 'survey', document_id: pendingEditSurveyId, collective_id: collectiveId,
    }, memberCookie)
    pendingEditReqId = r.request.id
  })

  it('non-owner PATCH on a personal pending-transfer survey returns 403 (no access to personal doc)', async () => {
    // The collective owner has no access to the member's personal survey (collective_id=null).
    // They get 403 before reaching the transfer-lock check — 423 is only reachable for
    // collective documents, but pending transfer always means the doc is still personal.
    const { status } = await api('PATCH', `/api/surveys/${pendingEditSurveyId}`, {
      title: '[TEST] Tulajdonos módosítás — tilos (nem saját)',
    }, ownerCookie)
    expect(status).toBe(403)
  })

  it('member (document owner) CAN PATCH their own pending-transfer doc', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${pendingEditSurveyId}`, {
      title: '[TEST] Szerkesztés várakozás közben — módosítva',
    }, memberCookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Szerkesztés várakozás közben — módosítva')
  })

  it('retract transfer request to clean up', async () => {
    const { status } = await api('PATCH', `/api/transfer-requests/${pendingEditReqId}`, {
      action: 'retract',
    }, memberCookie)
    expect(status).toBe(200)
  })
})
