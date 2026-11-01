/**
 * Invitation link flow — tests that accept and decline links do the right things.
 *
 * What is tested:
 *   1. GET /api/invitations/[token]    — public details endpoint
 *   2. POST /api/invitations/[token]/decline — no-auth decline
 *   3. POST /api/invitations/[token]/accept  — authenticated accept
 *   4. Error cases: invalid token, wrong-email user, already-responded
 *
 * Setup:
 *   A temporary collective is created for this suite so the test member's
 *   existing membership in the main test collective is not disturbed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

let ownerCookie, ownerUserId
let memberCookie, memberUserId, memberEmail
let soloEmail

let tempCollectiveId

// Tokens created per-test via DB insert
let acceptToken    // invitation for TEST_MEMBER_EMAIL → will be accepted
let declineToken   // invitation for a dummy address → will be declined
let staleToken     // invitation that is pre-marked accepted (for idempotency test)

// ── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const [ownerSession, memberSession] = await Promise.all([
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
  ])
  ownerCookie  = ownerSession.cookie
  ownerUserId  = ownerSession.userId
  memberCookie = memberSession.cookie
  memberUserId = memberSession.userId

  // Fetch real email for the test member — needed for token matching
  const { data: mp } = await admin.from('profiles').select('email').eq('id', memberUserId).single()
  memberEmail = mp.email

  // Fetch solo user email for "wrong user" test
  const soloSession = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
  soloEmail = process.env.TEST_SOLO_EMAIL

  // Create a fresh temporary collective (owner is owner)
  const newId = crypto.randomUUID()
  await admin.from('collectives').insert({ id: newId, name: 'Invitation Test Collective' })
  await admin.from('collective_members').insert({
    collective_id: newId,
    user_id:       ownerUserId,
    role:          'owner',
    status:        'active',
  })
  tempCollectiveId = newId

  // Invitation that will be accepted (for TEST_MEMBER_EMAIL)
  const { data: inv1 } = await admin
    .from('collective_invitations')
    .insert({ collective_id: newId, invited_by: ownerUserId, email: memberEmail, user_id: memberUserId })
    .select('token').single()
  acceptToken = inv1.token

  // Invitation that will be declined (dummy email, no existing user)
  const { data: inv2 } = await admin
    .from('collective_invitations')
    .insert({ collective_id: newId, invited_by: ownerUserId, email: 'invite-decline@epitek.test' })
    .select('token').single()
  declineToken = inv2.token

  // Pre-accepted invitation (for idempotency / already-responded tests)
  const { data: inv3 } = await admin
    .from('collective_invitations')
    .insert({ collective_id: newId, invited_by: ownerUserId, email: 'already-done@epitek.test', status: 'accepted' })
    .select('token').single()
  staleToken = inv3.token
})

afterAll(async () => {
  if (tempCollectiveId) {
    await admin.from('collective_invitations').delete().eq('collective_id', tempCollectiveId)
    await admin.from('collective_members').delete().eq('collective_id', tempCollectiveId)
    await admin.from('collectives').delete().eq('id', tempCollectiveId)
  }
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/invitations/[token]', () => {
  it('returns invitation details for a valid pending token', async () => {
    const { status, body } = await api('GET', `/api/invitations/${acceptToken}`)
    expect(status).toBe(200)
    expect(body.invitation.email).toBe(memberEmail)
    expect(body.invitation.status).toBe('pending')
    expect(body.invitation.collective_name).toBe('Invitation Test Collective')
    expect(body.invitation.is_existing_user).toBe(true)
  })

  it('returns 404 for a non-existent token', async () => {
    const { status } = await api('GET', '/api/invitations/totally-invalid-token-xyz')
    expect(status).toBe(404)
  })
})

describe('POST /api/invitations/[token]/decline', () => {
  it('declines a pending invitation without authentication', async () => {
    const { status, body } = await api('POST', `/api/invitations/${declineToken}/decline`)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('returns 409 when declining an already-responded invitation', async () => {
    // staleToken is pre-marked accepted
    const { status } = await api('POST', `/api/invitations/${staleToken}/decline`)
    expect(status).toBe(409)
  })

  it('returns 409 when declining the same invitation twice', async () => {
    // declineToken was just declined above
    const { status } = await api('POST', `/api/invitations/${declineToken}/decline`)
    expect(status).toBe(409)
  })

  it('returns 404 for a non-existent token', async () => {
    const { status } = await api('POST', '/api/invitations/bad-token-123/decline')
    expect(status).toBe(404)
  })
})

describe('POST /api/invitations/[token]/accept', () => {
  it('returns 401 when called without authentication', async () => {
    const { status } = await api('POST', `/api/invitations/${acceptToken}/accept`)
    expect(status).toBe(401)
  })

  it('returns 403 when called by a user whose email does not match the invitation', async () => {
    const soloSession = await signIn(process.env.TEST_SOLO_EMAIL, process.env.TEST_SOLO_PASSWORD)
    const { status, body } = await api('POST', `/api/invitations/${acceptToken}/accept`, null, soloSession.cookie)
    expect(status).toBe(403)
    expect(body.error).toMatch(/different email/i)
  })

  it('accepts the invitation and adds the member to the collective', async () => {
    const { status, body } = await api('POST', `/api/invitations/${acceptToken}/accept`, null, memberCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.collective_id).toBe(tempCollectiveId)

    // Verify membership was created
    const { data: membership } = await admin
      .from('collective_members')
      .select('role, status')
      .eq('collective_id', tempCollectiveId)
      .eq('user_id', memberUserId)
      .single()
    expect(membership?.status).toBe('active')
    expect(membership?.role).toBe('contributor')

    // Verify invitation is marked accepted
    const { data: inv } = await admin
      .from('collective_invitations')
      .select('status')
      .eq('token', acceptToken)
      .single()
    expect(inv?.status).toBe('accepted')
  })

  it('returns 200 (idempotent) when accepting an already-accepted invitation', async () => {
    // acceptToken was just accepted — accepting again should be graceful
    const { status, body } = await api('POST', `/api/invitations/${acceptToken}/accept`, null, memberCookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('returns 410 for a retracted invitation', async () => {
    // Create and immediately retract an invitation
    const { data: inv } = await admin
      .from('collective_invitations')
      .insert({ collective_id: tempCollectiveId, invited_by: ownerUserId, email: memberEmail, user_id: memberUserId, status: 'retracted' })
      .select('token').single()

    const { status, body } = await api('POST', `/api/invitations/${inv.token}/accept`, null, memberCookie)
    expect(status).toBe(410)
    expect(body.error).toBe('RETRACTED')

    await admin.from('collective_invitations').delete().eq('token', inv.token)
  })
})

describe('Decline link (?decline=1 query param)', () => {
  it('GET /api/invitations/[token] returns pending status so the UI can process ?decline=1', async () => {
    // Create a fresh invitation
    const { data: inv } = await admin
      .from('collective_invitations')
      .insert({ collective_id: tempCollectiveId, invited_by: ownerUserId, email: 'qs-decline@epitek.test' })
      .select('token').single()

    const { status, body } = await api('GET', `/api/invitations/${inv.token}`)
    expect(status).toBe(200)
    expect(body.invitation.status).toBe('pending')

    // The invitation page reads ?decline=1 and calls the decline endpoint itself.
    // Simulate that call:
    const { status: decStatus } = await api('POST', `/api/invitations/${inv.token}/decline`)
    expect(decStatus).toBe(200)

    // Verify final state
    const { data: updated } = await admin
      .from('collective_invitations')
      .select('status')
      .eq('token', inv.token)
      .single()
    expect(updated?.status).toBe('declined')

    await admin.from('collective_invitations').delete().eq('token', inv.token)
  })
})
