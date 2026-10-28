import { createAdminClient } from '@/lib/supabase/admin';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

const TABLE_MAP = { project: 'projects', quote: 'quotes', survey: 'surveys' };
const LIMIT_MAP = { project: 'max_projects', quote: 'max_quotes', survey: 'max_surveys' };

export async function hasPendingTransfer(documentType, documentId) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('transfer_requests')
    .select('id')
    .eq('document_type', documentType)
    .eq('document_id', documentId)
    .eq('status', 'pending')
    .maybeSingle();
  return !!data;
}

// Returns { allowed, reason } — whether the user can unlock a locked document to personal space.
export async function canUnlockToPersonal(documentType, userId, profile) {
  if (isEffectivePremium(profile)) return { allowed: true };

  const admin   = createAdminClient();
  const table   = TABLE_MAP[documentType];
  const limitKey = LIMIT_MAP[documentType];
  if (!table) return { allowed: false, reason: 'invalid_type' };

  // Count active (non-locked, non-deleted) personal documents
  const { count } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .is('collective_id', null)
    .is('deleted_at', null)
    .is('locked_reason', null);

  const { data: pricing } = await admin
    .from('pricing_config')
    .select(limitKey)
    .single();

  const limit = pricing?.[limitKey] ?? 5;
  if ((count ?? 0) >= limit) return { allowed: false, reason: 'quota_exceeded', current: count, limit };
  return { allowed: true };
}
