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
  const godUser = cookieHeader.match(/god_mode_user=([a-f0-9-]+)/)?.[1];
  return godUser || user.id;
}
