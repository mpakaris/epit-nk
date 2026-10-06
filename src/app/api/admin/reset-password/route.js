import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const serverClient = await createClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Bejelentkezés szükséges!' }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: callerProfile } = await adminClient
      .from('profiles').select('role, entity_id').eq('id', caller.id).single();

    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role))
      return NextResponse.json({ error: 'Nincs jogosultsága!' }, { status: 403 });

    const { userId, temporaryPassword = 'Epitek2026!' } = await request.json();
    if (!userId) return NextResponse.json({ error: 'A felhasználó azonosító kötelező!' }, { status: 400 });
    if (!temporaryPassword || temporaryPassword.length < 6)
      return NextResponse.json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie!' }, { status: 400 });

    const { data: targetProfile } = await adminClient
      .from('profiles').select('role, entity_id').eq('id', userId).single();

    if (!targetProfile) return NextResponse.json({ error: 'A felhasználó nem található!' }, { status: 404 });

    // Entity admin can only reset passwords of users in their own entity
    if (callerProfile.role !== 'superadmin') {
      if (targetProfile.entity_id !== callerProfile.entity_id)
        return NextResponse.json({ error: 'Nincs jogosultsága más entitás felhasználójának jelszóvisszaállításához!' }, { status: 403 });
      if (targetProfile.role === 'admin')
        return NextResponse.json({ error: 'Admin jelszavát csak Superadmin állíthatja vissza!' }, { status: 403 });
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      user_metadata: { must_change_password: true }
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: profileError } = await adminClient
      .from('profiles').update({ must_change_password: true }).eq('id', userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

    return NextResponse.json({ success: true, temporaryPassword });
  } catch (err) {
    console.error('Error in reset-password route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
