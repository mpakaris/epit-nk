'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppContext } from '@/context/AppContext';
import {
  SEED_VERSION,
  DEMO_USER, DEMO_USERS, DEMO_COLLECTIVES,
  DEMO_CLIENTS, DEMO_PROJECTS, DEMO_INVOICES, DEMO_LABOUR,
  DEMO_PROJECT_ROOMS, DEMO_SURVEYS, DEMO_SURVEY_ENTRIES,
  DEMO_QUOTES, DEMO_QUOTE_SECTIONS, DEMO_QUOTE_ENTRIES,
  ID,
} from '@/context/demo/seed';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY = 'okosszaki_demo_state';
const LS_VER = 'okosszaki_demo_version';

function loadState() {
  try {
    const ver = localStorage.getItem(LS_VER);
    if (Number(ver) !== SEED_VERSION) return null;
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    localStorage.setItem(LS_VER, String(SEED_VERSION));
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_VER);
  } catch {}
}

function buildSeed() {
  return {
    activeCollectiveId:    null,
    projects:              DEMO_PROJECTS,
    invoices:              DEMO_INVOICES,
    labourEntries:         DEMO_LABOUR,
    projectRooms:          DEMO_PROJECT_ROOMS,
    clients:               DEMO_CLIENTS,
    surveys:               DEMO_SURVEYS,
    surveyEntriesBySurvey: DEMO_SURVEY_ENTRIES,
    quotes:                DEMO_QUOTES,
    quoteSections:         DEMO_QUOTE_SECTIONS,
    quoteEntries:          DEMO_QUOTE_ENTRIES,
    diaryEntriesByProject: {},
    surveyMediaBySurvey:   {},
    surveyLayoutsBySurvey: {},
    surveyDrawingsBySurvey:{},
  };
}

// ─── ID generator ─────────────────────────────────────────────────────────────
let _counter = 0;
const demoId = (prefix = 'demo') =>
  `${prefix}-${Date.now()}-${(++_counter).toString().padStart(4,'0')}`;

