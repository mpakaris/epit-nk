import { createAdminClient } from '@/lib/supabase/admin';
import { r2PublicUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('image_library')
    .select('id, r2_key, orientation')
    .eq('is_platform_hero', true)
    .limit(1)
    .maybeSingle();

  if (!data) return Response.json({ url: null });
  return Response.json({ url: r2PublicUrl(data.r2_key) });
}
