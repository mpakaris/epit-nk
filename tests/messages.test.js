/**
 * Messaging & Notifications — API integration tests
 *
 * Prerequisite: migrations 143 and 144 must be applied.
 *
 * Test users:
 *   solo   — TEST_SOLO_EMAIL   — contractor who owns clients; not in the test collective
 *   owner  — TEST_OWNER_EMAIL  — collective owner
 *   member — TEST_MEMBER_EMAIL — collective contributor
 *   client — TEST_CLIENT_EMAIL — portal client (OTP in prod; password here)
 *
 * Coverage:
 *   Notifications API
 *     - 401 auth guards on GET and PATCH
 *     - GET returns unreadCount + notifications array
 *     - cross-user isolation: solo cannot see owner's notifications
 *     - PATCH { ids } marks specific notifications read
 *     - PATCH { all: true } marks all as read
 *     - PATCH with neither → 400
 *
 *   Quote respond → DB side effects  (POST /api/portal/quotes/[id]/respond)
 *     - question action writes client_question notification for contractor
 *     - accepted action writes quote_accepted notification for contractor
 *     - rejected action writes quote_rejected notification for contractor
 *     - question with comment creates thread + message in DB
 *     - second question on same quote reuses same thread
 *     - question without comment creates no thread
 *
 *   Client threads — contractor side  (GET /api/threads?client_id=X)
 *     - 401 unauth, 403 wrong owner
 *     - returns threads with messages for own client
 *
 *   Thread summary  (GET /api/threads?all=1)
 *     - 401 unauth
 *     - returns enriched list with unread_count, last_message, totalUnread
 *
 *   Unread message count  (GET /api/messages/unread-count)
 *     - 401 unauth
 *     - reflects unread client messages
 *     - decreases after PATCH /api/threads/[id]/read
 *
 *   Contractor initiates thread  (POST /api/threads, type: 'client')
 *     - 401 unauth, 400 missing fields, 403 wrong owner
 *     - creates thread + message in DB, returns thread_id
 *
 *   Contractor replies  (POST /api/threads/[id]/messages)
 *     - 401 unauth, 404 unknown thread, 403 wrong owner, 400 empty message
 *     - inserts message with sender_type='user' and correct sender_user_id
 *
 *   Mark messages read  (PATCH /api/threads/[id]/read)
 *     - 403 when not thread owner
 *     - sets read_at on all unread client messages; unread-count decreases
 *
 *   Collective chat send  (POST /api/threads, type: 'collective')
 *     - 400 missing fields, 403 non-member (US-MSG-023)
 *     - creates thread on first message; second message reuses same thread
 *     - broadcasts in-app notifications to others, not to sender
 *     - quote-scoped thread is separate from general collective thread
 *
 *   Collective chat read  (GET /api/threads?collective_id=X)
 *     - 403 non-member
 *     - returns thread + messages with sender_name
 *
 *   Cross-collective isolation  (US-MSG-023)
 *     - member of colA cannot POST to colB (403)
 *     - GET of colB returns 403 for colA-only member
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

// ── Module-level state ─────────────────────────────────────────────────────────

let soloCookie, soloId
let ownerCookie, ownerId
let memberCookie, memberId
let clientCookie

let clientRecordId
let quoteId
let tempCollectiveId

// thread IDs created during tests — used for notification cleanup in afterAll
const createdThreadIds = []

// ── Setup / Teardown ───────────────────────────────────────────────────────────

beforeAll(async () => {
  // Guard: verify migration 143 has been applied
  const { error } = await admin.from('notifications').select('id').limit(0)
  if (error) {
    throw new Error(
      'Migration 143 not applied — run supabase/migrations/143_notifications_threads_messages.sql first.'
    )
  }

  const [soloSession, ownerSession, memberSession, clientSession] = await Promise.all([
    signIn(process.env.TEST_SOLO_EMAIL,   process.env.TEST_SOLO_PASSWORD),
    signIn(process.env.TEST_OWNER_EMAIL,  process.env.TEST_OWNER_PASSWORD),
    signIn(process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD),
    signIn(process.env.TEST_CLIENT_EMAIL, process.env.TEST_CLIENT_PASSWORD),
  ])
  soloCookie   = soloSession.cookie
  soloId       = soloSession.userId
  ownerCookie  = ownerSession.cookie
  ownerId      = ownerSession.userId
  memberCookie = memberSession.cookie
  memberId     = memberSession.userId
  clientCookie = clientSession.cookie

  // Client record links TEST_CLIENT_EMAIL to the solo contractor
  const { data: clientRow, error: clientErr } = await admin
    .from('clients')
    .insert({ owner_id: soloId, name: '[TEST] Üzenet Ügyfél', email: process.env.TEST_CLIENT_EMAIL })
    .select().single()
  if (clientErr) throw new Error(`Failed to create client: ${clientErr.message}`)
  clientRecordId = clientRow.id

  // A sent quote linked to that client
  const { data: quoteRow, error: quoteErr } = await admin
    .from('quotes')
    .insert({
      owner_id:    soloId,
      client_id:   clientRecordId,
      title:       '[TEST] Üzenet Ajánlat',
      status:      'sent',
      tax_percent: 27,
    })
    .select().single()
  if (quoteErr) throw new Error(`Failed to create quote: ${quoteErr.message}`)
  quoteId = quoteRow.id

  // Temporary collective: owner + member; solo is intentionally NOT a member
  const collectiveId = crypto.randomUUID()
  await admin.from('collectives').insert({ id: collectiveId, name: '[TEST] Üzenet Kollektíva' })
  await admin.from('collective_members').insert([
    { collective_id: collectiveId, user_id: ownerId,  role: 'owner',       status: 'active' },
    { collective_id: collectiveId, user_id: memberId, role: 'contributor',  status: 'active' },
  ])
  tempCollectiveId = collectiveId
})

afterAll(async () => {
  // Threads cascade-delete their messages
  if (clientRecordId)   await admin.from('threads').delete().eq('client_id', clientRecordId)
  if (tempCollectiveId) await admin.from('threads').delete().eq('collective_id', tempCollectiveId)

  // Notifications scoped to our test resources
  if (quoteId) await admin.from('notifications').delete().eq('source_id', quoteId)
  for (const tid of createdThreadIds) {
    await admin.from('notifications').delete().eq('source_id', tid)
  }

  if (quoteId) {
    await admin.from('quote_client_comments').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
  if (clientRecordId) await admin.from('clients').delete().eq('id', clientRecordId)

  if (tempCollectiveId) {
    await admin.from('collective_members').delete().eq('collective_id', tempCollectiveId)
    await admin.from('collectives').delete().eq('id', tempCollectiveId)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('Notifications API — auth guards', () => {
  it('unauthenticated GET /api/notifications returns 401', async () => {
    const { status } = await api('GET', '/api/notifications', null, null)
    expect(status).toBe(401)
  })

  it('unauthenticated PATCH /api/notifications returns 401', async () => {
    const { status } = await api('PATCH', '/api/notifications', { all: true }, null)
    expect(status).toBe(401)
  })
})

describe('Notifications API — read & mark', () => {
  let notifId

  beforeAll(async () => {
    const { data } = await admin.from('notifications').insert({
      user_id:     soloId,
      type:        'quote_accepted',
      title:       '[TEST] Teszt értesítés',
      body:        'Elfogadta az ajánlatot',
      link:        `/ajanlatok/${quoteId}`,
      source_type: 'quote',
      source_id:   quoteId,
    }).select('id').single()
    notifId = data.id
  })

  afterAll(async () => {
    if (notifId) await admin.from('notifications').delete().eq('id', notifId)
  })

  it('GET returns unreadCount and notifications array', async () => {
    const { status, body } = await api('GET', '/api/notifications', null, soloCookie)
    expect(status).toBe(200)
    expect(typeof body.unreadCount).toBe('number')
    expect(Array.isArray(body.notifications)).toBe(true)
  })

  it('the unread notification appears and read_at is null', async () => {
    const { body } = await api('GET', '/api/notifications', null, soloCookie)
    const found = body.notifications.find(n => n.id === notifId)
    expect(found).toBeTruthy()
    expect(found.read_at).toBeNull()
    expect(body.unreadCount).toBeGreaterThanOrEqual(1)
  })

  it('solo cannot see notifications belonging to owner (cross-user isolation)', async () => {
    const { data: ownerNotif } = await admin.from('notifications').insert({
      user_id: ownerId,
      type:    'collective_message',
      title:   '[TEST] Owner értesítés',
    }).select('id').single()

    const { body } = await api('GET', '/api/notifications', null, soloCookie)
    const leaked = body.notifications.find(n => n.id === ownerNotif.id)
    expect(leaked).toBeUndefined()

    await admin.from('notifications').delete().eq('id', ownerNotif.id)
  })

  it('PATCH with neither ids nor all returns 400', async () => {
    const { status } = await api('PATCH', '/api/notifications', {}, soloCookie)
    expect(status).toBe(400)
  })

  it('PATCH { ids } marks specific notification as read in DB', async () => {
    // Reset to unread first
    await admin.from('notifications').update({ read_at: null }).eq('id', notifId)

    const { status } = await api('PATCH', '/api/notifications', { ids: [notifId] }, soloCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('notifications').select('read_at').eq('id', notifId).single()
    expect(data.read_at).not.toBeNull()
  })

  it('PATCH { all: true } marks all unread notifications as read', async () => {
    const { data: n2 } = await admin.from('notifications').insert({
      user_id: soloId,
      type:    'client_question',
      title:   '[TEST] Másik értesítés',
    }).select('id').single()

    const { status } = await api('PATCH', '/api/notifications', { all: true }, soloCookie)
    expect(status).toBe(200)

    const { data } = await admin.from('notifications').select('read_at').eq('id', n2.id).single()
    expect(data.read_at).not.toBeNull()

    await admin.from('notifications').delete().eq('id', n2.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE RESPOND → NOTIFICATION + THREAD SIDE EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Quote respond — notification side effects', () => {
  beforeAll(async () => {
    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
  })

  it('question action writes a client_question notification for the contractor', async () => {
    await admin.from('notifications').delete().eq('source_id', quoteId).eq('user_id', soloId)

    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'question', comment: 'Mi a határidő?' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: notifs } = await admin.from('notifications')
      .select('type').eq('source_id', quoteId).eq('user_id', soloId)
    expect(notifs?.some(n => n.type === 'client_question')).toBe(true)
  })

  it('accepted action writes a quote_accepted notification for the contractor', async () => {
    await admin.from('notifications').delete().eq('source_id', quoteId).eq('user_id', soloId)

    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'accepted' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: notifs } = await admin.from('notifications')
      .select('type').eq('source_id', quoteId).eq('user_id', soloId)
    expect(notifs?.some(n => n.type === 'quote_accepted')).toBe(true)

    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
  })

  it('rejected action writes a quote_rejected notification for the contractor', async () => {
    await admin.from('notifications').delete().eq('source_id', quoteId).eq('user_id', soloId)

    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'rejected', comment: 'Sajnos az ár meghaladja a keretemet.' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: notifs } = await admin.from('notifications')
      .select('type').eq('source_id', quoteId).eq('user_id', soloId)
    expect(notifs?.some(n => n.type === 'quote_rejected')).toBe(true)

    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
  })
})

describe('Quote respond — thread + message side effects', () => {
  beforeAll(async () => {
    await admin.from('quotes').update({ status: 'sent' }).eq('id', quoteId)
    await admin.from('threads').delete().eq('client_id', clientRecordId)
  })

  it('question with comment creates a thread and message in DB', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'question', comment: 'Mikor tudnak kezdeni?' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: threads } = await admin.from('threads')
      .select('id, type, quote_id').eq('client_id', clientRecordId).eq('quote_id', quoteId)
    expect(threads?.length).toBe(1)
    expect(threads[0].type).toBe('client')

    const { data: messages } = await admin.from('messages')
      .select('body, sender_type').eq('thread_id', threads[0].id)
    expect(messages?.length).toBe(1)
    expect(messages[0].sender_type).toBe('client')
    expect(messages[0].body).toBe('Mikor tudnak kezdeni?')
  })

  it('second question on same quote reuses the same thread', async () => {
    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'question', comment: 'Továbbá: milyen anyagokat terveznek?' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: threads } = await admin.from('threads')
      .select('id').eq('client_id', clientRecordId).eq('quote_id', quoteId)
    expect(threads?.length).toBe(1)

    const { data: messages } = await admin.from('messages')
      .select('id').eq('thread_id', threads[0].id)
    expect(messages?.length).toBe(2)
  })

  it('question without comment creates no thread', async () => {
    const { data: before } = await admin.from('threads')
      .select('id').eq('client_id', clientRecordId).eq('quote_id', quoteId)
    const countBefore = before?.length ?? 0

    const { status } = await api(
      'POST', `/api/portal/quotes/${quoteId}/respond`,
      { action: 'question', comment: '' },
      clientCookie
    )
    expect(status).toBe(200)

    const { data: after } = await admin.from('threads')
      .select('id').eq('client_id', clientRecordId).eq('quote_id', quoteId)
    expect(after?.length ?? 0).toBe(countBefore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT THREADS — CONTRACTOR SIDE
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/threads?client_id — auth & ownership', () => {
  let threadId

  beforeAll(async () => {
    const { data: thread } = await admin.from('threads').insert({
      type: 'client', owner_id: soloId, client_id: clientRecordId,
    }).select('id').single()
    await admin.from('messages').insert({
      thread_id:        thread.id,
      sender_type:      'client',
      sender_client_id: clientRecordId,
      body:             'Teszt kérdés',
    })
    threadId = thread.id
    createdThreadIds.push(threadId)
  })

  it('401 when unauthenticated', async () => {
    const { status } = await api('GET', `/api/threads?client_id=${clientRecordId}`, null, null)
    expect(status).toBe(401)
  })

  it('403 when client not owned by requester', async () => {
    const { status } = await api('GET', `/api/threads?client_id=${clientRecordId}`, null, ownerCookie)
    expect(status).toBe(403)
  })

  it('returns threads with messages for own client', async () => {
    const { status, body } = await api('GET', `/api/threads?client_id=${clientRecordId}`, null, soloCookie)
    expect(status).toBe(200)
    expect(Array.isArray(body.threads)).toBe(true)

    const found = body.threads.find(t => t.id === threadId)
    expect(found).toBeTruthy()
    expect(found.messages?.length).toBeGreaterThan(0)
    expect(found.messages[0].body).toBe('Teszt kérdés')
  })

  it('unread_count reflects unread client messages', async () => {
    const { body } = await api('GET', `/api/threads?client_id=${clientRecordId}`, null, soloCookie)
    const found = body.threads.find(t => t.id === threadId)
    expect(found?.unread_count).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/threads?all=1 — thread summary', () => {
  it('401 when unauthenticated', async () => {
    const { status } = await api('GET', '/api/threads?all=1', null, null)
    expect(status).toBe(401)
  })

  it('returns enriched thread list with unread_count, last_message, and totalUnread', async () => {
    const { status, body } = await api('GET', '/api/threads?all=1', null, soloCookie)
    expect(status).toBe(200)
    expect(typeof body.totalUnread).toBe('number')
    expect(Array.isArray(body.threads)).toBe(true)
    expect(body.threads.length).toBeGreaterThan(0)

    const t = body.threads[0]
    expect(typeof t.unread_count).toBe('number')
    expect(t.last_message).not.toBeNull()
    expect(typeof t.last_message.body).toBe('string')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTOR INITIATES THREAD
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/threads (type: client) — contractor initiates thread', () => {
  it('401 when unauthenticated', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'client', client_id: clientRecordId, message: 'Hello' },
      null
    )
    expect(status).toBe(401)
  })

  it('400 when client_id is missing', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'client', message: 'Hi' },
      soloCookie
    )
    expect(status).toBe(400)
  })

  it('400 when message is missing', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'client', client_id: clientRecordId },
      soloCookie
    )
    expect(status).toBe(400)
  })

  it('403 when client not owned by requester', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'client', client_id: clientRecordId, message: 'Próba' },
      ownerCookie
    )
    expect(status).toBe(403)
  })

  it('creates thread and message in DB, returns thread_id and message', async () => {
    const { status, body } = await api(
      'POST', '/api/threads',
      { type: 'client', client_id: clientRecordId, message: 'Vállalkozó üzenete' },
      soloCookie
    )
    expect(status).toBe(200)
    expect(body.thread_id).toBeTruthy()
    expect(body.message.body).toBe('Vállalkozó üzenete')
    createdThreadIds.push(body.thread_id)

    const { data: thread } = await admin.from('threads')
      .select('type, owner_id').eq('id', body.thread_id).single()
    expect(thread.type).toBe('client')
    expect(thread.owner_id).toBe(soloId)

    const { data: messages } = await admin.from('messages')
      .select('body, sender_type, sender_user_id').eq('thread_id', body.thread_id)
    expect(messages?.length).toBe(1)
    expect(messages[0].body).toBe('Vállalkozó üzenete')
    expect(messages[0].sender_type).toBe('user')
    expect(messages[0].sender_user_id).toBe(soloId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTOR REPLIES
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/threads/[id]/messages — contractor replies', () => {
  let replyThreadId

  beforeAll(async () => {
    const { data: thread } = await admin.from('threads').insert({
      type: 'client', owner_id: soloId, client_id: clientRecordId,
    }).select('id').single()
    await admin.from('messages').insert({
      thread_id:        thread.id,
      sender_type:      'client',
      sender_client_id: clientRecordId,
      body:             'Ügyfél kérdése',
    })
    replyThreadId = thread.id
    createdThreadIds.push(replyThreadId)
  })

  it('401 when unauthenticated', async () => {
    const { status } = await api(
      'POST', `/api/threads/${replyThreadId}/messages`,
      { message: 'Hi' },
      null
    )
    expect(status).toBe(401)
  })

  it('404 when thread does not exist', async () => {
    const { status } = await api(
      'POST', '/api/threads/00000000-0000-0000-0000-000000000000/messages',
      { message: 'Hi' },
      soloCookie
    )
    expect(status).toBe(404)
  })

  it('403 when not the thread owner (client thread)', async () => {
    const { status } = await api(
      'POST', `/api/threads/${replyThreadId}/messages`,
      { message: 'Betolakodó üzenet' },
      ownerCookie
    )
    expect(status).toBe(403)
  })

  it('400 when message is blank', async () => {
    const { status } = await api(
      'POST', `/api/threads/${replyThreadId}/messages`,
      { message: '   ' },
      soloCookie
    )
    expect(status).toBe(400)
  })

  it('inserts reply with sender_type=user and correct sender_user_id', async () => {
    const { status, body } = await api(
      'POST', `/api/threads/${replyThreadId}/messages`,
      { message: 'Pénteken tudunk kezdeni.' },
      soloCookie
    )
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.message.body).toBe('Pénteken tudunk kezdeni.')

    const { data: messages } = await admin.from('messages')
      .select('sender_type, sender_user_id')
      .eq('thread_id', replyThreadId)
      .eq('sender_type', 'user')
    expect(messages?.length).toBe(1)
    expect(messages[0].sender_user_id).toBe(soloId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MARK MESSAGES AS READ + UNREAD COUNT
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/threads/[id]/read & GET /api/messages/unread-count', () => {
  let readThreadId

  beforeAll(async () => {
    const { data: thread } = await admin.from('threads').insert({
      type: 'client', owner_id: soloId, client_id: clientRecordId,
    }).select('id').single()
    await admin.from('messages').insert([
      { thread_id: thread.id, sender_type: 'client', sender_client_id: clientRecordId, body: 'Kérdés 1' },
      { thread_id: thread.id, sender_type: 'client', sender_client_id: clientRecordId, body: 'Kérdés 2' },
    ])
    readThreadId = thread.id
    createdThreadIds.push(readThreadId)
  })

  it('GET /api/messages/unread-count returns 401 when unauthenticated', async () => {
    const { status } = await api('GET', '/api/messages/unread-count', null, null)
    expect(status).toBe(401)
  })

  it('unread-count reflects the two unread client messages', async () => {
    const { status, body } = await api('GET', '/api/messages/unread-count', null, soloCookie)
    expect(status).toBe(200)
    expect(body.count).toBeGreaterThanOrEqual(2)
  })

  it('403 when PATCH /api/threads/[id]/read is called by non-owner', async () => {
    const { status } = await api('PATCH', `/api/threads/${readThreadId}/read`, null, ownerCookie)
    expect(status).toBe(403)
  })

  it('marks all client messages as read and unread-count decreases', async () => {
    const { body: before } = await api('GET', '/api/messages/unread-count', null, soloCookie)
    const countBefore = before.count

    const { status } = await api('PATCH', `/api/threads/${readThreadId}/read`, null, soloCookie)
    expect(status).toBe(200)

    const { data: messages } = await admin.from('messages')
      .select('read_at').eq('thread_id', readThreadId).eq('sender_type', 'client')
    expect(messages?.every(m => m.read_at !== null)).toBe(true)

    const { body: after } = await api('GET', '/api/messages/unread-count', null, soloCookie)
    expect(after.count).toBe(countBefore - 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIVE CHAT
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/threads (type: collective) — send', () => {
  it('400 when collective_id is missing', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'collective', message: 'Hi' },
      ownerCookie
    )
    expect(status).toBe(400)
  })

  it('400 when message is missing', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId },
      ownerCookie
    )
    expect(status).toBe(400)
  })

  it('403 when user is not a member of the collective (US-MSG-023)', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Betolakodó' },
      soloCookie
    )
    expect(status).toBe(403)
  })

  it('creates a collective thread on first message', async () => {
    const { status, body } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Első csapatüzenet' },
      ownerCookie
    )
    expect(status).toBe(200)
    expect(body.thread_id).toBeTruthy()
    createdThreadIds.push(body.thread_id)

    const { data: thread } = await admin.from('threads')
      .select('type, collective_id').eq('id', body.thread_id).single()
    expect(thread.type).toBe('collective')
    expect(thread.collective_id).toBe(tempCollectiveId)
  })

  it('second message reuses the same thread (find-or-create)', async () => {
    const { body: r1 } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Második üzenet' },
      ownerCookie
    )
    const { body: r2 } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Harmadik üzenet' },
      ownerCookie
    )
    expect(r1.thread_id).toBe(r2.thread_id)
  })

  it('broadcasts in-app notifications to other members but NOT to sender', async () => {
    const { body } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Értesítés teszt' },
      ownerCookie
    )
    createdThreadIds.push(body.thread_id)

    const { data: memberNotifs } = await admin.from('notifications')
      .select('type, user_id')
      .eq('source_id', body.thread_id)
      .eq('user_id', memberId)
      .eq('type', 'collective_message')
    expect(memberNotifs?.length).toBeGreaterThanOrEqual(1)

    const { data: ownerNotifs } = await admin.from('notifications')
      .select('id')
      .eq('source_id', body.thread_id)
      .eq('user_id', ownerId)
      .eq('type', 'collective_message')
    expect(ownerNotifs?.length ?? 0).toBe(0)
  })

  it('quote-scoped thread is separate from general collective thread', async () => {
    // general chat
    const { body: generalBody } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Általános üzenet' },
      ownerCookie
    )
    // quote-scoped (uses existing test quote as a FK anchor)
    const { body: scopedBody } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, quote_id: quoteId, message: 'Ajánlathoz kapcsolt üzenet' },
      ownerCookie
    )
    expect(generalBody.thread_id).not.toBe(scopedBody.thread_id)
    createdThreadIds.push(scopedBody.thread_id)
  })
})

describe('GET /api/threads?collective_id — read', () => {
  it('403 when user is not a member of the collective', async () => {
    const { status } = await api('GET', `/api/threads?collective_id=${tempCollectiveId}`, null, soloCookie)
    expect(status).toBe(403)
  })

  it('returns thread and messages with sender_name for a member', async () => {
    // Member sends a message to ensure a general thread exists
    await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: tempCollectiveId, message: 'Tag üzenet' },
      memberCookie
    )

    const { status, body } = await api(
      'GET', `/api/threads?collective_id=${tempCollectiveId}`,
      null,
      memberCookie
    )
    expect(status).toBe(200)
    expect(body.thread).toBeTruthy()
    expect(Array.isArray(body.messages)).toBe(true)
    expect(body.messages.length).toBeGreaterThan(0)

    const withName = body.messages.filter(m => m.sender_name != null)
    expect(withName.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-COLLECTIVE ISOLATION (US-MSG-023)
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-collective isolation (US-MSG-023)', () => {
  let colBId

  beforeAll(async () => {
    const id = crypto.randomUUID()
    await admin.from('collectives').insert({ id, name: '[TEST] Kollektíva B' })
    await admin.from('collective_members').insert({
      collective_id: id,
      user_id:       ownerId,
      role:          'owner',
      status:        'active',
    })
    colBId = id
  })

  afterAll(async () => {
    if (colBId) {
      await admin.from('threads').delete().eq('collective_id', colBId)
      await admin.from('collective_members').delete().eq('collective_id', colBId)
      await admin.from('collectives').delete().eq('id', colBId)
    }
  })

  it('member of colA cannot POST a message to colB (403)', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: colBId, message: 'Kereszt-kollektíva üzenet' },
      memberCookie
    )
    expect(status).toBe(403)
  })

  it('GET /api/threads?collective_id=colB returns 403 for colA-only member', async () => {
    const { status } = await api(
      'GET', `/api/threads?collective_id=${colBId}`,
      null,
      memberCookie
    )
    expect(status).toBe(403)
  })

  it('owner of colA who is also owner of colB CAN post to colB', async () => {
    const { status } = await api(
      'POST', '/api/threads',
      { type: 'collective', collective_id: colBId, message: 'Owner a saját colB-jébe ír' },
      ownerCookie
    )
    expect(status).toBe(200)
  })
})
