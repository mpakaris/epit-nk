import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  // Superadmin can query any email via ?email=X
  const { searchParams } = new URL(request.url);
  const asEmail = searchParams.get('email');
  if (asEmail) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const email = (asEmail || user.email).toLowerCase();

  // All client records with this email across all contractors
  const { data: clientRecords } = await admin
    .from('clients')
    .select('id, owner_id, name')
    .ilike('email', email);

  if (!clientRecords?.length) return Response.json({ contractors: [], email: user.email });

  const ownerIds  = [...new Set(clientRecords.map(c => c.owner_id))];
  const clientIds = clientRecords.map(c => c.id);

  // Contractor profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, company_name, email')
    .in('id', ownerIds);

  // Non-draft quotes for these clients
  const { data: rawQuotes } = await admin
    .from('quotes')
    .select('id, client_id, owner_id, title, description, work_type, location, status, tax_percent, start_date, end_date, created_at, project_id')
    .in('client_id', clientIds)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  const quotes    = rawQuotes || [];
  const quoteIds  = quotes.map(q => q.id);

  const [{ data: quoteEntries }, { data: quoteSections }] = await Promise.all([
    quoteIds.length
      ? admin.from('quote_entries').select('*').in('quote_id', quoteIds)
      : { data: [] },
    quoteIds.length
      ? admin.from('quote_sections').select('*').in('quote_id', quoteIds).order('sort_order').order('created_at')
      : { data: [] },
  ]);

  // Projects
  const { data: rawProjects } = await admin
    .from('projects')
    .select('id, client_id, owner_id, name, description, status, start_date, end_date, created_at, project_id')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false });

  const projects    = rawProjects || [];
  const projectIds  = projects.map(p => p.id);

  const [{ data: invoices }, { data: rawDiary }] = await Promise.all([
    projectIds.length
      ? admin.from('invoices').select('project_id, value_huf').in('project_id', projectIds).is('deleted_at', null)
      : { data: [] },
    projectIds.length
      ? admin.from('diary_entries')
          .select('id, project_id, title, body, client_note, work_type, entry_date, created_at, created_by')
          .in('project_id', projectIds)
          .eq('is_public', true)
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(60)
      : { data: [] },
  ]);

  // Diary photos
  const diaryEntries  = rawDiary || [];
  const diaryIds      = diaryEntries.map(e => e.id);
  const { data: diaryPhotos } = diaryIds.length
    ? await admin.from('diary_photos')
        .select('id, entry_id, drive_view_url, thumbnail_url, mime_type')
        .in('entry_id', diaryIds)
        .order('created_at')
    : { data: [] };

  const enrichedDiary = diaryEntries.map(e => ({
    ...e,
    photos: (diaryPhotos || []).filter(p => p.entry_id === e.id),
  }));

  // Build per-contractor payload
  const contractors = ownerIds.map(ownerId => {
    const profile        = profiles?.find(p => p.id === ownerId);
    const ownerClientIds = clientRecords.filter(c => c.owner_id === ownerId).map(c => c.id);

    const ownerQuotes = quotes
      .filter(q => ownerClientIds.includes(q.client_id))
      .map(q => ({
        ...q,
        entries: (quoteEntries || []).filter(e => e.quote_id === q.id),
        sections: (quoteSections || [])
          .filter(s => s.quote_id === q.id)
          .map(s => ({
            ...s,
            entries: (quoteEntries || []).filter(e => e.quote_id === q.id && e.section_id === s.id),
          })),
      }));

    const ownerProjects = projects
      .filter(p => ownerClientIds.includes(p.client_id))
      .map(p => ({
        ...p,
        invoiceTotal: (invoices || [])
          .filter(i => i.project_id === p.id)
          .reduce((s, i) => s + Number(i.value_huf || 0), 0),
        linkedQuote: ownerQuotes.find(q => q.project_id === p.id) || null,
        diaryEntries: enrichedDiary.filter(d => d.project_id === p.id),
      }));

    return {
      owner_id:        ownerId,
      contractor_name: profile?.company_name || profile?.display_name || 'Ismeretlen vállalkozó',
      contractor_email: profile?.email || null,
      quotes:          ownerQuotes,
      projects:        ownerProjects,
    };
  });

  return Response.json({ contractors, email: user.email });
}
