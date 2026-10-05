import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request) {
  try {
    const serverClient = await createClient();
    const { data: { user: caller } } = await serverClient.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Bejelentkezés szükséges!' }, { status: 401 });

    const admin = createAdminClient();

    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Csak Superadmin törölhet entitást!' }, { status: 403 });
    }

    const { entityId } = await request.json();
    if (!entityId) return NextResponse.json({ error: 'entityId kötelező!' }, { status: 400 });

    // 1. Collect entity's projects to find child rows
    const { data: entityProjects } = await admin.from('projects').select('id').eq('entity_id', entityId);
    const projectIds = (entityProjects || []).map(p => p.id);

    // 2. Delete storage files for invoices belonging to these projects
    if (projectIds.length > 0) {
      const { data: invoiceRows } = await admin
        .from('invoices')
        .select('storage_path')
        .in('project_id', projectIds)
        .not('storage_path', 'is', null)
        .neq('storage_path', '');

      const paths = (invoiceRows || []).map(r => r.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await admin.storage.from('invoices').remove(paths);
      }
    }

    // 3. Delete all auth users belonging to the entity (cascades profiles + project_members)
    const { data: entityProfiles } = await admin.from('profiles').select('id').eq('entity_id', entityId);
    for (const profile of entityProfiles || []) {
      await admin.auth.admin.deleteUser(profile.id);
    }

    // 4. Delete child DB rows explicitly (in case FK cascades aren't set)
    if (projectIds.length > 0) {
      await admin.from('labour_entries').delete().in('project_id', projectIds);
      await admin.from('invoices').delete().in('project_id', projectIds);
      await admin.from('project_members').delete().in('project_id', projectIds);
      await admin.from('projects').delete().in('id', projectIds);
    }

    const { data: entityQuotes } = await admin.from('quotes').select('id').eq('entity_id', entityId);
    const quoteIds = (entityQuotes || []).map(q => q.id);
    if (quoteIds.length > 0) {
      await admin.from('quote_entries').delete().in('quote_id', quoteIds);
      await admin.from('quotes').delete().in('id', quoteIds);
    }

    await admin.from('clients').delete().eq('entity_id', entityId);

    // 5. Delete the entity itself
    const { error: entityErr } = await admin.from('entities').delete().eq('id', entityId);
    if (entityErr) throw entityErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('delete-entity error:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba' }, { status: 500 });
  }
}
