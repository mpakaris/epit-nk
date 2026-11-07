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
      return NextResponse.json({ error: 'Csak Superadmin törölhet kollektívát!' }, { status: 403 });
    }

    const { entityId } = await request.json();
    if (!entityId) return NextResponse.json({ error: 'entityId kötelező!' }, { status: 400 });

    // 1. Collect collective's projects to find child rows
    const { data: collectiveProjects } = await admin.from('projects').select('id').eq('collective_id', entityId);
    const projectIds = (collectiveProjects || []).map(p => p.id);

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

    // 3. Delete child DB rows explicitly (sub-records may be hard-deleted per CLAUDE.md §4)
    if (projectIds.length > 0) {
      await admin.from('labour_entries').delete().in('project_id', projectIds);
      await admin.from('invoices').delete().in('project_id', projectIds);
      await admin.from('project_members').delete().in('project_id', projectIds);
      await admin.from('projects').delete().in('id', projectIds);
    }

    const { data: collectiveQuotes } = await admin.from('quotes').select('id').eq('collective_id', entityId);
    const quoteIds = (collectiveQuotes || []).map(q => q.id);
    if (quoteIds.length > 0) {
      await admin.from('quote_entries').delete().in('quote_id', quoteIds);
      await admin.from('quotes').delete().in('id', quoteIds);
    }

    const { data: collectiveSurveys } = await admin.from('surveys').select('id').eq('collective_id', entityId);
    const surveyIds = (collectiveSurveys || []).map(s => s.id);
    if (surveyIds.length > 0) {
      await admin.from('surveys').delete().in('id', surveyIds);
    }

    // 4. Remove all collective members (sub-records, hard delete is correct)
    await admin.from('collective_members').delete().eq('collective_id', entityId);

    // 5. Delete the collective itself
    const { error: collectiveErr } = await admin.from('collectives').delete().eq('id', entityId);
    if (collectiveErr) throw collectiveErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('delete-entity error:', err);
    return NextResponse.json({ error: err.message || 'Szerverhiba' }, { status: 500 });
  }
}
