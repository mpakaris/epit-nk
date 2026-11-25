import { createAdminClient } from '@/lib/supabase/admin';
import { globalRateLimit } from '@/lib/rateLimitGlobal';
import { getClientIp } from '@/lib/rateLimit';
import { logAudit } from '@/lib/audit';

export async function POST(request, { params }) {
  const ip = getClientIp(request);
  const { allowed } = await globalRateLimit(`contact:${ip}`, { limit: 5, windowSec: 3600 });
  if (!allowed) return Response.json({ error: 'Túl sok kérés. Kérjük, próbáld újra később.' }, { status: 429 });

  const { slug } = await params;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Érvénytelen kérés' }, { status: 400 }); }

  const { name, email, phone, message } = body;
  if (!name?.trim()) return Response.json({ error: 'Név megadása kötelező' }, { status: 400 });
  if (!email?.trim() && !phone?.trim()) {
    return Response.json({ error: 'Email cím vagy telefonszám megadása kötelező' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: website } = await admin
    .from('user_websites')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!website) return Response.json({ error: 'Nem található' }, { status: 404 });

  const { error } = await admin.from('website_contact_leads').insert({
    website_id: website.id,
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    message: message?.trim() || null,
  });

  if (error) {
    logAudit({ action: 'Website lead save failed', targetType: 'website_lead', details: { error: error.message, slug } });
    return Response.json({ error: error.message }, { status: 500 });
  }
  logAudit({ action: 'Website lead received', targetType: 'website_lead', targetId: website.id, targetName: slug, details: { name: name.trim(), has_email: !!email, has_phone: !!phone } });
  return Response.json({ success: true });
}
