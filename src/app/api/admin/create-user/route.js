import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    // 1. Identify the caller
    const serverClient = await createClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: 'Bejelentkezés szükséges!' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Nincs jogosultsága!' }, { status: 403 });
    }

    const { displayName, email, password, role = 'user', entityId } = await request.json();

    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: 'Név, email cím és jelszó megadása kötelező!' },
        { status: 400 }
      );
    }

    // 2. Determine final entity_id and role based on caller's permissions
    let finalEntityId;
    let finalRole;

    if (callerProfile.role === 'superadmin') {
      finalEntityId = entityId || null;
      finalRole = role;
    } else {
      // Entity admin: can only create 'user' role within their own entity
      finalEntityId = callerProfile.entity_id;
      finalRole = 'user';
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: finalRole,
        entity_id: finalEntityId,
        must_change_password: true
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 4. Upsert profile (trigger should handle it, but upsert to be safe)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        display_name: displayName,
        role: finalRole,
        entity_id: finalEntityId,
        must_change_password: true
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
        role: finalRole,
        entity_id: finalEntityId,
        must_change_password: true
      }
    });
  } catch (err) {
    console.error('Error in create-user route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
