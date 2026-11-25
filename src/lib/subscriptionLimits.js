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
/**
 * Checks whether a Basic user has reached the per-document section limit.
 * Premium/Trial users and collective context are always allowed.
 * Returns { allowed: boolean, count: number, limit: number }
 *
 * @param {object}  admin        - Supabase admin client
 * @param {string}  docId        - Parent document UUID
 * @param {string}  sectionTable - 'survey_entries' | 'quote_sections' | 'project_rooms'
 * @param {string}  fkCol        - Foreign-key column name in sectionTable (e.g. 'survey_id')
 * @param {object}  profile      - Must include role, is_subscription_premium, subscription_tier, trial_ends_at
 * @param {boolean} inCollective - True when the document belongs to a collective workspace
 */
export async function checkSectionLimit(admin, docId, sectionTable, fkCol, profile, inCollective) {
  if (profile.role === 'superadmin' || isEffectivePremium(profile) || inCollective)
    return { allowed: true };
  const [countRes, configRes] = await Promise.all([
    admin.from(sectionTable).select('id', { count: 'exact', head: true }).eq(fkCol, docId),
    admin.from('pricing_config').select('value').eq('key', 'basic_max_sections').single(),
  ]);
  const count = countRes.count ?? 0;
  const limit = Number(configRes.data?.value ?? 10);
  return { allowed: count < limit, count, limit };
}

/**
 * Checks whether a section has room for one more item (safety ceiling, all tiers).
 * Returns { allowed: boolean, count: number, limit: number }
 *
 * @param {object} admin     - Supabase admin client
 * @param {string} sectionId - Section UUID
 * @param {string} entryTable - Table containing items (e.g. 'quote_entries')
 * @param {string} fkCol     - FK column pointing to the section (e.g. 'section_id')
 */
export async function checkItemLimit(admin, sectionId, entryTable, fkCol) {
  const [countRes, configRes] = await Promise.all([
    admin.from(entryTable).select('id', { count: 'exact', head: true }).eq(fkCol, sectionId),
    admin.from('pricing_config').select('value').eq('key', 'max_items_per_section').single(),
  ]);
  const count = countRes.count ?? 0;
  const limit = Number(configRes.data?.value ?? 100);
  return { allowed: count < limit, count, limit };
}

/**
 * Returns effective media limits for an upload context.
 * In collective context, the owner's tier applies (not the caller's).
 * Superadmins bypass all limits.
 *
 * @param {object}  admin          - Supabase admin client
 * @param {object}  callerProfile  - Caller's profile (needs role, is_subscription_premium, subscription_tier, trial_ends_at)
 * @param {boolean} inCollective   - True when the document belongs to a collective workspace
 * @param {object|null} ownerProfile - Collective owner's profile (same fields); required when inCollective=true
 * @returns {{ maxPhotos, maxVideos, maxPhotoSizeMB, maxVideoSizeMB }}
 */
export async function getMediaLimits(admin, callerProfile, inCollective, ownerProfile) {
  if (callerProfile?.role === 'superadmin') {
    return { maxPhotos: Infinity, maxVideos: Infinity, maxPhotoSizeMB: Infinity, maxVideoSizeMB: Infinity };
  }
  const effectiveProfile = (inCollective && ownerProfile) ? ownerProfile : callerProfile;
  const isPremium = isEffectivePremium(effectiveProfile ?? {});
  const { data: configs } = await admin.from('pricing_config')
    .select('key, value')
    .in('key', ['basic_max_photos', 'premium_max_photos', 'premium_max_videos', 'basic_photo_size_mb', 'premium_photo_size_mb', 'premium_video_size_mb']);
  const cfg = Object.fromEntries((configs || []).map(r => [r.key, Number(r.value)]));
  if (isPremium) {
    return {
      maxPhotos:    cfg.premium_max_photos     ?? 20,
      maxVideos:    cfg.premium_max_videos     ?? 5,
      maxPhotoSizeMB: cfg.premium_photo_size_mb ?? 10,
      maxVideoSizeMB: cfg.premium_video_size_mb ?? 50,
    };
  }
  return {
    maxPhotos:    cfg.basic_max_photos     ?? 3,
    maxVideos:    0,
    maxPhotoSizeMB: cfg.basic_photo_size_mb ?? 5,
    maxVideoSizeMB: 0,
  };
}

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
