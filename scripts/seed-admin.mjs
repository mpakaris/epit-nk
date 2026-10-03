import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const adminEmail = process.argv[2] || 'admin@epitek.hu';
const adminPassword = process.argv[3] || 'Admin1234!';
const adminName = process.argv[4] || 'Adminisztrátor';

async function seedAdmin() {
  console.log(`Setting up Admin user: ${adminEmail}...`);

  // 1. Check if user already exists
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const existing = usersData?.users?.find(u => u.email === adminEmail);

  let userId;

  if (existing) {
    console.log(`User ${adminEmail} already exists with id: ${existing.id}`);
    userId = existing.id;
  } else {
    // 2. Create in Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        display_name: adminName,
        role: 'admin',
        must_change_password: false
      }
    });

    if (authErr) {
      console.error('Error creating admin user:', authErr.message);
      process.exit(1);
    }

    userId = authData.user.id;
    console.log(`Created admin in auth.users with id: ${userId}`);
  }

  // 3. Upsert into public.profiles
  const { error: profErr } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      display_name: adminName,
      role: 'admin',
      must_change_password: false
    });

  if (profErr) {
    console.error('Error updating profiles table:', profErr.message);
    process.exit(1);
  }

  console.log(`✅ Admin account successfully configured!`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role:     admin`);
}

seedAdmin();
