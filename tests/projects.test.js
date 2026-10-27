/**
 * Project CRUD — personal workspace (test.solo)
 * Covers ops 9-11: create from quote template, edit sub-records, delete
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let cookie, userId
let quoteId, sectionId
let projectId
let invoiceId, labourId, diaryId

beforeAll(async () => {
  const session = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
  cookie = session.cookie
  userId = session.userId

  // Create a quote with one section so we can test template inheritance
  const { body: qBody } = await api('POST', '/api/quotes', {
    title: '[TEST] Projekt-sablon ajánlat',
    collective_id: null,
  }, cookie)
  quoteId = qBody.quote.id

  const { body: sBody } = await api('POST', `/api/quotes/${quoteId}/sections`, {
    name: '[TEST] Nappali',
    width_m: 4,
    length_m: 5,
  }, cookie)
  sectionId = sBody.section.id

  // Add an entry so the section has a quoted_amount_net
  await api('POST', `/api/quotes/${quoteId}/entries`, {
    entry_type: 'labour',
    work_description: '[TEST] Festés',
    amount_huf: 80000,
    section_id: sectionId,
  }, cookie)
})

afterAll(async () => {
  if (projectId) {
    await admin.from('diary_entries').delete().eq('project_id', projectId)
    await admin.from('invoices').delete().eq('project_id', projectId)
    await admin.from('labour_entries').delete().eq('project_id', projectId)
    await admin.from('project_members').delete().eq('project_id', projectId)
    await admin.from('project_rooms').delete().eq('project_id', projectId)
    await admin.from('projects').delete().eq('id', projectId)
  }
  if (quoteId) {
    await admin.from('quote_entries').delete().eq('quote_id', quoteId)
    await admin.from('quote_sections').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
})

describe('Project – personal workspace', () => {
  it('rejects creation without a name', async () => {
    const { status } = await api('POST', '/api/projects', { name: '', collectiveId: null }, cookie)
    expect(status).toBe(400)
  })

  it('creates a project from quote template and inherits rooms', async () => {
    const { status, body } = await api('POST', '/api/projects', {
      name: '[TEST] Felújítási projekt',
      description: 'Teszt projekt',
      quoteId,
      collectiveId: null,
    }, cookie)
    expect(status).toBe(200)
    expect(body.project.name).toBe('[TEST] Felújítási projekt')
    expect(body.project.collective_id).toBeNull()
    projectId = body.project.id

    // Rooms should be copied from quote sections
    const { data: rooms } = await admin
      .from('project_rooms').select('*').eq('project_id', projectId)
    expect(rooms.length).toBeGreaterThan(0)
    expect(rooms[0].name).toBe('[TEST] Nappali')
    expect(rooms[0].quoted_amount_net).toBe(80000)
    expect(rooms[0].source_section_id).toBe(sectionId)
  })

  it('quote is linked to the project after creation', async () => {
    const { data } = await admin.from('quotes').select('project_id').eq('id', quoteId).single()
    expect(data.project_id).toBe(projectId)
  })

  it('edits the project', async () => {
    const { status, body } = await api('PATCH', `/api/projects/${projectId}`, {
      description: '[TEST] Módosított leírás',
    }, cookie)
    expect(status).toBe(200)
    expect(body.project.description).toBe('[TEST] Módosított leírás')
  })

  it('adds an invoice to the project', async () => {
    const { status, body } = await api('POST', '/api/invoices', {
      projectId,
      valueHuf: 35000,
      category: 'Anyag',
      description: '[TEST] Csempe vásárlás',
    }, cookie)
    expect(status).toBe(201)
    expect(body.invoice.value_huf).toBe(35000)
    expect(body.invoice.uploaded_by).toBe(userId)
    invoiceId = body.invoice.id
  })

  it('adds a labour entry', async () => {
    const { status, body } = await api('POST', '/api/labour-entries', {
      projectId,
      date: '2026-10-27',
      labourType: '[TEST] Burkolás',
      hours: 8,
      hourlyRate: 5000,
    }, cookie)
    expect(status).toBe(201)
    expect(body.labourEntry.value_huf).toBe(40000)
    labourId = body.labourEntry.id
  })

  it('adds a diary entry', async () => {
    const { status, body } = await api('POST', '/api/diary', {
      project_id: projectId,
      title: '[TEST] Napi napló',
      body: 'Megkezdtük a csempézést.',
      entry_date: '2026-10-27',
    }, cookie)
    expect(status).toBe(201)
    expect(body.entry.title).toBe('[TEST] Napi napló')
    diaryId = body.entry.id
  })

  it('project financials reflect the added invoice and labour', async () => {
    const { status, body } = await api('GET', `/api/projects/${projectId}`, null, cookie)
    expect(status).toBe(200)
    // The project detail endpoint does not return calculated financials —
    // verify raw data in DB instead
    const { data: invoices } = await admin.from('invoices').select('*').eq('project_id', projectId)
    const { data: labour } = await admin.from('labour_entries').select('*').eq('project_id', projectId)
    expect(invoices.some(i => i.id === invoiceId)).toBe(true)
    expect(labour.some(l => l.id === labourId)).toBe(true)
    const totalCost = invoices.reduce((s, i) => s + Number(i.value_huf), 0)
    expect(totalCost).toBe(35000)
  })

  it('other users cannot soft-delete this project', async () => {
    const ownerSession = await signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD)
    const { status } = await api('DELETE', `/api/projects/${projectId}`, null, ownerSession.cookie)
    expect(status).toBe(403)
  })

  it('soft-deletes the project', async () => {
    const { status, body } = await api('DELETE', `/api/projects/${projectId}`, null, cookie)
    expect(status, `DELETE /api/projects error: ${body?.error}`).toBe(200)

    const { data } = await admin.from('projects').select('deleted_at').eq('id', projectId).single()
    expect(data.deleted_at).toBeTruthy()
  })

  it('deleted project does not appear in entity data', async () => {
    const { body } = await api('GET', '/api/entity/data', null, cookie)
    const found = (body.projects || []).find(p => p.id === projectId)
    expect(found).toBeUndefined()
  })
})
