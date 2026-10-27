import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const TABLE_MAP  = { project: 'projects', quote: 'quotes', survey: 'surveys' };
const TITLE_FIELD = { project: 'name',    quote: 'title',  survey: 'title'   };

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { document_type, document_id, collective_id } = await request.json();

  if (!document_type || !document_id || !collective_id)
    return Response.json({ error: 'Hiányzó adatok.' }, { status: 400 });
  if (!TABLE_MAP[document_type])
    return Response.json({ error: 'Érvénytelen dokumentumtípus.' }, { status: 400 });

  // Verify document exists, belongs to user, and is currently personal
  const titleField = TITLE_FIELD[document_type];
  const { data: doc } = await admin
    .from(TABLE_MAP[document_type])
    .select(`id, owner_id, collective_id, created_by, ${titleField}`)
    .eq('id', document_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!doc) return Response.json({ error: 'A dokumentum nem található.' }, { status: 404 });
  if (doc.owner_id !== user.id && doc.created_by !== user.id)
    return Response.json({ error: 'Nincs jogosultságod ehhez a dokumentumhoz.' }, { status: 403 });
  if (doc.collective_id)
    return Response.json({ error: 'A dokumentum már kollektívában van.' }, { status: 400 });

  // Get user's role in the target collective
  const { data: membership } = await admin
    .from('collective_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('collective_id', collective_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership)
    return Response.json({ error: 'Nem vagy tagja ennek a kollektívának.' }, { status: 403 });

  const docTitle = doc[titleField] || 'Névtelen dokumentum';

  if (membership.role === 'owner') {
    // Direct move — owner_id stays (it's their doc), just set collective_id
    const { error } = await admin
      .from(TABLE_MAP[document_type])
      .update({ collective_id })
      .eq('id', document_id);
    if (error) return Response.json({ error: 'Hiba az áthelyezéskor.' }, { status: 500 });
    return Response.json({ moved: true });
  }

  // Contributor — check for existing pending request
  const { data: existing } = await admin
    .from('transfer_requests')
    .select('id')
    .eq('document_type', document_type)
    .eq('document_id', document_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing)
    return Response.json({ error: 'Már van folyamatban lévő áthelyezési kérelem ehhez a dokumentumhoz.' }, { status: 400 });

  const { data: req, error } = await admin
    .from('transfer_requests')
    .insert({ document_type, document_id, document_title: docTitle, from_user_id: user.id, collective_id })
    .select()
    .single();

  if (error) return Response.json({ error: 'Hiba a kérelem létrehozásakor.' }, { status: 500 });
  return Response.json({ requested: true, request: req });
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);

  // Outgoing mode: return the current user's own pending requests (for locking their docs)
  if (searchParams.get('outgoing') === 'true') {
    const { data: requests } = await admin
      .from('transfer_requests')
      .select('*')
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return Response.json({ requests: requests || [] });
  }

  // Default (incoming): pending requests for collectives this user owns
  const { data: owned } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('status', 'active');

  if (!owned || owned.length === 0) return Response.json({ requests: [] });

  const ownedIds = owned.map(m => m.collective_id);

  const { data: requests } = await admin
    .from('transfer_requests')
    .select('*')
    .in('collective_id', ownedIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (!requests || requests.length === 0) return Response.json({ requests: [] });

  const fromUserIds = [...new Set(requests.map(r => r.from_user_id))];
  const { data: requesters } = await admin
    .from('profiles')
    .select('id, display_name, email')
    .in('id', fromUserIds);

  const requesterMap = Object.fromEntries((requesters || []).map(p => [p.id, p]));
  const enriched = requests.map(r => ({ ...r, requester: requesterMap[r.from_user_id] || null }));

  return Response.json({ requests: enriched });
}
