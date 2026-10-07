import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id, display_name').eq('id', user.id).single();
  if (!profile || !['admin', 'superadmin'].includes(profile.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { name, address, phone, email, notes, discountPercent = 0, entityId } = await request.json();
  const targetEntityId = profile.role === 'superadmin' ? (entityId || null) : profile.entity_id;
  if (!targetEntityId) return Response.json({ error: 'Nincs entitás hozzárendelve!' }, { status: 400 });
  if (!name?.trim()) return Response.json({ error: 'A név megadása kötelező!' }, { status: 400 });

  const { data, error: insertErr } = await admin
    .from('clients')
    .insert([{ entity_id: targetEntityId, name: name.trim(), address, phone, email, notes, discount_percent: Number(discountPercent) }])
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });

  logAudit({
    entityId: targetEntityId,
    userId: user.id,
    userName: profile.display_name || user.email,
    action: 'Ügyfél létrehozva',
    targetType: 'client',
    targetId: data.id,
    targetName: data.name,
  });

  return Response.json({ client: data });
}
