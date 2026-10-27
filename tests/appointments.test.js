/**
 * Appointment CRUD — personal workspace (test.solo)
 * Covers: create (plain + with linked survey/quote/project), edit, delete,
 * cross-user access guard, and linkedDocDeleted flag on GET.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let cookie
let otherCookie

// IDs collected during the run — cleaned up in afterAll
const apptIds     = []
const surveyIds   = []
const quoteIds    = []
const projectIds  = []

beforeAll(async () => {
  const solo  = await signIn(process.env.TEST_SOLO_EMAIL,  process.env.TEST_SOLO_PASSWORD)
  const owner = await signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD)
  cookie      = solo.cookie
  otherCookie = owner.cookie
})

afterAll(async () => {
  // Unlink before deleting linked docs so FK constraints don't block
  for (const id of apptIds) {
    await admin.from('appointments')
      .update({ linked_survey_id: null, linked_quote_id: null, linked_project_id: null })
      .eq('id', id)
    await admin.from('appointments').delete().eq('id', id)
  }
  for (const id of surveyIds)  await admin.from('surveys').delete().eq('id', id)
  for (const id of quoteIds)   {
    await admin.from('quote_entries').delete().eq('quote_id', id)
    await admin.from('quote_sections').delete().eq('quote_id', id)
    await admin.from('quotes').delete().eq('id', id)
  }
  for (const id of projectIds) await admin.from('projects').delete().eq('id', id)
})

// ─── Auth guards ────────────────────────────────────────────────────────────

describe('Appointments – auth guards', () => {
  it('rejects unauthenticated GET /api/appointments', async () => {
    const { status } = await api('GET', '/api/appointments', null, null)
    expect(status).toBe(401)
  })

  it('rejects unauthenticated POST /api/appointments', async () => {
    const { status } = await api('POST', '/api/appointments', { title: 'X', date: '2026-01-01' }, null)
    expect(status).toBe(401)
  })
})

// ─── Validation ─────────────────────────────────────────────────────────────

describe('Appointments – validation', () => {
  it('rejects creation without a title', async () => {
    const { status } = await api('POST', '/api/appointments', { title: '', date: '2026-06-01' }, cookie)
    expect(status).toBe(400)
  })

  it('rejects creation without a date', async () => {
    const { status } = await api('POST', '/api/appointments', { title: 'Teszt időpont', date: '' }, cookie)
    expect(status).toBe(400)
  })
})

// ─── Plain appointment (no linked doc) ──────────────────────────────────────

describe('Appointments – plain create / edit / delete', () => {
  let apptId

  it('creates a plain appointment', async () => {
    const { status, body } = await api('POST', '/api/appointments', {
      title:        '[TEST] Helyszíni szemle',
      date:         '2026-06-15',
      time:         '09:00',
      collective_id: null,
    }, cookie)
    expect(status).toBe(201)
    expect(body.appointment).toBeTruthy()
    expect(body.appointment.title).toBe('[TEST] Helyszíni szemle')
    expect(body.appointment.date).toBe('2026-06-15')
    expect(body.appointment.time).toMatch(/^09:00/)
    expect(body.linkedDoc).toBeNull()
    apptId = body.appointment.id
    apptIds.push(apptId)
  })

  it('appears in list after creation', async () => {
    const { status, body } = await api('GET', '/api/appointments', null, cookie)
    expect(status).toBe(200)
    const found = (body.appointments || []).find(a => a.id === apptId)
    expect(found).toBeTruthy()
  })

  it('fetches single appointment', async () => {
    const { status, body } = await api('GET', `/api/appointments/${apptId}`, null, cookie)
    expect(status).toBe(200)
    expect(body.appointment.id).toBe(apptId)
    expect(body.linkedDocDeleted).toBe(false)
    expect(body.linkedDocHref).toBeNull()
  })

  it('edits title and time', async () => {
    const { status, body } = await api('PATCH', `/api/appointments/${apptId}`, {
      title: '[TEST] Módosított helyszíni szemle',
      time:  '10:30',
    }, cookie)
    expect(status).toBe(200)
    expect(body.appointment.title).toBe('[TEST] Módosított helyszíni szemle')
    expect(body.appointment.time).toMatch(/^10:30/)
  })

  it('soft-deletes the appointment', async () => {
    const { status } = await api('DELETE', `/api/appointments/${apptId}`, null, cookie)
    expect(status).toBe(200)

    const { data } = await admin.from('appointments').select('deleted_at').eq('id', apptId).single()
    expect(data.deleted_at).toBeTruthy()
  })

  it('deleted appointment does not appear in list', async () => {
    const { status, body } = await api('GET', '/api/appointments', null, cookie)
    expect(status).toBe(200)
    const found = (body.appointments || []).find(a => a.id === apptId)
    expect(found).toBeUndefined()
  })
})

// ─── Appointment + linked survey ────────────────────────────────────────────

describe('Appointments – create with linked survey (felmérés)', () => {
  let apptId
  let surveyId

  it('creates appointment and auto-creates linked survey', async () => {
    const { status, body } = await api('POST', '/api/appointments', {
      title:         '[TEST] Felmérés időpont',
      date:          '2026-07-01',
      link_type:     'felmeres',
      collective_id: null,
    }, cookie)
    expect(status).toBe(201)
    expect(body.linkedType).toBe('felmeres')
    expect(body.linkedDoc).toBeTruthy()
    expect(body.linkedDoc.title).toBe('[TEST] Felmérés időpont')

    apptId   = body.appointment.id
    surveyId = body.linkedDoc.id
    apptIds.push(apptId)
    surveyIds.push(surveyId)
  })

  it('GET returns correct linkedDocHref for survey', async () => {
    const { status, body } = await api('GET', `/api/appointments/${apptId}`, null, cookie)
    expect(status).toBe(200)
    expect(body.linkedDocDeleted).toBe(false)
    expect(body.linkedDocHref).toBe(`/felmeres/${surveyId}`)
  })

  it('appointment stores linked_survey_id in DB', async () => {
    const { data } = await admin.from('appointments').select('linked_survey_id').eq('id', apptId).single()
    expect(data.linked_survey_id).toBe(surveyId)
  })

  it('soft-deleting the survey marks linkedDocDeleted on GET', async () => {
    await admin.from('surveys').update({ deleted_at: new Date().toISOString() }).eq('id', surveyId)

    const { body } = await api('GET', `/api/appointments/${apptId}`, null, cookie)
    expect(body.linkedDocDeleted).toBe(true)
    expect(body.linkedDocHref).toBeNull()
  })
})

// ─── Appointment + linked quote ──────────────────────────────────────────────

describe('Appointments – create with linked quote (ajánlat)', () => {
  let apptId
  let quoteId

  it('creates appointment and auto-creates linked quote', async () => {
    const { status, body } = await api('POST', '/api/appointments', {
      title:         '[TEST] Ajánlat időpont',
      date:          '2026-07-10',
      link_type:     'ajanlat',
      collective_id: null,
    }, cookie)
    expect(status).toBe(201)
    expect(body.linkedType).toBe('ajanlat')
    expect(body.linkedDoc).toBeTruthy()
    expect(body.linkedDoc.status).toBe('draft')

    apptId  = body.appointment.id
    quoteId = body.linkedDoc.id
    apptIds.push(apptId)
    quoteIds.push(quoteId)
  })

  it('GET returns correct linkedDocHref for quote', async () => {
    const { status, body } = await api('GET', `/api/appointments/${apptId}`, null, cookie)
    expect(status).toBe(200)
    expect(body.linkedDocDeleted).toBe(false)
    expect(body.linkedDocHref).toBe(`/ajanlatok/${quoteId}`)
  })

  it('appointment stores linked_quote_id in DB', async () => {
    const { data } = await admin.from('appointments').select('linked_quote_id').eq('id', apptId).single()
    expect(data.linked_quote_id).toBe(quoteId)
  })
})

// ─── Appointment + linked project ────────────────────────────────────────────

describe('Appointments – create with linked project (projekt)', () => {
  let apptId
  let projectId

  it('creates appointment and auto-creates linked project', async () => {
    const { status, body } = await api('POST', '/api/appointments', {
      title:         '[TEST] Projekt időpont',
      date:          '2026-07-20',
      link_type:     'projekt',
      collective_id: null,
    }, cookie)
    expect(status).toBe(201)
    expect(body.linkedType).toBe('projekt')
    expect(body.linkedDoc).toBeTruthy()
    expect(body.linkedDoc.name).toBe('[TEST] Projekt időpont')

    apptId    = body.appointment.id
    projectId = body.linkedDoc.id
    apptIds.push(apptId)
    projectIds.push(projectId)
  })

  it('GET returns correct linkedDocHref for project', async () => {
    const { status, body } = await api('GET', `/api/appointments/${apptId}`, null, cookie)
    expect(status).toBe(200)
    expect(body.linkedDocDeleted).toBe(false)
    expect(body.linkedDocHref).toBe(`/projektek/${projectId}`)
  })

  it('appointment stores linked_project_id in DB', async () => {
    const { data } = await admin.from('appointments').select('linked_project_id').eq('id', apptId).single()
    expect(data.linked_project_id).toBe(projectId)
  })
})

// ─── Cross-user access guard ──────────────────────────────────────────────────

describe('Appointments – cross-user access guard', () => {
  let apptId

  it('another user cannot edit a foreign appointment', async () => {
    const { body } = await api('POST', '/api/appointments', {
      title:         '[TEST] Idegen időpont',
      date:          '2026-08-01',
      collective_id: null,
    }, cookie)
    apptId = body.appointment.id
    apptIds.push(apptId)

    const { status } = await api('PATCH', `/api/appointments/${apptId}`, { title: 'Hacked' }, otherCookie)
    expect(status).toBe(403)
  })

  it('another user cannot delete a foreign appointment', async () => {
    const { status } = await api('DELETE', `/api/appointments/${apptId}`, null, otherCookie)
    expect(status).toBe(403)
  })
})
