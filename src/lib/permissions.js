/**
 * canMutateEntry — client-side permission check for entry/section mutations.
 *
 * doc       — the parent document (survey, quote, project)
 * entry     — the entry/section being mutated (may be null for doc-level checks)
 * uid       — effective user id
 * isAdmin   — profile.role === 'admin' || 'superadmin'
 * collectives — AppContext collectives array [{ collective_id, role }]
 *
 * Returns true if the mutation should be allowed locally.
 * When doc is null (not yet loaded) we return true and let the API decide.
 */
export function canMutateEntry({ doc, entry, uid, isAdmin, collectives }) {
  if (!doc) return true;
  const isOwner          = doc.owner_id === uid || doc.created_by === uid;
  const isShared         = (doc.shared_with || []).includes(uid);
  const isKollektivOwner = collectives.some(c =>
    c.collective_id === doc.collective_id && (c.role === 'owner' || c.role === 'admin')
  );
  const isEntryCreator   = entry ? (entry.created_by === uid || entry.user_id === uid) : false;
  const isCollMember     = collectives.some(c => c.collective_id === doc.collective_id);
  return isAdmin || isOwner || isShared || isKollektivOwner || (isCollMember && isEntryCreator);
}

/**
 * canMutateDoc — client-side permission check for document-level mutations
 * (update / delete of the top-level record itself).
 */
export function canMutateDoc({ doc, uid, isAdmin, collectives }) {
  if (!doc) return true;
  const isOwner          = doc.owner_id === uid || doc.created_by === uid;
  const isKollektivOwner = collectives.some(c =>
    c.collective_id === doc.collective_id && (c.role === 'owner' || c.role === 'admin')
  );
  return isAdmin || isOwner || isKollektivOwner;
}
