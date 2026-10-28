/**
 * Returns true if the profile has active Premium access
 * (paid premium OR an unexpired trial).
 */
export function isEffectivePremium(profile) {
  if (profile.is_subscription_premium) return true;
  if (profile.subscription_tier === 'trial' && profile.trial_ends_at) {
    return new Date(profile.trial_ends_at) > new Date();
  }
  return false;
}

/**
 * Checks whether a personal-context creation is within the Basic plan limit.
 * Returns { allowed: boolean, count: number, limit: number }
 *
 * @param {object} admin      - Supabase admin client
 * @param {string} userId
 * @param {string} table      - 'surveys' | 'quotes' | 'projects'
 * @param {string} configKey  - pricing_config key for the limit
 */
export async function checkPersonalLimit(admin, userId, table, configKey) {
  const [countRes, configRes] = await Promise.all([
    admin.from(table)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .is('collective_id', null)
      .is('deleted_at', null)
      .is('locked_reason', null),   // locked docs are in limbo, don't consume quota
    admin.from('pricing_config').select('value').eq('key', configKey).single(),
  ]);
  const count = countRes.count ?? 0;
  const limit = Number(configRes.data?.value ?? 5);
  return { allowed: count < limit, count, limit };
}
