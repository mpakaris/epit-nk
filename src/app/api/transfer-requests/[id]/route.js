import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const TABLE_MAP = { project: 'projects', quote: 'quotes', survey: 'surveys' };

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { id } = await params;
  const { action } = await request.json();

  if (!['accept', 'reject', 'retract'].includes(action))
    return Response.json({ error: 'Érvénytelen művelet.' }, { status: 400 });

  // Fetch the pending request
  const { data: req } = await admin
    .from('transfer_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!req) return Response.json({ error: 'A kérelem nem található.' }, { status: 404 });

  // Retract — only the original requester
  if (action === 'retract') {
    if (req.from_user_id !== user.id)
      return Response.json({ error: 'Csak a kérelmező vonhatja vissza a kérelmet.' }, { status: 403 });
    const { error } = await admin
      .from('transfer_requests')
      .update({ status: 'retracted', resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', id);
    if (error) return Response.json({ error: 'Hiba a visszavonáskor.' }, { status: 500 });

    const { data: prof } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
    logAudit({
      entityId:   req.collective_id,
      userId:     user.id,
      userName:   prof?.display_name || user.email,
      action:     'Áthelyezési kérelem visszavonva',
      targetType: req.document_type,
      targetId:   req.document_id,
      targetName: req.document_title,
      details:    { request_id: id },
    });

    return Response.json({ ok: true });
  }

  // Accept / reject — only the collective owner
  const { data: membership } = await admin
    .from('collective_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('collective_id', req.collective_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || membership.role !== 'owner')
    return Response.json({ error: 'Csak a kollektíva tulajdonosa dönthet a kérelemről.' }, { status: 403 });

  const table = TABLE_MAP[req.document_type];
  if (!table) return Response.json({ error: 'Ismeretlen dokumentumtípus.' }, { status: 400 });

  if (action === 'accept') {
    // Move document: owner_id → collective owner (user.id), set collective_id, clear any lock
    const { error: docErr } = await admin
      .from(table)
      .update({ owner_id: user.id, collective_id: req.collective_id, locked_reason: null, locked_at: null })
      .eq('id', req.document_id)
      .is('collective_id', null);

    if (docErr) return Response.json({ error: 'Hiba a dokumentum áthelyezésekor.' }, { status: 500 });
  } else {
    // Reject: lock the document so it becomes read-only
    const { error: lockErr } = await admin
      .from(table)
      .update({ locked_reason: 'transfer_rejected', locked_at: new Date().toISOString() })
      .eq('id', req.document_id);

    if (lockErr) return Response.json({ error: 'Hiba a dokumentum zárolásánál.' }, { status: 500 });
  }

  // Update request status
  const { error: reqErr } = await admin
    .from('transfer_requests')
    .update({ status: action === 'accept' ? 'accepted' : 'rejected', resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', id);

  if (reqErr) return Response.json({ error: 'Hiba az állapot frissítésekor.' }, { status: 500 });

  const { data: prof } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId:   req.collective_id,
    userId:     user.id,
    userName:   prof?.display_name || user.email,
    action:     action === 'accept' ? 'Áthelyezés elfogadva' : 'Áthelyezés visszautasítva',
    targetType: req.document_type,
    targetId:   req.document_id,
    targetName: req.document_title,
    details:    { request_id: id, from_user_id: req.from_user_id },
  });

  return Response.json({ ok: true });
}
