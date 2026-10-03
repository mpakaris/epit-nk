import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const { displayName, email, password, role = 'user' } = await request.json();

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: 'Név, email cím és jelszó megadása kötelező!' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: role,
        must_change_password: true
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Ensure profile exists in profiles table
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        display_name: displayName,
        role: role,
        must_change_password: true,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        display_name: displayName,
        role,
        must_change_password: true
      }
    });
  } catch (err) {
    console.error('Error in create-user route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
