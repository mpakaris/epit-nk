import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { softDeleteUser } from '@/lib/softDeleteUser';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (caller?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  // Delete a specific user by email (manual request via email)
  if (body.email) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, role')
      .ilike('email', body.email.trim())
      .maybeSingle();

    if (!profile) return Response.json({ error: 'User not found' }, { status: 404 });
    if (profile.role === 'superadmin') return Response.json({ error: 'Cannot delete a superadmin' }, { status: 403 });

    try {
      await softDeleteUser(profile.id);
      return Response.json({ ok: true, deleted: 1, users: [{ email: profile.email, success: true }] });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // No email provided — process all pending scheduled deletions
  const { data: pending } = await admin
    .from('profiles')
    .select('id, email')
    .not('scheduled_deletion_at', 'is', null)
    .lt('scheduled_deletion_at', new Date().toISOString())
    .is('deleted_at', null);

  if (!pending?.length) return Response.json({ ok: true, deleted: 0, users: [] });

  const results = [];
  for (const profile of pending) {
    try {
      await softDeleteUser(profile.id);
      results.push({ email: profile.email, success: true });
    } catch (err) {
      results.push({ email: profile.email, success: false, error: err.message });
    }
  }

  return Response.json({ ok: true, deleted: results.filter(r => r.success).length, total: pending.length, users: results });
}
