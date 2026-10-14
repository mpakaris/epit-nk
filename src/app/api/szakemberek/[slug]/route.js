import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FREE_TYPES = ['hero', 'about', 'services', 'contact'];

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get('preview') === '1';

  const admin = createAdminClient();

  // Select without is_premium — column may not exist until migration 041 is applied
  let query = admin
    .from('user_websites')
    .select('id, slug, status, user_id, theme, published_at, trade:trades(name_hu)')
    .eq('slug', slug);

  if (!isPreview) {
    query = query.eq('status', 'published');
  }

  const { data: website } = await query.maybeSingle();
  if (!website) return Response.json({ error: 'Nem található' }, { status: 404 });

  if (isPreview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== website.user_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Fetch is_premium separately — gracefully falls back to false if column missing
  let isPremium = false;
  try {
    const { data } = await admin
      .from('user_websites')
      .select('is_premium')
      .eq('id', website.id)
      .single();
    isPremium = data?.is_premium ?? false;
  } catch { /* migration 041 not yet applied */ }

  let sectionsQuery = admin
    .from('website_sections')
    .select('section_type, enabled, content, order_index')
    .eq('website_id', website.id)
    .eq('enabled', true)
    .order('order_index');

  // On the live public page, strip premium-only sections for non-premium websites
  if (!isPreview && !isPremium) {
    sectionsQuery = sectionsQuery.in('section_type', FREE_TYPES);
  }

  const [sectionsRes, profileRes] = await Promise.all([
    sectionsQuery,
    admin.from('profiles').select('display_name').eq('id', website.user_id).single(),
  ]);

  return Response.json({
    website: { ...website, is_premium: isPremium, owner_name: profileRes.data?.display_name },
    sections: sectionsRes.data || [],
  });
}
