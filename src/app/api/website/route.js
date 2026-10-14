import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SECTION_ORDER = [
  'hero', 'about', 'services', 'certifications', 'gallery',
  'pricing', 'testimonials', 'faq', 'service_area', 'contact',
];
const FREE_SECTIONS = new Set(['hero', 'about', 'services', 'contact']);

function buildDefaultSections(websiteId) {
  return SECTION_ORDER.map((type, i) => ({
    website_id: websiteId,
    section_type: type,
    enabled: FREE_SECTIONS.has(type),
    content: {},
    order_index: i,
  }));
}

async function getAuthedUser(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthedUser(supabase, null);
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: website } = await admin
    .from('user_websites')
    .select('*, trade:trades(id, name_hu, slug_prefix)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!website) return Response.json({ website: null, sections: [] });

  const { data: sections } = await admin
    .from('website_sections')
    .select('*')
    .eq('website_id', website.id)
    .order('order_index');

  return Response.json({ website, sections: sections || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const user = await getAuthedUser(supabase, null);
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Update flow
    const { action, sections, slug: _slug, ...websiteFields } = body;

    if (action === 'publish') {
      await admin.from('user_websites').update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else if (action === 'unpublish') {
      await admin.from('user_websites').update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else if (Object.keys(websiteFields).length > 0) {
      await admin.from('user_websites').update({
        ...websiteFields,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }

    if (sections?.length) {
      for (const s of sections) {
        await admin.from('website_sections')
          .update({ enabled: s.enabled, content: s.content })
          .eq('website_id', existing.id)
          .eq('section_type', s.section_type);
      }
    }

    const { data: website } = await admin
      .from('user_websites')
      .select('*, trade:trades(id, name_hu, slug_prefix)')
      .eq('id', existing.id)
      .single();
    const { data: updatedSections } = await admin
      .from('website_sections')
      .select('*')
      .eq('website_id', existing.id)
      .order('order_index');

    return Response.json({ website, sections: updatedSections || [] });
  }

  // Create new website
  const { slug, trade_id } = body;
  if (!slug?.trim()) return Response.json({ error: 'Slug kötelező' }, { status: 400 });

  const { data: website, error: createErr } = await admin
    .from('user_websites')
    .insert({ user_id: user.id, slug: slug.toLowerCase().trim(), trade_id: trade_id || null })
    .select('*, trade:trades(id, name_hu, slug_prefix)')
    .single();

  if (createErr) {
    if (createErr.code === '23505') return Response.json({ error: 'Ez a link már foglalt' }, { status: 409 });
    return Response.json({ error: createErr.message }, { status: 500 });
  }

  await admin.from('website_sections').insert(buildDefaultSections(website.id));
  const { data: sections } = await admin
    .from('website_sections')
    .select('*')
    .eq('website_id', website.id)
    .order('order_index');

  return Response.json({ website, sections: sections || [] }, { status: 201 });
}
