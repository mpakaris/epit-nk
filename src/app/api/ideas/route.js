import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

async function getCallerProfile(supabase, admin) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthenticated', status: 401 };
  const { data: profile } = await admin.from('profiles').select('id, role, active_collective_id, display_name').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found', status: 403 };
  return { user, profile };
}

export async function GET(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  let entityId = ctx.profile.active_collective_id || ctx.user.id;
  if (ctx.profile.role === 'superadmin') {
    const { searchParams } = new URL(request.url);
    entityId = searchParams.get('entity_id') || null;
    if (!entityId) return Response.json({ ideas: [] });
  }

  const { data, error } = await admin
    .from('ideas')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ideas: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { idea, entityId: entityIdOverride } = await request.json();
  if (!idea?.trim()) return Response.json({ error: 'Az ötlet nem lehet üres!' }, { status: 400 });

  const entityId = ctx.profile.role === 'superadmin'
    ? (entityIdOverride || null)
    : (ctx.profile.active_collective_id || ctx.user.id);
  if (!entityId) return Response.json({ error: 'Nincs entitás hozzárendelve!' }, { status: 400 });

  const { data, error } = await admin
    .from('ideas')
    .insert([{
      entity_id:   entityId,
      author_id:   ctx.user.id,
      author_name: ctx.profile.display_name || ctx.user.email,
      idea:        idea.trim(),
    }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   entityId,
    userId:     ctx.user.id,
    userName:   ctx.profile.display_name || ctx.user.email,
    action:     'Ötlet létrehozva',
    targetType: 'idea',
    targetId:   data.id,
    targetName: data.idea.slice(0, 80),
  });

  return Response.json({ idea: data });
}
