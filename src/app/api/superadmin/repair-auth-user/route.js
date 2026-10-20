import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  // Superadmin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (callerProfile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { email } = await request.json().catch(() => ({}));
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  // 1. Find the orphaned profile
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, email, display_name, role')
    .ilike('email', email.trim())
    .maybeSingle();

  if (profileErr || !profile) {
    return Response.json({ error: 'No profile found with that email' }, { status: 404 });
  }

  // 2. Check if auth user already exists for this UUID
  const { data: existingAuth } = await admin.auth.admin.getUserById(profile.id);

  if (existingAuth?.user) {
    const authEmail = existingAuth.user.email;
    const profileEmail = profile.email;

    // Emails match — nothing to fix
    if (authEmail?.toLowerCase() === profileEmail?.toLowerCase()) {
      return Response.json({ error: `Auth user already exists with matching email (${authEmail}). No repair needed.` }, { status: 409 });
    }

    // Email mismatch — sync auth email to match the profile
    const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(profile.id, {
      email: profileEmail,
      email_confirm: true,
    });

    if (updateErr) {
      return Response.json({ error: `Email mismatch detected (auth: ${authEmail} → profile: ${profileEmail}) but update failed: ${updateErr.message}` }, { status: 500 });
    }

    return Response.json({
      ok: true,
      userId: updated.user.id,
      email: updated.user.email,
      message: `Email mismatch fixed: auth was "${authEmail}", updated to match profile "${profileEmail}".`,
    });
  }

  // 3. No auth user at all — create with the exact same UUID as the profile
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    id: profile.id,
    email: profile.email,
    email_confirm: true,
    user_metadata: { display_name: profile.display_name },
  });

  if (createErr) {
    return Response.json({ error: createErr.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    userId: created.user.id,
    email: created.user.email,
    message: 'Auth user created and linked to existing profile.',
  });
}
