import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { name, address, phone, email, notes, discountPercent = 0, entityId } = await request.json();
  // For entity admins: always derive from their own profile (authoritative, server-side).
  // For superadmin: use the entityId sent from client (reflects God Mode context).
  const targetEntityId = profile.entity_id || entityId || null;
  if (!targetEntityId) return Response.json({ error: `Nincs entitás hozzárendelve! (role=${profile.role}, profile.entity_id=${profile.entity_id}, sent=${entityId})` }, { status: 400 });
  if (!name?.trim()) return Response.json({ error: 'A név megadása kötelező!' }, { status: 400 });

  const { data, error: insertErr } = await admin
    .from('clients')
    .insert([{ entity_id: targetEntityId, name: name.trim(), address, phone, email, notes, discount_percent: Number(discountPercent) }])
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });
  return Response.json({ client: data });
}
