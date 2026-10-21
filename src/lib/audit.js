import { createAdminClient } from '@/lib/supabase/admin';

// Convenience wrapper for server-side error logging
export async function logError({
  route       = null,
  userId      = null,
  userName    = '',
  errorMessage,
  statusCode  = 500,
  details     = null,
}) {
  return logAudit({
    entityId:   userId,
    userId,
    userName,
    action:     'Server Error',
    targetType: 'error',
    targetId:   route,
    targetName: String(errorMessage || '').substring(0, 120),
    details:    { route, status_code: statusCode, error: String(errorMessage || ''), ...(details || {}) },
  });
}

export async function logAudit({
  entityId    = null,
  userId      = null,
  userName    = '',
  action,
  targetType  = null,
  targetId    = null,
  targetName  = null,
  details     = null,
}) {
  try {
    const admin = createAdminClient();
    // entity_id has a FK to the old entities table which causes constraint violations
    // for collective UUIDs and user UUIDs. Store workspace context in details instead.
    const enrichedDetails = entityId
      ? { ...( details || {}), workspace_id: entityId }
      : (details || null);

    await admin.from('audit_logs').insert([{
      entity_id:   null,             // always null to avoid legacy FK constraint
      user_id:     userId     || null,
      user_name:   userName   || '',
      action,
      target_type: targetType || null,
      target_id:   targetId   != null ? String(targetId) : null,
      target_name: targetName || null,
      details:     enrichedDetails,
    }]);
  } catch (err) {
    console.error('Audit log failed (non-fatal):', err.message);
  }
}
