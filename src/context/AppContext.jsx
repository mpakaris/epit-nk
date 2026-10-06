'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseClient());

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);   // real authenticated user
  const [impersonating, setImpersonating] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [entities, setEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labourEntries, setLabourEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quoteEntries, setQuoteEntries] = useState([]);

  // ---- Derived ----------------------------------------------------------------
  const effectiveUser = impersonating || currentUser;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = ['admin', 'superadmin'].includes(effectiveUser?.role);
  // entity_id of the active context — falls back to single entity if superadmin has none set
  const effectiveEntityId = (() => {
    if (effectiveUser?.role !== 'superadmin') return effectiveUser?.entity_id ?? null;
    if (impersonating) return impersonating.entity_id ?? null;
    if (currentUser?.entity_id) return currentUser.entity_id;
    if (entities.length === 1) return entities[0].id;
    return null;
  })();

  const uid = effectiveUser?.id;
  // True if the *effective* user (real or impersonated) has admin-level access
  const effectiveIsAdmin = ['admin', 'superadmin'].includes(effectiveUser?.role);

  const visibleProjects = (() => {
    if (isSuperAdmin && !impersonating) return projects;
    // SA impersonating: always scope to the impersonated user's entity first
    if (isSuperAdmin && impersonating && effectiveEntityId) {
      const entityProjects = projects.filter(p => p.entity_id === effectiveEntityId);
      // If impersonating a non-admin, further restrict to their project memberships
      if (!effectiveIsAdmin && uid)
        return entityProjects.filter(p => (p.members || []).includes(uid));
      return entityProjects;
    }
    // Regular non-admin: only their assigned projects (API already entity-scoped)
    if (!effectiveIsAdmin && uid)
      return projects.filter(p => (p.members || []).includes(uid));
    // Entity admin: all entity projects (already scoped by /api/entity/data)
    return projects;
  })();

  const visibleQuotes = (() => {
    if (isSuperAdmin && !impersonating) return quotes;
    if (isSuperAdmin && impersonating && effectiveEntityId && effectiveIsAdmin)
      return quotes.filter(q => q.entity_id === effectiveEntityId);
    // Non-admin: only own/shared, and always scoped to entity
    if (!effectiveIsAdmin && uid)
      return quotes.filter(q =>
        q.entity_id === effectiveEntityId &&
        (q.created_by === uid || (q.shared_with || []).includes(uid))
      );
    // Entity admin: all entity quotes (already scoped by /api/entity/data)
    return quotes.filter(q => !effectiveEntityId || q.entity_id === effectiveEntityId);
  })();

  const visibleClients = (() => {
    if (isSuperAdmin && !impersonating) return clients;
    if (isSuperAdmin && impersonating && effectiveEntityId)
      return clients.filter(c => c.entity_id === effectiveEntityId);
    return clients;
  })();

  const visibleUsers = (() => {
    if (isSuperAdmin && !impersonating) return users;
    if (effectiveEntityId) return users.filter(u => u.entity_id === effectiveEntityId);
    return users;
  })();

  // -----------------------------------------------------------------------------

  const fetchProfile = async () => {
    const res = await fetch('/api/auth/profile');
    if (!res.ok) return null;
    const { profile } = await res.json();
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
            entity_id: profile?.entity_id || null,
            must_change_password: profile?.must_change_password ?? false
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setImpersonating(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('god_mode');
      if (saved) setImpersonating(JSON.parse(saved));
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
        const res = await fetch('/api/superadmin/data');
        if (res.ok) {
          const d = await res.json();
          setEntities(d.entities);
          setUsers(d.users);
          setProjects(d.projects);
          setInvoices(d.invoices);
          setLabourEntries(d.labourEntries);
          setClients(d.clients);
          setQuotes(d.quotes);
          setQuoteEntries(d.quoteEntries);
        }
        return;
      }

      const entityRes = await fetch('/api/entity/data');
      if (entityRes.ok) {
        const d = await entityRes.json();
        setUsers(d.users);
        setProjects(d.projects);
        setInvoices(d.invoices);
        setLabourEntries(d.labourEntries);
        setClients(d.clients);
        setQuotes(d.quotes);
        setQuoteEntries(d.quoteEntries);
      }
    } catch (err) {
      console.error('refreshSupabaseData error:', err);
    }
  };

  // ---- Auth -------------------------------------------------------------------

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await fetchProfile();

    const user = {
      id: data.user.id,
      email: data.user.email,
      display_name: profile?.display_name || data.user.email,
      role: profile?.role || 'user',
      entity_id: profile?.entity_id || null,
      must_change_password: profile?.must_change_password ?? false
    };

    setCurrentUser(user);
    await refreshSupabaseData(user);

    if (user.must_change_password) {
      router.push('/change-password');
    } else if (user.role === 'superadmin') {
      router.push('/superadmin');
    } else if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/projektek');
    }
    return user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setImpersonating(null);
    router.push('/login');
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

    if (currentUser?.role === 'superadmin') router.push('/superadmin');
    else if (currentUser?.role === 'admin') router.push('/admin');
    else router.push('/projektek');
  };

  // ---- God Mode ---------------------------------------------------------------

  const startImpersonation = async (userId) => {
    if (!isSuperAdmin) throw new Error('Csak Superadmin veheti át mások nézetét!');
    let profile = users.find(u => u.id === userId);
    if (!profile) {
      const res = await fetch(`/api/superadmin/user?id=${userId}`);
      if (!res.ok) throw new Error('Felhasználó nem található!');
      const data = await res.json();
      profile = data.profile;
    }
    setImpersonating(profile);
    if (profile?.role === 'admin') router.push('/admin');
    else router.push('/projektek');
  };

  const stopImpersonation = () => {
    setImpersonating(null);
    router.push('/superadmin');
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
    const deletedProjectIds = new Set(projects.filter(p => p.entity_id === entityId).map(p => p.id));
    setEntities(prev => prev.filter(e => e.id !== entityId));
    setUsers(prev => prev.filter(u => u.entity_id !== entityId));
    setProjects(prev => prev.filter(p => p.entity_id !== entityId));
    setClients(prev => prev.filter(c => c.entity_id !== entityId));
    setQuotes(prev => prev.filter(q => q.entity_id !== entityId));
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

    setUsers(prev => prev.filter(u => u.id !== userId));
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

  const createInvoice = async ({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');

    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        project_id: projectId,
        uploaded_by: effectiveUser.id,
        uploader_name: effectiveUser.display_name,
        value_huf: Number(valueHuf),
        ocr_suggested_value: ocrSuggestedValue ? Number(ocrSuggestedValue) : null,
        category,
        description: description || '',
        image_url: imageUrl || '',
        storage_path: storagePath || ''
      }])
      .select()
      .single();

    if (error) throw error;
    setInvoices(prev => [data, ...prev]);
    return data;
  };

  const updateInvoice = async (invoiceId, fields) => {
    if (!isAdmin) throw new Error('Csak adminisztrátor módosíthat számlát!');

    const { data, error } = await supabase.from('invoices').update(fields).eq('id', invoiceId).select().single();
    if (error) throw error;
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? data : inv));
    return data;
  };

  const deleteInvoice = async (invoiceId) => {
    if (!isAdmin) throw new Error('Csak adminisztrátor törölhet számlát!');

    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (error) throw error;
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  };

  // ---- Labour -----------------------------------------------------------------

  const createLabourEntry = async ({ projectId, date, labourType, hours, hourlyRate, description }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');

    const valueHuf = Math.round(Number(hours) * Number(hourlyRate));

    const { data, error } = await supabase
      .from('labour_entries')
      .insert([{
        project_id: projectId,
        uploaded_by: effectiveUser.id,
        date,
        labour_type: labourType,
        hours: Number(hours),
        hourly_rate: Number(hourlyRate),
        value_huf: valueHuf,
        description: description || ''
      }])
      .select()
      .single();

    if (error) throw error;
    setLabourEntries(prev => [data, ...prev]);
    return data;
  };

  const deleteLabourEntry = async (entryId) => {
    const entry = labourEntries.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.uploaded_by !== effectiveUser?.id && !isAdmin) {
      throw new Error('Csak saját munkabejegyzést törölhet!');
    }

    const { error } = await supabase.from('labour_entries').delete().eq('id', entryId);
    if (error) throw error;
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
    if (!isAdmin) throw new Error('Csak adminisztrátor módosíthat projektet!');
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
    if (!isAdmin) throw new Error('Csak adminisztrátor módosíthat tagságot!');
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tagok mentésekor');
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, members: memberIds } : p));
  };

  const deleteProject = async (projectId) => {
    if (!isAdmin) throw new Error('Csak adminisztrátor törölhet projektet!');
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a projekt törlésekor');
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setInvoices(prev => prev.filter(inv => inv.project_id !== projectId));
    setLabourEntries(prev => prev.filter(e => e.project_id !== projectId));
  };

  // ---- Clients ----------------------------------------------------------------

  const createClient = async ({ name, address, phone, email, notes, discountPercent = 0, entityId: entityIdOverride }) => {
    if (!isAdmin) throw new Error('Csak adminisztrátor hozhat létre ügyfelet!');
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, email, notes, discountPercent, entityId: entityIdOverride || effectiveEntityId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél létrehozásakor');
    setClients(prev => [...prev, data.client].sort((a, b) => a.name.localeCompare(b.name, 'hu')));
    return data.client;
  };

  const updateClient = async (clientId, fields) => {
    if (!isAdmin) throw new Error('Csak adminisztrátor módosíthat ügyfelet!');
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
    if (!isAdmin) throw new Error('Csak adminisztrátor törölhet ügyfelet!');
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ügyfél törlésekor');
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  // ---- Quotes -----------------------------------------------------------------

  const createQuote = async ({ title, location, workType, description, startDate, endDate, clientId, sharedWith = [], taxPercent = 27, entityId: entityIdOverride }) => {
    if (!effectiveUser) throw new Error('Bejelentkezés szükséges!');
    const targetEntityId = entityIdOverride || effectiveEntityId;
    if (!targetEntityId) throw new Error('Nincs entitás hozzárendelve!');

    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        entity_id: targetEntityId,
        title,
        location,
        work_type: workType,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'draft',
        client_id: clientId || null,
        project_id: null,
        created_by: effectiveUser.id,
        shared_with: sharedWith,
        tax_percent: Number(taxPercent) || 0,
      }])
      .select()
      .single();

    if (error) throw error;
    setQuotes(prev => [data, ...prev]);
    return data;
  };

  const updateQuote = async (quoteId, fields) => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
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
  };

  const shareQuoteWith = async (quoteId, userId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    if (quote.created_by !== effectiveUser?.id && !isAdmin) throw new Error('Nincs jogosultsága!');
    // Only share with users within the same entity
    const recipient = users.find(u => u.id === userId);
    if (!recipient || recipient.entity_id !== quote.entity_id) throw new Error('A felhasználó nem tartozik ehhez az entitáshoz!');
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

  const createQuoteEntry = async ({ quoteId, userId, workDescription, amountHuf, notes, entryType, quantity, unit, unitPrice }) => {
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
      notes: notes || ''
    };

    const { data, error } = await supabase.from('quote_entries').insert([payload]).select().single();
    if (error) throw error;
    setQuoteEntries(prev => [...prev, data]);
    return data;
  };

  const updateQuoteEntry = async (entryId, fields) => {
    const entry = quoteEntries.find(e => e.id === entryId);
    if (!entry) return;
    if (entry.user_id !== effectiveUser?.id && !isAdmin) throw new Error('Csak saját tételt módosíthat!');

    const { data, error } = await supabase.from('quote_entries').update(fields).eq('id', entryId).select().single();
    if (error) throw error;
    setQuoteEntries(prev => prev.map(e => e.id === entryId ? data : e));
    return data;
  };

  const deleteQuoteEntry = async (entryId) => {
    const entry = quoteEntries.find(e => e.id === entryId);
    if (!entry) return;
    if (entry.user_id !== effectiveUser?.id && !isAdmin) throw new Error('Csak saját tételt törölhet!');

    const { error } = await supabase.from('quote_entries').delete().eq('id', entryId);
    if (error) throw error;
    setQuoteEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const convertQuoteToProject = async (quoteId, memberIds) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Az ajánlat nem található!');
    if (!isAdmin && quote.created_by !== effectiveUser?.id) throw new Error('Nincs jogosultsága!');
    if (!effectiveEntityId) throw new Error('Nincs entitás hozzárendelve!');
    if (quote.entity_id !== effectiveEntityId) throw new Error('Az ajánlat nem ehhez az entitáshoz tartozik!');

    const projDescription = [quote.work_type, quote.description].filter(Boolean).join(' – ');

    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .insert([{
        entity_id: effectiveEntityId,
        name: quote.title,
        description: projDescription,
        created_by: effectiveUser.id,
        start_date: quote.start_date,
        end_date: quote.end_date,
        client_id: quote.client_id || null,
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
        loading,
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
        deleteLabourEntry,
        // Projects
        createProject,
        updateProject,
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
        // Misc
        refreshSupabaseData
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
