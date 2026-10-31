/**
 * Document lifecycle: active / inactive status changes
 *
 * Requires migration 123_archived_at.sql to be applied before running
 * (adds archived_at to surveys and projects).
 *
 * Surveys:
 *   archived_at IS NULL  → active
 *   archived_at IS SET   → inactive
 *
 * Quotes:
 *   status = 'draft' | 'sent' → active
 *   status = 'rejected'       → inactive (reversible via → draft)
 *   Note: no archived_at — the status workflow covers the inactive concept
 *
 * Projects:
 *   closed_at IS SET   → completed / closed (reversible)
 *   archived_at IS SET → shelved / inactive (reversible, distinct from closed)
 *
 * Permission rule across all documents:
 *   owner / kollektív admin → can change status
 *   contributor             → 403
 *
 * Template filter (GET /api/surveys/for-offer-template):
 *   default              → only active (archived_at IS NULL) surveys returned
 *   ?include_inactive=true → all surveys returned
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let collectiveId

// Fixtures
let surveyId       // collective survey owned by owner
let quoteId        // collective quote owned by owner
let projectId      // collective project owned by owner

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
  if (surveyId) {
    await admin.from('survey_entries').delete().eq('survey_id', surveyId)
    await admin.from('surveys').update({ archived_at: null }).eq('id', surveyId)
    await admin.from('surveys').delete().eq('id', surveyId)
  }
  if (quoteId) {
    await admin.from('quote_entries').delete().eq('quote_id', quoteId)
    await admin.from('quote_sections').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
  if (projectId) {
    await admin.from('projects').delete().eq('id', projectId)
  }
})

// ─── SETUP ───────────────────────────────────────────────────────────────────

describe('Setup — create test documents in collective', () => {
  it('owner creates a collective survey', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST-LIFECYCLE] Felmérés',
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(201)
    surveyId = body.survey.id
    expect(surveyId).toBeTruthy()
    expect(body.survey.archived_at).toBeNull()
  })

  it('owner creates a collective quote', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST-LIFECYCLE] Ajánlat',
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(201)
    quoteId = body.quote.id
    expect(quoteId).toBeTruthy()
    expect(body.quote.status).toBe('draft')
  })

  it('owner creates a collective project', async () => {
    const { status, body } = await api('POST', '/api/projects', {
      name: '[TEST-LIFECYCLE] Projekt',
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(200)
    projectId = body.project.id
    expect(projectId).toBeTruthy()
  })
})

// ─── SURVEY: ARCHIVE / UNARCHIVE ─────────────────────────────────────────────

describe('Survey — archive / unarchive', () => {
  it('owner archives the survey → archived_at is set in DB', async () => {
    const now = new Date().toISOString()
    const { status } = await api('PATCH', `/api/surveys/${surveyId}`, {
      archived_at: now,
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('surveys').select('archived_at').eq('id', surveyId).single()
    expect(data.archived_at).not.toBeNull()
  })

  it('owner unarchives the survey → archived_at is null in DB', async () => {
    const { status } = await api('PATCH', `/api/surveys/${surveyId}`, {
      archived_at: null,
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('surveys').select('archived_at').eq('id', surveyId).single()
    expect(data.archived_at).toBeNull()
  })

  it('contributor cannot archive the survey → 403', async () => {
    const { status } = await api('PATCH', `/api/surveys/${surveyId}`, {
      archived_at: new Date().toISOString(),
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('contributor attempt leaves archived_at unchanged (still null)', async () => {
    const { data } = await admin.from('surveys').select('archived_at').eq('id', surveyId).single()
    expect(data.archived_at).toBeNull()
  })
})

// ─── QUOTE: REJECTED (inactive) / DRAFT (active) ─────────────────────────────

describe('Quote — rejected ↔ draft status', () => {
  it('owner sets quote status to rejected (inactive)', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'rejected',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('rejected')
  })

  it('DB confirms status = rejected', async () => {
    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('rejected')
  })

  it('owner resets quote status back to draft (active)', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'draft',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('draft')
  })

  it('DB confirms status = draft', async () => {
    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('draft')
  })

  it('contributor cannot change quote status → 403', async () => {
    const { status } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'rejected',
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('contributor attempt leaves status unchanged (still draft)', async () => {
    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('draft')
  })
})

// ─── PROJECT: CLOSE / REOPEN ─────────────────────────────────────────────────

describe('Project — close / reopen (closed_at)', () => {
  it('owner closes the project → closed_at set in DB', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      closed_at: new Date().toISOString(),
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('projects').select('closed_at').eq('id', projectId).single()
    expect(data.closed_at).not.toBeNull()
  })

  it('owner reopens the project → closed_at null in DB', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      closed_at: null,
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('projects').select('closed_at').eq('id', projectId).single()
    expect(data.closed_at).toBeNull()
  })

  it('contributor cannot close the project → 403', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      closed_at: new Date().toISOString(),
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('contributor attempt leaves closed_at unchanged (still null)', async () => {
    const { data } = await admin.from('projects').select('closed_at').eq('id', projectId).single()
    expect(data.closed_at).toBeNull()
  })
})

// ─── PROJECT: ARCHIVE / UNARCHIVE ────────────────────────────────────────────

describe('Project — archive / unarchive (archived_at)', () => {
  it('owner archives the project → archived_at set in DB', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      archived_at: new Date().toISOString(),
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('projects').select('archived_at').eq('id', projectId).single()
    expect(data.archived_at).not.toBeNull()
  })

  it('owner unarchives the project → archived_at null in DB', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      archived_at: null,
    }, ownerCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('projects').select('archived_at').eq('id', projectId).single()
    expect(data.archived_at).toBeNull()
  })

  it('contributor cannot archive the project → 403', async () => {
    const { status } = await api('PATCH', `/api/projects/${projectId}`, {
      archived_at: new Date().toISOString(),
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('contributor attempt leaves archived_at unchanged (still null)', async () => {
    const { data } = await admin.from('projects').select('archived_at').eq('id', projectId).single()
    expect(data.archived_at).toBeNull()
  })
})

// ─── TEMPLATE FILTER ─────────────────────────────────────────────────────────

describe('Survey template filter (GET /api/surveys/for-offer-template)', () => {
  let activeSurveyId
  let archivedSurveyId

  beforeAll(async () => {
    // Create two personal surveys: one active, one archived
    const [activeRes, archivedRes] = await Promise.all([
      api('POST', '/api/surveys', {
        title: '[TEST-LIFECYCLE-TMPL] Aktív felmérés',
        collective_id: null,
      }, ownerCookie),
      api('POST', '/api/surveys', {
        title: '[TEST-LIFECYCLE-TMPL] Inaktív felmérés',
        collective_id: null,
      }, ownerCookie),
    ])
    activeSurveyId  = activeRes.body.survey.id
    archivedSurveyId = archivedRes.body.survey.id

    // Archive the second one directly in DB
    await admin.from('surveys')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', archivedSurveyId)
  })

  afterAll(async () => {
    const ids = [activeSurveyId, archivedSurveyId].filter(Boolean)
    for (const id of ids) {
      await admin.from('surveys').delete().eq('id', id)
    }
  })

  it('default response includes the active survey', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(status).toBe(200)
    const ids = (body.surveys || []).map(s => s.id)
    expect(ids).toContain(activeSurveyId)
  })

  it('default response excludes the archived survey', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    expect(status).toBe(200)
    const ids = (body.surveys || []).map(s => s.id)
    expect(ids).not.toContain(archivedSurveyId)
  })

  it('?include_inactive=true returns both active and archived surveys', async () => {
    const { status, body } = await api('GET', '/api/surveys/for-offer-template?include_inactive=true', null, ownerCookie)
    expect(status).toBe(200)
    const ids = (body.surveys || []).map(s => s.id)
    expect(ids).toContain(activeSurveyId)
    expect(ids).toContain(archivedSurveyId)
  })

  it('archived survey in inclusive response has archived_at set', async () => {
    const { body } = await api('GET', '/api/surveys/for-offer-template?include_inactive=true', null, ownerCookie)
    const archived = (body.surveys || []).find(s => s.id === archivedSurveyId)
    expect(archived).toBeTruthy()
    expect(archived.archived_at).not.toBeNull()
  })

  it('active survey in response has archived_at null', async () => {
    const { body } = await api('GET', '/api/surveys/for-offer-template', null, ownerCookie)
    const active = (body.surveys || []).find(s => s.id === activeSurveyId)
    expect(active).toBeTruthy()
    expect(active.archived_at).toBeNull()
  })

  it('collective survey filter also excludes archived (collective_id param)', async () => {
    // Archive our collective survey, then check it doesn't appear in template list
    await admin.from('surveys').update({ archived_at: new Date().toISOString() }).eq('id', surveyId)

    const { status, body } = await api(
      'GET', `/api/surveys/for-offer-template?collective_id=${collectiveId}`,
      null, ownerCookie
    )
    expect(status).toBe(200)
    const ids = (body.surveys || []).map(s => s.id)
    expect(ids).not.toContain(surveyId)

    // Restore for afterAll cleanup
    await admin.from('surveys').update({ archived_at: null }).eq('id', surveyId)
  })
})
