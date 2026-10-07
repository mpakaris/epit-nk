import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function DELETE(request) {
  try {
    const serverClient = await createClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Bejelentkezés szükséges!' }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: callerProfile } = await adminClient
      .from('profiles').select('role, entity_id').eq('id', caller.id).single();

    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role))
      return NextResponse.json({ error: 'Nincs jogosultsága!' }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Felhasználó azonosító kötelező!' }, { status: 400 });

    const { data: targetProfile } = await adminClient
      .from('profiles').select('role, entity_id, display_name').eq('id', userId).single();

    if (!targetProfile) return NextResponse.json({ error: 'A felhasználó nem található!' }, { status: 404 });

    // Superadmin can delete anyone except other superadmins
    if (callerProfile.role === 'superadmin') {
      if (targetProfile.role === 'superadmin')
        return NextResponse.json({ error: 'Superadmin nem törölhető!' }, { status: 403 });
    } else {
      // Entity admin can only delete users in their own entity (and not admins)
      if (targetProfile.entity_id !== callerProfile.entity_id)
        return NextResponse.json({ error: 'Nincs jogosultsága más entitás felhasználójának törléséhez!' }, { status: 403 });
      if (targetProfile.role === 'admin')
        return NextResponse.json({ error: 'Admin fiókot csak Superadmin törölhet!' }, { status: 403 });
    }

    if (userId === caller.id)
      return NextResponse.json({ error: 'Saját fiókját nem törölheti!' }, { status: 400 });

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    logAudit({
      entityId: targetProfile.entity_id,
      userId: caller.id,
      userName: callerProfile.display_name || caller.email,
      action: 'Felhasználó törölve',
      targetType: 'user',
      targetId: userId,
      targetName: targetProfile.display_name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in delete-user route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
