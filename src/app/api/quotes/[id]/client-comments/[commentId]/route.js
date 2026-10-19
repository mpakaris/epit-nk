import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH — toggle resolved
export async function PATCH(request, { params }) {
  const { id, commentId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('owner_id, shared_with').eq('id', id).single();
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const canAccess = profile?.role === 'superadmin'
    || quote.owner_id === user.id
    || (quote.shared_with || []).includes(user.id);
  if (!canAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: existing } = await admin
    .from('quote_client_comments')
    .select('id, resolved_at')
    .eq('id', commentId)
    .eq('quote_id', id)
    .single();
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  // Toggle: if already resolved → unresolve; if open → resolve
  const patch = existing.resolved_at
    ? { resolved_at: null, resolved_by: null }
    : { resolved_at: new Date().toISOString(), resolved_by: user.id };

  const { data: updated, error } = await admin
    .from('quote_client_comments')
    .update(patch)
    .eq('id', commentId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ comment: updated });
}