// ─── DemoProvider ─────────────────────────────────────────────────────────────
export function DemoProvider({ children }) {
  // Always seed with the default state so SSR and first client render match,
  // then hydrate from localStorage in an effect to avoid hydration mismatches.
  const [state, _setState] = useState(buildSeed);

  useEffect(() => {
    const saved = loadState();
    if (saved) _setState(saved);
  }, []);

  // Persist on every change
  const setState = useCallback((updater) => {
    _setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveState(next);
      return next;
    });
  }, []);

  const s = state; // shorthand

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeCollectiveId = s.activeCollectiveId;

  const currentUser = {
    ...DEMO_USER,
    active_collective_id: activeCollectiveId,
  };

  const visibleProjects = activeCollectiveId
    ? s.projects.filter(p => p.collective_id === activeCollectiveId)
    : s.projects.filter(p => !p.collective_id);

  const visibleQuotes = activeCollectiveId
    ? s.quotes.filter(q => q.collective_id === activeCollectiveId)
    : s.quotes.filter(q => !q.collective_id);

  const visibleSurveys = activeCollectiveId
    ? s.surveys.filter(sv => sv.collective_id === activeCollectiveId)
    : s.surveys.filter(sv => !sv.collective_id);

  // ── Context switch ─────────────────────────────────────────────────────────
  const setActiveContext = async (collectiveId) => {
    setState(prev => ({ ...prev, activeCollectiveId: collectiveId || null }));
  };

  // ── Demo reset ─────────────────────────────────────────────────────────────
  const resetDemo = () => {
    clearState();
    setState(buildSeed());
  };

  // ── No-op helpers ──────────────────────────────────────────────────────────
  const noop        = async () => {};
  const noopThrow   = async () => { throw new Error('Demo módban ez a funkció nem elérhető.'); };

  // ── File "upload" — client-side only, returns object URL ───────────────────
  const uploadInvoiceImage = async (file) => {
    const imageUrl = URL.createObjectURL(file);
    return { imageUrl, storagePath: `demo/${file.name}` };
  };

  const uploadSurveyMedia = async (surveyId, files) => {
    return files.map((f, i) => ({
      id: demoId('media'), survey_id: surveyId,
      url: URL.createObjectURL(f),
      mime_type: f.type,
      created_at: new Date().toISOString(),
    }));
  };

  const uploadDiaryPhotos = async (projectId, files) => {
    return files.map(f => ({
      id: demoId('photo'), project_id: projectId,
      drive_view_url: URL.createObjectURL(f),
      thumbnail_url:  URL.createObjectURL(f),
      mime_type: f.type,
      created_at: new Date().toISOString(),
    }));
  };

  // ── Invoices ───────────────────────────────────────────────────────────────
  const createInvoice = async ({ projectId, valueHuf, category, description, imageUrl = '', storagePath = '', ocrSuggestedValue, roomId, aiLineItems, aiTotal }) => {
    const inv = {
      id: demoId('inv'), project_id: projectId,
      uploaded_by: ID.userOwner, uploader_name: currentUser.display_name,
      value_huf: Math.round(Number(valueHuf)), category: category || 'Egyéb',
      description: description || '', image_url: imageUrl, storage_path: storagePath,
      room_id: roomId || null, ocr_suggested_value: ocrSuggestedValue || null,
      ai_line_items: aiLineItems || null, ai_total: aiTotal || null,
      created_at: new Date().toISOString(), deleted_at: null,
    };
    setState(prev => ({ ...prev, invoices: [inv, ...prev.invoices] }));
    return inv;
  };

  const updateInvoice = async (invoiceId, fields) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv => inv.id === invoiceId ? { ...inv, ...fields } : inv),
    }));
  };

  const deleteInvoice = async (invoiceId) => {
    const now = new Date().toISOString();
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, deleted_at: now } : inv
      ),
    }));
  };

  // ── Labour ─────────────────────────────────────────────────────────────────
  const createLabourEntry = async ({ projectId, date, labourType, hours, hourlyRate, description, roomId, unit }) => {
    const entry = {
      id: demoId('lab'), project_id: projectId,
      uploaded_by: ID.userOwner, date,
      labour_type: labourType, hours: Number(hours),
      hourly_rate: Number(hourlyRate),
      value_huf: Math.round(Number(hours) * Number(hourlyRate)),
      description: description || '', room_id: roomId || null,
      unit: unit || 'h', created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, labourEntries: [entry, ...prev.labourEntries] }));
    return entry;
  };

  const updateLabourEntry = async (entryId, fields) => {
    setState(prev => ({
      ...prev,
      labourEntries: prev.labourEntries.map(e => {
        if (e.id !== entryId) return e;
        const updated = { ...e, ...fields };
        if ('hours' in fields || 'hourly_rate' in fields)
          updated.value_huf = Math.round(Number(updated.hours) * Number(updated.hourly_rate));
        return updated;
      }),
    }));
  };

  const deleteLabourEntry = async (entryId) => {
    setState(prev => ({ ...prev, labourEntries: prev.labourEntries.filter(e => e.id !== entryId) }));
  };

  // ── Projects ───────────────────────────────────────────────────────────────
  const createProject = async ({ name, description, memberIds = [], startDate, endDate, clientId, collectiveId }) => {
    const proj = {
      id: demoId('proj'), owner_id: ID.userOwner, created_by: ID.userOwner,
      collective_id: collectiveId || activeCollectiveId || null,
      name, description: description || '',
      start_date: startDate || null, end_date: endDate || null,
      client_id: clientId || null, status: 'active',
      members: memberIds.length ? memberIds : [ID.userOwner],
      created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, projects: [proj, ...prev.projects] }));
    return proj;
  };

  const updateProject = async (projectId, fields) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === projectId ? { ...p, ...fields } : p),
    }));
  };

  const deleteProject = async (projectId) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      invoices: prev.invoices.filter(i => i.project_id !== projectId),
      labourEntries: prev.labourEntries.filter(e => e.project_id !== projectId),
    }));
  };

  const closeProject  = async (projectId) => updateProject(projectId, { status: 'closed' });
  const reopenProject = async (projectId) => updateProject(projectId, { status: 'active' });
  const updateProjectMembers = async (projectId, memberIds) => updateProject(projectId, { members: memberIds });

  // ── Project rooms ──────────────────────────────────────────────────────────
  const createProjectRoom = async (projectId, fields) => {
    const room = { id: demoId('room'), project_id: projectId, ...fields, created_at: new Date().toISOString() };
    setState(prev => ({ ...prev, projectRooms: [...prev.projectRooms, room] }));
    return room;
  };

  const updateProjectRoom = async (projectId, roomId, fields) => {
    setState(prev => ({
      ...prev,
      projectRooms: prev.projectRooms.map(r => r.id === roomId ? { ...r, ...fields } : r),
    }));
  };

  const deleteProjectRoom = async (projectId, roomId) => {
    setState(prev => ({ ...prev, projectRooms: prev.projectRooms.filter(r => r.id !== roomId) }));
  };

  const syncRoomsFromQuote = noop;

  // ── Clients ────────────────────────────────────────────────────────────────
  const createClient = async ({ name, address, phone, email, notes }) => {
    const client = {
      id: demoId('client'), owner_id: ID.userOwner,
      name, address: address || '', phone: phone || '',
      email: email || '', notes: notes || '',
      created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, clients: [...prev.clients, client] }));
    return client;
  };

  const updateClient = async (clientId, fields) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === clientId ? { ...c, ...fields } : c),
    }));
  };

  const deleteClient = async (clientId) => {
    setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== clientId) }));
  };

  // ── Surveys ────────────────────────────────────────────────────────────────
  const createSurvey = async ({ title, notes, date, location, clientId, sharedWith = [], collectiveId }) => {
    const survey = {
      id: demoId('sv'), owner_id: ID.userOwner, created_by: ID.userOwner,
      collective_id: collectiveId || activeCollectiveId || null,
      title, notes: notes || '', date: date || new Date().toISOString().slice(0, 10),
      location: location || '', client_id: clientId || null,
      shared_with: sharedWith, created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, surveys: [survey, ...prev.surveys] }));
    return survey;
  };

  const updateSurvey = async (surveyId, fields) => {
    setState(prev => ({
      ...prev,
      surveys: prev.surveys.map(s => s.id === surveyId ? { ...s, ...fields } : s),
    }));
  };

  const deleteSurvey = async (surveyId) => {
    setState(prev => ({
      ...prev,
      surveys: prev.surveys.filter(s => s.id !== surveyId),
      surveyEntriesBySurvey: Object.fromEntries(
        Object.entries(prev.surveyEntriesBySurvey).filter(([k]) => k !== surveyId)
      ),
    }));
  };

  const fetchSurveyMedia  = async () => ({});
  const deleteSurveyMedia = noop;

  const createSurveyEntry = async (surveyId, fields) => {
    const entry = { id: demoId('sentry'), survey_id: surveyId, ...fields, created_at: new Date().toISOString() };
    setState(prev => ({
      ...prev,
      surveyEntriesBySurvey: {
        ...prev.surveyEntriesBySurvey,
        [surveyId]: [...(prev.surveyEntriesBySurvey[surveyId] || []), entry],
      },
    }));
    return entry;
  };

  const updateSurveyEntry = async (surveyId, entryId, fields) => {
    setState(prev => ({
      ...prev,
      surveyEntriesBySurvey: {
        ...prev.surveyEntriesBySurvey,
        [surveyId]: (prev.surveyEntriesBySurvey[surveyId] || []).map(
          e => e.id === entryId ? { ...e, ...fields } : e
        ),
      },
    }));
  };

  const deleteSurveyEntry = async (surveyId, entryId) => {
    setState(prev => ({
      ...prev,
      surveyEntriesBySurvey: {
        ...prev.surveyEntriesBySurvey,
        [surveyId]: (prev.surveyEntriesBySurvey[surveyId] || []).filter(e => e.id !== entryId),
      },
    }));
  };

  const createSurveyDrawing = async (surveyId, fields) => {
    const drawing = { id: demoId('drw'), survey_id: surveyId, ...fields };
    setState(prev => ({
      ...prev,
      surveyDrawingsBySurvey: {
        ...prev.surveyDrawingsBySurvey,
        [surveyId]: [...(prev.surveyDrawingsBySurvey[surveyId] || []), drawing],
      },
    }));
    return drawing;
  };

  const deleteSurveyDrawing = async (surveyId, drawingId) => {
    setState(prev => ({
      ...prev,
      surveyDrawingsBySurvey: {
        ...prev.surveyDrawingsBySurvey,
        [surveyId]: (prev.surveyDrawingsBySurvey[surveyId] || []).filter(d => d.id !== drawingId),
      },
    }));
  };

  // ── Quotes ─────────────────────────────────────────────────────────────────
  const createQuote = async ({ title, location, workType, description, startDate, endDate, clientId, sharedWith = [], taxPercent = 27, collectiveId, surveyId }) => {
    const quote = {
      id: demoId('q'), owner_id: ID.userOwner, created_by: ID.userOwner,
      collective_id: collectiveId || activeCollectiveId || null,
      title, location: location || '', work_type: workType || '',
      description: description || '',
      start_date: startDate || null, end_date: endDate || null,
      client_id: clientId || null, shared_with: sharedWith,
      tax_percent: taxPercent, status: 'draft', total_amount_huf: 0,
      survey_id: surveyId || null, created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, quotes: [quote, ...prev.quotes] }));
    return quote;
  };

  const updateQuote = async (quoteId, fields) => {
    setState(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => q.id === quoteId ? { ...q, ...fields } : q),
    }));
  };

  const updateQuoteStatus = async (quoteId, status) => updateQuote(quoteId, { status });

  const deleteQuote = async (quoteId) => {
    setState(prev => ({
      ...prev,
      quotes: prev.quotes.filter(q => q.id !== quoteId),
      quoteSections: prev.quoteSections.filter(s => s.quote_id !== quoteId),
      quoteEntries: prev.quoteEntries.filter(e => e.quote_id !== quoteId),
    }));
  };

  const shareQuoteWith   = async (quoteId, userId) => {
    setState(prev => ({
      ...prev,
      quotes: prev.quotes.map(q =>
        q.id === quoteId ? { ...q, shared_with: [...(q.shared_with || []), userId] } : q
      ),
    }));
  };
  const unshareQuoteWith = async (quoteId, userId) => {
    setState(prev => ({
      ...prev,
      quotes: prev.quotes.map(q =>
        q.id === quoteId ? { ...q, shared_with: (q.shared_with || []).filter(id => id !== userId) } : q
      ),
    }));
  };

  // ── Quote sections ─────────────────────────────────────────────────────────
  const createQuoteSection = async (quoteId, fields) => {
    const section = { id: demoId('qsect'), quote_id: quoteId, ...fields };
    setState(prev => ({ ...prev, quoteSections: [...prev.quoteSections, section] }));
    return section;
  };

  const updateQuoteSection = async (quoteId, sectionId, fields) => {
    setState(prev => ({
      ...prev,
      quoteSections: prev.quoteSections.map(s => s.id === sectionId ? { ...s, ...fields } : s),
    }));
  };

  const deleteQuoteSection = async (quoteId, sectionId) => {
    setState(prev => ({
      ...prev,
      quoteSections: prev.quoteSections.filter(s => s.id !== sectionId),
      quoteEntries:  prev.quoteEntries.filter(e => e.section_id !== sectionId),
    }));
  };

  // ── Quote entries ──────────────────────────────────────────────────────────
  const createQuoteEntry = async ({ quoteId, userId, workDescription, amountHuf, notes, entryType, quantity, unit, unitPrice, sectionId }) => {
    const entry = {
      id: demoId('qe'), quote_id: quoteId, section_id: sectionId || null,
      user_id: userId || ID.userOwner, work_description: workDescription,
      amount_huf: Math.round(Number(amountHuf)), notes: notes || '',
      entry_type: entryType || 'fixed', quantity: Number(quantity) || 1,
      unit: unit || 'db', unit_price: Number(unitPrice) || amountHuf,
      created_at: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, quoteEntries: [...prev.quoteEntries, entry] }));
    return entry;
  };

  const updateQuoteEntry = async (entryId, fields) => {
    setState(prev => ({
      ...prev,
      quoteEntries: prev.quoteEntries.map(e => e.id === entryId ? { ...e, ...fields } : e),
    }));
  };

  const deleteQuoteEntry = async (entryId) => {
    setState(prev => ({ ...prev, quoteEntries: prev.quoteEntries.filter(e => e.id !== entryId) }));
  };

  const convertQuoteToProject = async (quoteId, memberIds) => {
    const quote = s.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Ajánlat nem található');
    const proj = await createProject({
      name: quote.title, description: quote.description,
      memberIds, startDate: quote.start_date, endDate: quote.end_date,
      clientId: quote.client_id, collectiveId: quote.collective_id,
    });
    await updateQuoteStatus(quoteId, 'accepted');
    return proj;
  };

  // ── Diary ──────────────────────────────────────────────────────────────────
  const fetchDiaryEntries = async (projectId) => {
    return s.diaryEntriesByProject[projectId] || [];
  };

  const createDiaryEntry = async ({ projectId, title, body, entryDate, workType, internalNote, clientNote, isPublic, roomId }) => {
    const entry = {
      id: demoId('diary'), project_id: projectId,
      created_by: ID.userOwner, title, body: body || '',
      entry_date: entryDate || new Date().toISOString().slice(0, 10),
      work_type: workType || '', internal_note: internalNote || '',
      client_note: clientNote || '', is_public: !!isPublic,
      room_id: roomId || null, photos: [],
      created_at: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      diaryEntriesByProject: {
        ...prev.diaryEntriesByProject,
        [projectId]: [entry, ...(prev.diaryEntriesByProject[projectId] || [])],
      },
    }));
    return entry;
  };

  const updateDiaryEntry = async (entryId, fields) => {
    setState(prev => {
      const updated = {};
      for (const [pid, entries] of Object.entries(prev.diaryEntriesByProject)) {
        updated[pid] = entries.map(e => e.id === entryId ? { ...e, ...fields } : e);
      }
      return { ...prev, diaryEntriesByProject: updated };
    });
  };

  const deleteDiaryEntry = async (entryId, projectId) => {
    setState(prev => ({
      ...prev,
      diaryEntriesByProject: {
        ...prev.diaryEntriesByProject,
        [projectId]: (prev.diaryEntriesByProject[projectId] || []).filter(e => e.id !== entryId),
      },
    }));
  };

  const deleteDiaryPhoto = noop;

  // ── Context value ──────────────────────────────────────────────────────────
  const value = {
    // Auth state
    currentUser,
    realUser:             currentUser,
    impersonating:        null,
    isSuperAdmin:         false,
    isAdmin:              false,
    effectiveEntityId:    activeCollectiveId,
    activeCollectiveId,
    loading:              false,
    dataReady:            true,
    // Collectives
    collectives:          DEMO_COLLECTIVES,
    effectiveCollectives: DEMO_COLLECTIVES,
    allMemberships:       [],
    setActiveContext,
    switchImpersonatingContext: noop,
    // God mode (disabled)
    startImpersonation:   noopThrow,
    stopImpersonation:    noop,
    // Data
    entities:             [],
    users:                DEMO_USERS,
    projects:             visibleProjects,
    invoices:             s.invoices.filter(i => !i.deleted_at),
    labourEntries:        s.labourEntries,
    clients:              s.clients,
    quotes:               visibleQuotes,
    quoteEntries:         s.quoteEntries,
    quoteSections:        s.quoteSections,
    surveys:              visibleSurveys,
    surveyMediaBySurvey:  s.surveyMediaBySurvey,
    surveyEntriesBySurvey: s.surveyEntriesBySurvey,
    surveyLayoutsBySurvey:  s.surveyLayoutsBySurvey,
    surveyDrawingsBySurvey: s.surveyDrawingsBySurvey,
    projectRooms:         s.projectRooms,
    diaryEntriesByProject: s.diaryEntriesByProject,
    // Auth actions (demo: no-ops / stub)
    login:                noopThrow,
    loginWithOAuth:       noopThrow,
    registerWithEmail:    noopThrow,
    resetPasswordEmail:   noop,
    logout:               noop,
    changePassword:       noopThrow,
    // Entity/user mgmt (disabled in demo)
    createEntity:         noopThrow,
    updateEntity:         noopThrow,
    deleteEntity:         noopThrow,
    createUser:           noopThrow,
    deleteUser:           noopThrow,
    resetUserPassword:    noopThrow,
    // Invoices
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
    // Rooms
    createProjectRoom,
    updateProjectRoom,
    deleteProjectRoom,
    syncRoomsFromQuote,
    // Clients
    createClient,
    updateClient,
    deleteClient,
    // Surveys
    createSurvey,
    updateSurvey,
    deleteSurvey,
    fetchSurveyMedia,
    uploadSurveyMedia,
    deleteSurveyMedia,
    createSurveyEntry,
    updateSurveyEntry,
    deleteSurveyEntry,
    createSurveyDrawing,
    deleteSurveyDrawing,
    // Quotes
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    shareQuoteWith,
    unshareQuoteWith,
    createQuoteSection,
    updateQuoteSection,
    deleteQuoteSection,
    createQuoteEntry,
    updateQuoteEntry,
    deleteQuoteEntry,
    convertQuoteToProject,
    // Diary
    fetchDiaryEntries,
    createDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
    deleteDiaryPhoto,
    uploadDiaryPhotos,
    // Misc
    refreshSupabaseData:  noop,
    refreshCollectives:   noop,
    // Demo-specific
    resetDemo,
    isDemoMode: true,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
