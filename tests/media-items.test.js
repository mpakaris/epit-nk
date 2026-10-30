/**
 * media_items — R2 reference counting and deletion safety
 *
 * Prerequisite: migration 119_media_items.sql must be applied before running.
 *
 * Fake R2 keys are used throughout — no real objects are uploaded. deleteFromR2
 * silently swallows errors for unknown keys, so we verify only DB state.
 *
 * Scenarios tested:
 *   1. copy-survey-media — creates media_items rows from survey_media (idempotent)
 *   2. GET /api/quotes/[id] — includes mediaItems in response after copy
 *   3. DELETE media_items when survey_media ALSO holds the same r2_key
 *      → DB row removed, survey_media row survives (R2 not deleted)
 *   4. DELETE survey_media when media_items ALSO holds the same r2_key
 *      → DB row removed, media_items row survives (R2 not deleted)
 *   5. DELETE media_items when it is the LAST reference (survey_media gone)
 *   6. DELETE survey_media when it is the LAST reference (no media_items)
 *   7. Auth: 401 / 403 on media-items and copy-survey-media routes
 *
 * Test users:
 *   solo  — TEST_SOLO_EMAIL  — creates all resources
 *   owner — TEST_OWNER_EMAIL — used only as an unauthorized third party
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn } from './helpers/auth.js'
import { api } from './helpers/request.js'
import { admin } from './helpers/admin.js'

// ── Stable fake R2 keys — never uploaded, deleteFromR2 silently ignores them ──
const KEY_A         = 'test-media/ref-a.webp'   // shared between survey_media + media_items
const KEY_B         = 'test-media/ref-b.webp'   // shared between survey_media + media_items
const KEY_SURVEY_ONLY = 'test-media/survey-only.webp'  // only in survey_media
const KEY_MEDIA_ONLY  = 'test-media/media-only.webp'   // only in media_items (direct insert)
const FAKE_CDN = (key) => `https://fake-cdn.r2.test/${key}`

// ── Module-level state ────────────────────────────────────────────────────────
let cookie, userId
let ownerCookie

let surveyId
let surveyEntryId

let quoteId
let sectionId

let smIdA         // survey_media row — KEY_A  (shared)
let smIdB         // survey_media row — KEY_B  (shared)
let smIdSurveyOnly // survey_media row — KEY_SURVEY_ONLY (no media_items)

let miIdA         // media_items row — KEY_A  (created by copy-survey-media)
let miIdB         // media_items row — KEY_B  (created by copy-survey-media)
let miIdMediaOnly // media_items row — KEY_MEDIA_ONLY (inserted directly)

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Guard — verify migration 119 has been applied before running any tests
  const { error: tableCheck } = await admin.from('media_items').select('id').limit(0)
  if (tableCheck) {
    throw new Error(
      'media_items table not found — apply supabase/migrations/119_media_items.sql first'
    )
  }

  const [soloSession, ownerSession] = await Promise.all([
    signIn(process.env.TEST_SOLO_EMAIL,  process.env.TEST_SOLO_PASSWORD),
    signIn(process.env.TEST_OWNER_EMAIL, process.env.TEST_OWNER_PASSWORD),
  ])
  cookie      = soloSession.cookie
  userId      = soloSession.userId
  ownerCookie = ownerSession.cookie

  // 1. Create a survey
  const { body: surveyBody } = await api('POST', '/api/surveys', {
    title: '[TEST-MEDIA] Felmérés',
    collective_id: null,
  }, cookie)
  surveyId = surveyBody.survey.id

  // 2. Insert a survey entry directly (no public API needed for this setup step)
  const { data: entryRow, error: entryErr } = await admin
    .from('survey_entries')
    .insert({ survey_id: surveyId, name: '[TEST-MEDIA] Fürdőszoba', sort_order: 0 })
    .select('id')
    .single()
  if (entryErr) throw new Error(`survey_entries insert: ${entryErr.message}`)
  surveyEntryId = entryRow.id

  // 3. Insert survey_media rows for KEY_A, KEY_B, and KEY_SURVEY_ONLY
  const mediaInserts = [
    { survey_id: surveyId, entry_id: surveyEntryId, uploaded_by: userId,
      drive_file_id: KEY_A, drive_view_url: FAKE_CDN(KEY_A),
      thumbnail_url: null, mime_type: 'image/webp' },
    { survey_id: surveyId, entry_id: surveyEntryId, uploaded_by: userId,
      drive_file_id: KEY_B, drive_view_url: FAKE_CDN(KEY_B),
      thumbnail_url: null, mime_type: 'image/webp' },
    { survey_id: surveyId, entry_id: surveyEntryId, uploaded_by: userId,
      drive_file_id: KEY_SURVEY_ONLY, drive_view_url: FAKE_CDN(KEY_SURVEY_ONLY),
      thumbnail_url: null, mime_type: 'image/webp' },
  ]
  const { data: mediaRows, error: mediaErr } = await admin
    .from('survey_media')
    .insert(mediaInserts)
    .select('id, drive_file_id')
  if (mediaErr) throw new Error(`survey_media insert: ${mediaErr.message}`)
  smIdA          = mediaRows.find(r => r.drive_file_id === KEY_A).id
  smIdB          = mediaRows.find(r => r.drive_file_id === KEY_B).id
  smIdSurveyOnly = mediaRows.find(r => r.drive_file_id === KEY_SURVEY_ONLY).id

  // 4. Create a quote linked to the survey
  const { body: quoteBody } = await api('POST', '/api/quotes', {
    title: '[TEST-MEDIA] Ajánlat',
    survey_id: surveyId,
    collective_id: null,
    tax_percent: 27,
  }, cookie)
  quoteId = quoteBody.quote.id

  // 5. Create a quote section linked to the survey entry
  const { body: sectionBody } = await api('POST', `/api/quotes/${quoteId}/sections`, {
    name: '[TEST-MEDIA] Fürdőszoba',
    survey_entry_id: surveyEntryId,
  }, cookie)
  sectionId = sectionBody.section.id
})

afterAll(async () => {
  if (quoteId) {
    await admin.from('media_items').delete().eq('document_id', quoteId)
    await admin.from('quote_sections').delete().eq('quote_id', quoteId)
    await admin.from('quotes').delete().eq('id', quoteId)
  }
  if (surveyId) {
    await admin.from('survey_media').delete().eq('survey_id', surveyId)
    await admin.from('survey_entries').delete().eq('survey_id', surveyId)
    await admin.from('surveys').delete().eq('id', surveyId)
  }
})

// ── 1. copy-survey-media ──────────────────────────────────────────────────────

describe('copy-survey-media', () => {
  it('rejects unauthenticated requests', async () => {
    const { status } = await api('POST', `/api/quotes/${quoteId}/copy-survey-media`, null, null)
    expect(status).toBe(401)
  })

  it('rejects requests from a non-owner', async () => {
    const { status } = await api('POST', `/api/quotes/${quoteId}/copy-survey-media`, null, ownerCookie)
    expect(status).toBe(403)
  })

  it('creates media_items rows for every survey_media entry on the linked section', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/copy-survey-media`, null, cookie)
    expect(status).toBe(200)
    // KEY_A, KEY_B, KEY_SURVEY_ONLY — all three survey_media rows map to this entry
    expect(body.copied).toBe(3)

    // Confirm rows exist in DB with correct fields
    const { data: rows } = await admin
      .from('media_items')
      .select('id, r2_key, owner_type, owner_id, document_type, document_id')
      .eq('document_id', quoteId)
    expect(rows).toHaveLength(3)
    const keys = rows.map(r => r.r2_key)
    expect(keys).toContain(KEY_A)
    expect(keys).toContain(KEY_B)
    expect(keys).toContain(KEY_SURVEY_ONLY)

    const rowA = rows.find(r => r.r2_key === KEY_A)
    expect(rowA.owner_type).toBe('quote_section')
    expect(rowA.owner_id).toBe(sectionId)
    expect(rowA.document_type).toBe('quote')

    // Save IDs for later tests
    miIdA = rows.find(r => r.r2_key === KEY_A).id
    miIdB = rows.find(r => r.r2_key === KEY_B).id
  })

  it('is idempotent — a second call copies 0 rows', async () => {
    const { status, body } = await api('POST', `/api/quotes/${quoteId}/copy-survey-media`, null, cookie)
    expect(status).toBe(200)
    expect(body.copied).toBe(0)

    // Still exactly 3 rows — no duplicates
    const { data: rows } = await admin
      .from('media_items').select('id').eq('document_id', quoteId)
    expect(rows).toHaveLength(3)
  })
})

// ── 2. GET /api/quotes/[id] includes mediaItems ───────────────────────────────

describe('GET /api/quotes/[id] — mediaItems field', () => {
  it('returns mediaItems array containing the copied rows', async () => {
    const { status, body } = await api('GET', `/api/quotes/${quoteId}`, null, cookie)
    expect(status).toBe(200)
    expect(Array.isArray(body.mediaItems)).toBe(true)
    expect(body.mediaItems.length).toBe(3)
    const keys = body.mediaItems.map(m => m.r2_key)
    expect(keys).toContain(KEY_A)
    expect(keys).toContain(KEY_B)
  })

  it('mediaItems rows have cdn_url populated from survey_media.drive_view_url', async () => {
    const { body } = await api('GET', `/api/quotes/${quoteId}`, null, cookie)
    const rowA = body.mediaItems.find(m => m.r2_key === KEY_A)
    expect(rowA.cdn_url).toBe(FAKE_CDN(KEY_A))
  })
})

// ── 3. DELETE media_items — shared key (survey_media still references it) ─────

describe('DELETE /api/media-items/[id] — shared key', () => {
  it('deletes the media_items row but leaves the survey_media row intact', async () => {
    // KEY_A is in both survey_media (smIdA) and media_items (miIdA)
    const { status, body } = await api('DELETE', `/api/media-items/${miIdA}`, null, cookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)

    // media_items row is gone
    const { data: miRow } = await admin.from('media_items').select('id').eq('id', miIdA).maybeSingle()
    expect(miRow).toBeNull()

    // survey_media row for the same key is still there
    const { data: smRow } = await admin.from('survey_media').select('id').eq('id', smIdA).maybeSingle()
    expect(smRow).not.toBeNull()
  })

  it('returns 404 when trying to delete an already-deleted media_items row', async () => {
    const { status } = await api('DELETE', `/api/media-items/${miIdA}`, null, cookie)
    expect(status).toBe(404)
  })

  it('rejects unauthenticated requests', async () => {
    const { status } = await api('DELETE', `/api/media-items/${miIdB}`, null, null)
    expect(status).toBe(401)
  })

  it('rejects requests from a non-owner', async () => {
    const { status } = await api('DELETE', `/api/media-items/${miIdB}`, null, ownerCookie)
    expect(status).toBe(403)
  })
})

// ── 4. DELETE survey_media — shared key (media_items still references it) ─────

describe('DELETE /api/surveys/[id]/media/[mediaId] — shared key', () => {
  it('deletes the survey_media row but leaves the media_items row intact', async () => {
    // KEY_B is in both survey_media (smIdB) and media_items (miIdB)
    const { status, body } = await api(
      'DELETE', `/api/surveys/${surveyId}/media/${smIdB}`, null, cookie
    )
    expect(status).toBe(200)
    expect(body.success).toBe(true)

    // survey_media row is gone
    const { data: smRow } = await admin.from('survey_media').select('id').eq('id', smIdB).maybeSingle()
    expect(smRow).toBeNull()

    // media_items row for KEY_B is still there
    const { data: miRow } = await admin.from('media_items').select('id').eq('id', miIdB).maybeSingle()
    expect(miRow).not.toBeNull()
  })
})

// ── 5. DELETE media_items — last reference (survey_media already gone) ─────────

describe('DELETE /api/media-items/[id] — last reference', () => {
  it('deletes the row when it is the only remaining reference to that r2_key', async () => {
    // miIdB holds KEY_B — smIdB was deleted in the previous group
    // checkWhereImageIsUsed should return total=1 before delete, 0 after
    const { status, body } = await api('DELETE', `/api/media-items/${miIdB}`, null, cookie)
    expect(status).toBe(200)
    expect(body.ok).toBe(true)

    const { data: miRow } = await admin.from('media_items').select('id').eq('id', miIdB).maybeSingle()
    expect(miRow).toBeNull()
  })

  it('deletes a directly-inserted media_items row with no survey_media counterpart', async () => {
    // Insert a media_items row that has never been in survey_media
    const { data: inserted } = await admin.from('media_items').insert({
      r2_key:       KEY_MEDIA_ONLY,
      cdn_url:      FAKE_CDN(KEY_MEDIA_ONLY),
      mime_type:    'image/webp',
      owner_type:   'quote_section',
      owner_id:     sectionId,
      document_type: 'quote',
      document_id:  quoteId,
      created_by:   userId,
      sort_order:   0,
    }).select('id').single()
    miIdMediaOnly = inserted.id

    const { status } = await api('DELETE', `/api/media-items/${miIdMediaOnly}`, null, cookie)
    expect(status).toBe(200)

    const { data: miRow } = await admin.from('media_items').select('id').eq('id', miIdMediaOnly).maybeSingle()
    expect(miRow).toBeNull()
  })
})

// ── 6. DELETE survey_media — last reference (no media_items for this key) ─────

describe('DELETE /api/surveys/[id]/media/[mediaId] — last reference', () => {
  it('deletes the row when no media_items references the same r2_key', async () => {
    // smIdSurveyOnly holds KEY_SURVEY_ONLY — never in media_items
    // (the media_items row created by copy-survey-media for KEY_SURVEY_ONLY was not deleted above)
    // We need to first delete that media_items row so this is truly the last reference
    await admin.from('media_items').delete().eq('r2_key', KEY_SURVEY_ONLY)

    const { status, body } = await api(
      'DELETE', `/api/surveys/${surveyId}/media/${smIdSurveyOnly}`, null, cookie
    )
    expect(status).toBe(200)
    expect(body.success).toBe(true)

    const { data: smRow } = await admin.from('survey_media').select('id').eq('id', smIdSurveyOnly).maybeSingle()
    expect(smRow).toBeNull()
  })
})

// ── 7. checkWhereImageIsUsed — cross-table reference count ────────────────────

describe('checkWhereImageIsUsed — reference counting via DB state', () => {
  // At this point in the run: KEY_A is only in survey_media (smIdA), all media_items deleted
  it('counts survey_media references correctly', async () => {
    const { data: smRows } = await admin
      .from('survey_media').select('id').eq('drive_file_id', KEY_A)
    const { data: miRows } = await admin
      .from('media_items').select('id').eq('r2_key', KEY_A)

    expect(smRows).toHaveLength(1)  // smIdA still exists
    expect(miRows).toHaveLength(0)  // miIdA was deleted in group 3
  })

  it('counts media_items references correctly', async () => {
    // KEY_B: both smIdB and miIdB are deleted at this point
    const { data: smRows } = await admin
      .from('survey_media').select('id').eq('drive_file_id', KEY_B)
    const { data: miRows } = await admin
      .from('media_items').select('id').eq('r2_key', KEY_B)

    expect(smRows).toHaveLength(0)
    expect(miRows).toHaveLength(0)
  })

  it('total count = 2 when both tables hold the same key', async () => {
    // Insert a media_items row for KEY_A (which still exists in survey_media)
    const { data: inserted } = await admin.from('media_items').insert({
      r2_key:       KEY_A,
      cdn_url:      FAKE_CDN(KEY_A),
      mime_type:    'image/webp',
      owner_type:   'quote_section',
      owner_id:     sectionId,
      document_type: 'quote',
      document_id:  quoteId,
      created_by:   userId,
      sort_order:   0,
    }).select('id').single()

    const { data: smRows } = await admin
      .from('survey_media').select('id').eq('drive_file_id', KEY_A)
    const { data: miRows } = await admin
      .from('media_items').select('id').eq('r2_key', KEY_A)

    expect(smRows.length + miRows.length).toBe(2)

    // Cleanup: remove the test media_items row we just added
    await admin.from('media_items').delete().eq('id', inserted.id)
  })
})
