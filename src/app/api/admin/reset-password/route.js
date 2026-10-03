import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const { userId, temporaryPassword = 'Epitek2026!' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'A felhasználó azonosító kötelező!' }, { status: 400 });
    }

    if (!temporaryPassword || temporaryPassword.length < 6) {
      return NextResponse.json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie!' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Update user in Supabase Auth with the new temporary password and flag must_change_password
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      user_metadata: {
        must_change_password: true
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Set must_change_password = true in public.profiles table
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      temporaryPassword
    });
  } catch (err) {
    console.error('Error in reset-password route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
