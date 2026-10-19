import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action } = body;
  if (!['accepted', 'rejected'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify quote exists and belongs to a client with this email
  const { data: quote } = await admin
    .from('quotes')
    .select('id, client_id, status')
    .eq('id', id)
    .single();

  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  if (!['sent', 'accepted', 'rejected'].includes(quote.status)) {
    return Response.json({ error: 'Ez az ajánlat nem módosítható' }, { status: 400 });
  }

  // Auth check: client record email must match portal user
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('id', quote.client_id)
    .ilike('email', user.email.toLowerCase())
    .single();

  if (!client) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { error: updateErr } = await admin
    .from('quotes')
    .update({ status: action })
    .eq('id', id);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ ok: true, status: action });
}
