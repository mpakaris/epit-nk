import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trades')
    .select('id, name_hu, slug_prefix')
    .order('order_index');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ trades: data });
}
