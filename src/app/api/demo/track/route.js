import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { session_id, event, path, label, target, props } = body;

    if (!session_id || !event) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Daily-rotating IP hash — same IP = same hash within the day, different the next.
    // Non-reversible: SHA-256(ip + YYYY-MM-DD) → can distinguish sessions without storing IP.
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const today = new Date().toISOString().slice(0, 10);
    const ip_hash = createHash('sha256').update(ip + today).digest('hex').slice(0, 16);

    const country    = request.headers.get('cf-ipcountry') || null;
    const user_agent = request.headers.get('user-agent')?.slice(0, 200) || null;

    const admin = createAdminClient();
    await admin.from('demo_events').insert({
      session_id,
      ip_hash,
      country,
      user_agent,
      event,
      path: path || null,
      label: label || null,
      target: target || null,
      props: props || null,
    });

    return Response.json({ ok: true });
  } catch (err) {
    // Never block the client — swallow errors silently
    console.error('[demo/track]', err.message);
    return Response.json({ ok: false });
  }
}
