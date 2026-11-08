import { createAdminClient } from '@/lib/supabase/admin';
import { buildSessionCookie } from '@/lib/portalSession';
import { globalRateLimit } from '@/lib/rateLimitGlobal';

export async function POST(request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  const { allowed } = await globalRateLimit(`portal-otp-verify:${ip}`, { limit: 10, windowSec: 900 });
  if (!allowed) return Response.json({ error: 'Túl sok kérés.' }, { status: 429 });

  const body  = await request.json().catch(() => ({}));
  const email = body.email?.trim().toLowerCase();
  const code  = body.code?.trim();
  if (!email || !code) return Response.json({ error: 'Hiányzó adatok.' }, { status: 400 });

  const admin = createAdminClient();

  const { data: otp } = await admin
    .from('portal_otps')
    .select('id')
    .eq('email', email)
    .eq('code', code)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return Response.json({ error: 'Érvénytelen vagy lejárt kód.' }, { status: 401 });

  await admin.from('portal_otps').update({ used_at: new Date().toISOString() }).eq('id', otp.id);

  return new Response(JSON.stringify({ ok: true, email }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(email),
    },
  });
}
