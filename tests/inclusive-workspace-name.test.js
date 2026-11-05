/**
 * Inclusive workspace — name is derived from the user's locale at creation time.
 *
 * Uses TEST_SOLO (premium, isolated from the collective permission tests).
 * Each test: set locale → wipe any existing inclusive collective → GET /api/collectives
 * → the lazy-creation logic runs → verify the stored name.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let cookie, userId

beforeAll(async () => {
  const session = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
  cookie = session.cookie
  userId = session.userId
})

afterAll(async () => {
  await admin.from('profiles').update({ locale: null }).eq('id', userId)
  await deleteInclusive(userId)
})

async function deleteInclusive(uid) {
  const { data: rows } = await admin
    .from('collective_members')
    .select('collective_id, collectives!inner(is_inclusive)')
    .eq('user_id', uid)
    .eq('role', 'owner')
    .eq('status', 'active')
  for (const row of rows || []) {
    if (!row.collectives?.is_inclusive) continue
    await admin.from('collective_members').delete().eq('collective_id', row.collective_id)
    await admin.from('collectives').delete().eq('id', row.collective_id)
  }
}

async function prepareLocale(locale) {
  await admin.from('profiles').update({ locale }).eq('id', userId)
  await deleteInclusive(userId)
}

describe('Inclusive workspace — locale-based name on creation', () => {
  it('hu locale → "<name> Csapata"', async () => {
    await prepareLocale('hu')
    const { status, body } = await api('GET', '/api/collectives', null, cookie)
    expect(status).toBe(200)
    const inc = (body.collectives || []).find(c => c.is_inclusive)
    expect(inc, 'inclusive collective was not created').toBeTruthy()
    expect(inc.name).toBe('Test Solo Csapata')
  })

  it('en locale → "<name> Workspace"', async () => {
    await prepareLocale('en')
    const { status, body } = await api('GET', '/api/collectives', null, cookie)
    expect(status).toBe(200)
    const inc = (body.collectives || []).find(c => c.is_inclusive)
    expect(inc, 'inclusive collective was not created').toBeTruthy()
    expect(inc.name).toBe('Test Solo Workspace')
  })

  it('de locale → "Arbeitsbereich von <name>"', async () => {
    await prepareLocale('de')
    const { status, body } = await api('GET', '/api/collectives', null, cookie)
    expect(status).toBe(200)
    const inc = (body.collectives || []).find(c => c.is_inclusive)
    expect(inc, 'inclusive collective was not created').toBeTruthy()
    expect(inc.name).toBe('Test Solo Arbeitsbereich')
  })

  it('null locale → defaults to "<name> Csapata"', async () => {
    await prepareLocale(null)
    const { status, body } = await api('GET', '/api/collectives', null, cookie)
    expect(status).toBe(200)
    const inc = (body.collectives || []).find(c => c.is_inclusive)
    expect(inc, 'inclusive collective was not created').toBeTruthy()
    expect(inc.name).toBe('Test Solo Csapata')
  })
})
