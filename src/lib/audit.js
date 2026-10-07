import { createAdminClient } from '@/lib/supabase/admin';

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
    await admin.from('audit_logs').insert([{
      entity_id:   entityId   || null,
      user_id:     userId     || null,
      user_name:   userName   || '',
      action,
      target_type: targetType || null,
      target_id:   targetId   != null ? String(targetId) : null,
      target_name: targetName || null,
      details:     details    || null,
    }]);
  } catch (err) {
    console.error('Audit log failed (non-fatal):', err.message);
  }
}
