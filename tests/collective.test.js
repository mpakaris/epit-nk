/**
 * Collective workspace — all 11 ops + permission gates + deleted-member test.
 *
 * Users:
 *   owner  — can create / edit / delete documents
 *   member — contributor: can add entries to existing docs, cannot create docs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'
import { calculateProjectFinancials } from '../src/lib/calculations.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId
let collectiveId

// IDs created during the run — cleaned up in afterAll
let surveyId
let quoteId, sectionId
let projectId
let memberInvoiceId

beforeAll(async () => {
  const [ownerSession, memberSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId

  // Look up the test collective (created by seed.js)
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
  // Clean up project sub-records
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
  if (surveyId) {
    await admin.from('survey_entries').delete().eq('survey_id', surveyId)
    await admin.from('survey_media').delete().eq('survey_id', surveyId)
    await admin.from('surveys').delete().eq('id', surveyId)
  }
  // Ensure member is back in the collective (deleted-member test removes them)
  const { data: existing } = await admin
    .from('collective_members')
    .select('id, status')
    .eq('collective_id', collectiveId)
    .eq('user_id', memberUserId)
    .maybeSingle()
  if (!existing) {
    await admin.from('collective_members').insert({
      collective_id: collectiveId,
      user_id:       memberUserId,
      role:          'contributor',
      status:        'active',
    })
  } else if (existing.status !== 'active') {
    await admin.from('collective_members').update({ status: 'active' }).eq('id', existing.id)
  }
})

// ─── SURVEYS ────────────────────────────────────────────────────────────────

describe('Survey – collective workspace', () => {
  it('contributor cannot CREATE a survey in the collective', async () => {
    const { status } = await api('POST', '/api/surveys', {
      title: '[TEST] Contributor survey attempt',
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('owner creates a survey in collective', async () => {
    const { status, body } = await api('POST', '/api/surveys', {
      title: '[TEST] Kollektív felmérés',
      collective_id: collectiveId,
    }, ownerCookie)
    expect(status).toBe(201)
    expect(body.survey.collective_id).toBe(collectiveId)
    surveyId = body.survey.id
  })

  it('contributor can read the collective survey', async () => {
    const { status } = await api('GET', `/api/surveys/${surveyId}`, null, memberCookie)
    expect(status).toBe(200)
  })

  it('contributor cannot edit the collective survey', async () => {
    const { status } = await api('PATCH', `/api/surveys/${surveyId}`, {
      title: '[TEST] Contributor edit attempt',
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('owner edits the survey', async () => {
    const { status, body } = await api('PATCH', `/api/surveys/${surveyId}`, {
      title: '[TEST] Módosított kollektív felmérés',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.survey.title).toBe('[TEST] Módosított kollektív felmérés')
  })

  it('owner soft-deletes the survey', async () => {
    const { status } = await api('DELETE', `/api/surveys/${surveyId}`, null, ownerCookie)
    expect(status).toBe(200)
    const { data } = await admin.from('surveys').select('deleted_at').eq('id', surveyId).single()
    expect(data.deleted_at).toBeTruthy()
    surveyId = null // prevent duplicate cleanup in afterAll
  })
})

// ─── QUOTES ─────────────────────────────────────────────────────────────────

describe('Quote – collective workspace', () => {
  it('contributor cannot CREATE a quote in the collective', async () => {
    const { status } = await api('POST', '/api/quotes', {
      title: '[TEST] Contributor quote attempt',
      collective_id: collectiveId,
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('owner creates a quote in collective', async () => {
    const { status, body } = await api('POST', '/api/quotes', {
      title: '[TEST] Kollektív ajánlat',
      collective_id: collectiveId,
      tax_percent: 27,
    }, ownerCookie)
    expect(status).toBe(201)
    expect(body.quote.collective_id).toBe(collectiveId)
    quoteId = body.quote.id
  })

  it('contributor can add a section to the collective quote', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/sections`, {
      name: '[TEST] Konyha',
    }, memberCookie)
    expect(status).toBe(201)
    sectionId = body.section.id
  })

  it('contributor can add an entry to the section they created', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/entries`, {
      entry_type: 'material',
      work_description: '[TEST] Konyhai csempe',
      amount_huf: 60000,
      section_id: sectionId,
    }, memberCookie)
    expect(status).toBe(201)
    expect(body.entry.amount_huf).toBe(60000)
  })

  it('owner changes quote status to sent', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'sent',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('sent')
  })

  it('owner reverts quote status back to draft', async () => {
    const { status, body } = await api('PATCH', `/api/quotes/${quoteId}`, {
      status: 'draft',
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.quote.status).toBe('draft')
  })

  it('contributor cannot delete the collective quote', async () => {
    const { status } = await api('DELETE', `/api/quotes/${quoteId}`, null, memberCookie)
    expect(status).toBe(403)
  })

  it('owner soft-deletes the collective quote', async () => {
    const { status } = await api('DELETE', `/api/quotes/${quoteId}`, null, ownerCookie)
    expect(status).toBe(200)
    const { data } = await admin.from('quotes').select('deleted_at').eq('id', quoteId).single()
    expect(data.deleted_at).toBeTruthy()
    quoteId = null
  })
})

// ─── PROJECTS ───────────────────────────────────────────────────────────────

describe('Project – collective workspace', () => {
  it('contributor cannot CREATE a project in the collective', async () => {
    const { status } = await api('POST', '/api/projects', {
      name: '[TEST] Contributor project attempt',
      collectiveId,
    }, memberCookie)
    expect(status).toBe(403)
  })

  it('owner creates a project in collective', async () => {
    const { status, body } = await api('POST', '/api/projects', {
      name: '[TEST] Kollektív projekt',
      collectiveId,
    }, ownerCookie)
    expect(status).toBe(200)
    expect(body.project.collective_id).toBe(collectiveId)
    projectId = body.project.id
  })

  it('contributor can add an invoice', async () => {
    const { status, body } = await api('POST', '/api/invoices', {
      projectId,
      valueHuf: 25000,
      category: 'Anyag',
      description: '[TEST] Tag számla',
    }, memberCookie)
    expect(status).toBe(201)
    expect(body.invoice.uploaded_by).toBe(memberUserId)
    memberInvoiceId = body.invoice.id
  })

  it('contributor can add a labour entry', async () => {
    const { status, body } = await api('POST', '/api/labour-entries', {
      projectId,
      date: '2026-10-27',
      labourType: '[TEST] Tag munkavégzés',
      hours: 4,
      hourlyRate: 6000,
    }, memberCookie)
    expect(status).toBe(201)
    expect(body.labourEntry.value_huf).toBe(24000)
  })

  it('contributor can add a diary entry', async () => {
    const { status } = await api('POST', '/api/diary', {
      project_id: projectId,
      title: '[TEST] Tag napló',
      entry_date: '2026-10-27',
    }, memberCookie)
    expect(status).toBe(201)
  })

  it('owner can add an invoice', async () => {
    const { status, body } = await api('POST', '/api/invoices', {
      projectId,
      valueHuf: 50000,
      category: 'Anyag',
      description: '[TEST] Tulajdonos számla',
    }, ownerCookie)
    expect(status).toBe(201)
    expect(body.invoice.uploaded_by).toBe(ownerUserId)
  })

  it('contributor cannot delete the project', async () => {
    const { status } = await api('DELETE', `/api/projects/${projectId}`, null, memberCookie)
    expect(status).toBe(403)
  })
})

// ─── DELETED MEMBER TEST ─────────────────────────────────────────────────────

describe('Deleted member — contributions persist', () => {
  it('owner removes member from collective', async () => {
    const { status } = await api(
      'DELETE',
      `/api/collectives/${collectiveId}/members/${memberUserId}`,
      null,
      ownerCookie,
    )
    expect(status).toBe(200)

    // Verify membership is gone
    const { data } = await admin
      .from('collective_members')
      .select('id')
      .eq('collective_id', collectiveId)
      .eq('user_id', memberUserId)
      .maybeSingle()
    expect(data).toBeNull()
  })

  it("member's invoice still exists in DB after removal", async () => {
    const { data } = await admin
      .from('invoices')
      .select('id, uploaded_by, value_huf')
      .eq('id', memberInvoiceId)
      .single()
    expect(data).toBeTruthy()
    expect(data.uploaded_by).toBe(memberUserId)
    expect(data.value_huf).toBe(25000)
  })

  it('calculateProjectFinancials includes deleted member with correct amounts', async () => {
    const { data: invoices }     = await admin.from('invoices').select('*').eq('project_id', projectId)
    const { data: labourEntries } = await admin.from('labour_entries').select('*').eq('project_id', projectId)

    // Only owner is the active "member" now
    const activeMember = [{ id: ownerUserId, display_name: 'Test Owner', role: 'owner', deleted_at: null }]
    const fin = calculateProjectFinancials(
      { id: projectId, owner_id: ownerUserId },
      invoices,
      labourEntries,
      activeMember,
      ownerUserId,
    )

    // Deleted member's entry must appear
    const deletedEntry = fin.memberBreakdown.find(m => m.userId === memberUserId)
    expect(deletedEntry).toBeTruthy()
    expect(deletedEntry.displayName).toBe('(Törölt felhasználó)')
    expect(deletedEntry.deletedAt).toBeTruthy()
    expect(deletedEntry.paid).toBe(25000)         // their invoice
    expect(deletedEntry.labourValue).toBe(24000)  // their labour

    // memberCount must be 2 (owner + deleted member), not 1
    expect(fin.memberCount).toBe(2)

    // Total cost must include deleted member's invoice
    expect(fin.totalCost).toBe(75000) // 25k (member) + 50k (owner)

    // equalShare = 75000 / 2 = 37500 per person
    expect(fin.equalCostShare).toBe(37500)

    // Net balance:
    //   owner:   costBalance = +12500 (overpaid costs), labourBalance = -12000 (no labour) → +500
    //   member:  costBalance = -12500 (underpaid costs), labourBalance = +12000 (all labour) → -500
    // → member owes owner 500
    expect(fin.settlements.length).toBe(1)
    expect(fin.settlements[0].toId).toBe(ownerUserId)
    expect(fin.settlements[0].amount).toBe(500)
  })

  it('owner soft-deletes the project after member removal', async () => {
    const { status, body } = await api('DELETE', `/api/projects/${projectId}`, null, ownerCookie)
    expect(status, `DELETE /api/projects error: ${body?.error}`).toBe(200)
    const { data } = await admin.from('projects').select('deleted_at').eq('id', projectId).single()
    expect(data.deleted_at).toBeTruthy()
    projectId = null // afterAll skips cleanup since it's soft-deleted; still cleans sub-records
  })
})
