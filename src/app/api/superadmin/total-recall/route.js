import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromR2 } from '@/lib/r2';

async function assertSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'superadmin' ? admin : null;
}

// GET — list all users + aggregate stats
export async function GET() {
  const admin = await assertSuperAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const [
    { data: profiles, error },
    { count: collectivesCount },
    { count: surveysCount },
  ] = await Promise.all([
    admin.from('profiles').select('id, email, display_name, subscription_tier, is_subscription_premium, created_at').order('created_at', { ascending: false }),
    admin.from('collectives').select('id', { count: 'exact', head: true }),
    admin.from('surveys').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    users: profiles ?? [],
    stats: {
      collectives: collectivesCount ?? 0,
      surveys:     surveysCount     ?? 0,
    },
  });
}

// DELETE — total recall: wipe every trace of a user including R2 media
export async function DELETE(req) {
  const admin = await assertSuperAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const { email } = await req.json();
  if (!email?.trim()) return Response.json({ error: 'email required' }, { status: 400 });

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!profile) return Response.json({ error: `No user found for ${email}` }, { status: 404 });

  const uid = profile.id;
  const errors = [];

  const attempt = async (label, fn) => {
    try { await fn(); }
    catch (e) { errors.push(`${label}: ${e.message}`); }
  };

  // ── Collect all R2 keys before any DB deletions ──────────────────────────

  const r2Keys = [];

  // survey_media (via surveys owned by user)
  const { data: userSurveys } = await admin.from('surveys').select('id').eq('owner_id', uid);
  const surveyIds = (userSurveys || []).map(s => s.id);
  if (surveyIds.length > 0) {
    const { data: surveyMedia } = await admin
      .from('survey_media')
      .select('drive_file_id')
      .in('survey_id', surveyIds);
    for (const m of surveyMedia || []) if (m.drive_file_id) r2Keys.push(m.drive_file_id);
  }

  // diary_photos uploaded by this user
  const { data: diaryPhotos } = await admin
    .from('diary_photos')
    .select('drive_file_id')
    .eq('uploaded_by', uid);
  for (const p of diaryPhotos || []) if (p.drive_file_id) r2Keys.push(p.drive_file_id);

  // invoices + payment_item_files (via projects owned by user)
  const { data: userProjects } = await admin.from('projects').select('id').eq('owner_id', uid);
  const projectIds = (userProjects || []).map(p => p.id);
  if (projectIds.length > 0) {
    const { data: invoiceFiles } = await admin
      .from('invoices')
      .select('storage_path')
      .in('project_id', projectIds)
      .neq('storage_path', '');
    for (const f of invoiceFiles || []) if (f.storage_path) r2Keys.push(f.storage_path);

    const { data: paymentItems } = await admin
      .from('payment_plan_items')
      .select('id')
      .in('project_id', projectIds);
    const itemIds = (paymentItems || []).map(i => i.id);
    if (itemIds.length > 0) {
      const { data: paymentFiles } = await admin
        .from('payment_item_files')
        .select('storage_path')
        .in('item_id', itemIds);
      for (const f of paymentFiles || []) if (f.storage_path) r2Keys.push(f.storage_path);
    }
  }

  // website_sections: gallery items (content.items[].r2_key) + about photo (content.photo_r2_key)
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('user_id', uid)
    .maybeSingle();
  if (website) {
    const { data: sections } = await admin
      .from('website_sections')
      .select('content')
      .eq('website_id', website.id);
    for (const section of sections || []) {
      if (!section.content) continue;
      if (section.content.photo_r2_key) r2Keys.push(section.content.photo_r2_key);
      if (Array.isArray(section.content.items)) {
        for (const item of section.content.items) {
          if (item.r2_key) r2Keys.push(item.r2_key);
        }
      }
    }
  }

  // ── Delete DB rows ────────────────────────────────────────────────────────

  // Personal content
  await attempt('projects',  () => admin.from('projects').delete().eq('owner_id', uid));
  await attempt('quotes',    () => admin.from('quotes').delete().eq('owner_id', uid));
  await attempt('surveys',   () => admin.from('surveys').delete().eq('owner_id', uid));
  await attempt('clients',   () => admin.from('clients').delete().eq('owner_id', uid));

  // Owned collectives (cascades members + invitations)
  const { data: ownedMemberships } = await admin
    .from('collective_members')
    .select('collective_id')
    .eq('user_id', uid)
    .eq('role', 'owner');
  const collectiveIds = (ownedMemberships || []).map(m => m.collective_id);
  if (collectiveIds.length > 0) {
    await attempt('collectives', () => admin.from('collectives').delete().in('id', collectiveIds));
  }

  // Memberships in other collectives + any remaining invitations
  await attempt('collective_members',     () => admin.from('collective_members').delete().eq('user_id', uid));
  await attempt('collective_invitations', () => admin.from('collective_invitations').delete().eq('user_id', uid));

  // Billing
  await attempt('subscriptions', () => admin.from('subscriptions').delete().eq('user_id', uid));
  await attempt('trial_emails',  () => admin.from('trial_emails').delete().eq('email', email.trim().toLowerCase()));

  // Audit log
  await attempt('audit_logs', () => admin.from('audit_logs').delete().eq('user_id', uid));

  // Profile row
  await attempt('profiles', () => admin.from('profiles').delete().eq('id', uid));

  // Auth user (must come last)
  await attempt('auth.users', async () => {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;
  });

  // ── Delete R2 objects ─────────────────────────────────────────────────────

  const uniqueKeys = [...new Set(r2Keys)];
  const r2Errors = [];
  await Promise.all(uniqueKeys.map(async key => {
    try { await deleteFromR2(key); }
    catch (e) { r2Errors.push(`r2:${key}: ${e.message}`); }
  }));

  console.log(`[total-recall] ${email} (${uid}) wiped. DB errors: ${errors.length}, R2 deleted: ${uniqueKeys.length}, R2 errors: ${r2Errors.length}`);

  return Response.json({
    ok: true,
    email,
    userId: uid,
    r2Deleted: uniqueKeys.length,
    warnings: [...errors, ...r2Errors].length > 0 ? [...errors, ...r2Errors] : undefined,
  });
}
