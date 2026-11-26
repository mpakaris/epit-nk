/**
 * Shared helper for checking collective lifecycle status before any write.
 *
 * Returns null when the collective is active and writes are allowed.
 * Returns a Response when the write must be blocked (not_activated, frozen, deleted).
 *
 * Usage:
 *   const blocked = await checkCollectiveStatus(admin, collectiveId);
 *   if (blocked) return blocked;
 */
export async function checkCollectiveStatus(admin, collectiveId) {
  if (!collectiveId) return null;

  const { data: collective, error } = await admin
    .from('collectives')
    .select('status')
    .eq('id', collectiveId)
    .is('deleted_at', null)
    .single();

  if (error || !collective) {
    return Response.json({ error: 'Kollektíva nem található.' }, { status: 404 });
  }

  if (collective.status === 'not_activated') {
    return Response.json({ error: 'collective_not_activated' }, { status: 403 });
  }
  if (collective.status === 'frozen') {
    return Response.json({ error: 'collective_frozen', upgrade_required: 'collective', collective_id: collectiveId }, { status: 403 });
  }
  if (collective.status === 'deleted') {
    return Response.json({ error: 'collective_deleted' }, { status: 403 });
  }

  return null;
}
