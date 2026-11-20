import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const admin = createAdminClient();
  const locale = new URL(request.url).searchParams.get('locale') || 'hu';
  const { data, error } = await admin
    .from('trades')
    .select('id, name_hu, slug_prefix')
    .order('order_index');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const trades = (data || []).map(t => ({
    id: t.id,
    slug_prefix: t.slug_prefix,
    name: t.name_hu,
    name_hu: t.name_hu,
  }));
  return Response.json({ trades });
}
