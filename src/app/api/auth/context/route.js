import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const { entity_id } = await request.json();
  if (!entity_id) return Response.json({ error: 'entity_id required' }, { status: 400 });

  const admin = createAdminClient();

  // Verify the user is actually a member of the requested entity
  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('entity_id', entity_id)
    .eq('status', 'active')
    .single();

  if (!membership) return Response.json({ error: 'Not a member of this entity' }, { status: 403 });

  const { error } = await admin
    .from('profiles')
    .update({ current_entity_id: entity_id })
    .eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
