/**
 * Client Portal — end-to-end API tests
 *
 * Prerequisite: migration 142_portal_visible.sql must be applied.
 *
 * Test users:
 *   solo      — TEST_SOLO_EMAIL       — the contractor who creates all resources
 *   client    — TEST_CLIENT_EMAIL     — the portal client (normally uses OTP; password in tests)
 *   owner     — TEST_OWNER_EMAIL      — an unrelated contractor (should see nothing)
 *   sa        — TEST_SA_EMAIL         — superadmin (can impersonate any client via ?email=)
 *
 * Coverage:
 *   Portal data API (GET /api/portal/data)
 *     - 401 when unauthenticated
 *     - client sees no data when portal_visible = false (default)
 *     - contractor enables quote visibility → client sees it
 *     - contractor enables invoice visibility → client sees it
 *     - contractor enables labour visibility → client sees it
 *     - portal data includes quote entries
 *     - financial totals are calculated correctly
 *     - another user (non-client) sees no data for this client
 *
 *   portal_visible toggles (contractor side)
 *     - PATCH /api/quotes/[id] with portal_visible
 *     - PATCH /api/invoices/[id] with portal_visible
 *     - PATCH /api/labour-entries/[id] with portal_visible
 *     - another user cannot toggle portal_visible on someone else's resources
 *
 *   Quote respond API (POST /api/portal/quotes/[id]/respond)
 *     - 401 when unauthenticated
 *     - 403 when wrong client (email mismatch)
 *     - 400 when quote is not in 'sent' status
 *     - 'question' action: status stays 'sent', comment stored
 *     - 'accepted' action: status → 'accepted'
 *     - 400 when trying to respond after already accepted
 *
 *   Superadmin impersonation
 *     - SA can query portal data for any email via ?email=
 *     - non-SA cannot use the ?email= param
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

// ── Module-level state ────────────────────────────────────────────────────────

let contractorCookie, contractorId
let clientCookie
let ownerCookie
let saCookie

let clientRecordId
let projectId
let quoteId
let invoiceId
let labourId

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Guard: verify migration 142 has been applied
  const { error: colCheck } = await admin
    .from('quotes').select('portal_visible').limit(0)
  if (colCheck) {
    throw new Error(
      'Migration 142 not applied — run supabase/migrations/142_portal_visible.sql first.'
    )
  }

  // Sign in all actors
  const [contractor, client, owner] = await Promise.all([
    signIn(process.env.TEST_SOLO_EMAIL,   process.env.TEST_SOLO_PASSWORD),
    signIn(process.env.TEST_CLIENT_EMAIL, process.env.TEST_CLIENT_PASSWORD),
    signIn(process.env.TEST_OWNER_EMAIL,  process.env.TEST_OWNER_PASSWORD),
  ])
  contractorCookie = contractor.cookie
  contractorId     = contractor.userId
  clientCookie     = client.cookie
  ownerCookie      = owner.cookie

  // SA sign-in is optional — skip SA tests if not configured
  if (process.env.TEST_SA_EMAIL) {
    const sa = await signIn(process.env.TEST_SA_EMAIL, process.env.TEST_SA_PASSWORD)
    saCookie = sa.cookie
  }

  // Create a clients row that links the client email to the contractor
  const { data: clientRow, error: clientErr } = await admin
    .from('clients')
    .insert({
      owner_id: contractorId,
      name:     '[TEST] Portál Ügyfél',
      email:    process.env.TEST_CLIENT_EMAIL,
    })
    .select()
    .single()
  if (clientErr) throw new Error(`Failed to create client row: ${clientErr.message}`)
  clientRecordId = clientRow.id

  // Create a project linked to that client
  const { data: projectRow, error: projErr } = await admin
    .from('projects')
    .insert({
      owner_id:  contractorId,
      client_id: clientRecordId,
      name:      '[TEST] Portál Projekt',
      status:    'active',
    })
    .select()
    .single()
  if (projErr) throw new Error(`Failed to create project: ${projErr.message}`)
  projectId = projectRow.id

  // Create a quote linked to the client + project (portal_visible = false by default)
  const { data: quoteRow, error: quoteErr } = await admin
    .from('quotes')
    .insert({
      owner_id:       contractorId,
      client_id:      clientRecordId,
      project_id:     projectId,
      title:          '[TEST] Portál Ajánlat',
      status:         'sent',
      tax_percent:    27,
      portal_visible: false,
    })
    .select()
    .single()
  if (quoteErr) throw new Error(`Failed to create quote: ${quoteErr.message}`)
  quoteId = quoteRow.id

  // Add a line item to the quote
  await admin.from('quote_entries').insert({
    quote_id:         quoteId,
    entry_type:       'labour',
    work_description: '[TEST] Festési munkák',
    amount_huf:       100000,
  })

  // Create an invoice in the project (portal_visible = false)
  const { data: invoiceRow, error: invErr } = await admin
    .from('invoices')
    .insert({
      project_id:     projectId,
      owner_id:       contractorId,
      value_huf:      50000,
      description:    '[TEST] Anyagszámla',
      portal_visible: false,
    })
    .select()
    .single()
  if (invErr) throw new Error(`Failed to create invoice: ${invErr.message}`)
  invoiceId = invoiceRow.id

  // Create a labour entry in the project (portal_visible = false)
  const { data: labourRow, error: labErr } = await admin
    .from('labour_entries')
    .insert({
      project_id:     projectId,
      owner_id:       contractorId,
      labour_type:    '[TEST] Napszám',
      value_huf:      30000,
      portal_visible: false,
    })
    .select()
    .single()
  if (labErr) throw new Error(`Failed to create labour entry: ${labErr.message}`)
  labourId = labourRow.id
})

afterAll(async () => {
  if (quoteId) {
    await admin.from('quote_client_comments').delete().eq('quote_id', quoteId)
    await admin.from('quote_entries').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
  if (projectId) {
    if (invoiceId) await admin.from('invoices').delete().eq('id', invoiceId)
    if (labourId)  await admin.from('labour_entries').delete().eq('id', labourId)
    await admin.from('projects').delete().eq('id', projectId)
  }
  if (clientRecordId) await admin.from('clients').delete().eq('id', clientRecordId)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getPortalProject() {
  const { body } = await api('GET', '/api/portal/data', null, clientCookie)
  const contractor = (body.contractors || []).find(c => c.owner_id === contractorId)
  return contractor?.projects?.find(p => p.id === projectId) || null
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Portal data API — auth', () => {
  it('unauthenticated request returns 401', async () => {
    const { status } = await api('GET', '/api/portal/data', null, null)
    expect(status).toBe(401)
  })

  it('authenticated client returns 200 with contractors array', async () => {
    const { status, body } = await api('GET', '/api/portal/data', null, clientCookie)
    expect(status).toBe(200)
    expect(Array.isArray(body.contractors)).toBe(true)
  })
})

describe('Portal data API — visibility defaults (portal_visible = false)', () => {
  it('client sees the project but no quote (portal_visible = false)', async () => {
    const project = await getPortalProject()
    expect(project).not.toBeNull()
    expect((project.quotes || []).length).toBe(0)
  })

  it('client sees no invoices (portal_visible = false)', async () => {
    const project = await getPortalProject()
    expect((project?.invoices || []).length).toBe(0)
  })

  it('client sees no labour entries (portal_visible = false)', async () => {
    const project = await getPortalProject()
    expect((project?.labourEntries || []).length).toBe(0)
  })

  it('unrelated contractor sees no data for this client', async () => {
    const { status, body } = await api('GET', '/api/portal/data', null, ownerCookie)
    expect(status).toBe(200)
    // ownerCookie is TEST_OWNER_EMAIL, not the client email — should return their own empty list
    const found = (body.contractors || []).find(c => c.owner_id === contractorId)
    expect(found).toBeUndefined()
  })
})

describe('portal_visible toggle — contractor side', () => {
  it('contractor enables portal_visible on quote', async () => {
    const { status, body } = await api(
      'PATCH', `/api/quotes/${quoteId}`, { portal_visible: true }, contractorCookie
    )
    expect(status).toBe(200)
    expect(body.quote.portal_visible).toBe(true)
  })

  it('another user cannot toggle portal_visible on this quote', async () => {
    const { status } = await api(
      'PATCH', `/api/quotes/${quoteId}`, { portal_visible: false }, ownerCookie
    )
    expect(status).toBe(403)
  })

  it('contractor enables portal_visible on invoice', async () => {
    const { status } = await api(
      'PATCH', `/api/invoices/${invoiceId}`, { portal_visible: true }, contractorCookie
    )
    expect(status).toBe(200)
  })

  it('another user cannot toggle portal_visible on this invoice', async () => {
    const { status } = await api(
      'PATCH', `/api/invoices/${invoiceId}`, { portal_visible: false }, ownerCookie
    )
    expect(status).toBe(403)
  })

  it('contractor enables portal_visible on labour entry', async () => {
    const { status } = await api(
      'PATCH', `/api/labour-entries/${labourId}`, { portal_visible: true }, contractorCookie
    )
    expect(status).toBe(200)
  })

  it('another user cannot toggle portal_visible on this labour entry', async () => {
    const { status } = await api(
      'PATCH', `/api/labour-entries/${labourId}`, { portal_visible: false }, ownerCookie
    )
    expect(status).toBe(403)
  })
})

describe('Portal data API — after enabling portal_visible', () => {
  it('client sees the shared quote with entries', async () => {
    const project = await getPortalProject()
    const quote = (project?.quotes || []).find(q => q.id === quoteId)
    expect(quote).toBeTruthy()
    expect(quote.title).toBe('[TEST] Portál Ajánlat')
    expect(quote.status).toBe('sent')
    expect((quote.entries || []).length).toBeGreaterThan(0)
    expect(quote.entries[0].entry_type).toBe('labour')
    expect(quote.entries[0].amount_huf).toBe(100000)
  })

  it('client sees the shared invoice', async () => {
    const project = await getPortalProject()
    const invoice = (project?.invoices || []).find(i => i.id === invoiceId)
    expect(invoice).toBeTruthy()
    expect(invoice.value_huf).toBe(50000)
    expect(invoice.description).toBe('[TEST] Anyagszámla')
  })

  it('client sees the shared labour entry', async () => {
    const project = await getPortalProject()
    const labour = (project?.labourEntries || []).find(l => l.id === labourId)
    expect(labour).toBeTruthy()
    expect(labour.value_huf).toBe(30000)
    expect(labour.labour_type).toBe('[TEST] Napszám')
  })

  it('project invoiceTotal includes all project invoices regardless of portal_visible', async () => {
    // invoiceTotal is a sum of ALL invoices (for financial overview); portal invoices are the filtered list
    const project = await getPortalProject()
    expect(project.invoiceTotal).toBeGreaterThanOrEqual(50000)
  })

  it('standalone quotes (no project_id) appear at contractor level', async () => {
    // Create a standalone quote (not linked to any project)
    const { data: standalone } = await admin.from('quotes').insert({
      owner_id:       contractorId,
      client_id:      clientRecordId,
      project_id:     null,
      title:          '[TEST] Standalone Ajánlat',
      status:         'sent',
      portal_visible: true,
    }).select().single()

    const { body } = await api('GET', '/api/portal/data', null, clientCookie)
    const contractor = (body.contractors || []).find(c => c.owner_id === contractorId)
    const found = (contractor?.standaloneQuotes || []).find(q => q.id === standalone.id)
    expect(found).toBeTruthy()

    // Cleanup
    await admin.from('quotes').delete().eq('id', standalone.id)
  })
})

describe('Quote respond API — auth & ownership', () => {
  it('unauthenticated user cannot respond to a quote', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`, { action: 'accepted' }, null
    )
    expect(status).toBe(401)
  })

  it('unrelated user (email mismatch) cannot respond to this quote', async () => {
    // ownerCookie is TEST_OWNER_EMAIL — not the client associated with this quote
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`, { action: 'accepted' }, ownerCookie
    )
    expect(status).toBe(403)
  })

  it('rejects invalid action value', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`, { action: 'maybe' }, clientCookie
    )
    expect(status).toBe(400)
  })

  it('rejects respond when quote is not in sent status', async () => {
    // Temporarily set to accepted
    await admin.from('quotes').update({ status: 'accepted' }).eq('id', quoteId)
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`, { action: 'accepted' }, clientCookie
    )
    expect(status).toBe(400)
    // Reset for subsequent tests
    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
  })
})

describe('Quote respond API — client actions', () => {
  it('client can send a question (status stays sent)', async () => {
    const { status, body } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'question', comment: 'Módosítható a burkolat típusa?' },
      clientCookie
    )
    expect(status).toBe(200)
    expect(body.status).toBe('sent')

    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('sent')

    // Comment is stored in quote_client_comments
    const { data: comments } = await admin
      .from('quote_client_comments').select('action, comment').eq('quote_id', quoteId)
    const q = comments?.find(c => c.action === 'question')
    expect(q).toBeTruthy()
    expect(q.comment).toBe('Módosítható a burkolat típusa?')
  })

  it('client can accept the quote', async () => {
    const { status, body } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'accepted', comment: 'Elfogadom, kezdhetünk.' },
      clientCookie
    )
    expect(status).toBe(200)
    expect(body.status).toBe('accepted')

    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('accepted')
  })

  it('client cannot respond again after accepting', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'rejected', comment: 'Mégsem.' },
      clientCookie
    )
    expect(status).toBe(400)
  })

  it('client can reject a sent quote', async () => {
    // Reset quote back to sent
    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)

    const { status, body } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'rejected', comment: 'Az ár meghaladja a keretemet.' },
      clientCookie
    )
    expect(status).toBe(200)
    expect(body.status).toBe('rejected')

    const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
    expect(data.status).toBe('rejected')
  })

  it('rejected quote no longer accepts responses', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'accepted' },
      clientCookie
    )
    expect(status).toBe(400)

    // Reset to sent for any further tests
    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
  })
})

describe('Portal data API — superadmin impersonation', () => {
  it.skipIf(!process.env.TEST_SA_EMAIL)(
    'SA can query portal data for any client email via ?email=',
    async () => {
      const url = `/api/portal/data?email=${encodeURIComponent(process.env.TEST_CLIENT_EMAIL)}`
      const { status, body } = await api('GET', url, null, saCookie)
      expect(status).toBe(200)
      const contractor = (body.contractors || []).find(c => c.owner_id === contractorId)
      expect(contractor).toBeTruthy()
      expect(contractor.projects.some(p => p.id === projectId)).toBe(true)
    }
  )

  it('non-SA user is rejected when using the ?email= impersonation param', async () => {
    // TEST_OWNER is a regular user, not SA
    const url = `/api/portal/data?email=${encodeURIComponent(process.env.TEST_CLIENT_EMAIL)}`
    const { status } = await api('GET', url, null, ownerCookie)
    expect(status).toBe(403)
  })

  it('unauthenticated request with ?email= also returns 401', async () => {
    const url = `/api/portal/data?email=${encodeURIComponent(process.env.TEST_CLIENT_EMAIL)}`
    const { status } = await api('GET', url, null, null)
    expect(status).toBe(401)
  })
})
