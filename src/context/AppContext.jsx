'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { processMediaFiles } from '@/lib/mediaGate';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createSupabaseClient());

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);   // real authenticated user
  const [impersonating, setImpersonating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collectives, setCollectives] = useState([]);       // current user's collective memberships (context switcher)
  const [allMemberships, setAllMemberships] = useState([]); // all collective memberships — superadmin only

  // Data
  const [dataReady, setDataReady] = useState(false);
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labourEntries, setLabourEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quoteEntries, setQuoteEntries] = useState([]);
  const [quoteSections, setQuoteSections] = useState([]);
  const [projectRooms, setProjectRooms] = useState([]);

  // Surveys
  const [surveys, setSurveys] = useState([]);
  const [surveyMediaBySurvey, setSurveyMediaBySurvey] = useState({});
  const [surveyEntriesBySurvey, setSurveyEntriesBySurvey] = useState({});
  const [surveyLayoutsBySurvey, setSurveyLayoutsBySurvey] = useState({});
  const [surveyDrawingsBySurvey, setSurveyDrawingsBySurvey] = useState({});


  // Diary — keyed by project_id, loaded on demand
  const [diaryEntriesByProject, setDiaryEntriesByProject] = useState({});

  // ---- Derived ----------------------------------------------------------------
  const effectiveUser = impersonating || currentUser;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(effectiveUser?.role);
  // Active collective id — null means personal context
  const activeCollectiveId = (() => {
    if (effectiveUser?.role !== 'superadmin')
      return effectiveUser?.active_collective_id ?? null;
    if (impersonating)
      return impersonating.active_collective_id ?? null;
    return null;
  })();
  // Keep effectiveEntityId as alias for superadmin god mode cookie (still uses entity UUID)
  const effectiveEntityId = activeCollectiveId;

  const uid = effectiveUser?.id;

  // Collectives for the effective user (context switcher list)
  const effectiveCollectives = (() => {
    if (!impersonating) return collectives;
    return allMemberships
      .filter(m => m.user_id === impersonating.id)
      .map(m => ({
        collective_id: m.entity_id,
        name: entities.find(e => e.id === m.entity_id)?.name || '…',
        role: m.role,
      }));
  })();
  // True if the *effective* user (real or impersonated) has admin-level access
  const effectiveIsAdmin = ['admin', 'superadmin'].includes(effectiveUser?.role);

  // /api/entity/data already scopes data to the active context — minimal client-side filtering needed.
  // In collective context the server already returns only collective-scoped records, so no extra
  // ownership filter is applied — all collective members should see everything in the collective.
  const visibleProjects = (() => {
    if (isSuperAdmin && !impersonating) return projects;
    if (!effectiveIsAdmin && uid && !activeCollectiveId)
      return projects.filter(p => (p.members || []).includes(uid) || p.owner_id === uid);
    return projects;
  })();

  const visibleQuotes = (() => {
    if (isSuperAdmin && !impersonating) return quotes;
    if (!effectiveIsAdmin && uid && !activeCollectiveId)
      return quotes.filter(q => q.owner_id === uid || (q.shared_with || []).includes(uid));
    return quotes;
  })();

  const visibleClients = (() => {
    if (isSuperAdmin && !impersonating) return clients;
    // Clients are always personal — already filtered server-side by owner_id
    return clients;
  })();

  const visibleUsers = (() => {
    if (isSuperAdmin && !impersonating) return users;
    return users;
  })();

  // ---- Route guard ------------------------------------------------------------
  const PUBLIC_ROUTE_PREFIXES = ['/login', '/change-password', '/szakemberek/', '/p/', '/clients/', '/naplo/', '/auth/', '/invitations/', '/demo', '/portal', '/impressum', '/adatkezeles', '/aszf', '/about', '/checkout-popup-success'];
  const PUBLIC_ROUTE_EXACT = ['/'];
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      const isPublic = PUBLIC_ROUTE_EXACT.includes(pathname) || PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
      if (!isPublic) {
        router.replace('/login');
      }
      return;
    }
    if (currentUser.must_change_password && pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [loading, currentUser, pathname]);
  // -----------------------------------------------------------------------------

  const fetchProfile = async () => {
    const res = await fetch('/api/auth/profile');
    if (!res.ok) return null;
    const { profile, collectives: c } = await res.json();
    if (c) setCollectives(c);
    return profile || null;
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile();

          const user = {
            id: session.user.id,
            email: session.user.email,
            display_name: profile?.display_name || session.user.email,
            role: profile?.role || 'user',
            active_collective_id: profile?.active_collective_id || null,
            must_change_password: profile?.must_change_password ?? false,
            is_subscription_premium: profile?.is_subscription_premium ?? false,
            subscription_tier: profile?.subscription_tier ?? 'basic',
            trial_started_at: profile?.trial_started_at ?? null,
            trial_ends_at: profile?.trial_ends_at ?? null,
            default_tax_percent: profile?.default_tax_percent ?? 27,
          };
          setCurrentUser(user);
          await refreshSupabaseData(user);
        }
      } catch (err) {
        console.error('Init error:', err);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setCurrentUser(null);
        setImpersonating(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        router.push('/change-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('god_mode');
      if (saved) {
        const data = JSON.parse(saved);
        setImpersonating(data);
        // Re-sync cookie so server components see it after a hard refresh
        if (data?.id) {
          document.cookie = `god_mode_user=${data.id}; path=/; SameSite=Lax`;
        }
        if (data?.active_collective_id) {
          document.cookie = `god_mode_entity=${data.active_collective_id}; path=/; SameSite=Lax`;
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (impersonating) sessionStorage.setItem('god_mode', JSON.stringify(impersonating));
    else sessionStorage.removeItem('god_mode');
  }, [impersonating]);

  const refreshSupabaseData = async (userOverride) => {
    const user = userOverride || currentUser;
    if (!user) return;

    try {
      if (user.role === 'superadmin') {
        // Check impersonation state BEFORE fetching so we know whether to hold dataReady.
        const isActivelyImpersonating = typeof sessionStorage !== 'undefined'
          && !!sessionStorage.getItem('god_mode');
        const godModeUser = typeof document !== 'undefined'
          ? document.cookie.match(/god_mode_user=([a-f0-9-]+)/)?.[1]
          : null;

        const res = await fetch('/api/superadmin/data');
        if (res.ok) {
          const d = await res.json();
          setEntities(d.entities);
          setAllMemberships(d.allMemberships || []);
          if (!isActivelyImpersonating) {
            // Not impersonating — use SA global data directly and mark ready.
            setUsers(d.users);
            setProjects(d.projects);
            setInvoices(d.invoices);
            setLabourEntries(d.labourEntries);
            setClients(d.clients);
            setQuotes(d.quotes);
            setQuoteEntries(d.quoteEntries);
            setQuoteSections(d.quoteSections || []);
            setSurveys([]);
            setProjectRooms([]);
            // Clear any stale god mode cookies
            if (typeof document !== 'undefined' && godModeUser) {
              document.cookie = 'god_mode_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
              document.cookie = 'god_mode_entity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            }
            setDataReady(true);
          }
          // When impersonating, do NOT set dataReady yet — wait for entity-scoped fetch below
          // so pages never briefly flash the full SA dataset.
        }

        if (godModeUser && isActivelyImpersonating) {
          const entityRes = await fetch('/api/entity/data', { cache: 'no-store' });
          if (entityRes.ok) {
            const d = await entityRes.json();
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
            setDataReady(true);
          }
        }
        return;
      }

      const entityRes = await fetch('/api/entity/data', { cache: 'no-store' });
      if (entityRes.ok) {
        const d = await entityRes.json();
        setUsers(d.users);
        setProjects(d.projects);
        setInvoices(d.invoices);
        setLabourEntries(d.labourEntries);
        setClients(d.clients);
        setQuotes(d.quotes);
        setQuoteEntries(d.quoteEntries);
        setQuoteSections(d.quoteSections || []);
        setSurveys(d.surveys || []);
        setProjectRooms(d.projectRooms || []);
        setDataReady(true);
      }
    } catch (err) {
      console.error('refreshSupabaseData error:', err);
    }
  };

  // ---- Audit (fire-and-forget) ------------------------------------------------
  const auditLog = (action, extras = {}) => {
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extras }),
    }).catch(() => {});
  };

  // ---- Auth -------------------------------------------------------------------

  const login = async (email, password, { noRedirect = false } = {}) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await fetchProfile();

    const user = {
      id: data.user.id,
      email: data.user.email,
      display_name: profile?.display_name || data.user.email,
      role: profile?.role || 'user',
      active_collective_id: profile?.active_collective_id || null,
      must_change_password: profile?.must_change_password ?? false,
      is_subscription_premium: profile?.is_subscription_premium ?? false,
      default_tax_percent: profile?.default_tax_percent ?? 27,
    };

    setCurrentUser(user);
    await refreshSupabaseData(user);

    auditLog('Bejelentkezés', { entityId: user.active_collective_id || user.id });

    if (!noRedirect) {
      if (user.must_change_password) {
        router.push('/change-password');
      } else if (user.role === 'superadmin') {
        router.push('/superadmin');
      } else if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
    return user;
  };

  const loginWithOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const registerWithEmail = async (name, email, password, gdprConsentedAt, { noRedirect = false } = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, must_change_password: false, gdpr_consented_at: gdprConsentedAt } },
    });
    if (error) throw error;
    if (data.session) {
      const profile = await fetchProfile();
      const user = {
        id: data.user.id,
        email: data.user.email,
        display_name: profile?.display_name || name,
        role: profile?.role || 'user',
        active_collective_id: profile?.active_collective_id || null,
        must_change_password: false,
        is_subscription_premium: profile?.is_subscription_premium ?? false,
        default_tax_percent: profile?.default_tax_percent ?? 27,
      };
      setCurrentUser(user);
      await refreshSupabaseData(user);
      if (!noRedirect) router.push('/dashboard');
    }
    return data;
  };

  const resetPasswordEmail = async (email) => {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Hiba történt.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setImpersonating(null);
    router.push('/');
  };

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (error) throw error;

    // Use admin-client backed API so the update bypasses RLS (browser client silently no-ops on policy mismatch)
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ must_change_password: false }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Hiba a profil frissítésekor');
    }

    setCurrentUser(prev => ({ ...prev, must_change_password: false }));
    auditLog('Jelszó megváltoztatva', { entityId: currentUser?.active_collective_id || currentUser?.id });

    if (currentUser?.role === 'superadmin') router.push('/superadmin');
    else if (currentUser?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  // ---- God Mode ---------------------------------------------------------------

  const startImpersonation = async (userId, entityIdOverride) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin veheti át mások nézetét!');
    let profile = users.find(u => u.id === userId);
    if (!profile) {
      const res = await fetch(`/api/superadmin/user?id=${userId}`);
      if (!res.ok) throw new Error('Felhasználó nem található!');
      const data = await res.json();
      profile = data.profile;
    }
    const activeCollectiveId = entityIdOverride ?? profile?.active_collective_id ?? null;
    const impersonatingProfile = entityIdOverride
      ? { ...profile, active_collective_id: entityIdOverride }
      : profile;

    // Clear stale SA data immediately so pages don't briefly flash all-SA content
    setDataReady(false);
    setProjects([]); setClients([]); setQuotes([]); setInvoices([]);
    setLabourEntries([]); setSurveys([]); setProjectRooms([]);
    setQuoteEntries([]); setQuoteSections([]);

    setImpersonating(impersonatingProfile);
    document.cookie = `god_mode_user=${userId}; path=/; SameSite=Lax`;
    if (activeCollectiveId) {
      document.cookie = `god_mode_entity=${activeCollectiveId}; path=/; SameSite=Lax`;
    } else {
      document.cookie = 'god_mode_entity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }

    // Full entity-scoped fetch so context has the right data before any page renders it
    try {
      const res = await fetch('/api/entity/data', { cache: 'no-store' });
      if (res.ok) {
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
      }
    } catch { /* non-fatal */ }

    setDataReady(true);
    if (profile?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  const stopImpersonation = async () => {
    setImpersonating(null);
    document.cookie = 'god_mode_entity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'god_mode_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    // Clear sessionStorage NOW so refreshSupabaseData doesn't think we're still impersonating
    try { sessionStorage.removeItem('god_mode'); } catch {}
    // Reload SA global data so the superadmin page has fresh data and dataReady = true
    await refreshSupabaseData(currentUser);
    router.push('/superadmin');
  };

  // ---- Context Switcher -------------------------------------------------------

  const setActiveContext = async (collectiveId) => {
    // Update DB first — creation routes read active_collective_id from the DB,
    // so the client must not reflect the new context until the write is confirmed.
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
      document.cookie = `god_mode_entity=${collectiveId}; path=/; SameSite=Lax`;
    } else {
      document.cookie = 'god_mode_entity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    setDataReady(false);
    try {
      const res = await fetch('/api/entity/data', { cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      setUsers(d.users || []);
      setProjects(d.projects || []);
      setInvoices(d.invoices || []);
      setLabourEntries(d.labourEntries || []);
      setClients(d.clients || []);
      setQuotes(d.quotes || []);
      setQuoteEntries(d.quoteEntries || []);
      setQuoteSections(d.quoteSections || []);
      setSurveys(d.surveys || []);
      setProjectRooms(d.projectRooms || []);
    } catch { /* non-fatal */ }
    setDataReady(true);
  };

  // ---- Entities (superadmin only) --------------------------------------------

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
      body: JSON.stringify({ displayName, email, password, role, entityId: resolvedEntityId })
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a felhasználó létrehozásakor');

    const newUser = resData.user;
    setUsers(prev => [...prev, newUser].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '', 'hu')));
    return newUser;
  };

  const deleteUser = async (userId) => {
    if (!isAdmin) throw new Error('Nincs jogosultsága!');
    if (userId === currentUser?.id) throw new Error('Saját fiókját nem törölheti!');

    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a törléskor');

    // Soft-delete: keep user in state so project settlement maths stay intact,
    // but mark them as departed so the UI can show the "Kilépett" badge.
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, deleted_at: new Date().toISOString() } : u
    ));
  };

  const resetUserPassword = async (userId, temporaryPassword = 'Epitek2026!') => {
    if (!isAdmin) throw new Error('Nincs jogosultsága!');

    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, temporaryPassword })
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Hiba a jelszó visszaállításakor');

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, must_change_password: true } : u));
    return resData;
  };

  // ---- Invoice image ----------------------------------------------------------

  const uploadInvoiceImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${effectiveUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage.from('invoices').upload(fileName, file);
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('invoices').getPublicUrl(data.path);
    return { imageUrl: publicUrlData.publicUrl, storagePath: data.path };
  };

  // ---- Invoices ---------------------------------------------------------------

  const createInvoice = async ({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue, roomId, aiLineItems, aiTotal }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue, roomId, aiLineItems, aiTotal }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a számla mentésekor');
    setInvoices(prev => [json.invoice, ...prev]);
    return json.invoice;
  };

  const updateInvoice = async (invoiceId, fields) => {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a módosításkor');
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? json.invoice : inv));
    return json.invoice;
  };

  const deleteInvoice = async (invoiceId) => {
    const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a törléskor');
    const now = new Date().toISOString();
    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, deleted_at: now } : inv
    ));
  };

  // ---- Labour -----------------------------------------------------------------

  const createLabourEntry = async ({ projectId, date, labourType, hours, hourlyRate, description, roomId, unit }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/labour-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, date, labourType, hours, hourlyRate, description, roomId, unit }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a munkabejegyzés mentésekor');
    setLabourEntries(prev => [json.labourEntry, ...prev]);
    return json.labourEntry;
  };

  const updateLabourEntry = async (entryId, fields) => {
    const res = await fetch(`/api/labour-entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a módosításkor');
    setLabourEntries(prev => prev.map(e => e.id === entryId ? json.labourEntry : e));
    return json.labourEntry;
  };

  const deleteLabourEntry = async (entryId) => {
    const res = await fetch(`/api/labour-entries/${entryId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a törléskor');
    setLabourEntries(prev => prev.filter(e => e.id !== entryId));
  };

  // ---- Projects ---------------------------------------------------------------

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
    const isOwner = proj?.owner_id === uid || proj?.created_by === uid;
    if (!isAdmin && !isOwner) throw new Error('Csak adminisztrátor vagy a projekt tulajdonosa módosíthat!');
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

  const closeProject = async (projectId) => {
    return updateProject(projectId, { closed_at: new Date().toISOString() });
  };

  const reopenProject = async (projectId) => {
    return updateProject(projectId, { closed_at: null });
  };

  const deleteProject = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    const isCreator = project?.created_by === effectiveUser?.id;
    if (!isAdmin && !isCreator) throw new Error('Nincs jogosultsága törölni ezt a projektet!');
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

  // ---- Clients ----------------------------------------------------------------

  const createClient = async ({ name, address, phone, email, notes, discountPercent = 0, companyName, taxNumber, gdprConsent, collectiveShares = [], sharesGdprConfirmed = false }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, email, notes, discountPercent, companyName, taxNumber, gdprConsent, collectiveShares, sharesGdprConfirmed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél létrehozásakor');
    setClients(prev => [...prev, data.client].sort((a, b) => a.name.localeCompare(b.name, 'hu')));
    return data.client;
  };

  const updateClient = async (clientId, fields) => {
    const client = clients.find(c => c.id === clientId);
    if (!isAdmin && client?.owner_id !== uid) throw new Error('Csak adminisztrátor vagy az ügyfél tulajdonosa módosíthat!');
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél módosításakor');
    setClients(prev => prev.map(c => c.id === clientId ? data.client : c).sort((a, b) => a.name.localeCompare(b.name, 'hu')));
    return data.client;
  };

  const deleteClient = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!isAdmin && client?.owner_id !== uid) throw new Error('Csak adminisztrátor vagy az ügyfél tulajdonosa törölhet!');
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél törlésekor');
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  // ---- Quotes -----------------------------------------------------------------

  // ---- Surveys ----------------------------------------------------------------

  const createSurvey = async ({ title, notes, date, location, clientId, sharedWith = [], collectiveId: collectiveIdOverride }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes, date: date || null, location, client_id: clientId || null, collective_id: collectiveIdOverride ?? activeCollectiveId ?? null, shared_with: sharedWith }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a felmérés létrehozásakor');
    setSurveys(prev => [data.survey, ...prev]);
    return data.survey;
  };

  const updateSurvey = async (surveyId, fields) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isSurveyOwner = survey?.owner_id === uid || survey?.created_by === uid;
    if (!isAdmin && !isSurveyOwner) throw new Error('Csak adminisztrátor vagy a felmérés tulajdonosa módosíthat!');
    const res = await fetch(`/api/surveys/${surveyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a felmérés módosításakor');
    setSurveys(prev => prev.map(s => s.id === surveyId ? data.survey : s));
    return data.survey;
  };

  const deleteSurvey = async (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isSurveyOwner = survey?.owner_id === uid || survey?.created_by === uid;
    if (!isAdmin && !isSurveyOwner) throw new Error('Csak adminisztrátor vagy a felmérés tulajdonosa törölhet!');
    const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a felmérés törlésekor');
    setSurveys(prev => prev.filter(s => s.id !== surveyId));
    setSurveyMediaBySurvey(prev =>    { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyLayoutsBySurvey(prev =>  { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyEntriesBySurvey(prev =>  { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyDrawingsBySurvey(prev => { const n = { ...prev }; delete n[surveyId]; return n; });
  };

  const fetchSurveyMedia = async (surveyId) => {
    const res = await fetch(`/api/surveys/${surveyId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a média betöltésekor');
    setSurveyMediaBySurvey(prev => ({ ...prev, [surveyId]: data.photos || [] }));
    setSurveyLayoutsBySurvey(prev => ({ ...prev, [surveyId]: data.layouts || [] }));
    setSurveyEntriesBySurvey(prev => ({ ...prev, [surveyId]: data.entries || [] }));
    setSurveyDrawingsBySurvey(prev => ({ ...prev, [surveyId]: data.drawings || [] }));
    return data;
  };

  const uploadSurveyMedia = async (surveyId, files, { entryId = null, mediaType = 'photo' } = {}) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isOwner  = survey?.owner_id === uid || survey?.created_by === uid;
    const isShared = (survey?.shared_with || []).includes(effectiveUser?.id);
    if (!isAdmin && !isOwner && !isShared) throw new Error('Nincs jogosultsága!');
    const processed = await processMediaFiles(files);
    const formData = new FormData();
    for (const file of processed) formData.append('files', file);
    formData.append('survey_id', surveyId);
    if (entryId) formData.append('entry_id', entryId);
    formData.append('media_type', mediaType);
    const res = await fetch('/api/surveys/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a feltöltés közben');
    if (entryId) {
      setSurveyEntriesBySurvey(prev => ({
        ...prev,
        [surveyId]: (prev[surveyId] || []).map(e =>
          e.id === entryId ? { ...e, media: [...(e.media || []), ...data.media] } : e
        ),
      }));
    } else if (mediaType === 'layout') {
      setSurveyLayoutsBySurvey(prev => ({
        ...prev,
        [surveyId]: [...(prev[surveyId] || []), ...data.media],
      }));
    } else {
      setSurveyMediaBySurvey(prev => ({
        ...prev,
        [surveyId]: [...(prev[surveyId] || []), ...data.media],
      }));
    }
    return data.media;
  };

  const deleteSurveyMedia = async (mediaId, surveyId, entryId = null, mediaType = 'photo') => {
    const survey = surveys.find(s => s.id === surveyId);
    const isOwner  = survey?.owner_id === uid || survey?.created_by === uid;
    const isShared = (survey?.shared_with || []).includes(effectiveUser?.id);
    if (!isAdmin && !isOwner && !isShared) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/surveys/${surveyId}/media/${mediaId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a média törlésekor');
    if (entryId) {
      setSurveyEntriesBySurvey(prev => ({
        ...prev,
        [surveyId]: (prev[surveyId] || []).map(e =>
          e.id === entryId ? { ...e, media: (e.media || []).filter(m => m.id !== mediaId) } : e
        ),
      }));
    } else if (mediaType === 'layout') {
      setSurveyLayoutsBySurvey(prev => ({
        ...prev,
        [surveyId]: (prev[surveyId] || []).filter(m => m.id !== mediaId),
      }));
    } else {
      setSurveyMediaBySurvey(prev => ({
        ...prev,
        [surveyId]: (prev[surveyId] || []).filter(m => m.id !== mediaId),
      }));
    }
  };

  const createSurveyEntry = async (surveyId, { name, description, width_m, length_m, height_m, window_count, door_count, sort_order }) => {
    const res = await fetch(`/api/surveys/${surveyId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, width_m, length_m, height_m, window_count, door_count, sort_order }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a helyiség létrehozásakor');
    setSurveyEntriesBySurvey(prev => ({
      ...prev,
      [surveyId]: [...(prev[surveyId] || []), data.entry],
    }));
    return data.entry;
  };

  const updateSurveyEntry = async (surveyId, entryId, fields) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isOwner  = survey?.owner_id === uid || survey?.created_by === uid;
    const isShared = (survey?.shared_with || []).includes(effectiveUser?.id);
    if (!isAdmin && !isOwner && !isShared) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/surveys/${surveyId}/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a módosításkor');
    setSurveyEntriesBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).map(e =>
        e.id === entryId ? { ...e, ...data.entry } : e
      ),
    }));
    return data.entry;
  };

  const deleteSurveyEntry = async (surveyId, entryId) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isOwner  = survey?.owner_id === uid || survey?.created_by === uid;
    const isShared = (survey?.shared_with || []).includes(effectiveUser?.id);
    if (!isAdmin && !isOwner && !isShared) throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/surveys/${surveyId}/entries/${entryId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a törléskor');
    setSurveyEntriesBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).filter(e => e.id !== entryId),
    }));
    setSurveyDrawingsBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).filter(d => d.entry_id !== entryId),
    }));
    setSurveyMediaBySurvey(prev => ({ ...prev }));
  };

  // ---- Survey drawings --------------------------------------------------------

  const createSurveyDrawing = async (surveyId, { svg_data, entry_id }) => {
    const res = await fetch(`/api/surveys/${surveyId}/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svg_data, entry_id: entry_id || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a vázlat mentésekor');
    setSurveyDrawingsBySurvey(prev => ({
      ...prev,
      [surveyId]: [...(prev[surveyId] || []), data.drawing],
    }));
    return data.drawing;
  };

  const deleteSurveyDrawing = async (surveyId, drawingId) => {
    const res = await fetch(`/api/surveys/${surveyId}/drawings/${drawingId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a vázlat törlésekor');
    setSurveyDrawingsBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).filter(d => d.id !== drawingId),
    }));
  };

  // ---- Quotes -----------------------------------------------------------------

  const createQuote = async ({ title, location, workType, description, startDate, endDate, clientId, sharedWith = [], taxPercent = 27, collectiveId: collectiveIdOverride, surveyId }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const targetCollectiveId = collectiveIdOverride ?? activeCollectiveId ?? null;

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id:      effectiveUser.id,
        collective_id: targetCollectiveId,
        title,
        location,
        work_type: workType,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        client_id: clientId || null,
        created_by: effectiveUser.id,
        shared_with: sharedWith,
        tax_percent: Number(taxPercent) || 0,
        survey_id: surveyId || null,
      }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Hiba az ajánlat létrehozásakor');
    const data = payload.quote;
    setQuotes(prev => [data, ...prev]);
    return data;
  };

  const updateQuote = async (quoteId, fields) => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        updated_at: new Date().toISOString(),
        updated_by_name: effectiveUser?.display_name || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ajánlat módosításakor');
    setQuotes(prev => prev.map(q => q.id === quoteId ? data.quote : q));
    return data.quote;
  };

  const updateQuoteStatus = async (quoteId, status) => {
    return updateQuote(quoteId, { status });
  };

  const deleteQuote = async (quoteId) => {
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ajánlat törlésekor');
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    setQuoteEntries(prev => prev.filter(e => e.quote_id !== quoteId));
    setQuoteSections(prev => prev.filter(s => s.quote_id !== quoteId));
  };

  // ---- Quote sections ---------------------------------------------------------

  const createQuoteSection = async (quoteId, { name, description, width_m, length_m, height_m, window_count, door_count, survey_entry_id, sort_order, start_date, end_date }) => {
    const res = await fetch(`/api/quotes/${quoteId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, width_m, length_m, height_m, window_count, door_count, survey_entry_id, sort_order, start_date, end_date }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a szekció létrehozásakor');
    setQuoteSections(prev => [...prev, data.section]);
    return data.section;
  };

  const updateQuoteSection = async (quoteId, sectionId, fields) => {
    const res = await fetch(`/api/quotes/${quoteId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a módosításkor');
    setQuoteSections(prev => prev.map(s => s.id === sectionId ? data.section : s));
    return data.section;
  };

  const deleteQuoteSection = async (quoteId, sectionId) => {
    const res = await fetch(`/api/quotes/${quoteId}/sections/${sectionId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a törléskor');
    setQuoteSections(prev => prev.filter(s => s.id !== sectionId));
    // un-group entries that belonged to this section
    setQuoteEntries(prev => prev.map(e => e.section_id === sectionId ? { ...e, section_id: null } : e));
  };

  const shareQuoteWith = async (quoteId, userId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    if (quote.created_by !== effectiveUser?.id && !isAdmin) throw new Error('Nincs jogosultsága!');
    // Only share with users within the same entity
    const recipient = users.find(u => u.id === userId);
    if (!recipient) throw new Error('A felhasználó nem található!');
    const newShared = [...new Set([...(quote.shared_with || []), userId])];
    return updateQuote(quoteId, { shared_with: newShared });
  };

  const unshareQuoteWith = async (quoteId, userId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    if (quote.created_by !== effectiveUser?.id && !isAdmin) throw new Error('Nincs jogosultsága!');
    const newShared = (quote.shared_with || []).filter(id => id !== userId);
    return updateQuote(quoteId, { shared_with: newShared });
  };

  // ---- Quote Entries ----------------------------------------------------------

  const createQuoteEntry = async ({ quoteId, userId, workDescription, amountHuf, notes, entryType, quantity, unit, unitPrice, sectionId }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');

    const payload = {
      quote_id: quoteId,
      user_id: userId || effectiveUser.id,
      entry_type: entryType || 'other',
      work_description: workDescription,
      quantity: quantity != null ? Number(quantity) : null,
      unit: unit || null,
      unit_price: unitPrice != null ? Number(unitPrice) : null,
      amount_huf: Number(amountHuf),
      notes: notes || '',
      section_id: sectionId || null,
      created_by_name: effectiveUser.display_name || null,
    };

    const res = await fetch(`/api/quotes/${quoteId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel létrehozásakor');
    setQuoteEntries(prev => [...prev, data.entry]);
    return data.entry;
  };

  const updateQuoteEntry = async (entryId, fields) => {
    const entry = quoteEntries.find(e => e.id === entryId);
    if (!entry) return;
    const res = await fetch(`/api/quotes/${entry.quote_id}/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel módosításakor');
    setQuoteEntries(prev => prev.map(e => e.id === entryId ? data.entry : e));
    return data.entry;
  };

  const deleteQuoteEntry = async (entryId) => {
    const entry = quoteEntries.find(e => e.id === entryId);
    if (!entry) return;
    const res = await fetch(`/api/quotes/${entry.quote_id}/entries/${entryId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel törlésekor');
    setQuoteEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const convertQuoteToProject = async (quoteId, memberIds) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Az ajánlat nem található!');
    if (!isAdmin && quote.created_by !== effectiveUser?.id) throw new Error('Nincs jogosultsága!');

    const projDescription = [quote.work_type, quote.description].filter(Boolean).join(' – ');

    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .insert([{
        owner_id:      effectiveUser.id,
        collective_id: quote.collective_id || null,
        name: quote.title,
        description: projDescription,
        created_by: effectiveUser.id,
        start_date: quote.start_date,
        end_date: quote.end_date,
        client_id: quote.client_id || null,
        survey_id: quote.survey_id || null,
      }])
      .select()
      .single();

    if (projErr) throw projErr;

    if (memberIds.length > 0) {
      const rows = memberIds.map(uId => ({ project_id: proj.id, user_id: uId }));
      await supabase.from('project_members').insert(rows);
    }

    await supabase.from('quotes').update({ status: 'accepted', project_id: proj.id }).eq('id', quoteId);
    setProjects(prev => [{ ...proj, members: memberIds }, ...prev]);
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted', project_id: proj.id } : q));
    return proj;
  };

  // ---- Diary ------------------------------------------------------------------

  const fetchDiaryEntries = async (projectId) => {
    const res = await fetch(`/api/diary?project_id=${projectId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a napló betöltésekor');
    setDiaryEntriesByProject(prev => ({ ...prev, [projectId]: data.entries }));
    return data.entries;
  };

  const createDiaryEntry = async ({ projectId, title, body, entryDate, photoIds = [], workType, internalNote, clientNote, isPublic = false, roomId }) => {
    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, title, body, entry_date: entryDate, photo_ids: photoIds, work_type: workType, internal_note: internalNote, client_note: clientNote, is_public: isPublic, room_id: roomId || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a bejegyzés létrehozásakor');
    setDiaryEntriesByProject(prev => ({
      ...prev,
      [projectId]: [data.entry, ...(prev[projectId] || [])],
    }));
    return data.entry;
  };

  const deleteDiaryPhoto = async (photoId, projectId) => {
    const res = await fetch(`/api/diary/photos/${photoId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a fotó törlésekor');
    setDiaryEntriesByProject(prev => {
      const next = { ...prev };
      if (next[projectId]) {
        next[projectId] = next[projectId].map(entry => ({
          ...entry,
          photos: (entry.photos || []).filter(p => p.id !== photoId),
        }));
      }
      return next;
    });
  };

  const updateDiaryEntry = async (entryId, fields) => {
    const res = await fetch(`/api/diary/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a bejegyzés frissítésekor');
    // Update in-memory state across all projects
    setDiaryEntriesByProject(prev => {
      const next = { ...prev };
      for (const [pid, entries] of Object.entries(next)) {
        next[pid] = entries.map(e => e.id === entryId ? { ...e, ...data.entry } : e);
      }
      return next;
    });
    return data.entry;
  };

  const deleteDiaryEntry = async (entryId, projectId) => {
    const res = await fetch(`/api/diary/${entryId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a törléskor');
    if (projectId) {
      setDiaryEntriesByProject(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(e => e.id !== entryId),
      }));
    }
  };

  const uploadDiaryPhotos = async (projectId, files, isPrivate = false) => {
    const processed = await processMediaFiles(files);
    const formData = new FormData();
    for (const file of processed) formData.append('files', file);
    formData.append('project_id', projectId);
    formData.append('is_private', String(isPrivate));
    const res = await fetch('/api/diary/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a fotók feltöltésekor');
    return data.photos;
  };

  // ---- Context value ----------------------------------------------------------

  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser: effectiveUser,  // backward compat: pages use currentUser for display
        realUser: currentUser,        // actual auth user (for god mode UI)
        impersonating,
        isSuperAdmin,
        isAdmin,
        effectiveEntityId,
        activeCollectiveId,
        loading,
        dataReady,
        // Collectives & context switcher
        collectives,
        effectiveCollectives,
        allMemberships,
        setActiveContext,
        switchImpersonatingContext,
        // God Mode
        startImpersonation,
        stopImpersonation,
        // Data (entity-filtered when in god mode)
        entities,
        users: visibleUsers,
        projects: visibleProjects,
        invoices,
        labourEntries,
        clients: visibleClients,
        quotes: visibleQuotes,
        quoteEntries,
        // Auth actions
        login,
        loginWithOAuth,
        registerWithEmail,
        resetPasswordEmail,
        logout,
        changePassword,
        // Entity management
        createEntity,
        updateEntity,
        deleteEntity,
        // User management
        createUser,
        deleteUser,
        resetUserPassword,
        // Invoice
        uploadInvoiceImage,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        // Labour
        createLabourEntry,
        updateLabourEntry,
        deleteLabourEntry,
        // Projects
        createProject,
        updateProject,
        closeProject,
        reopenProject,
        updateProjectMembers,
        deleteProject,
        // Clients
        createClient,
        updateClient,
        deleteClient,
        // Quotes
        createQuote,
        updateQuote,
        updateQuoteStatus,
        deleteQuote,
        shareQuoteWith,
        unshareQuoteWith,
        // Quote entries
        createQuoteEntry,
        updateQuoteEntry,
        deleteQuoteEntry,
        convertQuoteToProject,
        // Quote sections
        quoteSections,
        createQuoteSection,
        updateQuoteSection,
        deleteQuoteSection,
        // Surveys
        surveys,
        surveyMediaBySurvey,
        surveyEntriesBySurvey,
        surveyLayoutsBySurvey,
        surveyDrawingsBySurvey,
        createSurveyDrawing,
        deleteSurveyDrawing,
        createSurvey,
        updateSurvey,
        deleteSurvey,
        fetchSurveyMedia,
        uploadSurveyMedia,
        deleteSurveyMedia,
        createSurveyEntry,
        updateSurveyEntry,
        deleteSurveyEntry,
        // Project rooms
        projectRooms,
        createProjectRoom,
        updateProjectRoom,
        deleteProjectRoom,
        syncRoomsFromQuote,
        // Diary
        diaryEntriesByProject,
        fetchDiaryEntries,
        createDiaryEntry,
        updateDiaryEntry,
        deleteDiaryEntry,
        deleteDiaryPhoto,
        uploadDiaryPhotos,
        // Misc
        refreshSupabaseData,
        refreshCollectives: fetchProfile
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
