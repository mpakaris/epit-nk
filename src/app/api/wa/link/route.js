import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return Response.json({ error: 'Unauthenticated' }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, active_collective_id')
    .eq('id', user.id)
    .single();

  const { phone_number } = await request.json();
  if (!phone_number || !/^\+\d{7,15}$/.test(phone_number)) {
    return Response.json({ error: 'Érvénytelen telefonszám. Adj meg E.164 formátumot (pl. +36301234567).' }, { status: 400 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: upsertErr } = await admin.from('wa_accounts').upsert(
    {
      phone_number,
      user_id:        user.id,
      account_type:   'owner_member',
      display_name:   profile?.display_name || user.email,
      verified_at:    null,
      is_active:      false,
      collective_id:  profile?.active_collective_id || null,
      registered_by:  user.id,
      permissions:    { _pending_code: code, _code_expires: codeExpires },
    },
    { onConflict: 'phone_number' }
  );

  if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.INTERNAL_CRON_SECRET;

  await fetch(`${appUrl}/api/wa/send`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      chatId: phone_number,
      text:   `Szia! Az OkosSzaki WhatsApp összekapcsolási kódod: *${code}*\n\nKüld vissza: VERIFY ${code}\n\nA kód 15 percig érvényes.`,
    }),
  });

  return Response.json({ sent: true });
}
