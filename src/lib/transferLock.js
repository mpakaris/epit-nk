import { createAdminClient } from '@/lib/supabase/admin';

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
