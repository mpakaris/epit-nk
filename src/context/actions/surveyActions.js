import { processMediaFiles } from '@/lib/mediaGate';
import { canMutateEntry } from '@/lib/permissions';

export function makeSurveyActions({
  surveys, surveyEntriesBySurvey, surveyDrawingsBySurvey, surveyItemsBySurvey,
  setSurveys, setSurveyMediaBySurvey, setSurveyEntriesBySurvey,
  setSurveyLayoutsBySurvey, setSurveyDrawingsBySurvey, setSurveyItemsBySurvey,
  uid, isAdmin, collectives, effectiveUser, activeCollectiveId,
}) {
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

  const cacheSurvey = (survey) => {
    setSurveys(prev => prev.some(s => s.id === survey.id) ? prev : [...prev, survey]);
  };

  const updateSurvey = async (surveyId, fields) => {
    const survey = surveys.find(s => s.id === surveyId);
    const isSurveyOwner    = survey?.owner_id === uid || survey?.created_by === uid;
    const isKollektivOwner = collectives.some(c => c.collective_id === survey?.collective_id && (c.role === 'owner' || c.role === 'admin'));
    if (!isAdmin && !isSurveyOwner && !isKollektivOwner) throw new Error('Csak adminisztrátor vagy a felmérés tulajdonosa módosíthat!');
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

  const deleteSurvey = async (surveyId, surveyData = null) => {
    const survey = surveyData || surveys.find(s => s.id === surveyId);
    const isSurveyOwner    = survey?.owner_id === uid || survey?.created_by === uid;
    const isKollektivOwner = survey
      ? collectives.some(c => c.collective_id === survey.collective_id && (c.role === 'owner' || c.role === 'admin'))
      : collectives.some(c => c.role === 'owner' || c.role === 'admin');
    if (!isAdmin && !isSurveyOwner && !isKollektivOwner) throw new Error('Csak adminisztrátor vagy a felmérés tulajdonosa törölhet!');
    const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a felmérés törlésekor');
    setSurveys(prev => prev.filter(s => s.id !== surveyId));
    setSurveyMediaBySurvey(prev =>    { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyLayoutsBySurvey(prev =>  { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyEntriesBySurvey(prev =>  { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyDrawingsBySurvey(prev => { const n = { ...prev }; delete n[surveyId]; return n; });
    setSurveyItemsBySurvey(prev =>    { const n = { ...prev }; delete n[surveyId]; return n; });
  };

  const fetchSurveyMedia = async (surveyId) => {
    const [surveyRes, itemsRes] = await Promise.all([
      fetch(`/api/surveys/${surveyId}`),
      fetch(`/api/surveys/${surveyId}/items`),
    ]);
    const data = await surveyRes.json();
    if (!surveyRes.ok) throw new Error(data.error || 'Hiba a média betöltésekor');
    setSurveyMediaBySurvey(prev => ({ ...prev, [surveyId]: data.photos || [] }));
    setSurveyLayoutsBySurvey(prev => ({ ...prev, [surveyId]: data.layouts || [] }));
    setSurveyEntriesBySurvey(prev => ({ ...prev, [surveyId]: data.entries || [] }));
    setSurveyDrawingsBySurvey(prev => ({ ...prev, [surveyId]: data.drawings || [] }));
    const itemsData = await itemsRes.json();
    if (itemsRes.ok) {
      setSurveyItemsBySurvey(prev => ({ ...prev, [surveyId]: itemsData.items || [] }));
    } else {
      console.warn('[fetchSurveyMedia] items fetch failed:', itemsData?.error);
    }
    return data;
  };

  const uploadSurveyMedia = async (surveyId, files, { entryId = null, mediaType = 'photo' } = {}) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      const isOwner      = survey.owner_id === uid || survey.created_by === uid;
      const isShared     = (survey.shared_with || []).includes(effectiveUser?.id);
      const isCollMember = collectives.some(c => c.collective_id === survey.collective_id);
      if (!isAdmin && !isOwner && !isShared && !isCollMember) throw new Error('Nincs jogosultsága!');
    }
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
    const isOwner          = survey?.owner_id === uid || survey?.created_by === uid;
    const isShared         = (survey?.shared_with || []).includes(effectiveUser?.id);
    const isKollektivOwner = collectives.some(c => c.collective_id === survey?.collective_id && (c.role === 'owner' || c.role === 'admin'));
    if (!isAdmin && !isOwner && !isShared && !isKollektivOwner) throw new Error('Nincs jogosultsága!');
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

  // ---- Survey entries ---------------------------------------------------------

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
    const entry = (surveyEntriesBySurvey[surveyId] || []).find(e => e.id === entryId);
    if (!canMutateEntry({ doc: survey, entry, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
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
    const entry = (surveyEntriesBySurvey[surveyId] || []).find(e => e.id === entryId);
    if (!canMutateEntry({ doc: survey, entry, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
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
    setSurveyItemsBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).filter(i => i.entry_id !== entryId),
    }));
    setSurveyMediaBySurvey(prev => ({ ...prev }));
  };

  // ---- Survey entry items (tételek) ------------------------------------------

  const createSurveyItem = async (surveyId, itemData) => {
    const res = await fetch(`/api/surveys/${surveyId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel létrehozásakor');
    setSurveyItemsBySurvey(prev => ({
      ...prev,
      [surveyId]: [...(prev[surveyId] || []), data.item],
    }));
    return data.item;
  };

  const updateSurveyItem = async (surveyId, itemId, fields) => {
    const res = await fetch(`/api/surveys/${surveyId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel módosításakor');
    setSurveyItemsBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).map(i => i.id === itemId ? data.item : i),
    }));
    return data.item;
  };

  const deleteSurveyItem = async (surveyId, itemId) => {
    const res = await fetch(`/api/surveys/${surveyId}/items/${itemId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel törlésekor');
    setSurveyItemsBySurvey(prev => ({
      ...prev,
      [surveyId]: (prev[surveyId] || []).filter(i => i.id !== itemId),
    }));
  };

  const generateSurveyEntryItems = async (surveyId, entryId) => {
    const res = await fetch(`/api/surveys/${surveyId}/entries/${entryId}/generate-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tételek generálásakor');
    if (data.items) {
      setSurveyItemsBySurvey(prev => ({
        ...prev,
        [surveyId]: [...(prev[surveyId] || []).filter(i => i.entry_id !== entryId), ...data.items],
      }));
    }
    return data;
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

  return {
    createSurvey, cacheSurvey, updateSurvey, deleteSurvey,
    fetchSurveyMedia, uploadSurveyMedia, deleteSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
    createSurveyItem, updateSurveyItem, deleteSurveyItem, generateSurveyEntryItems,
    createSurveyDrawing, deleteSurveyDrawing,
  };
}
