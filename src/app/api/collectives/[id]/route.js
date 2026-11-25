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

  const body = await req.json().catch(() => ({}));
  const transferDocs = !!body.transfer_docs;

  const [{ data: collectiveData }, { data: callerProfile }, { data: members }] = await Promise.all([
    admin.from('collectives').select('name, is_inclusive, status').eq('id', id).single(),
    admin.from('profiles').select('display_name, email').eq('id', user.id).single(),
    admin.from('collective_members').select('user_id, profiles(email)').eq('collective_id', id).eq('status', 'active'),
  ]);

  if (collectiveData?.is_inclusive) {
    return Response.json({ error: 'Az inkluzív kollektíva nem törölhető' }, { status: 403 });
  }

  if (collectiveData?.status === 'active') {
    return Response.json({
      error: 'Az aktív kollektíva nem törölhető. Először mondd le az előfizetést az Előfizetés oldalon.',
      active_sub: true,
    }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (collectiveData?.status === 'frozen') {
    if (transferDocs) {
      // Transfer docs to owner's personal workspace as permanently read-only
      for (const table of ['surveys', 'quotes', 'projects']) {
        await admin.from(table)
          .update({ collective_id: null, is_read_only: true })
          .eq('collective_id', id).is('deleted_at', null).eq('is_seed', false);
        // Seed docs in collective: soft-delete (they're tied to the collective)
        await admin.from(table)
          .update({ deleted_at: now })
          .eq('collective_id', id).is('deleted_at', null).eq('is_seed', true);
      }
    } else {
      // Soft-delete all collective documents
      for (const table of ['surveys', 'quotes', 'projects']) {
        await admin.from(table).update({ deleted_at: now }).eq('collective_id', id).is('deleted_at', null);
      }
    }
    // Cascade-soft-delete active members
    await admin.from('collective_members').update({ status: 'left' }).eq('collective_id', id).eq('status', 'active');
    // Soft-delete the collective itself
    const { error } = await admin.from('collectives').update({ status: 'deleted', deleted_at: now }).eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    // not_activated: hard delete (no documents, no subscription)
    const { error } = await admin.from('collectives').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  logAudit({
    entityId:   id,
    userId:     user.id,
    userName:   callerProfile?.display_name || user.email,
    action:     collectiveData?.status === 'frozen' ? 'Kollektíva törölve (volt felfüggesztve)' : 'Kollektíva törölve (nem aktivált)',
    targetType: 'collective',
    targetId:   id,
    targetName: collectiveData?.name,
    details:    { status: collectiveData?.status },
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
