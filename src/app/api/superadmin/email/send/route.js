import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { to, subject, html, text, replyTo } = await request.json();
  if (!to || !subject || !html) return Response.json({ error: 'to, subject and html are required' }, { status: 400 });

  try {
    const result = await sendEmail({ to, subject, html, text, replyTo });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
