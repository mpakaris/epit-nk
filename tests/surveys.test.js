/**
 * Survey CRUD — personal workspace (test.solo)
 * Covers ops 1-3: create, edit, delete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let cookie
let surveyId

beforeAll(async () => {
  const session = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
  cookie = session.cookie
})

afterAll(async () => {
  if (surveyId) {
    // Hard-delete so GC has nothing to do
    await admin.from('survey_entries').delete().eq('survey_id', surveyId)
    await admin.from('survey_media').delete().eq('survey_id', surveyId)
    await admin.from('survey_drawings').delete().eq('survey_id', surveyId)
    await admin.from('surveys').delete().eq('id', surveyId)
  }
})

describe('Survey – personal workspace', () => {
  it('rejects unauthenticated requests', async () => {
    const { status } = await api('POST', '/api/surveys', { title: 'No auth' }, null)
    expect(status).toBe(401)
  })

  it('rejects creation without a title', async () => {
    const { status } = await api('POST', '/api/surveys', { title: '' }, cookie)
    expect(status).toBe(400)
  })

  it('creates a survey in personal workspace', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Alapfelmérés',
      location: 'Budapest, Teszt utca 1.',
      collective_id: null,
    }, cookie)
    expect(status).toBe(201)
    expect(body.survey).toBeTruthy()
    expect(body.survey.title).toBe('[TEST] Alapfelmérés')
    expect(body.survey.collective_id).toBeNull()
    surveyId = body.survey.id
  })

  it('fetches the created survey', async () => {
    const { status, body } = await api('GET', `/api/surveys/${surveyId}`, null, cookie)
    expect(status).toBe(200)
    expect(body.survey.id).toBe(surveyId)
    expect(body.survey.title).toBe('[TEST] Alapfelmérés')
    expect(body.entries).toBeInstanceOf(Array)
  })

  it('edits the survey title and notes', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${surveyId}`, {
      title: '[TEST] Módosított felmérés',
      notes: 'Teszt megjegyzés',
    }, cookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Módosított felmérés')
    expect(body.survey.notes).toBe('Teszt megjegyzés')
  })

  it('survey appears in list after creation', async () => {
    const { status, body } = await api('GET', '/api/surveys', null, cookie)
    expect(status).toBe(200)
    const found = (body.surveys || []).find(s => s.id === surveyId)
    expect(found).toBeTruthy()
  })

  it('soft-deletes the survey', async () => {
    const { status } = await api('DELETE', `/api/surveys/${surveyId}`, null, cookie)
    expect(status).toBe(200)

    // Verify deleted_at is set in DB
    const { data } = await admin.from('surveys').select('deleted_at').eq('id', surveyId).single()
    expect(data.deleted_at).toBeTruthy()
  })

  it('deleted survey does not appear in list', async () => {
    const { status, body } = await api('GET', '/api/surveys', null, cookie)
    expect(status).toBe(200)
    const found = (body.surveys || []).find(s => s.id === surveyId)
    expect(found).toBeUndefined()
  })

  it('other users cannot delete another user survey', async () => {
    // Re-create a fresh survey to test cross-user access
    const { body: created } = await api('POST', '/api/surveys', {
      title: '[TEST] Cross-user survey',
      collective_id: null,
    }, cookie)
    const otherId = created.survey.id

    const ownerSession = await signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD)
    const { status } = await api('DELETE', `/api/surveys/${otherId}`, null, ownerSession.cookie)
    expect(status).toBe(403)

    // Cleanup
    await admin.from('surveys').delete().eq('id', otherId)
  })
})
