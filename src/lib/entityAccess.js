/**
 * Check whether a profile has access to a given entity.
 * Accounts for both profiles.entity_id (personal/home) and
 * profiles.current_entity_id (actively selected collective entity).
 */
export function hasEntityAccess(profile, entityId) {
  if (!profile || !entityId) return false;
  if (profile.role === 'superadmin') return true;
  return profile.entity_id === entityId || profile.current_entity_id === entityId;
}
