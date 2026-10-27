import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEffectivePremium, checkPersonalLimit } from '@/lib/subscriptionLimits';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('role, active_collective_id').eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  let query = admin.from('appointments').select('*')
    .is('deleted_at', null).order('date').order('time', { nullsFirst: true });

  if (profile.role === 'superadmin') {
    // no extra filter
  } else if (profile.active_collective_id) {
    query = query.eq('collective_id', profile.active_collective_id);
  } else {
    query = query.eq('owner_id', user.id).is('collective_id', null);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ appointments: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles')
    .select('id, role, display_name, active_collective_id, is_subscription_premium, subscription_tier, trial_ends_at')
    .eq('id', user.id).single();
  if (!profile) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, date, time, client_id, link_type, collective_id: bodyCollectiveId } = body;

  if (!title?.trim()) return Response.json({ error: 'A cím kötelező' }, { status: 400 });
  if (!date)          return Response.json({ error: 'A dátum kötelező' }, { status: 400 });

  const collectiveId = bodyCollectiveId !== undefined
    ? (bodyCollectiveId || null)
    : (profile.active_collective_id || null);

  if (collectiveId && profile.role !== 'superadmin') {
    const { data: mem } = await admin.from('collective_members')
      .select('role').eq('collective_id', collectiveId).eq('user_id', user.id)
      .eq('status', 'active').maybeSingle();
    if (!mem || (mem.role !== 'owner' && mem.role !== 'admin'))
      return Response.json({ error: 'Csak a kollektíva tulajdonosa hozhat létre időpontot.' }, { status: 403 });
  }

  // Create the appointment
  const { data: appt, error: apptErr } = await admin.from('appointments').insert([{
    owner_id:      user.id,
    collective_id: collectiveId,
    created_by:    user.id,
    title:         title.trim(),
    date,
    time:          time || null,
    client_id:     client_id || null,
    link_type:     link_type || null,
  }]).select().single();

  if (apptErr) return Response.json({ error: apptErr.message }, { status: 500 });

  // Optionally create the linked document
  let linkedDoc  = null;
  let linkedType = null;

  if (link_type === 'felmeres') {
    if (!collectiveId && profile.role !== 'superadmin' && !isEffectivePremium(profile)) {
      const check = await checkPersonalLimit(admin, user.id, 'surveys', 'basic_max_surveys');
      if (!check.allowed) {
        await admin.from('appointments').delete().eq('id', appt.id);
        return Response.json({ error: `Bázis csomagban maximum ${check.limit} felmérés hozható létre.` }, { status: 403 });
      }
    }
    const { data: survey } = await admin.from('surveys').insert([{
      owner_id:      user.id,
      collective_id: collectiveId,
      created_by:    user.id,
      title:         title.trim(),
      date,
      client_id:     client_id || null,
    }]).select().single();
    if (survey) {
      await admin.from('appointments').update({ linked_survey_id: survey.id }).eq('id', appt.id);
      linkedDoc  = survey;
      linkedType = 'felmeres';
    }
  } else if (link_type === 'ajanlat') {
    if (!collectiveId && profile.role !== 'superadmin' && !isEffectivePremium(profile)) {
      const check = await checkPersonalLimit(admin, user.id, 'quotes', 'basic_max_quotes');
      if (!check.allowed) {
        await admin.from('appointments').delete().eq('id', appt.id);
        return Response.json({ error: `Bázis csomagban maximum ${check.limit} ajánlat hozható létre.` }, { status: 403 });
      }
    }
    const { data: quote } = await admin.from('quotes').insert([{
      owner_id:      user.id,
      collective_id: collectiveId,
      created_by:    user.id,
      title:         title.trim(),
      start_date:    date,
      client_id:     client_id || null,
      status:        'draft',
      tax_percent:   0,
    }]).select().single();
    if (quote) {
      await admin.from('appointments').update({ linked_quote_id: quote.id }).eq('id', appt.id);
      linkedDoc  = quote;
      linkedType = 'ajanlat';
    }
  } else if (link_type === 'projekt') {
    if (!collectiveId && profile.role !== 'superadmin' && !isEffectivePremium(profile)) {
      const check = await checkPersonalLimit(admin, user.id, 'projects', 'basic_max_projects');
      if (!check.allowed) {
        await admin.from('appointments').delete().eq('id', appt.id);
        return Response.json({ error: `Bázis csomagban maximum ${check.limit} projekt hozható létre.` }, { status: 403 });
      }
    }
    const { data: project } = await admin.from('projects').insert([{
      owner_id:      user.id,
      collective_id: collectiveId,
      created_by:    user.id,
      name:          title.trim(),
      start_date:    date,
      client_id:     client_id || null,
    }]).select().single();
    if (project) {
      await admin.from('appointments').update({ linked_project_id: project.id }).eq('id', appt.id);
      linkedDoc  = project;
      linkedType = 'projekt';
    }
  }

  logAudit({
    entityId:   collectiveId || user.id,
    userId:     user.id,
    userName:   profile.display_name || user.email,
    action:     'Időpont létrehozva',
    targetType: 'appointment',
    targetId:   appt.id,
    targetName: appt.title,
    details:    link_type ? { link_type, linked_doc_id: linkedDoc?.id } : null,
  });

  return Response.json({ appointment: appt, linkedDoc, linkedType }, { status: 201 });
}
