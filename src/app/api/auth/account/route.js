import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { fillTemplate, wrapEmail, EMAIL_TEMPLATES } from '@/lib/emailTemplates';

// DELETE — schedules account deletion (30-day grace period, no immediate ban)
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
  if (profile.role === 'superadmin') return Response.json({ error: 'Superadmin fiók nem törölhető' }, { status: 403 });

  const memberName = profile.display_name || profile.email || 'Ismeretlen felhasználó';

  // Notify each collective owner whose collective this user belongs to
  const { data: memberships } = await admin
    .from('collective_members')
    .select('collective_id, role, collectives(name)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const tpl = EMAIL_TEMPLATES.member_account_deleted;
  for (const m of (memberships || [])) {
    const collectiveName = m.collectives?.name ?? '';
    const vars = { member_name: memberName, collective_name: collectiveName };
    const { data: owners } = await admin
      .from('collective_members')
      .select('profiles(email)')
      .eq('collective_id', m.collective_id)
      .eq('role', 'owner')
      .eq('status', 'active')
      .neq('user_id', user.id);
    for (const o of (owners || [])) {
      const ownerEmail = o.profiles?.email;
      if (ownerEmail) {
        try { await sendEmail({ to: ownerEmail, subject: fillTemplate(tpl.subject, vars), html: wrapEmail(fillTemplate(tpl.bodyHtml, vars)) }); }
        catch { /* non-critical */ }
      }
    }
  }

  // Derive deletion date from the subscription's current period end if available
  let scheduled_deletion_at = null;

  const { data: activeSub } = await admin
    .from('subscriptions')
    .select('creem_subscription_id, period_end')
    .eq('user_id', user.id)
    .in('product_family', ['premium', 'bundle'])
    .in('status', ['active', 'trialing', 'scheduled_cancel'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSub?.period_end) {
    // Already has a period_end from a scheduled cancel
    scheduled_deletion_at = activeSub.period_end;
  } else if (activeSub?.creem_subscription_id) {
    // Fetch period end from Creem
    const CREEM_BASE = process.env.CREEM_API_KEY?.startsWith('creem_test_')
      ? 'https://test-api.creem.io'
      : 'https://api.creem.io';
    try {
      const subRes = await fetch(`${CREEM_BASE}/v1/subscriptions?subscription_id=${activeSub.creem_subscription_id}`, {
        headers: { 'x-api-key': process.env.CREEM_API_KEY },
      });
      if (subRes.ok) {
        const sub = await subRes.json();
        const periodEnd = sub?.current_period_end ?? sub?.period_end;
        if (periodEnd) scheduled_deletion_at = new Date(periodEnd * 1000).toISOString();
      }
    } catch { /* fall through to fallback */ }
  }

  // Fallback: 30 days if no subscription period end is available
  if (!scheduled_deletion_at) {
    scheduled_deletion_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  await admin
    .from('profiles')
    .update({ scheduled_deletion_at })
    .eq('id', user.id);

  return Response.json({ ok: true, scheduled_deletion_at });
}

// PATCH — cancel a scheduled deletion
export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await request.json();
  if (!body.cancel_deletion) return Response.json({ error: 'Unsupported action' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('profiles').update({ scheduled_deletion_at: null }).eq('id', user.id);

  return Response.json({ ok: true });
}
