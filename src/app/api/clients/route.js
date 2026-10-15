import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { name, address, phone, email, notes, discountPercent = 0 } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A név megadása kötelező!' }, { status: 400 });

  // Clients are always personal — owner_id = calling user
  const ownerId = user.id;

  const { data, error: insertErr } = await admin
    .from('clients')
    .insert([{
      owner_id:         ownerId,
      name:             name.trim(),
      address,
      phone,
      email,
      notes,
      discount_percent: Number(discountPercent),
    }])
    .select()
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 400 });

  logAudit({
    entityId: ownerId,
    userId:   user.id,
    userName: profile.display_name || user.email,
    action:   'Ügyfél létrehozva',
    targetType: 'client',
    targetId:   data.id,
    targetName: data.name,
  });

  return Response.json({ client: data });
}
