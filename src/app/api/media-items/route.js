import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/media-items?document_type=project&document_id=X
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const documentType = searchParams.get('document_type');
  const documentId   = searchParams.get('document_id');
  if (!documentType || !documentId) return Response.json({ error: 'document_type and document_id required' }, { status: 400 });

  const admin = createAdminClient();

  // Verify user has access to the parent document
  const table = documentType === 'quote' ? 'quotes' : 'projects';
  const { data: doc } = await admin
    .from(table).select('owner_id, created_by, collective_id').eq('id', documentId).single();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

  const isOwner = doc.owner_id === user.id || doc.created_by === user.id;
  if (!isOwner) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') {
      if (!doc.collective_id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { data: mem } = await admin.from('collective_members')
        .select('role').eq('collective_id', doc.collective_id)
        .eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!mem) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data: items, error } = await admin
    .from('media_items')
    .select('id, r2_key, cdn_url, thumbnail_url, mime_type, file_size_kb, portal_visible, created_at, sort_order')
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mediaItems: items || [] });
}
