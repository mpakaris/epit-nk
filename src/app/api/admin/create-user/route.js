import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  try {
    const serverClient = await createClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Bejelentkezés szükséges!' }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, active_collective_id, display_name')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role))
      return NextResponse.json({ error: 'Nincs jogosultsága!' }, { status: 403 });

    const { displayName, email, password, role = 'user', collectiveId } = await request.json();

    if (!displayName || !email || !password)
      return NextResponse.json({ error: 'Név, email cím és jelszó megadása kötelező!' }, { status: 400 });

    let finalCollectiveId;
    let finalRole;

    if (callerProfile.role === 'superadmin') {
      finalCollectiveId = collectiveId || null;
      finalRole = role;
    } else {
      // Admin: adds user to their currently active collective
      finalCollectiveId = callerProfile.active_collective_id || null;
      finalRole = role === 'admin' ? 'admin' : 'user';
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name:       displayName,
        role:               finalRole,
        collective_id:      finalCollectiveId,
        must_change_password: true,
      },
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Upsert profile as safety net (trigger should handle it)
    await adminClient.from('profiles').upsert({
      id:                   authData.user.id,
      email,
      display_name:         displayName,
      role:                 finalRole,
      active_collective_id: finalCollectiveId,
      must_change_password: true,
    });

    logAudit({
      entityId: finalCollectiveId || caller.id,
      userId:   caller.id,
      userName: callerProfile.display_name,
      action:   'Felhasználó létrehozva',
      targetType: 'user',
      targetId:   authData.user.id,
      targetName: displayName,
      details: { email, role: finalRole },
    });

    return NextResponse.json({
      success: true,
      user: {
        id:                   authData.user.id,
        email,
        display_name:         displayName,
        role:                 finalRole,
        active_collective_id: finalCollectiveId,
        must_change_password: true,
      },
    });
  } catch (err) {
    console.error('Error in create-user route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
