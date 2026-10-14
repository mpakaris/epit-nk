import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get('preview') === '1';

  const admin = createAdminClient();

  let query = admin
    .from('user_websites')
    .select('id, slug, status, user_id, theme, published_at, trade:trades(name_hu)')
    .eq('slug', slug);

  if (!isPreview) {
    // Public: only show published pages
    query = query.eq('status', 'published');
  }

  const { data: website } = await query.maybeSingle();
  if (!website) return Response.json({ error: 'Nem található' }, { status: 404 });

  // Preview mode: verify the requesting user is the owner
  if (isPreview) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== website.user_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const [sectionsRes, profileRes] = await Promise.all([
    admin
      .from('website_sections')
      .select('section_type, enabled, content, order_index')
      .eq('website_id', website.id)
      .eq('enabled', true)
      .order('order_index'),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', website.user_id)
      .single(),
  ]);

  return Response.json({
    website: { ...website, owner_name: profileRes.data?.display_name },
    sections: sectionsRes.data || [],
  });
}
