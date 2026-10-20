import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  const { token, password } = await request.json().catch(() => ({}));

  if (!token || !password) {
    return Response.json({ error: 'Token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'A jelszónak legalább 8 karakterből kell állnia.' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();

  const { data: record, error: fetchErr } = await admin
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (fetchErr || !record) {
    return Response.json({ error: 'Érvénytelen vagy lejárt link. Kérj új visszaállítási e-mailt.' }, { status: 400 });
  }
  if (record.used_at) {
    return Response.json({ error: 'Ez a link már felhasználásra került.' }, { status: 400 });
  }
  if (new Date(record.expires_at) < new Date()) {
    return Response.json({ error: 'A link lejárt. Kérj új visszaállítási e-mailt.' }, { status: 400 });
  }

  // Update password via admin API — no session required
  const { error: updateErr } = await admin.auth.admin.updateUserById(record.user_id, {
    password,
  });

  if (updateErr) {
    console.error('[confirm-reset] updateUser error:', updateErr.message);
    return Response.json({ error: 'Hiba a jelszó frissítésekor. Próbáld újra.' }, { status: 500 });
  }

  // Mark token as used
  await admin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id);

  return Response.json({ ok: true });
}
