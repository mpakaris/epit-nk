import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pingSmtp } from '@/lib/email';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await pingSmtp();
    return Response.json(result);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
