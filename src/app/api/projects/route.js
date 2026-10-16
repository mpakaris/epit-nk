import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active_collective_id')
    .eq('id', user.id)
    .single();
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 403 });

  const { name, description, memberIds = [], startDate, endDate, clientId, collectiveId: bodyCollectiveId, quoteId } = await request.json();
  if (!name?.trim()) return Response.json({ error: 'A projekt neve kötelező!' }, { status: 400 });

  // Superadmin can pass explicit collectiveId; others use their active context
  const collectiveId = profile.role === 'superadmin'
    ? (bodyCollectiveId || null)
    : (profile.active_collective_id || null);

  // If targeting a collective, verify membership
  if (collectiveId && profile.role !== 'superadmin') {
    const { data: mem } = await admin
      .from('collective_members')
      .select('collective_id')
      .eq('user_id', user.id)
      .eq('collective_id', collectiveId)
      .eq('status', 'active')
      .single();
    if (!mem) return Response.json({ error: 'Nincs hozzáférés ehhez a csoporthoz!' }, { status: 403 });
  }

  const { data: proj, error: projErr } = await admin
    .from('projects')
    .insert([{
      owner_id:      user.id,
      collective_id: collectiveId,
      name:          name.trim(),
      description:   description || null,
      created_by:    user.id,
      start_date:    startDate || null,
      end_date:      endDate || null,
      client_id:     clientId || null,
    }])
    .select()
    .single();

  if (projErr) return Response.json({ error: projErr.message }, { status: 400 });

  // Copy rooms from linked quote (one-time structural inheritance — no live dependency)
  if (quoteId) {
    const { data: quote } = await admin
      .from('quotes')
      .select('id, owner_id, collective_id')
      .eq('id', quoteId)
      .is('deleted_at', null)
      .maybeSingle();

    if (quote) {
      const isQuoteOwner = quote.owner_id === user.id;
      const inSameCollective = collectiveId && quote.collective_id === collectiveId;
      if (isQuoteOwner || inSameCollective) {
        // Link the quote to this project (informational — shows "Kapcsolt ajánlat" card)
        await admin.from('quotes').update({ project_id: proj.id }).eq('id', quoteId);

        // Fetch sections + sum entries per section
        const [sectionsRes, entriesRes] = await Promise.all([
          admin.from('quote_sections').select('*').eq('quote_id', quoteId).order('sort_order').order('created_at'),
          admin.from('quote_entries').select('section_id, amount_huf').eq('quote_id', quoteId),
        ]);

        const sections = sectionsRes.data || [];
        const amountBySection = {};
        for (const e of (entriesRes.data || [])) {
          amountBySection[e.section_id] = (amountBySection[e.section_id] || 0) + Number(e.amount_huf || 0);
        }

        if (sections.length > 0) {
          await admin.from('project_rooms').insert(
            sections.map((s, i) => ({
              project_id:        proj.id,
              name:              s.name,
              size_m2:           s.size_m2 || null,
              description:       s.description || null,
              work_types:        [],
              quoted_amount_net: amountBySection[s.id] || null,
              sort_order:        s.sort_order ?? i,
              source_section_id: s.id,
              start_date:        s.start_date || null,
              end_date:          s.end_date || null,
            }))
          );
        }
      }
    }
  }

  if (memberIds.length > 0) {
    // Validate members are in the same collective
    if (collectiveId) {
      const { data: validMembers } = await admin
        .from('collective_members')
        .select('user_id')
        .eq('collective_id', collectiveId)
        .in('user_id', memberIds)
        .eq('status', 'active');
      const validIds = (validMembers || []).map(m => m.user_id);
      if (validIds.length > 0) {
        await admin.from('project_members').insert(
          validIds.map(uId => ({ project_id: proj.id, user_id: uId }))
        );
      }
    }
  }

  const { data: callerProfile } = await admin.from('profiles').select('display_name').eq('id', user.id).single();
  logAudit({
    entityId: collectiveId || user.id,
    userId: user.id,
    userName: callerProfile?.display_name || user.email,
    action: 'Projekt létrehozva',
    targetType: 'project',
    targetId: proj.id,
    targetName: proj.name,
  });

  return Response.json({ project: { ...proj, members: memberIds } });
}
