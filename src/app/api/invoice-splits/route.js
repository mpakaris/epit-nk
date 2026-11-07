import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT — replace all splits for one invoice
export async function PUT(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { invoice_id, splits } = await request.json();
  if (!invoice_id) return Response.json({ error: 'invoice_id kötelező' }, { status: 400 });

  const { data: invoice } = await admin.from('invoices').select('project_id').eq('id', invoice_id).is('deleted_at', null).single();
  if (!invoice) return Response.json({ error: 'Számla nem található' }, { status: 404 });

  // Permission: project owner, collective owner/admin, or superadmin
  if (profile.role !== 'superadmin') {
    const { data: project } = await admin.from('projects').select('owner_id, collective_id').eq('id', invoice.project_id).is('deleted_at', null).single();
    const isOwner = project?.owner_id === user.id;
    let isCollectiveAdmin = false;
    if (project?.collective_id) {
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', project.collective_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      isCollectiveAdmin = mem?.role === 'owner' || mem?.role === 'admin';
    }
    if (!isOwner && !isCollectiveAdmin) {
      return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
    }
  }

  await admin.from('invoice_section_splits').delete().eq('invoice_id', invoice_id);

  const rows = (splits || [])
    .filter(s => s.room_id && Number(s.amount_huf) > 0)
    .map(s => ({
      invoice_id,
      project_id: invoice.project_id,
      room_id:    s.room_id,
      amount_huf: Math.round(Number(s.amount_huf)),
      note:       s.note?.trim() || null,
    }));

  if (rows.length === 0) return Response.json({ splits: [] });

  const { data: saved, error } = await admin.from('invoice_section_splits').insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ splits: saved });
}
