import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectiveUserId } from '@/lib/godMode';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ count: 0 });

  const admin = createAdminClient();
  const effectiveUserId = await resolveEffectiveUserId(request, user, admin);
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', effectiveUserId)
    .maybeSingle();

  if (!website) return Response.json({ count: 0 });

  const { count } = await admin
    .from('website_contact_leads')
    .select('id', { count: 'exact', head: true })
    .eq('website_id', website.id)
    .eq('read', false);

  return Response.json({ count: count || 0 });
}
