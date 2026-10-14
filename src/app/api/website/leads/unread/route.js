import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ count: 0 });

  const admin = createAdminClient();
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!website) return Response.json({ count: 0 });

  const { count } = await admin
    .from('website_contact_leads')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', website.id)
    .eq('read', false);

  return Response.json({ count: count || 0 });
}
