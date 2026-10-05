import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const env = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  }
} catch {
  console.error('Could not read .env.local');
  process.exit(1);
}

const url        = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const targetEmail = process.argv[2] || env.SUPERADMIN_EMAIL || 'info@mppm-consulting.com';

async function promote() {
  console.log(`\nPromoting ${targetEmail} to superadmin...\n`);

  // 1. Find auth user by email
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('Error listing users:', listErr.message); process.exit(1); }

  const authUser = users.find(u => u.email === targetEmail);
  if (!authUser) {
    console.error(`No auth user found with email: ${targetEmail}`);
    console.log('\nHint: Create the user in Supabase Auth dashboard first, then re-run this script.');
    process.exit(1);
  }

  console.log(`Found user: ${authUser.id} (${authUser.email})`);

  // 2. Check if role column allows 'superadmin' (migration 005 required)
  const { data: checkData, error: checkErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (checkErr && checkErr.code !== 'PGRST116') {
    console.error('Error reading profile:', checkErr.message);
    console.log('\nHint: Run migration 005_multi_tenant_fresh_start.sql in Supabase SQL Editor first.');
    process.exit(1);
  }

  // 3. Upsert profile with superadmin role
  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert({
      id:                   authUser.id,
      display_name:         authUser.user_metadata?.display_name || authUser.email.split('@')[0],
      role:                 'superadmin',
      entity_id:            null,
      must_change_password: false
    }, { onConflict: 'id' });

  if (upsertErr) {
    if (upsertErr.message?.includes('violates check constraint')) {
      console.error('\n❌  The "superadmin" role is not allowed yet.');
      console.log('   Run supabase/migrations/005_multi_tenant_fresh_start.sql in your Supabase SQL Editor first.');
      console.log('   ⚠️  WARNING: That migration drops all existing data.');
    } else {
      console.error('Error updating profile:', upsertErr.message);
    }
    process.exit(1);
  }

  console.log(`\n✅  ${targetEmail} is now superadmin.`);
  console.log(`   Role:      superadmin`);
  console.log(`   Entity:    none (global access)`);
  console.log('\nLog out and log back in to apply the new role.\n');
}

promote();
