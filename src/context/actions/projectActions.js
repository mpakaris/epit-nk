export function makeProjectActions({
  projects, invoices, labourEntries, projectRooms,
  setProjects, setInvoices, setLabourEntries, setProjectRooms,
  uid, isAdmin, collectives, effectiveEntityId, effectiveUser,
}) {
  const createProject = async ({ name, description, memberIds = [], startDate, endDate, clientId, entityId: entityIdOverride }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, description, memberIds,
        startDate: startDate || null,
        endDate: endDate || null,
        clientId: clientId || null,
        entityId: entityIdOverride || effectiveEntityId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a projekt létrehozásakor');
    setProjects(prev => [data.project, ...prev]);
    return data.project;
  };

  const updateProject = async (projectId, fields) => {
    const proj = projects.find(p => p.id === projectId);
    const isOwner          = proj?.owner_id === uid || proj?.created_by === uid;
    const isKollektivOwner = collectives.some(c => c.collective_id === proj?.collective_id && (c.role === 'owner' || c.role === 'admin'));
    if (!isAdmin && !isOwner && !isKollektivOwner) throw new Error('Csak adminisztrátor vagy a projekt tulajdonosa módosíthat!');
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a projekt módosításakor');
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...data.project, members: p.members } : p));
    return data.project;
  };

  const updateProjectMembers = async (projectId, memberIds) => {
    const proj = projects.find(p => p.id === projectId);
    const isOwner = proj?.owner_id === uid || proj?.created_by === uid;
    if (!isAdmin && !isOwner) throw new Error('Csak adminisztrátor vagy a projekt tulajdonosa módosíthat tagságot!');
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tagok mentésekor');
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, members: memberIds } : p));
  };

  const closeProject  = (projectId) => updateProject(projectId, { closed_at: new Date().toISOString() });
  const reopenProject = (projectId) => updateProject(projectId, { closed_at: null });

  const deleteProject = async (projectId, projectData = null) => {
    const project = projectData || projects.find(p => p.id === projectId);
    const isCreator        = project?.created_by === effectiveUser?.id || project?.owner_id === effectiveUser?.id;
    const isKollektivOwner = project
      ? collectives.some(c => c.collective_id === project.collective_id && (c.role === 'owner' || c.role === 'admin'))
      : collectives.some(c => c.role === 'owner' || c.role === 'admin');
    if (!isAdmin && !isCreator && !isKollektivOwner) throw new Error('Nincs jogosultsága törölni ezt a projektet!');
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a projekt törlésekor');
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setInvoices(prev => prev.filter(inv => inv.project_id !== projectId));
    setLabourEntries(prev => prev.filter(e => e.project_id !== projectId));
    setProjectRooms(prev => prev.filter(r => r.project_id !== projectId));
  };

  // ---- Project rooms ----------------------------------------------------------

  const createProjectRoom = async (projectId, { name, size_m2, work_types, description, quoted_amount_net, sort_order, source_section_id }) => {
    const proj = projects.find(p => p.id === projectId);
    if (!isAdmin && proj?.owner_id !== uid && proj?.created_by !== uid) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/projects/${projectId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size_m2, work_types, description, quoted_amount_net, sort_order, source_section_id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a helyiség létrehozásakor');
    setProjectRooms(prev => [...prev, data.room]);
    return data.room;
  };

  const updateProjectRoom = async (projectId, roomId, fields) => {
    const proj = projects.find(p => p.id === projectId);
    if (!isAdmin && proj?.owner_id !== uid && proj?.created_by !== uid) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/projects/${projectId}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a helyiség módosításakor');
    setProjectRooms(prev => prev.map(r => r.id === roomId ? data.room : r));
    return data.room;
  };

  const deleteProjectRoom = async (projectId, roomId) => {
    const proj = projects.find(p => p.id === projectId);
    if (!isAdmin && proj?.owner_id !== uid && proj?.created_by !== uid) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/projects/${projectId}/rooms/${roomId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a helyiség törlésekor');
    setProjectRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const syncRoomsFromQuote = async (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    if (!isAdmin && proj?.owner_id !== uid && proj?.created_by !== uid) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/projects/${projectId}/rooms/sync-from-quote`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a szinkronizáláskor');
    if (data.rooms && data.rooms.length > 0) {
      setProjectRooms(prev => [...prev, ...data.rooms]);
    }
    return data;
  };

  return {
    createProject, updateProject, updateProjectMembers, closeProject, reopenProject, deleteProject,
    createProjectRoom, updateProjectRoom, deleteProjectRoom, syncRoomsFromQuote,
  };
}
