import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role, entity_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  const { name, description, memberIds = [], startDate, endDate, clientId, entityId } = await request.json();

  const targetEntityId = profile.role === 'superadmin' ? (entityId || null) : profile.entity_id;
  if (!targetEntityId) return Response.json({ error: 'Nincs entitás hozzárendelve!' }, { status: 400 });
  if (!name?.trim()) return Response.json({ error: 'A projekt neve kötelező!' }, { status: 400 });

  const { data: proj, error: projErr } = await admin
    .from('projects')
    .insert([{
      entity_id: targetEntityId,
      name: name.trim(),
      description: description || null,
      created_by: user.id,
      start_date: startDate || null,
      end_date: endDate || null,
      client_id: clientId || null,
    }])
    .select()
    .single();

  if (projErr) return Response.json({ error: projErr.message }, { status: 400 });

  if (memberIds.length > 0) {
    const { data: validMembers } = await admin
      .from('profiles').select('id').in('id', memberIds).eq('entity_id', targetEntityId);
    const validIds = (validMembers || []).map(m => m.id);
    if (validIds.length > 0) {
      await admin.from('project_members').insert(
        validIds.map(uId => ({ project_id: proj.id, user_id: uId }))
      );
    }
  }

  return Response.json({ project: { ...proj, members: memberIds } });
}
