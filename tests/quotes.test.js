/**
 * Quote CRUD — personal workspace (test.solo)
 * Covers ops 4-8: create from survey, edit, status change, delete
 * Email send (op 6) is skipped — Puppeteer PDF not tested here.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let cookie
let surveyId
let quoteId
let sectionId
let entryId

beforeAll(async () => {
  const session = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
  cookie = session.cookie

  // Create a survey to link the quote to
  const { body } = await api('POST', '/api/surveys', {
    title: '[TEST] Linked survey',
    collective_id: null,
  }, cookie)
  surveyId = body.survey.id
})

afterAll(async () => {
  if (quoteId) {
    await admin.from('quote_entries').delete().eq('quote_id', quoteId)
    await admin.from('quote_sections').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
  if (surveyId) {
    await admin.from('survey_entries').delete().eq('survey_id', surveyId)
    await admin.from('survey_media').delete().eq('survey_id', surveyId)
    await admin.from('surveys').delete().eq('id', surveyId)
  }
})

describe('Quote – personal workspace', () => {
  it('rejects creation without a title', async () => {
    const { status } = await api('POST', '/api/quotes', { title: '', collective_id: null }, cookie)
    expect(status).toBe(400)
  })

  it('creates a quote linked to a survey', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST] Renovációs ajánlat',
      work_type: 'Felújítás',
      survey_id: surveyId,
      collective_id: null,
      tax_percent: 27,
    }, cookie)
    expect(status).toBe(201)
    expect(body.quote.title).toBe('[TEST] Renovációs ajánlat')
    expect(body.quote.survey_id).toBe(surveyId)
    expect(body.quote.status).toBe('draft')
    expect(body.quote.collective_id).toBeNull()
    quoteId = body.quote.id
  })

  it('adds a section to the quote', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/sections`, {
      name: '[TEST] Fürdőszoba',
      width_m: 3,
      length_m: 2.5,
    }, cookie)
    expect(status).toBe(201)
    expect(body.section.name).toBe('[TEST] Fürdőszoba')
    sectionId = body.section.id
  })

  it('adds an entry to the quote section', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/entries`, {
      entry_type: 'material',
      work_description: '[TEST] Csempe',
      quantity: 10,
      unit: 'm²',
      unit_price: 5000,
      amount_huf: 50000,
      section_id: sectionId,
    }, cookie)
    expect(status).toBe(201)
    expect(body.entry.amount_huf).toBe(50000)
    entryId = body.entry.id
  })

  it('edits the quote title and description', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      title: '[TEST] Módosított ajánlat',
      description: 'Módosítva a tesztben',
    }, cookie)
    expect(status).toBe(200)
    expect(body.quote.title).toBe('[TEST] Módosított ajánlat')
  })

  it('changes status to sent', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'sent',
    }, cookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('sent')
  })

  it('changes status to accepted', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'accepted',
    }, cookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('accepted')
  })

  it('reverts status back to draft', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'draft',
    }, cookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('draft')
  })

  it('quote appears in entity data', async () => {
    const { status, body } = await api('GET', '/api/entity/data', null, cookie)
    expect(status).toBe(200)
    const found = (body.quotes || []).find(q => q.id === quoteId)
    expect(found).toBeTruthy()
  })

  it('other users cannot edit this quote', async () => {
    const ownerSession = await signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD)
    const { status } = await api('PATCH', `/api/quotes/${quoteId}`, {
      title: 'Hacked',
    }, ownerSession.cookie)
    expect(status).toBe(403)
  })

  it('soft-deletes the quote', async () => {
    const { status } = await api('DELETE', `/api/quotes/${quoteId}`, null, cookie)
    expect(status).toBe(200)

    const { data } = await admin.from('quotes').select('deleted_at').eq('id', quoteId).single()
    expect(data.deleted_at).toBeTruthy()
  })

  it('deleted quote does not appear in entity data', async () => {
    const { body } = await api('GET', '/api/entity/data', null, cookie)
    const found = (body.quotes || []).find(q => q.id === quoteId)
    expect(found).toBeUndefined()
  })
})
