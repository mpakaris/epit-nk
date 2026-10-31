import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('owner_id, created_by, collective_id')
    .eq('id', id)
    .single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isSuperAdmin = profile?.role === 'superadmin';

  let isMember = false;
  if (!isOwner && !isSuperAdmin && quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isMember = !!mem;
  }

  if (!isOwner && !isSuperAdmin && !isMember)
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '10', 10), 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10), 0);

  const { data: history, count } = await admin
    .from('audit_logs')
    .select('id, user_name, action, details, created_at', { count: 'exact' })
    .eq('target_type', 'quote')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return Response.json({ history: history || [], total: count ?? 0 });
}
