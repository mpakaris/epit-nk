'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  INITIAL_DEMO_USERS,
  INITIAL_DEMO_PROJECTS,
  INITIAL_DEMO_INVOICES,
  INITIAL_DEMO_LABOUR_ENTRIES,
  INITIAL_DEMO_CLIENTS,
  INITIAL_DEMO_QUOTES,
  INITIAL_DEMO_QUOTE_ENTRIES
} from '@/lib/demo-data';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseClient());
  const [isConfigured] = useState(() => isSupabaseConfigured());

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [labourEntries, setLabourEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quoteEntries, setQuoteEntries] = useState([]);

  useEffect(() => {
    async function init() {
      setLoading(true);

      if (isConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            setCurrentUser({
              id: session.user.id,
              email: session.user.email,
              display_name: profile?.display_name || session.user.email,
              role: profile?.role || 'user',
              must_change_password: profile?.must_change_password ?? false
            });
          }

          await refreshSupabaseData();
        } catch (err) {
          console.error('Supabase initial fetch failed:', err);
          loadDemoData();
        }
      } else {
        loadDemoData();
      }

      setLoading(false);
    }

    init();
  }, [isConfigured]);

  const loadDemoData = () => {
    try {
      const savedUser = localStorage.getItem('epitek_demo_user');
      const savedProjects = localStorage.getItem('epitek_demo_projects');
      const savedInvoices = localStorage.getItem('epitek_demo_invoices');
      const savedUsers = localStorage.getItem('epitek_demo_users');
      const savedLabour = localStorage.getItem('epitek_demo_labour');
      const savedClients = localStorage.getItem('epitek_demo_clients');
      const savedQuotes = localStorage.getItem('epitek_demo_quotes');
      const savedQuoteEntries = localStorage.getItem('epitek_demo_quote_entries');

      setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_DEMO_USERS);
      setProjects(savedProjects ? JSON.parse(savedProjects) : INITIAL_DEMO_PROJECTS);
      setInvoices(savedInvoices ? JSON.parse(savedInvoices) : INITIAL_DEMO_INVOICES);
      setLabourEntries(savedLabour ? JSON.parse(savedLabour) : INITIAL_DEMO_LABOUR_ENTRIES);
      setClients(savedClients ? JSON.parse(savedClients) : INITIAL_DEMO_CLIENTS);
      setQuotes(savedQuotes ? JSON.parse(savedQuotes) : INITIAL_DEMO_QUOTES);
      setQuoteEntries(savedQuoteEntries ? JSON.parse(savedQuoteEntries) : INITIAL_DEMO_QUOTE_ENTRIES);

      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        setCurrentUser(INITIAL_DEMO_USERS[0]);
      }
    } catch {
      setUsers(INITIAL_DEMO_USERS);
      setProjects(INITIAL_DEMO_PROJECTS);
      setInvoices(INITIAL_DEMO_INVOICES);
      setLabourEntries(INITIAL_DEMO_LABOUR_ENTRIES);
      setClients(INITIAL_DEMO_CLIENTS);
      setQuotes(INITIAL_DEMO_QUOTES);
      setQuoteEntries(INITIAL_DEMO_QUOTE_ENTRIES);
      setCurrentUser(INITIAL_DEMO_USERS[0]);
    }
  };

  const refreshSupabaseData = async () => {
    if (!isConfigured) return;
    try {
      const { data: projs } = await supabase
        .from('projects')
        .select(`*, project_members (user_id)`);

      if (projs) {
        setProjects(projs.map(p => ({
          ...p,
          members: (p.project_members || []).map(pm => pm.user_id)
        })));
      }

      const { data: invs } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (invs) setInvoices(invs);

      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true });
      if (profs) setUsers(profs);

      const { data: labour } = await supabase
        .from('labour_entries')
        .select('*')
        .order('date', { ascending: false });
      if (labour) setLabourEntries(labour);

      const { data: cls } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (cls) setClients(cls);

      const { data: qts } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (qts) setQuotes(qts);

      const { data: qes } = await supabase
        .from('quote_entries')
        .select('*')
        .order('created_at', { ascending: true });
      if (qes) setQuoteEntries(qes);
    } catch (err) {
      console.error('Error refreshing data from Supabase:', err);
    }
  };

  // Auth: Login
  const login = async (email, password) => {
    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userObj = {
        id: data.user.id,
        email: data.user.email,
        display_name: profile?.display_name || data.user.email,
        role: profile?.role || 'user',
        must_change_password: profile?.must_change_password ?? false
      };

      setCurrentUser(userObj);
      await refreshSupabaseData();

      if (userObj.must_change_password) {
        router.push('/change-password');
      } else if (userObj.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/projektek');
      }
      return userObj;
    } else {
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        throw new Error('Nem található felhasználó ezzel az email címmel a demó fiókok között.');
      }
      setCurrentUser(matched);
      localStorage.setItem('epitek_demo_user', JSON.stringify(matched));

      if (matched.must_change_password) {
        router.push('/change-password');
      } else if (matched.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/projektek');
      }
      return matched;
    }
  };

  const switchDemoUser = (userId) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      if (!isConfigured) {
        localStorage.setItem('epitek_demo_user', JSON.stringify(target));
      }
      if (target.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/projektek');
      }
    }
  };

  const logout = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('epitek_demo_user');
    }
    setCurrentUser(null);
    router.push('/login');
  };

  const changePassword = async (newPassword) => {
    if (isConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', currentUser.id);

      setCurrentUser(prev => ({ ...prev, must_change_password: false }));
    } else {
      const updatedUser = { ...currentUser, must_change_password: false };
      setCurrentUser(updatedUser);
      localStorage.setItem('epitek_demo_user', JSON.stringify(updatedUser));

      const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUsers);
      localStorage.setItem('epitek_demo_users', JSON.stringify(updatedUsers));
    }

    if (currentUser?.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/projektek');
    }
  };

  // Upload Invoice Image
  const uploadInvoiceImage = async (file) => {
    if (isConfigured) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(data.path);

      return { imageUrl: publicUrlData.publicUrl, storagePath: data.path };
    } else {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ imageUrl: reader.result, storagePath: `demo/${file.name}` });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Invoices: Create
  const createInvoice = async ({ projectId, valueHuf, category, description, imageUrl, storagePath, ocrSuggestedValue }) => {
    if (!currentUser) throw new Error('Bejelentkezés szükséges!');

    const newInvoice = {
      ...(!isConfigured && { id: `inv-${Date.now()}` }),
      project_id: projectId,
      uploaded_by: currentUser.id,
      uploader_name: currentUser.display_name,
      value_huf: Number(valueHuf),
      ocr_suggested_value: ocrSuggestedValue ? Number(ocrSuggestedValue) : null,
      category,
      description: description || '',
      image_url: imageUrl || '',
      storage_path: storagePath || '',
      created_at: new Date().toISOString()
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('invoices')
        .insert([newInvoice])
        .select()
        .single();

      if (error) throw error;
      setInvoices(prev => [data, ...prev]);
      return data;
    } else {
      const updated = [newInvoice, ...invoices];
      setInvoices(updated);
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updated));
      return newInvoice;
    }
  };

  // Invoices: Update (Admin only)
  const updateInvoice = async (invoiceId, fields) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor módosíthatja a számlákat!');
    }

    if (isConfigured) {
      const { data, error } = await supabase
        .from('invoices')
        .update(fields)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? data : inv));
      return data;
    } else {
      const updated = invoices.map(inv => inv.id === invoiceId ? { ...inv, ...fields } : inv);
      setInvoices(updated);
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updated));
    }
  };

  // Invoices: Delete (Admin only)
  const deleteInvoice = async (invoiceId) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor törölhet számlát!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } else {
      const updated = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updated);
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updated));
    }
  };

  // Labour: Create
  const createLabourEntry = async ({ projectId, date, labourType, hours, hourlyRate, description }) => {
    if (!currentUser) throw new Error('Bejelentkezés szükséges!');

    const valueHuf = Math.round(Number(hours) * Number(hourlyRate));

    const newEntry = {
      ...(!isConfigured && { id: `lab-${Date.now()}` }),
      project_id: projectId,
      uploaded_by: currentUser.id,
      date,
      labour_type: labourType,
      hours: Number(hours),
      hourly_rate: Number(hourlyRate),
      value_huf: valueHuf,
      description: description || '',
      created_at: new Date().toISOString()
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('labour_entries')
        .insert([{
          project_id: projectId,
          uploaded_by: currentUser.id,
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
    } else {
      const updated = [newEntry, ...labourEntries];
      setLabourEntries(updated);
      localStorage.setItem('epitek_demo_labour', JSON.stringify(updated));
      return newEntry;
    }
  };

  // Labour: Delete
  const deleteLabourEntry = async (entryId) => {
    const entry = labourEntries.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.uploaded_by !== currentUser?.id && currentUser?.role !== 'admin') {
      throw new Error('Csak saját munkabejegyzést törölhet!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('labour_entries').delete().eq('id', entryId);
      if (error) throw error;
      setLabourEntries(prev => prev.filter(e => e.id !== entryId));
    } else {
      const updated = labourEntries.filter(e => e.id !== entryId);
      setLabourEntries(updated);
      localStorage.setItem('epitek_demo_labour', JSON.stringify(updated));
    }
  };

  // Projects: Create (Admin only)
  const createProject = async ({ name, description, memberIds = [], startDate, endDate }) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor hozhat létre projektet!');
    }

    if (isConfigured) {
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .insert([{ name, description, created_by: currentUser.id, start_date: startDate || null, end_date: endDate || null }])
        .select()
        .single();

      if (projErr) throw projErr;

      if (memberIds.length > 0) {
        const memberRows = memberIds.map(uId => ({ project_id: proj.id, user_id: uId }));
        await supabase.from('project_members').insert(memberRows);
      }

      await refreshSupabaseData();
      return proj;
    } else {
      const newProj = {
        id: `proj-${Date.now()}`,
        name,
        description,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        start_date: startDate || null,
        end_date: endDate || null,
        members: memberIds
      };
      const updated = [newProj, ...projects];
      setProjects(updated);
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updated));
      return newProj;
    }
  };

  // Projects: Update Members (Admin only)
  const updateProjectMembers = async (projectId, memberIds) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor módosíthatja a tagságot!');
    }

    if (isConfigured) {
      await supabase.from('project_members').delete().eq('project_id', projectId);
      if (memberIds.length > 0) {
        const rows = memberIds.map(uId => ({ project_id: projectId, user_id: uId }));
        await supabase.from('project_members').insert(rows);
      }
      await refreshSupabaseData();
    } else {
      const updated = projects.map(p => p.id === projectId ? { ...p, members: memberIds } : p);
      setProjects(updated);
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updated));
    }
  };

  // Projects: Delete (Admin only)
  const deleteProject = async (projectId) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor törölhet projektet!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      await refreshSupabaseData();
    } else {
      const updatedProjs = projects.filter(p => p.id !== projectId);
      const updatedInvs = invoices.filter(inv => inv.project_id !== projectId);
      const updatedLabour = labourEntries.filter(le => le.project_id !== projectId);
      setProjects(updatedProjs);
      setInvoices(updatedInvs);
      setLabourEntries(updatedLabour);
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updatedProjs));
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updatedInvs));
      localStorage.setItem('epitek_demo_labour', JSON.stringify(updatedLabour));
    }
  };

  // Clients: Create (Admin only)
  const createClient = async ({ name, address, phone, email, notes, discountPercent = 0 }) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor hozhat létre ügyfelet!');
    }

    const newClient = {
      ...(!isConfigured && { id: `client-${Date.now()}` }),
      name,
      address: address || '',
      phone: phone || '',
      email: email || '',
      notes: notes || '',
      discount_percent: Number(discountPercent),
      created_at: new Date().toISOString()
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ name, address, phone, email, notes, discount_percent: Number(discountPercent) }])
        .select()
        .single();
      if (error) throw error;
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'hu')));
      return data;
    } else {
      const updated = [...clients, newClient].sort((a, b) => a.name.localeCompare(b.name, 'hu'));
      setClients(updated);
      localStorage.setItem('epitek_demo_clients', JSON.stringify(updated));
      return newClient;
    }
  };

  // Clients: Update (Admin only)
  const updateClient = async (clientId, fields) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor módosíthatja az ügyfeleket!');
    }

    if (isConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .update(fields)
        .eq('id', clientId)
        .select()
        .single();
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === clientId ? data : c).sort((a, b) => a.name.localeCompare(b.name, 'hu')));
      return data;
    } else {
      const updated = clients.map(c => c.id === clientId ? { ...c, ...fields } : c).sort((a, b) => a.name.localeCompare(b.name, 'hu'));
      setClients(updated);
      localStorage.setItem('epitek_demo_clients', JSON.stringify(updated));
    }
  };

  // Clients: Delete (Admin only)
  const deleteClient = async (clientId) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor törölhet ügyfelet!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== clientId));
    } else {
      const updated = clients.filter(c => c.id !== clientId);
      setClients(updated);
      localStorage.setItem('epitek_demo_clients', JSON.stringify(updated));
    }
  };

  // Quotes: Create
  const createQuote = async ({ title, location, workType, description, startDate, endDate, clientId }) => {
    if (!currentUser) throw new Error('Bejelentkezés szükséges!');

    const newQuote = {
      ...(!isConfigured && { id: `quote-${Date.now()}` }),
      title,
      location: location || '',
      work_type: workType || '',
      description: description || '',
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'draft',
      client_id: clientId || null,
      project_id: null,
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          title,
          location,
          work_type: workType,
          description,
          start_date: startDate || null,
          end_date: endDate || null,
          status: 'draft',
          client_id: clientId || null,
          project_id: null,
          created_by: currentUser.id
        }])
        .select()
        .single();
      if (error) throw error;
      setQuotes(prev => [data, ...prev]);
      return data;
    } else {
      const updated = [newQuote, ...quotes];
      setQuotes(updated);
      localStorage.setItem('epitek_demo_quotes', JSON.stringify(updated));
      return newQuote;
    }
  };

  // Quotes: Update status
  const updateQuoteStatus = async (quoteId, status) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Az ajánlat nem található!');

    if (quote.created_by !== currentUser?.id && currentUser?.role !== 'admin') {
      throw new Error('Csak a létrehozó vagy az adminisztrátor módosíthatja az ajánlat státuszát!');
    }

    if (isConfigured) {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId)
        .select()
        .single();
      if (error) throw error;
      setQuotes(prev => prev.map(q => q.id === quoteId ? data : q));
      return data;
    } else {
      const updated = quotes.map(q => q.id === quoteId ? { ...q, status } : q);
      setQuotes(updated);
      localStorage.setItem('epitek_demo_quotes', JSON.stringify(updated));
    }
  };

  // Quotes: Delete
  const deleteQuote = async (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    if (quote.created_by !== currentUser?.id && currentUser?.role !== 'admin') {
      throw new Error('Csak a létrehozó vagy az adminisztrátor törölhet ajánlatot!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
      if (error) throw error;
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setQuoteEntries(prev => prev.filter(e => e.quote_id !== quoteId));
    } else {
      const updatedQuotes = quotes.filter(q => q.id !== quoteId);
      const updatedEntries = quoteEntries.filter(e => e.quote_id !== quoteId);
      setQuotes(updatedQuotes);
      setQuoteEntries(updatedEntries);
      localStorage.setItem('epitek_demo_quotes', JSON.stringify(updatedQuotes));
      localStorage.setItem('epitek_demo_quote_entries', JSON.stringify(updatedEntries));
    }
  };

  // Quote Entries: Create
  const createQuoteEntry = async ({ quoteId, userId, workDescription, amountHuf, notes }) => {
    if (!currentUser) throw new Error('Bejelentkezés szükséges!');

    const newEntry = {
      ...(!isConfigured && { id: `qe-${Date.now()}` }),
      quote_id: quoteId,
      user_id: userId || currentUser.id,
      work_description: workDescription,
      amount_huf: Number(amountHuf),
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    if (isConfigured) {
      const { data, error } = await supabase
        .from('quote_entries')
        .insert([{
          quote_id: quoteId,
          user_id: userId || currentUser.id,
          work_description: workDescription,
          amount_huf: Number(amountHuf),
          notes: notes || ''
        }])
        .select()
        .single();
      if (error) throw error;
      setQuoteEntries(prev => [...prev, data]);
      return data;
    } else {
      const updated = [...quoteEntries, newEntry];
      setQuoteEntries(updated);
      localStorage.setItem('epitek_demo_quote_entries', JSON.stringify(updated));
      return newEntry;
    }
  };

  // Quote Entries: Delete
  const deleteQuoteEntry = async (entryId) => {
    const entry = quoteEntries.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.user_id !== currentUser?.id && currentUser?.role !== 'admin') {
      throw new Error('Csak saját tételt törölhet!');
    }

    if (isConfigured) {
      const { error } = await supabase.from('quote_entries').delete().eq('id', entryId);
      if (error) throw error;
      setQuoteEntries(prev => prev.filter(e => e.id !== entryId));
    } else {
      const updated = quoteEntries.filter(e => e.id !== entryId);
      setQuoteEntries(updated);
      localStorage.setItem('epitek_demo_quote_entries', JSON.stringify(updated));
    }
  };

  // Quote → Project conversion
  const convertQuoteToProject = async (quoteId, memberIds) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Az ajánlat nem található!');

    if (currentUser?.role !== 'admin' && quote.created_by !== currentUser?.id) {
      throw new Error('Nincs jogosultsága az átalakításhoz!');
    }

    const projDescription = [quote.work_type, quote.description].filter(Boolean).join(' – ');

    if (isConfigured) {
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .insert([{
          name: quote.title,
          description: projDescription,
          created_by: currentUser.id,
          start_date: quote.start_date,
          end_date: quote.end_date
        }])
        .select()
        .single();
      if (projErr) throw projErr;

      if (memberIds.length > 0) {
        const memberRows = memberIds.map(uId => ({ project_id: proj.id, user_id: uId }));
        await supabase.from('project_members').insert(memberRows);
      }

      await supabase
        .from('quotes')
        .update({ status: 'accepted', project_id: proj.id })
        .eq('id', quoteId);

      await refreshSupabaseData();
      return proj;
    } else {
      const newProj = {
        id: `proj-${Date.now()}`,
        name: quote.title,
        description: projDescription,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        start_date: quote.start_date,
        end_date: quote.end_date,
        members: memberIds
      };

      const updatedProjs = [newProj, ...projects];
      setProjects(updatedProjs);
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updatedProjs));

      const updatedQuotes = quotes.map(q => q.id === quoteId ? { ...q, status: 'accepted', project_id: newProj.id } : q);
      setQuotes(updatedQuotes);
      localStorage.setItem('epitek_demo_quotes', JSON.stringify(updatedQuotes));

      return newProj;
    }
  };

  // Users: Create User (Admin only)
  const createUser = async ({ displayName, email, password, role = 'user' }) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor hozhat létre új felhasználót!');
    }

    if (isConfigured) {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, role })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Hiba a felhasználó létrehozásakor');

      await refreshSupabaseData();
      return resData.user;
    } else {
      const newUser = {
        id: `usr-${Date.now()}`,
        email,
        display_name: displayName,
        role,
        must_change_password: true,
        created_at: new Date().toISOString()
      };
      const updated = [...users, newUser];
      setUsers(updated);
      localStorage.setItem('epitek_demo_users', JSON.stringify(updated));
      return newUser;
    }
  };

  // Users: Delete User (Admin only)
  const deleteUser = async (userId) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor törölhet felhasználót!');
    }
    if (userId === currentUser.id) {
      throw new Error('Saját admin fiókját nem törölheti!');
    }

    if (isConfigured) {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Hiba a felhasználó törlésekor');

      await refreshSupabaseData();
    } else {
      const updatedUsers = users.filter(u => u.id !== userId);
      const updatedProjects = projects.map(p => ({
        ...p,
        members: (p.members || []).filter(mId => mId !== userId)
      }));
      setUsers(updatedUsers);
      setProjects(updatedProjects);
      localStorage.setItem('epitek_demo_users', JSON.stringify(updatedUsers));
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updatedProjects));
    }
  };

  // Users: Reset Password (Admin only)
  const resetUserPassword = async (userId, temporaryPassword = 'Epitek2026!') => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor állíthatja vissza a jelszót!');
    }

    if (isConfigured) {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, temporaryPassword })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Hiba a jelszó visszaállításakor');

      await refreshSupabaseData();
      return resData;
    } else {
      const updatedUsers = users.map(u =>
        u.id === userId ? { ...u, must_change_password: true } : u
      );
      setUsers(updatedUsers);
      localStorage.setItem('epitek_demo_users', JSON.stringify(updatedUsers));
      return { success: true, temporaryPassword };
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAdmin,
        loading,
        isConfigured,
        users,
        projects,
        invoices,
        labourEntries,
        clients,
        quotes,
        quoteEntries,
        login,
        logout,
        switchDemoUser,
        changePassword,
        uploadInvoiceImage,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        createLabourEntry,
        deleteLabourEntry,
        createProject,
        updateProjectMembers,
        deleteProject,
        createClient,
        updateClient,
        deleteClient,
        createQuote,
        updateQuoteStatus,
        deleteQuote,
        createQuoteEntry,
        deleteQuoteEntry,
        convertQuoteToProject,
        createUser,
        deleteUser,
        resetUserPassword,
        refreshSupabaseData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
