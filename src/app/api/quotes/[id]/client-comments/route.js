import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Verify caller can access this quote (owner, shared, or superadmin)
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const { data: quote }   = await admin.from('quotes').select('owner_id, created_by, collective_id, shared_with').eq('id', id).single();

  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const isShared = (quote.shared_with || []).includes(user.id);
  let canAccess = profile?.role === 'superadmin' || isOwner || isShared;

  if (!canAccess && quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    canAccess = !!mem;
  }

  if (!canAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: comments, error } = await admin
    .from('quote_client_comments')
    .select('id, action, comment, client_email, client_name, resolved_at, resolved_by, created_at')
    .eq('quote_id', id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ comments: comments || [] });
}
