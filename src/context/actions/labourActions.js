import { canMutateEntry } from '@/lib/permissions';

export function makeLabourActions({
  labourEntries, projects, setLabourEntries,
  uid, isAdmin, collectives, effectiveUser,
}) {
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
    const entry = labourEntries.find(e => e.id === entryId);
    const proj  = entry ? projects.find(p => p.id === entry.project_id) : null;
    if (proj) {
      if (!canMutateEntry({ doc: proj, entry, uid, isAdmin, collectives }))
        throw new Error('Nincs jogosultsága!');
    }
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
    const entry = labourEntries.find(e => e.id === entryId);
    const proj  = entry ? projects.find(p => p.id === entry.project_id) : null;
    if (proj) {
      if (!canMutateEntry({ doc: proj, entry, uid, isAdmin, collectives }))
        throw new Error('Nincs jogosultsága!');
    }
    const res = await fetch(`/api/labour-entries/${entryId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Hiba a törléskor');
    setLabourEntries(prev => prev.filter(e => e.id !== entryId));
  };

  return { createLabourEntry, updateLabourEntry, deleteLabourEntry };
}
