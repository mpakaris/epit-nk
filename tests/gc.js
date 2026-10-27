/**
 * Garbage collection: hard-deletes all records created by the 3 test users.
 * Preserves the test user accounts and their collective membership.
 *
 * Run with: node tests/gc.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env.test', override: true })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getTestUserIds() {
  const emails = [
    process.env.TEST_SOLO_EMAIL,
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_MEMBER_EMAIL,
  ].filter(Boolean)

  const { data, error } = await admin.from('profiles').select('id').in('email', emails)
  if (error) throw new Error(`Could not fetch test user IDs: ${error.message}`)
  return (data || []).map(p => p.id)
}

async function gc() {
  const userIds = await getTestUserIds()
  if (userIds.length === 0) {
    console.log('No test users found — nothing to clean up.')
    return
  }
  console.log(`Test users: ${userIds.join(', ')}`)

  // 1. Find all test project IDs (needed to delete sub-records)
  const { data: projects } = await admin
    .from('projects').select('id').in('owner_id', userIds)
  const projectIds = (projects || []).map(p => p.id)

  // 2. Find all test quote IDs
  const { data: quotes } = await admin
    .from('quotes').select('id').in('owner_id', userIds)
  const quoteIds = (quotes || []).map(q => q.id)

  // 3. Find all test survey IDs
  const { data: surveys } = await admin
    .from('surveys').select('id').in('owner_id', userIds)
  const surveyIds = (surveys || []).map(s => s.id)

  let deleted = 0

  async function del(table, column, ids, label) {
    if (!ids || ids.length === 0) return
    const { error, count } = await admin.from(table).delete({ count: 'exact' }).in(column, ids)
    if (error) console.warn(`  ⚠ ${label}: ${error.message}`)
    else { deleted += count || 0; console.log(`  ✓ ${label}: ${count ?? '?'} rows`) }
  }

  async function delBy(table, column, ids, label) {
    if (!ids || ids.length === 0) return
    // Delete in batches of 200 to stay within PostgREST limits
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200)
      const { error, count } = await admin.from(table).delete({ count: 'exact' }).in(column, batch)
      if (error) console.warn(`  ⚠ ${label}: ${error.message}`)
      else { deleted += count || 0; if (i === 0) console.log(`  ✓ ${label}: ~${count ?? '?'} rows`) }
    }
  }

  console.log('\nDeleting project sub-records...')
  await delBy('diary_entries',   'project_id', projectIds, 'diary_entries')
  await delBy('invoices',        'project_id', projectIds, 'invoices')
  await delBy('labour_entries',  'project_id', projectIds, 'labour_entries')
  await delBy('project_members', 'project_id', projectIds, 'project_members')
  await delBy('project_rooms',   'project_id', projectIds, 'project_rooms')

  console.log('\nDeleting quote sub-records...')
  await delBy('quote_entries',  'quote_id', quoteIds, 'quote_entries')
  await delBy('quote_sections', 'quote_id', quoteIds, 'quote_sections')

  console.log('\nDeleting survey sub-records...')
  await delBy('survey_entries',  'survey_id', surveyIds, 'survey_entries')
  await delBy('survey_media',    'survey_id', surveyIds, 'survey_media')
  await delBy('survey_drawings', 'survey_id', surveyIds, 'survey_drawings')

  console.log('\nDeleting top-level records...')
  await del('projects', 'owner_id', userIds, 'projects')
  await del('quotes',   'owner_id', userIds, 'quotes')
  await del('surveys',  'owner_id', userIds, 'surveys')
  await del('clients',  'owner_id', userIds, 'clients')

  console.log('\nRestoring collective membership...')
  const { data: ownerProfile } = await admin
    .from('profiles').select('id').eq('email', process.env.TEST_OWNER_EMAIL).maybeSingle()
  const { data: memberProfile } = await admin
    .from('profiles').select('id').eq('email', process.env.TEST_MEMBER_EMAIL).maybeSingle()

  if (ownerProfile && memberProfile) {
    // Find the test collective
    const { data: rows } = await admin
      .from('collective_members')
      .select('collective_id, collectives!inner(is_inclusive)')
      .eq('user_id', ownerProfile.id)
      .eq('role', 'owner')
      .eq('status', 'active')
    const row = (rows || []).find(r => r.collectives?.is_inclusive === false)

    if (row) {
      const collectiveId = row.collective_id
      const { data: membership } = await admin
        .from('collective_members')
        .select('id, status')
        .eq('collective_id', collectiveId)
        .eq('user_id', memberProfile.id)
        .maybeSingle()

      if (!membership) {
        await admin.from('collective_members').insert({
          collective_id: collectiveId,
          user_id:       memberProfile.id,
          role:          'contributor',
          status:        'active',
        })
        console.log('  ✓ Re-added member to collective')
      } else if (membership.status !== 'active') {
        await admin.from('collective_members').update({ status: 'active' }).eq('id', membership.id)
        console.log('  ✓ Re-activated member in collective')
      } else {
        console.log('  ✓ Member already in collective — no change')
      }
    }
  }

  console.log(`\n✅ GC complete. ~${deleted} total rows removed.\n`)
}

gc().catch(err => { console.error(err); process.exit(1) })
