import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('*').eq('id', id).single();
  if (!quote) return Response.json({ error: 'Az ajánlat nem található.' }, { status: 404 });

  // Only owner/admin can accept
  const isOwner = quote.owner_id === user.id || quote.created_by === user.id;
  let isKollektivOwner = false;
  if (!isOwner && quote.collective_id) {
    const { data: mem } = await admin
      .from('collective_members')
      .select('role')
      .eq('collective_id', quote.collective_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    isKollektivOwner = mem?.role === 'owner' || mem?.role === 'admin';
  }
  if (!isOwner && !isKollektivOwner) {
    return Response.json({ error: 'Csak a tulajdonos fogadhatja el az ajánlatot.' }, { status: 403 });
  }

  if (quote.status === 'accepted') {
    return Response.json({ error: 'Az ajánlat már el van fogadva.' }, { status: 409 });
  }

  // 1. Create the project first
  const projDescription = [quote.work_type, quote.description].filter(Boolean).join(' – ');
  const { data: proj, error: projErr } = await admin
    .from('projects')
    .insert([{
      owner_id:      user.id,
      collective_id: quote.collective_id || null,
      name:          quote.title,
      description:   projDescription || null,
      created_by:    user.id,
      start_date:    quote.start_date || null,
      end_date:      quote.end_date   || null,
      client_id:     quote.client_id  || null,
      survey_id:     quote.survey_id  || null,
    }])
    .select()
    .single();

  if (projErr) {
    console.error('accept: project insert failed', projErr);
    return Response.json({ error: 'A projekt létrehozása sikertelen. Kérjük, próbáld újra.' }, { status: 500 });
  }

  // 2. Only update the quote status after the project is confirmed created
  const { error: quoteErr } = await admin
    .from('quotes')
    .update({ status: 'accepted', project_id: proj.id })
    .eq('id', id);

  if (quoteErr) {
    // Project was created but quote update failed — clean up the orphan project
    await admin.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', proj.id);
    console.error('accept: quote status update failed', quoteErr);
    return Response.json({ error: 'A projekt létrejött, de az ajánlat státusza nem frissült. Kérjük, próbáld újra.' }, { status: 500 });
  }

  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId:   quote.collective_id || user.id,
    userId:     user.id,
    userName:   profile?.display_name || user.email,
    action:     'Ajánlat elfogadva, projekt létrehozva',
    targetType: 'quote',
    targetId:   id,
    targetName: quote.title,
    details:    { project_id: proj.id, project_name: proj.name },
  });

  return Response.json({ project: proj });
}
