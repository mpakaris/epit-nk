/**
 * Resolves the effective user ID for API routes that need to support
 * superadmin impersonation via god mode cookies.
 */
export async function resolveEffectiveUserId(request, user, admin) {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'superadmin') return user.id;
  const cookieHeader = request.headers.get('cookie') || '';
  const raw = cookieHeader.match(/god_mode_user=([a-f0-9-]+)/)?.[1];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const godUser = raw && UUID_RE.test(raw) ? raw : null;
  return godUser || user.id;
}
