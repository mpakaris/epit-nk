import { processMediaFiles } from '@/lib/mediaGate';

export function makeDiaryActions({ setDiaryEntriesByProject, effectiveUser }) {
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

  const updateDiaryEntry = async (entryId, fields) => {
    const res = await fetch(`/api/diary/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a bejegyzés frissítésekor');
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

  return { fetchDiaryEntries, createDiaryEntry, updateDiaryEntry, deleteDiaryEntry, deleteDiaryPhoto, uploadDiaryPhotos };
}
