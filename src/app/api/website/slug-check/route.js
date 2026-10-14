import { createAdminClient } from '@/lib/supabase/admin';

const RESERVED = new Set([
  'api', 'admin', 'superadmin', 'login', 'weboldalam', 'projektek',
  'felmeres', 'ajanlatok', 'naptar', 'ugyfelek', 'otletek', 'szakemberek',
  'naplo', 'clients', 'p', 'change-password', 'www', 'app', 'support',
]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.toLowerCase().trim();

  if (!slug) return Response.json({ available: false, reason: 'Üres slug' });
  if (slug.length < 3) return Response.json({ available: false, reason: 'Legalább 3 karakter szükséges' });
  if (slug.length > 60) return Response.json({ available: false, reason: 'Maximum 60 karakter' });
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return Response.json({ available: false, reason: 'Csak kisbetű, szám és kötőjel engedélyezett' });
  }
  if (RESERVED.has(slug)) return Response.json({ available: false, reason: 'Ez a link foglalt' });

  const admin = createAdminClient();
  const { data } = await admin.from('user_websites').select('id').eq('slug', slug).maybeSingle();
  return Response.json({ available: !data });
}
