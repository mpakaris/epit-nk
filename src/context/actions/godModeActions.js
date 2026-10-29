export function makeGodModeActions({
  isSuperAdmin, currentUser,
  setImpersonating, setImpersonatingCollectives, setCurrentUser, setDataReady,
  setProjects, setClients, setQuotes, setInvoices, setLabourEntries,
  setSurveys, setProjectRooms, setQuoteEntries, setQuoteSections, setUsers,
  refreshSupabaseData, router, setGodCookie, clearGodCookie,
}) {
  const _loadEntityData = async () => {
    const res = await fetch('/api/entity/data', { cache: 'no-store' });
    if (!res.ok) return;
    const d = await res.json();
    setUsers(d.users || []);
    setProjects(d.projects || []);
    setClients(d.clients || []);
    setQuotes(d.quotes || []);
    setQuoteEntries(d.quoteEntries || []);
    setQuoteSections(d.quoteSections || []);
    setInvoices(d.invoices || []);
    setLabourEntries(d.labourEntries || []);
    setSurveys(d.surveys || []);
    setProjectRooms(d.projectRooms || []);
  };

  const startImpersonation = async (userId, entityIdOverride) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin veheti át mások nézetét!');

    const res = await fetch(`/api/superadmin/user?id=${userId}&include=collectives`);
    if (!res.ok) throw new Error('Felhasználó nem található!');
    const { profile, collectives: fetchedCollectives } = await res.json();

    const activeCollectiveId = entityIdOverride ?? profile?.active_collective_id ?? null;
    const impersonatingProfile = entityIdOverride
      ? { ...profile, active_collective_id: entityIdOverride }
      : profile;

    setDataReady(false);
    setProjects([]); setClients([]); setQuotes([]); setInvoices([]);
    setLabourEntries([]); setSurveys([]); setProjectRooms([]);
    setQuoteEntries([]); setQuoteSections([]);

    setImpersonatingCollectives(fetchedCollectives || []);
    setImpersonating(impersonatingProfile);
    setGodCookie('god_mode_user', userId);
    if (activeCollectiveId) {
      setGodCookie('god_mode_entity', activeCollectiveId);
    } else {
      clearGodCookie('god_mode_entity');
    }

    try { await _loadEntityData(); } catch { /* non-fatal */ }

    setDataReady(true);
    if (profile?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  const stopImpersonation = async () => {
    setImpersonating(null);
    setImpersonatingCollectives([]);
    clearGodCookie('god_mode_entity');
    clearGodCookie('god_mode_user');
    try { sessionStorage.removeItem('god_mode'); } catch {}
    await refreshSupabaseData(currentUser);
    router.push('/superadmin');
  };

  const setActiveContext = async (collectiveId) => {
    const res = await fetch('/api/auth/context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collective_id: collectiveId }),
    });
    if (!res.ok) throw new Error('Hiba a kontextus váltásakor');
    setCurrentUser(prev => prev ? { ...prev, active_collective_id: collectiveId } : prev);
    await refreshSupabaseData();
  };

  const switchImpersonatingContext = async (collectiveId) => {
    setImpersonating(prev => prev ? { ...prev, active_collective_id: collectiveId } : prev);
    if (collectiveId) {
      setGodCookie('god_mode_entity', collectiveId);
    } else {
      clearGodCookie('god_mode_entity');
    }
    setDataReady(false);
    try { await _loadEntityData(); } catch { /* non-fatal */ }
    setDataReady(true);
  };

  return { startImpersonation, stopImpersonation, setActiveContext, switchImpersonatingContext };
}
