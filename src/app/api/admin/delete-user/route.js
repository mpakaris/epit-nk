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
      .from('profiles').select('role, active_collective_id, display_name').eq('id', caller.id).single();

    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role))
      return NextResponse.json({ error: 'Nincs jogosultsága!' }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Felhasználó azonosító kötelező!' }, { status: 400 });

    if (userId === caller.id)
      return NextResponse.json({ error: 'Saját fiókját nem törölheti!' }, { status: 400 });

    const { data: targetProfile } = await adminClient
      .from('profiles').select('role, display_name').eq('id', userId).single();

    if (!targetProfile) return NextResponse.json({ error: 'A felhasználó nem található!' }, { status: 404 });

    if (callerProfile.role === 'superadmin') {
      if (targetProfile.role === 'superadmin')
        return NextResponse.json({ error: 'Superadmin nem távolítható el!' }, { status: 403 });
    } else {
      // Admin can only delete users in their active collective
      if (callerProfile.active_collective_id) {
        const { data: mem } = await adminClient.from('collective_members')
          .select('user_id').eq('collective_id', callerProfile.active_collective_id).eq('user_id', userId).eq('status', 'active').maybeSingle();
        if (!mem) return NextResponse.json({ error: 'Nincs jogosultsága más kollektíva felhasználójához!' }, { status: 403 });
      }
      if (targetProfile.role === 'admin')
        return NextResponse.json({ error: 'Admin fiókot csak Superadmin távolíthat el!' }, { status: 403 });
    }

    // ── Find all projects this user is a member of ────────────────────────────
    const { data: memberships } = await adminClient
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    const projectIds = (memberships || []).map(m => m.project_id);

    // For each project count how many members it has
    const soloProjectIds = [];
    const sharedProjectIds = [];

    if (projectIds.length > 0) {
      const { data: allMemberships } = await adminClient
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds);

      const memberCountByProject = {};
      for (const row of (allMemberships || [])) {
        memberCountByProject[row.project_id] = (memberCountByProject[row.project_id] || 0) + 1;
      }

      for (const pid of projectIds) {
        if ((memberCountByProject[pid] || 1) <= 1) soloProjectIds.push(pid);
        else sharedProjectIds.push(pid);
      }
    }

    // ── Delete solo projects (invoices + labour cascade automatically) ─────────
    if (soloProjectIds.length > 0) {
      await adminClient.from('projects').delete().in('id', soloProjectIds);
    }

    // ── Soft-delete the profile ───────────────────────────────────────────────
    await adminClient
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    // ── Ban the auth user (prevents login) ───────────────────────────────────
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: '876000h' });

    logAudit({
      entityId: callerProfile.active_collective_id || caller.id,
      userId: caller.id,
      userName: callerProfile.display_name || caller.email,
      action: 'Tag kiléptetése',
      targetType: 'user',
      targetId: userId,
      targetName: targetProfile.display_name,
      details: {
        soloProjectsDeleted: soloProjectIds.length,
        sharedProjectsKept: sharedProjectIds.length,
      },
    });

    return NextResponse.json({
      success: true,
      soloProjectsDeleted: soloProjectIds.length,
      sharedProjectsKept: sharedProjectIds.length,
    });
  } catch (err) {
    console.error('Error in delete-user route:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba történt' }, { status: 500 });
  }
}
