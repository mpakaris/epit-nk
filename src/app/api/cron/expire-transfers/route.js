import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

const TABLE_MAP = { project: 'projects', quote: 'quotes', survey: 'surveys' };

// Called by Vercel Cron (daily). Auto-rejects pending transfer requests
// older than 7 days and locks the associated document.
export async function GET(request) {
  const secret = request.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const { data: expired, error } = await admin
    .from('transfer_requests')
    .select('id, document_type, document_id, document_title, from_user_id, collective_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff.toISOString());

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!expired || expired.length === 0) return Response.json({ expired: 0 });

  let count = 0;
  for (const req of expired) {
    const table = TABLE_MAP[req.document_type];
    if (!table) continue;

    // Lock the document
    await admin.from(table)
      .update({ locked_reason: 'transfer_expired', locked_at: new Date().toISOString() })
      .eq('id', req.document_id);

    // Mark request as expired (reuse 'rejected' status, distinguish via locked_reason on doc)
    await admin.from('transfer_requests')
      .update({ status: 'transfer_expired', resolved_at: new Date().toISOString() })
      .eq('id', req.id);

    logAudit({
      entityId:   req.collective_id,
      userId:     req.from_user_id,
      userName:   'cron',
      action:     'Áthelyezési kérelem lejárt (automatikus)',
      targetType: req.document_type,
      targetId:   req.document_id,
      targetName: req.document_title,
      details:    { request_id: req.id },
    });

    count++;
  }

  return Response.json({ expired: count });
}
