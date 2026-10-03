import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  console.log('Testing connection to Supabase...');
  
  // 1. Check profiles table
  const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('*').limit(1);
  if (profErr) {
    console.log('❌ profiles table error:', profErr.message, profErr.code);
  } else {
    console.log('✅ profiles table exists! Count:', profiles.length);
  }

  // 2. Check projects table
  const { data: projects, error: projErr } = await supabaseAdmin.from('projects').select('*').limit(1);
  if (projErr) {
    console.log('❌ projects table error:', projErr.message);
  } else {
    console.log('✅ projects table exists! Count:', projects.length);
  }

  // 3. Check storage bucket
  const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
  if (bErr) {
    console.log('❌ Storage error:', bErr.message);
  } else {
    console.log('✅ Buckets:', buckets.map(b => b.name));
  }

  // 4. Check users
  const { data: usersData, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
  if (uErr) {
    console.log('❌ List users error:', uErr.message);
  } else {
    console.log('✅ Auth users count:', usersData.users.length);
  }
}

check();
