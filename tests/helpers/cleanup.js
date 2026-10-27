/**
 * Full teardown of all test data.
 * Safe deletion order based on FK constraints:
 *   1. Sub-records (no FK depedencies outward)
 *   2. Top-level owned records (frees owner_id references to profiles)
 *   3. Collectives — CASCADE auto-removes collective_members
 *   4. Auth users — CASCADE removes profiles → remaining memberships
 */

import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getTestUserIds(admin) {
  const emails = [
    process.env.TEST_SOLO_EMAIL,
    process.env.TEST_OWNER_EMAIL,
    process.env.TEST_MEMBER_EMAIL,
  ].filter(Boolean)

  const { data } = await admin.from('profiles').select('id').in('email', emails)
  return (data || []).map(p => p.id)
}

async function del(admin, table, column, ids, label) {
  if (!ids?.length) return 0
  for (let i = 0; i < ids.length; i += 200) {
    const { error, count } = await admin
      .from(table).delete({ count: 'exact' }).in(column, ids.slice(i, i + 200))
    if (error) console.warn(`  ⚠ ${label}: ${error.message}`)
    else if (i === 0) console.log(`  ✓ ${label}: ${count ?? '?'} rows`)
  }
}

async function cleanRecords(admin, userIds) {
  const [{ data: projects }, { data: quotes }, { data: surveys }] = await Promise.all([
    admin.from('projects').select('id').in('owner_id', userIds),
    admin.from('quotes').select('id').in('owner_id', userIds),
    admin.from('surveys').select('id').in('owner_id', userIds),
  ])
  const projectIds = (projects || []).map(p => p.id)
  const quoteIds   = (quotes   || []).map(q => q.id)
  const surveyIds  = (surveys  || []).map(s => s.id)

  console.log('\nSub-records:')
  await del(admin, 'transfer_requests', 'from_user_id', userIds,    'transfer_requests')
  await del(admin, 'diary_entries',     'project_id',   projectIds, 'diary_entries')
  await del(admin, 'invoices',          'project_id',   projectIds, 'invoices')
  await del(admin, 'labour_entries',    'project_id',   projectIds, 'labour_entries')
  await del(admin, 'project_members',   'project_id',   projectIds, 'project_members')
  await del(admin, 'project_rooms',     'project_id',   projectIds, 'project_rooms')
  await del(admin, 'quote_entries',     'quote_id',     quoteIds,   'quote_entries')
  await del(admin, 'quote_sections',    'quote_id',     quoteIds,   'quote_sections')
  await del(admin, 'survey_entries',    'survey_id',    surveyIds,  'survey_entries')
  await del(admin, 'survey_media',      'survey_id',    surveyIds,  'survey_media')
  await del(admin, 'survey_drawings',   'survey_id',    surveyIds,  'survey_drawings')

  console.log('\nTop-level records:')
  await del(admin, 'projects', 'owner_id', userIds, 'projects')
  await del(admin, 'quotes',   'owner_id', userIds, 'quotes')
  await del(admin, 'surveys',  'owner_id', userIds, 'surveys')
  await del(admin, 'clients',  'owner_id', userIds, 'clients')
}

// Pre-test: wipe only records, keep users + collectives so tests can sign in.
export async function cleanRecordsOnly() {
  const admin = makeAdmin()
  const userIds = await getTestUserIds(admin)
  if (!userIds.length) { console.log('No test users found — skipping.'); return }
  console.log(`Test users: ${userIds.join(', ')}`)
  await cleanRecords(admin, userIds)
  console.log('\n✅ Record cleanup done.\n')
}

// Post-test: wipe everything — records, collectives, and auth users.
export async function fullCleanup() {
  const admin = makeAdmin()
  const userIds = await getTestUserIds(admin)
  if (!userIds.length) { console.log('No test users found — nothing to clean.'); return }
  console.log(`Test users: ${userIds.join(', ')}`)

  await cleanRecords(admin, userIds)

  // Collectives (CASCADE removes collective_members)
  const { data: ownedMemberships } = await admin
    .from('collective_members').select('collective_id')
    .in('user_id', userIds).eq('role', 'owner')
  const collectiveIds = [...new Set((ownedMemberships || []).map(m => m.collective_id))]
  console.log('\nCollectives:')
  await del(admin, 'collectives', 'id', collectiveIds, 'collectives + memberships (cascade)')

  // Auth users (CASCADE removes profiles + remaining memberships)
  console.log('\nAuth users:')
  for (const uid of userIds) {
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) console.warn(`  ⚠ deleteUser ${uid}: ${error.message}`)
    else       console.log(`  ✓ deleted user ${uid}`)
  }

  console.log('\n✅ Cleanup complete.\n')
}
