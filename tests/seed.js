/**
 * One-time setup: creates the 3 permanent test users + collective.
 * Safe to re-run — existing users and memberships are left untouched.
 *
 * Run with: node tests/seed.js
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

const USERS = [
  {
    email:    process.env.TEST_SOLO_EMAIL,
    password: process.env.TEST_SOLO_PASSWORD,
    name:     'Test Solo',
    premium:  true,
  },
  {
    email:    process.env.TEST_OWNER_EMAIL,
    password: process.env.TEST_OWNER_PASSWORD,
    name:     'Test Owner',
    premium:  true,
  },
  {
    email:    process.env.TEST_MEMBER_EMAIL,
    password: process.env.TEST_MEMBER_PASSWORD,
    name:     'Test Member',
    premium:  false,
  },
]

async function ensureUser({ email, password, name, premium }) {
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()

  let userId
  if (existing) {
    userId = existing.id
    console.log(`  ✓ ${email} already exists (${userId})`)
  } else {
    const { data: authUser, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
    if (error) throw new Error(`Failed to create ${email}: ${error.message}`)
    userId = authUser.user.id
    // Wait for the handle_new_user DB trigger to create the profile row
    await new Promise(r => setTimeout(r, 1500))
    console.log(`  ✓ Created ${email} (${userId})`)
  }

  await admin.from('profiles').update({
    display_name:           name,
    is_subscription_premium: premium,
    subscription_tier:       premium ? 'premium' : 'basic',
    must_change_password:    false,
    gdpr_consented_at:       new Date().toISOString(),
  }).eq('id', userId)

  return userId
}

async function ensureCollective(ownerEmail, memberEmail) {
  const [{ data: ownerProfile }, { data: memberProfile }] = await Promise.all([
    admin.from('profiles').select('id').eq('email', ownerEmail).single(),
    admin.from('profiles').select('id').eq('email', memberEmail).single(),
  ])
  if (!ownerProfile || !memberProfile) throw new Error('Could not find test user profiles')

  const ownerId  = ownerProfile.id
  const memberId = memberProfile.id

  // Find existing non-inclusive collective owned by test owner
  const { data: existingRows } = await admin
    .from('collective_members')
    .select('collective_id, collectives!inner(id, name, is_inclusive)')
    .eq('user_id', ownerId)
    .eq('role', 'owner')
    .eq('status', 'active')

  const existing = (existingRows || []).find(r => r.collectives?.is_inclusive === false)
  let collectiveId

  if (existing) {
    collectiveId = existing.collective_id
    console.log(`  ✓ Collective already exists (${collectiveId})`)
  } else {
    const { data: coll, error } = await admin
      .from('collectives')
      .insert({ name: 'Test Collective', is_inclusive: false })
      .select()
      .single()
    if (error) throw new Error(`Failed to create collective: ${error.message}`)
    collectiveId = coll.id

    await admin.from('collective_members').insert({
      collective_id: collectiveId,
      user_id:       ownerId,
      role:          'owner',
      status:        'active',
    })
    console.log(`  ✓ Created collective (${collectiveId}) and added owner`)
  }

  // Ensure member is in the collective
  const { data: existingMembership } = await admin
    .from('collective_members')
    .select('id, status')
    .eq('collective_id', collectiveId)
    .eq('user_id', memberId)
    .maybeSingle()

  if (existingMembership) {
    if (existingMembership.status !== 'active') {
      await admin.from('collective_members').update({ status: 'active' }).eq('id', existingMembership.id)
      console.log(`  ✓ Re-activated member (${memberId})`)
    } else {
      console.log(`  ✓ Member already in collective`)
    }
  } else {
    await admin.from('collective_members').insert({
      collective_id: collectiveId,
      user_id:       memberId,
      role:          'contributor',
      status:        'active',
    })
    console.log(`  ✓ Added member to collective`)
  }

  return collectiveId
}

async function main() {
  console.log('\n── Test User Seed ──────────────────────────')

  if (!process.env.TEST_SOLO_EMAIL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars. Add TEST_* and SUPABASE_SERVICE_ROLE_KEY to .env.local or .env.test')
    process.exit(1)
  }

  console.log('\nUsers:')
  for (const u of USERS) await ensureUser(u)

  console.log('\nCollective:')
  const collectiveId = await ensureCollective(process.env.TEST_OWNER_EMAIL, process.env.TEST_MEMBER_EMAIL)

  console.log(`\n✅ Seed complete. Collective ID: ${collectiveId}`)
  console.log('────────────────────────────────────────────\n')
}

main().catch(err => { console.error(err); process.exit(1) })
