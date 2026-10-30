import { deleteFromR2 } from '@/lib/r2';

export async function checkWhereImageIsUsed(admin, r2Key) {
  const [{ data: surveyRefs }, { data: mediaRefs }] = await Promise.all([
    admin.from('survey_media').select('id, survey_id, entry_id').eq('drive_file_id', r2Key),
    admin.from('media_items').select('id, owner_type, owner_id, document_type, document_id').eq('r2_key', r2Key),
  ]);
  return {
    total: (surveyRefs?.length || 0) + (mediaRefs?.length || 0),
    surveyRefs: surveyRefs || [],
    mediaRefs: mediaRefs || [],
  };
}

export async function safeDeleteMediaItem(admin, mediaItemId) {
  const { data: item } = await admin
    .from('media_items').select('r2_key').eq('id', mediaItemId).single();
  if (!item) return;

  await admin.from('media_items').delete().eq('id', mediaItemId);

  const { total } = await checkWhereImageIsUsed(admin, item.r2_key);
  if (total === 0) {
    try { await deleteFromR2(item.r2_key); } catch {}
  }
}
