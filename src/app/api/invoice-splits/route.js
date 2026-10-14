import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT — replace all splits for one invoice
export async function PUT(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return Response.json({ error: 'Nincs jogosultság' }, { status: 403 });
  }

  const { invoice_id, splits } = await request.json();
  if (!invoice_id) return Response.json({ error: 'invoice_id kötelező' }, { status: 400 });

  const { data: invoice } = await admin.from('invoices').select('project_id').eq('id', invoice_id).single();
  if (!invoice) return Response.json({ error: 'Számla nem található' }, { status: 404 });

  // Delete all existing splits for this invoice, then insert new ones
  await admin.from('invoice_section_splits').delete().eq('invoice_id', invoice_id);

  const rows = (splits || [])
    .filter(s => s.room_id && Number(s.amount_huf) > 0)
    .map(s => ({
      invoice_id,
      project_id: invoice.project_id,
      room_id: s.room_id,
      amount_huf: Math.round(Number(s.amount_huf)),
      note: s.note?.trim() || null,
    }));

  if (rows.length === 0) return Response.json({ splits: [] });

  const { data: saved, error } = await admin.from('invoice_section_splits').insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ splits: saved });
}
