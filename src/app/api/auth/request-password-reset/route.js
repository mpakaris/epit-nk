import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail } from '@/lib/emailTemplates';

export async function POST(request) {
  const origin = new URL(request.url).origin;
  const { email } = await request.json().catch(() => ({}));

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up the profile by email — never reveal whether it exists
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle();

  if (!profile) {
    // Return ok to prevent email enumeration
    return Response.json({ ok: true });
  }

  // Generate a secure random token — only the hash is stored
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Invalidate any existing unused tokens for this user
  await admin
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .is('used_at', null);

  const { error: insertErr } = await admin.from('password_reset_tokens').insert({
    user_id: profile.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (insertErr) {
    console.error('[password-reset] insert error:', insertErr.message);
    return Response.json({ ok: true }); // still silent
  }

  const resetLink = `${origin}/change-password?token=${token}`;

  const html = wrapEmail(`
    <h2 style="font-size:1.2rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem;">Jelszó visszaállítása</h2>
    <p style="color:#475569;font-size:0.875rem;line-height:1.65;margin:0 0 1.5rem;">
      Jelszó visszaállítási kérést kaptunk a <strong>${email.trim()}</strong> e-mail címhez tartozó fiókhoz.<br>
      Kattints az alábbi gombra az új jelszó beállításához.
    </p>
    <a href="${resetLink}"
       style="display:inline-block;background:#0f172a;color:#fff;font-weight:700;font-size:0.875rem;padding:0.75rem 1.75rem;border-radius:8px;text-decoration:none;margin-bottom:1.5rem;">
      Jelszó visszaállítása
    </a>
    <p style="color:#94a3b8;font-size:0.78rem;line-height:1.55;margin:0;">
      Ha nem te kérted a visszaállítást, ezt az e-mailt figyelmen kívül hagyhatod — a fiókod biztonságban van.<br>
      A link <strong>1 óráig</strong> érvényes.
    </p>
  `, 'Jelszó visszaállítása – Epiteq');

  try {
    await sendEmail({ to: email.trim(), subject: 'Jelszó visszaállítása – Epiteq', html });
  } catch (mailErr) {
    console.error('[password-reset] sendEmail error:', mailErr.message);
  }

  return Response.json({ ok: true });
}
