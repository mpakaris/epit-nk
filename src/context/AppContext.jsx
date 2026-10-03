'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { INITIAL_DEMO_USERS, INITIAL_DEMO_PROJECTS, INITIAL_DEMO_INVOICES } from '@/lib/demo-data';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [isConfigured] = useState(() => isSupabaseConfigured());

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App data (in-memory & synced with Supabase or localStorage)
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Load initial state
  useEffect(() => {
    async function init() {
      setLoading(true);

      if (isConfigured) {
        try {
          // Check Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch profile
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

          // Fetch projects and invoices
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

      setUsers(savedUsers ? JSON.parse(savedUsers) : INITIAL_DEMO_USERS);
      setProjects(savedProjects ? JSON.parse(savedProjects) : INITIAL_DEMO_PROJECTS);
      setInvoices(savedInvoices ? JSON.parse(savedInvoices) : INITIAL_DEMO_INVOICES);

      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        // Default to admin for convenient preview
        setCurrentUser(INITIAL_DEMO_USERS[0]);
      }
    } catch {
      setUsers(INITIAL_DEMO_USERS);
      setProjects(INITIAL_DEMO_PROJECTS);
      setInvoices(INITIAL_DEMO_INVOICES);
      setCurrentUser(INITIAL_DEMO_USERS[0]);
    }
  };

  const refreshSupabaseData = async () => {
    if (!isConfigured) return;
    try {
      // 1. Projects
      const { data: projs } = await supabase
        .from('projects')
        .select(`
          *,
          project_members (user_id)
        `);

      if (projs) {
        const formattedProjects = projs.map(p => ({
          ...p,
          members: (p.project_members || []).map(pm => pm.user_id)
        }));
        setProjects(formattedProjects);
      }

      // 2. Invoices
      const { data: invs } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invs) {
        setInvoices(invs);
      }

      // 3. Profiles
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true });

      if (profs) {
        setUsers(profs);
      }
    } catch (err) {
      console.error('Error refreshing data from Supabase:', err);
    }
  };

  // Auth: Login
  const login = async (email, password) => {
    if (isConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

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
      // Demo login
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

  // Switch demo user helper
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

  // Auth: Logout
  const logout = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('epitek_demo_user');
    }
    setCurrentUser(null);
    router.push('/login');
  };

  // Auth: Change password
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

      return {
        imageUrl: publicUrlData.publicUrl,
        storagePath: data.path
      };
    } else {
      // In demo mode, convert to base64 Data URL so user sees preview immediately
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            imageUrl: reader.result,
            storagePath: `demo/${file.name}`
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Invoices: Create
  const createInvoice = async ({
    projectId,
    valueHuf,
    category,
    description,
    imageUrl,
    storagePath,
    ocrSuggestedValue
  }) => {
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
      const updated = invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, ...fields } : inv
      );
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
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } else {
      const updated = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updated);
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updated));
    }
  };

  // Projects: Create (Admin only)
  const createProject = async ({ name, description, memberIds = [] }) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Csak az adminisztrátor hozhat létre projektet!');
    }

    if (isConfigured) {
      // 1. Insert project
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .insert([{
          name,
          description,
          created_by: currentUser.id
        }])
        .select()
        .single();

      if (projErr) throw projErr;

      // 2. Insert members
      if (memberIds.length > 0) {
        const memberRows = memberIds.map(uId => ({
          project_id: proj.id,
          user_id: uId
        }));
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
      // Delete existing
      await supabase.from('project_members').delete().eq('project_id', projectId);
      // Insert new
      if (memberIds.length > 0) {
        const rows = memberIds.map(uId => ({
          project_id: projectId,
          user_id: uId
        }));
        await supabase.from('project_members').insert(rows);
      }
      await refreshSupabaseData();
    } else {
      const updated = projects.map(p =>
        p.id === projectId ? { ...p, members: memberIds } : p
      );
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
      setProjects(updatedProjs);
      setInvoices(updatedInvs);
      localStorage.setItem('epitek_demo_projects', JSON.stringify(updatedProjs));
      localStorage.setItem('epitek_demo_invoices', JSON.stringify(updatedInvs));
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
      // Remove from all project memberships
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
        login,
        logout,
        switchDemoUser,
        changePassword,
        uploadInvoiceImage,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        createProject,
        updateProjectMembers,
        deleteProject,
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
