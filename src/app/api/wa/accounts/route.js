import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireOwnerOrAdmin(user, admin) {
  const { data: profile } = await admin
    .from('profiles')
    .select('active_collective_id, display_name, role')
    .eq('id', user.id)
    .single();
  if (!profile?.active_collective_id) return { error: 'Nincs aktív kollektíva', status: 403 };

  const { data: member } = await admin
    .from('collective_members')
    .select('role')
    .eq('collective_id', profile.active_collective_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { error: 'Nincs jogosultságod', status: 403 };
  }
  return { profile, collectiveId: profile.active_collective_id };
}

// GET — list all WA accounts for the active collective
export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const ctx   = await requireOwnerOrAdmin(user, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { data: accounts } = await admin
    .from('wa_accounts')
    .select('*, assignments:subbie_project_assignments(project_id, is_active, project:projects(id, name))')
    .eq('collective_id', ctx.collectiveId)
    .order('created_at', { ascending: false });

  return Response.json({ accounts: accounts || [] });
}

// POST — register a new Subbie (WA-060)
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();
  const ctx   = await requireOwnerOrAdmin(user, admin);
  if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { phone_number, display_name, project_ids = [], permissions = {} } = await request.json();

  if (!phone_number || !/^\+\d{7,15}$/.test(phone_number)) {
    return Response.json({ error: 'Érvénytelen telefonszám. Használj E.164 formátumot (pl. +36301234567).' }, { status: 400 });
  }
  if (!display_name?.trim()) {
    return Response.json({ error: 'A név megadása kötelező.' }, { status: 400 });
  }

  // Check no active account exists for this number
  const { data: existing } = await admin
    .from('wa_accounts')
    .select('id, is_active')
    .eq('phone_number', phone_number)
    .maybeSingle();

  if (existing?.is_active) {
    return Response.json({ error: 'Ez a szám már aktív fiókhoz van rendelve.' }, { status: 409 });
  }

  const code        = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: account, error: upsertErr } = await admin.from('wa_accounts').upsert(
    {
      phone_number,
      display_name:  display_name.trim(),
      account_type:  'subbie',
      user_id:       null,
      collective_id: ctx.collectiveId,
      registered_by: user.id,
      verified_at:   null,
      is_active:     false,
      permissions:   { ...permissions, _pending_code: code, _code_expires: codeExpires },
    },
    { onConflict: 'phone_number' }
  ).select('id').single();

  if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });

  // Assign to projects
  if (project_ids.length) {
    const rows = project_ids.map(pid => ({ wa_account_id: account.id, project_id: pid, assigned_by: user.id, is_active: true }));
    await admin.from('subbie_project_assignments').upsert(rows, { onConflict: 'wa_account_id,project_id' });
  }

  // Send verification WhatsApp message
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.INTERNAL_CRON_SECRET;
  await fetch(`${appUrl}/api/wa/send`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chatId: phone_number,
      text:   `Szia ${display_name.trim()}! ${ctx.profile.display_name} hozzáadott az OkosSzaki rendszeréhez mint alvállalkozó.\n\nAdatkezelési tájékoztató: ${appUrl}/adatkezeles\n\nA verifikációs kódod: *${code}*\nKüld vissza: VERIFY ${code}\n\nA kód 15 percig érvényes.`,
    }),
  });

  return Response.json({ created: true, wa_account_id: account.id }, { status: 201 });
}
