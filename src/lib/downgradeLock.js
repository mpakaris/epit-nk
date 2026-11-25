import { logAudit } from '@/lib/audit';

/**
 * Applies the downgrade write-lock when a user's Premium/Trial access ends.
 * - For each doc type (surveys, quotes, projects): the oldest personal doc stays writable;
 *   all others get is_read_only = true.
 * - Downgrades subscription_tier to 'basic'.
 * - Freezes the user's inclusive collective (if any).
 * - Retracts pending invitations on frozen collectives.
 *
 * Safe to call multiple times — idempotent.
 */
export async function applyDowngradeLock(userId, admin) {
  // 1. Downgrade profile tier
  await admin.from('profiles')
    .update({ subscription_tier: 'basic', is_subscription_premium: false })
    .eq('id', userId);

  // 2. For each doc type: keep the oldest, lock all others
  for (const table of ['surveys', 'quotes', 'projects']) {
    const nameCol = table === 'projects' ? 'name' : 'title';

    const { data: docs } = await admin.from(table)
      .select('id, created_at')
      .eq('owner_id', userId)
      .is('collective_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (!docs || docs.length <= 1) continue;

    // Keep the first (oldest) writable; lock the rest
    const toLock = docs.slice(1).map(d => d.id);
    if (toLock.length === 0) continue;

    await admin.from(table)
      .update({ is_read_only: true })
      .in('id', toLock);
  }

  // 3. Freeze inclusive collective (personal access revoked)
  const { data: memberships } = await admin.from('collective_members')
    .select('collective_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active');

  const ownedIds = (memberships || []).map(m => m.collective_id);
  if (ownedIds.length > 0) {
    const { data: collectives } = await admin.from('collectives')
      .select('id, is_inclusive, status')
      .in('id', ownedIds)
      .is('deleted_at', null);

    const inclusiveIds = (collectives || [])
      .filter(c => c.is_inclusive && c.status === 'active')
      .map(c => c.id);

    if (inclusiveIds.length > 0) {
      await admin.from('collectives')
        .update({ status: 'frozen', subscription_status: 'canceled' })
        .in('id', inclusiveIds);

      // Retract pending invitations
      await admin.from('collective_members')
        .update({ status: 'retracted' })
        .in('collective_id', inclusiveIds)
        .eq('status', 'invited');

      for (const id of inclusiveIds) {
        logAudit({ userId, action: 'Inclusive collective frozen (trial expired)', targetType: 'collective', targetId: id, details: { reason: 'trial_expired' } });
      }
    }
  }

  logAudit({ userId, action: 'Downgrade lock applied', targetType: 'user', targetId: userId, details: { reason: 'trial_expired_or_premium_revoked' } });
}

/**
 * Clears the downgrade write-lock when Premium is re-granted.
 * Sets is_read_only = false on all personal docs (except permanently locked collective-transfer docs).
 * Does NOT unfreeze paid collectives — owner must reactivate those via Creem.
 * The inclusive collective is unfrozen by grantPremium() separately.
 */
export async function clearDowngradeLock(userId, admin) {
  for (const table of ['surveys', 'quotes', 'projects']) {
    await admin.from(table)
      .update({ is_read_only: false })
      .eq('owner_id', userId)
      .is('collective_id', null)
      .is('deleted_at', null)
      .eq('is_read_only', true);
  }

  logAudit({ userId, action: 'Downgrade lock cleared', targetType: 'user', targetId: userId, details: { reason: 'premium_granted' } });
}
