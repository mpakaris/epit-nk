'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { setGodCookie, clearGodCookie } from './cookieHelpers';
import { makeAuthActions }       from './actions/authActions';
import { makeGodModeActions }    from './actions/godModeActions';
import { makeEntityUserActions } from './actions/entityUserActions';
import { makeProjectActions }    from './actions/projectActions';
import { makeInvoiceActions }    from './actions/invoiceActions';
import { makeLabourActions }     from './actions/labourActions';
import { makeClientActions }     from './actions/clientActions';
import { makeSurveyActions }     from './actions/surveyActions';
import { makeQuoteActions }      from './actions/quoteActions';
import { makeDiaryActions }      from './actions/diaryActions';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createSupabaseClient());

  // ---- Auth state -------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState(null);
  const [impersonating, setImpersonating] = useState(null);
  const [impersonatingCollectives, setImpersonatingCollectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [collectives, setCollectives] = useState([]);
  const [allMemberships, setAllMemberships] = useState([]);

  // ---- Data state -------------------------------------------------------------
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

  // ---- Survey state (keyed by survey_id) -------------------------------------
  const [surveys, setSurveys] = useState([]);
  const [surveyMediaBySurvey, setSurveyMediaBySurvey] = useState({});
  const [surveyEntriesBySurvey, setSurveyEntriesBySurvey] = useState({});
  const [surveyLayoutsBySurvey, setSurveyLayoutsBySurvey] = useState({});
  const [surveyDrawingsBySurvey, setSurveyDrawingsBySurvey] = useState({});
  const [surveyItemsBySurvey, setSurveyItemsBySurvey] = useState({});

  // ---- Diary (keyed by project_id, loaded on demand) -------------------------
  const [diaryEntriesByProject, setDiaryEntriesByProject] = useState({});

  // ---- Derived ----------------------------------------------------------------
  const effectiveUser       = impersonating || currentUser;
  const isSuperAdmin        = currentUser?.role === 'superadmin';
  const isAdmin             = ['admin', 'superadmin'].includes(effectiveUser?.role);
  const activeCollectiveId  = (() => {
    if (effectiveUser?.role !== 'superadmin') return effectiveUser?.active_collective_id ?? null;
    if (impersonating) return impersonating.active_collective_id ?? null;
    return null;
  })();
  const effectiveEntityId   = activeCollectiveId;
  const uid                 = effectiveUser?.id;
  const effectiveCollectives = impersonating ? impersonatingCollectives : collectives;
  const effectiveIsAdmin    = ['admin', 'superadmin'].includes(effectiveUser?.role);

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
    return clients;
  })();

  const visibleUsers = (() => {
    if (isSuperAdmin && !impersonating) return users;
    return users;
  })();

  // ---- Route guard ------------------------------------------------------------
  const PUBLIC_ROUTE_PREFIXES = ['/login', '/change-password', '/szakemberek/', '/p/', '/clients/', '/naplo/', '/auth/', '/invitations/', '/demo', '/portal', '/impressum', '/adatkezeles', '/aszf', '/about', '/checkout-popup-success'];
  const PUBLIC_ROUTE_EXACT    = ['/'];
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      const isPublic = PUBLIC_ROUTE_EXACT.includes(pathname) || PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
      if (!isPublic) router.replace('/login');
      return;
    }
    if (currentUser.must_change_password && pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [loading, currentUser, pathname]);

  // ---- Profile fetch ----------------------------------------------------------
  const fetchProfile = async () => {
    const res = await fetch('/api/auth/profile');
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`profile ${res.status}`);
    const { profile, collectives: c } = await res.json();
    if (c) setCollectives(c);
    return profile || null;
  };

  // ---- Data refresh -----------------------------------------------------------
  const refreshSupabaseData = async (userOverride) => {
    const user = userOverride || currentUser;
    if (!user) return;

    try {
      if (user.role === 'superadmin') {
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
            if (typeof document !== 'undefined' && godModeUser) {
              clearGodCookie('god_mode_user');
              clearGodCookie('god_mode_entity');
            }
            setDataReady(true);
          }
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

  // ---- Auth init useEffect ----------------------------------------------------
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile();
          if (profile === null) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          if (profile.deleted_at) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

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

          const welcomeKey = `okosszaki_welcomed_${user.id}`;
          const alreadyWelcomed = typeof localStorage !== 'undefined' && localStorage.getItem(welcomeKey);
          const isNew = !alreadyWelcomed
            && profile?.created_at
            && (Date.now() - new Date(profile.created_at).getTime()) < 2 * 60 * 1000;
          if (isNew) setShowWelcome(true);
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

  // ---- God mode restore from sessionStorage -----------------------------------
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('god_mode');
      if (saved) {
        const data = JSON.parse(saved);
        setImpersonating(data);
        if (data?.id) {
          setGodCookie('god_mode_user', data.id);
          fetch(`/api/superadmin/user?id=${data.id}&include=collectives`)
            .then(r => r.ok ? r.json() : { collectives: [] })
            .then(d => setImpersonatingCollectives(d.collectives || []))
            .catch(() => {});
        }
        if (data?.active_collective_id) {
          setGodCookie('god_mode_entity', data.active_collective_id);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (impersonating) sessionStorage.setItem('god_mode', JSON.stringify(impersonating));
    else sessionStorage.removeItem('god_mode');
  }, [impersonating]);

  // ---- Audit helpers ----------------------------------------------------------
  const auditLog = (action, extras = {}) => {
    fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extras }) }).catch(() => {});
  };
  const auditPublic = (action, extras = {}) => {
    fetch('/api/audit/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extras }) }).catch(() => {});
  };

  // ---- Action factories -------------------------------------------------------

  const { login, loginWithOAuth, registerWithEmail, resetPasswordEmail, logout, changePassword } =
    makeAuthActions({ supabase, router, fetchProfile, refreshSupabaseData, setCurrentUser, setLoading, setImpersonating, currentUser, clearGodCookie });

  const { startImpersonation, stopImpersonation, setActiveContext, switchImpersonatingContext } =
    makeGodModeActions({ isSuperAdmin, currentUser, setImpersonating, setImpersonatingCollectives, setCurrentUser, setDataReady, setProjects, setClients, setQuotes, setInvoices, setLabourEntries, setSurveys, setProjectRooms, setQuoteEntries, setQuoteSections, setUsers, refreshSupabaseData, router, setGodCookie, clearGodCookie });

  const { createEntity, updateEntity, deleteEntity, createUser, deleteUser, resetUserPassword } =
    makeEntityUserActions({ isSuperAdmin, isAdmin, entities, projects, users, setEntities, setProjects, setQuotes, setInvoices, setUsers, effectiveEntityId, supabase });

  const { createProject, updateProject, updateProjectMembers, closeProject, reopenProject, deleteProject, createProjectRoom, updateProjectRoom, deleteProjectRoom, syncRoomsFromQuote } =
    makeProjectActions({ projects, invoices, labourEntries, projectRooms, setProjects, setInvoices, setLabourEntries, setProjectRooms, uid, isAdmin, collectives, effectiveEntityId, effectiveUser });

  const { uploadInvoiceImage, createInvoice, updateInvoice, deleteInvoice } =
    makeInvoiceActions({ invoices, projects, setInvoices, uid, isAdmin, collectives, effectiveUser, supabase });

  const { createLabourEntry, updateLabourEntry, deleteLabourEntry } =
    makeLabourActions({ labourEntries, projects, setLabourEntries, uid, isAdmin, collectives, effectiveUser });

  const { createClient, updateClient, deleteClient } =
    makeClientActions({ clients, setClients, uid, isAdmin });

  const { createSurvey, cacheSurvey, updateSurvey, deleteSurvey, fetchSurveyMedia, uploadSurveyMedia, deleteSurveyMedia, createSurveyEntry, updateSurveyEntry, deleteSurveyEntry, createSurveyItem, updateSurveyItem, deleteSurveyItem, generateSurveyEntryItems, createSurveyDrawing, deleteSurveyDrawing } =
    makeSurveyActions({ surveys, surveyEntriesBySurvey, surveyDrawingsBySurvey, surveyItemsBySurvey, setSurveys, setSurveyMediaBySurvey, setSurveyEntriesBySurvey, setSurveyLayoutsBySurvey, setSurveyDrawingsBySurvey, setSurveyItemsBySurvey, uid, isAdmin, collectives, effectiveUser, activeCollectiveId });

  const { createQuote, updateQuote, updateQuoteStatus, deleteQuote, cacheQuote, shareQuoteWith, unshareQuoteWith, createQuoteSection, updateQuoteSection, deleteQuoteSection, createQuoteEntry, updateQuoteEntry, deleteQuoteEntry, convertQuoteToProject } =
    makeQuoteActions({ quotes, quoteEntries, quoteSections, users, setQuotes, setQuoteEntries, setQuoteSections, setProjects, uid, isAdmin, collectives, effectiveUser, activeCollectiveId, supabase });

  const { fetchDiaryEntries, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry, deleteDiaryPhoto, uploadDiaryPhotos } =
    makeDiaryActions({ setDiaryEntriesByProject, effectiveUser });

  // ---- deleteUser wrapper (needs currentUser.id) ------------------------------
  const deleteUserWrapped = (userId) => deleteUser(userId, currentUser?.id);

  // ---- Context value ----------------------------------------------------------
  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser: effectiveUser,
        realUser: currentUser,
        impersonating,
        isSuperAdmin,
        isAdmin,
        effectiveEntityId,
        activeCollectiveId,
        loading,
        dataReady,
        showWelcome,
        dismissWelcome: () => {
          setShowWelcome(false);
          const uid = currentUser?.id;
          if (uid && typeof localStorage !== 'undefined') {
            localStorage.setItem(`okosszaki_welcomed_${uid}`, '1');
          }
        },
        // Collectives & context switcher
        collectives: effectiveCollectives,
        effectiveCollectives,
        allMemberships,
        setActiveContext,
        switchImpersonatingContext,
        // God Mode
        startImpersonation,
        stopImpersonation,
        // Data
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
        deleteUser: deleteUserWrapped,
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
        surveyItemsBySurvey,
        createSurveyDrawing,
        deleteSurveyDrawing,
        cacheSurvey,
        cacheQuote,
        createSurvey,
        updateSurvey,
        deleteSurvey,
        fetchSurveyMedia,
        uploadSurveyMedia,
        deleteSurveyMedia,
        createSurveyEntry,
        updateSurveyEntry,
        deleteSurveyEntry,
        createSurveyItem,
        updateSurveyItem,
        deleteSurveyItem,
        generateSurveyEntryItems,
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
        refreshCollectives: fetchProfile,
        updateDisplayName: (name) => setCurrentUser(prev => prev ? { ...prev, display_name: name } : prev),
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
