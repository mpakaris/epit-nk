import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';

// PATCH — rename collective (owner only)
// DELETE — delete collective (owner only)

async function getCallerRole(admin, collectiveId, userId) {
  const { data } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data?.role || null;
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const role = await getCallerRole(admin, id, user.id);
  if (role !== 'owner') return Response.json({ error: 'Csak a tulajdonos módosíthatja a kollektívát' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return Response.json({ error: 'A név nem lehet üres' }, { status: 400 });

  const { data: oldCollective } = await admin.from('collectives').select('name').eq('id', id).single();
  const oldName = oldCollective?.name ?? '';

  const { data, error } = await admin.from('collectives').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Kollektíva módosítva',
    targetType: 'collective',
    targetId:   id,
    targetName: data.name,
  });

  // Notify all active members of the rename (non-critical, fire-and-forget)
  if (oldName && oldName !== data.name) {
    const { data: members } = await admin
      .from('collective_members')
      .select('profiles(email)')
      .eq('collective_id', id)
      .eq('status', 'active');
    const tpl  = EMAIL_TEMPLATES.collective_renamed;
    const vars = { old_name: oldName, new_name: data.name, manager_name: callerProfile?.display_name || user.email };
    for (const m of (members || [])) {
      const email = m.profiles?.email;
      if (email) sendEmail({ to: email, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) })
        .catch(err => console.error('[collective_renamed email]', err.message));
    }
  }

  return Response.json({ collective: data });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const role = await getCallerRole(admin, id, user.id);
  if (role !== 'owner') return Response.json({ error: 'Csak a tulajdonos törölheti a kollektívát' }, { status: 403 });

  const [{ data: collectiveData }, { data: callerProfile }, { data: members }] = await Promise.all([
    admin.from('collectives').select('name, is_inclusive').eq('id', id).single(),
    admin.from('profiles').select('display_name, email').eq('id', user.id).single(),
    admin.from('collective_members').select('user_id, profiles(email)').eq('collective_id', id).eq('status', 'active'),
  ]);

  if (collectiveData?.is_inclusive) {
    return Response.json({ error: 'Az inkluzív kollektíva nem törölhető' }, { status: 403 });
  }

  const { error } = await admin.from('collectives').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     'Kollektíva törölve',
    targetType: 'collective',
    targetId:   id,
    targetName: collectiveData?.name,
  });

  // Notify all members of deletion (non-critical, fire-and-forget)
  if (collectiveData?.name && members?.length) {
    const tpl  = EMAIL_TEMPLATES.collective_deleted;
    const vars = { collective_name: collectiveData.name, owner_name: callerProfile?.display_name || user.email };
    for (const m of members) {
      const email = m.profiles?.email;
      if (email && email !== callerProfile?.email) {
        sendEmail({ to: email, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) })
          .catch(err => console.error('[collective_deleted email]', err.message));
      }
    }
  }

  return Response.json({ ok: true });
}
