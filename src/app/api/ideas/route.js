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

  let query = admin.from('ideas').select('*').order('created_at', { ascending: false });

  if (ctx.profile.role === 'superadmin') {
    // SA sees all ideas
  } else if (ctx.profile.active_collective_id) {
    // Collective context: show ideas from all collective members
    const { data: members } = await admin
      .from('collective_members')
      .select('user_id')
      .eq('collective_id', ctx.profile.active_collective_id)
      .eq('status', 'active');
    const memberIds = (members || []).map(m => m.user_id);
    if (memberIds.length === 0) return Response.json({ ideas: [] });
    query = query.in('author_id', memberIds);
  } else {
    // Personal context: only own ideas
    query = query.eq('author_id', ctx.user.id);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ideas: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const ctx = await getCallerProfile(supabase, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { idea } = await request.json();
  if (!idea?.trim()) return Response.json({ error: 'Az ötlet nem lehet üres!' }, { status: 400 });

  const { data, error } = await admin.from('ideas').insert([{
    author_id:   ctx.user.id,
    author_name: ctx.profile.display_name || ctx.user.email,
    idea:        idea.trim(),
  }]).select().single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  logAudit({
    entityId:   ctx.user.id,
    userId:     ctx.user.id,
    userName:   ctx.profile.display_name || ctx.user.email,
    action:     'Ötlet létrehozva',
    targetType: 'idea',
    targetId:   data.id,
    targetName: data.idea.slice(0, 80),
  });

  return Response.json({ idea: data });
}
