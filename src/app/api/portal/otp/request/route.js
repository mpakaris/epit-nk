import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { wrapEmail, buildOtpEmailHtml } from '@/lib/emailTemplates';
import { globalRateLimit } from '@/lib/rateLimitGlobal';

export async function POST(request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  const { allowed } = await globalRateLimit(`portal-otp-req:${ip}`, { limit: 5, windowSec: 900 });
  if (!allowed) return Response.json({ error: 'Túl sok kérés. Kérjük, próbálkozzon 15 perc múlva.' }, { status: 429 });

  const body  = await request.json().catch(() => ({}));
  const email = body.email?.trim().toLowerCase();
  const lang  = ['hu', 'de', 'en'].includes(body.lang) ? body.lang : 'hu';

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Érvénytelen e-mail cím.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Delete all previous unused OTPs for this email (lazy cleanup)
  await admin.from('portal_otps').delete().eq('email', email).is('used_at', null);

  // Generate 6-digit code and save
  const code      = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: insertErr } = await admin
    .from('portal_otps')
    .insert({ email, code, expires_at: expiresAt });

  if (insertErr) {
    return Response.json({ error: 'Hiba történt. Kérjük, próbálkozzon újra.' }, { status: 500 });
  }

  const SUBJECTS = {
    hu: `${code} – az Ön belépési kódja`,
    de: `${code} – Ihr Anmeldecode`,
    en: `${code} – your login code`,
  };

  const html = wrapEmail(buildOtpEmailHtml(code, lang), SUBJECTS[lang], lang);
  try {
    await sendEmail({ to: email, subject: SUBJECTS[lang], html });
  } catch (err) {
    return Response.json({ error: `E-mail küldési hiba: ${err.message}` }, { status: 500 });
  }

  return Response.json({ ok: true });
}
