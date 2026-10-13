import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(request, { params }) {
  const { id, drawingId } = await params;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('id, role').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { data: drawing } = await admin.from('survey_drawings').select('created_by, survey_id').eq('id', drawingId).single();
  if (!drawing || drawing.survey_id !== id) return Response.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = ['admin', 'superadmin'].includes(profile.role);
  const isCreator = drawing.created_by === user.id;
  if (!isAdmin && !isCreator) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { error: delErr } = await admin.from('survey_drawings').delete().eq('id', drawingId);
  if (delErr) return Response.json({ error: delErr.message }, { status: 400 });
  return Response.json({ success: true });
}
