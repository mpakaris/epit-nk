import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { r2PublicUrl } from '@/lib/r2';

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
    .ilike('email', email)
    .is('deleted_at', null);

  if (!clientRecords?.length) return Response.json({ contractors: [], email: user.email });

  const ownerIds  = [...new Set(clientRecords.map(c => c.owner_id))];
  const clientIds = clientRecords.map(c => c.id);

  // Contractor profiles (including T&C info)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, company_name, email, terms_pdf_url, terms_pdf_name')
    .in('id', ownerIds);

  // Portal-visible quotes for these clients (CP-12: filter by portal_visible instead of status!=draft)
  const { data: rawQuotes } = await admin
    .from('quotes')
    .select('id, client_id, owner_id, title, description, work_type, location, status, tax_percent, start_date, end_date, created_at, project_id')
    .in('client_id', clientIds)
    .eq('portal_visible', true)
    .is('deleted_at', null)
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
    .select('id, client_id, owner_id, name, description, status, start_date, end_date, created_at')
    .in('client_id', clientIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const projects    = rawProjects || [];
  const projectIds  = projects.map(p => p.id);

  const [
    { data: rawInvoiceTotals },
    { data: rawPortalInvoices },
    { data: rawLabourEntries },
    { data: rawDiary },
    { data: rawMedia },
  ] = await Promise.all([
    // All invoices for total (existing behaviour)
    projectIds.length
      ? admin.from('invoices').select('project_id, value_huf').in('project_id', projectIds).is('deleted_at', null)
      : { data: [] },
    // CP-09: portal-visible invoices with full fields
    projectIds.length
      ? admin.from('invoices')
          .select('id, project_id, category, value_huf, description, created_at')
          .in('project_id', projectIds)
          .eq('portal_visible', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      : { data: [] },
    // CP-10: portal-visible labour entries
    projectIds.length
      ? admin.from('labour_entries')
          .select('id, project_id, labour_type, hours, unit, value_huf, date')
          .in('project_id', projectIds)
          .eq('portal_visible', true)
          .order('date', { ascending: false })
      : { data: [] },
    // Existing: public diary entries
    projectIds.length
      ? admin.from('diary_entries')
          .select('id, project_id, title, body, client_note, work_type, entry_date, created_at, created_by, author_name')
          .in('project_id', projectIds)
          .eq('is_public', true)
          .is('deleted_at', null)
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(60)
      : { data: [] },
    // CP-11: portal-visible media items (project documents only)
    projectIds.length
      ? admin.from('media_items')
          .select('id, document_id, r2_key, thumbnail_url, mime_type, created_at')
          .eq('document_type', 'project')
          .in('document_id', projectIds)
          .eq('portal_visible', true)
          .order('created_at')
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
        invoiceTotal: (rawInvoiceTotals || [])
          .filter(i => i.project_id === p.id)
          .reduce((s, i) => s + Number(i.value_huf || 0), 0),
        invoices: (rawPortalInvoices || []).filter(i => i.project_id === p.id),
        labourEntries: (rawLabourEntries || []).filter(l => l.project_id === p.id),
        media: (rawMedia || [])
          .filter(m => m.document_id === p.id)
          .map(m => ({
            id: m.id,
            mime_type: m.mime_type,
            created_at: m.created_at,
            url: r2PublicUrl(m.r2_key),
            thumbnail: m.thumbnail_url || r2PublicUrl(m.r2_key),
          })),
        // CP-16: all portal-visible quotes linked to this project
        quotes: ownerQuotes.filter(q => q.project_id === p.id),
        diaryEntries: enrichedDiary.filter(d => d.project_id === p.id),
      }));

    // The client_id is the clients.id record linking this email to this contractor.
    // Used by the SA portal view to link to /clients/[id] (the real client portal).
    const ownerClientRecord = clientRecords.find(c => c.owner_id === ownerId);

    return {
      owner_id:          ownerId,
      client_id:         ownerClientRecord?.id || null,
      contractor_name:   profile?.company_name || profile?.display_name || 'Ismeretlen vállalkozó',
      contractor_email:  profile?.email || null,
      terms_pdf_url:     profile?.terms_pdf_url || null,
      terms_pdf_name:    profile?.terms_pdf_name || null,
      standaloneQuotes:  ownerQuotes.filter(q => !q.project_id),
      projects:          ownerProjects,
    };
  });

  return Response.json({ contractors, email: user.email });
}
