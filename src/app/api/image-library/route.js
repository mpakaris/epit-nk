import { createAdminClient } from '@/lib/supabase/admin';
import { r2PublicUrl } from '@/lib/r2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tradeId     = searchParams.get('trade_id');
  const orientation = searchParams.get('orientation');

  const admin = createAdminClient();
  let query = admin
    .from('image_library')
    .select('id, trade_id, r2_key, orientation, alt_text')
    .eq('is_platform_only', false)   // never expose superadmin-internal images to users
    .order('created_at', { ascending: false });

  if (tradeId === 'generic') query = query.is('trade_id', null);
  else if (tradeId)          query = query.eq('trade_id', tradeId);
  if (orientation)           query = query.eq('orientation', orientation);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    images: (data || []).map(img => ({ ...img, url: r2PublicUrl(img.r2_key) })),
  });
}
