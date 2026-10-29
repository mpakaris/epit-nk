export function makeEntityUserActions({
  isSuperAdmin, isAdmin, entities, projects, users,
  setEntities, setProjects, setQuotes, setInvoices, setUsers,
  effectiveEntityId, supabase,
}) {
  // ---- Entities (superadmin only) -----------------------------------------------

  const createEntity = async ({ name }) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin hozhat létre entitást!');
    const { data, error } = await supabase.from('entities').insert([{ name }]).select().single();
    if (error) throw error;
    setEntities(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateEntity = async (entityId, fields) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin módosíthat entitást!');
    const { data, error } = await supabase.from('entities').update(fields).eq('id', entityId).select().single();
    if (error) throw error;
    setEntities(prev => prev.map(e => e.id === entityId ? data : e));
    return data;
  };

  const deleteEntity = async (entityId) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin törölhet entitást!');
    const res = await fetch('/api/admin/delete-entity', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a törléskor');
    const deletedProjectIds = new Set(projects.filter(p => p.collective_id === entityId).map(p => p.id));
    setEntities(prev => prev.filter(e => e.id !== entityId));
    setProjects(prev => prev.filter(p => p.collective_id !== entityId));
    setQuotes(prev => prev.filter(q => q.collective_id !== entityId));
    setInvoices(prev => prev.filter(inv => !deletedProjectIds.has(inv.project_id)));
  };

  // ---- Users ------------------------------------------------------------------

  const createUser = async ({ displayName, email, password, role = 'user', entityId }) => {
    if (!isAdmin) throw new Error('Nincs jogosultsága felhasználót létrehozni!');
    const resolvedEntityId = entityId || effectiveEntityId;
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email, password, role, entityId: resolvedEntityId }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a felhasználó létrehozásakor');
    const newUser = resData.user;
    setUsers(prev => [...prev, newUser].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'hu')));
    return newUser;
  };

  const deleteUser = async (userId, currentUserId) => {
    if (!isAdmin) throw new Error('Nincs jogosultsága!');
    if (userId === currentUserId) throw new Error('Saját fiókját nem törölheti!');
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a törléskor');
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, deleted_at: new Date().toISOString() } : u
    ));
  };

  const resetUserPassword = async (userId, temporaryPassword = 'OkosSzaki2026!') => {
    if (!isAdmin) throw new Error('Nincs jogosultsága!');
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, temporaryPassword }),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a jelszó visszaállításakor');
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, must_change_password: true } : u));
    return resData;
  };

  return { createEntity, updateEntity, deleteEntity, createUser, deleteUser, resetUserPassword };
}
