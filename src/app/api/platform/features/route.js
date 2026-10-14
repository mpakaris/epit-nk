import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { r2PublicUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// Public GET — landing page reads this
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('platform_feature_images')
    .select('slot_index, image_id, image_url')
    .order('slot_index');
  return Response.json({ slots: data || [] });
}

// PUT — superadmin only, body: { slot_index, image_id }
export async function PUT(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { slot_index, image_id } = await request.json();
  if (slot_index == null || slot_index < 0 || slot_index > 6)
    return Response.json({ error: 'slot_index 0–6 required' }, { status: 400 });

  let image_url = null;
  if (image_id) {
    const { data: img } = await admin.from('image_library').select('r2_key').eq('id', image_id).single();
    if (img) image_url = r2PublicUrl(img.r2_key);
  }

  const { data, error } = await admin
    .from('platform_feature_images')
    .upsert({ slot_index, image_id: image_id || null, image_url, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ slot: data });
}
