import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getWebsiteForUser(admin, userId) {
  const { data } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const website = await getWebsiteForUser(admin, user.id);
  if (!website) return Response.json({ leads: [], unread: 0 });

  const { data: leads, error } = await admin
    .from('website_contact_leads')
    .select('*')
    .eq('website_id', website.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const unread = (leads || []).filter(l => !l.read).length;
  return Response.json({ leads: leads || [], unread });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  const { id, markAllRead } = body;

  const admin = createAdminClient();
  const website = await getWebsiteForUser(admin, user.id);
  if (!website) return Response.json({ error: 'Weboldal nem található' }, { status: 404 });

  if (markAllRead) {
    await admin
      .from('website_contact_leads')
      .update({ read: true })
      .eq('website_id', website.id)
      .eq('read', false);
  } else if (id) {
    await admin
      .from('website_contact_leads')
      .update({ read: true })
      .eq('id', id)
      .eq('website_id', website.id);
  }

  return Response.json({ success: true });
}
