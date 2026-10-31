import { canMutateEntry } from '@/lib/permissions';

export function makeQuoteActions({
  quotes, quoteEntries, quoteSections, users,
  setQuotes, setQuoteEntries, setQuoteSections, setProjects,
  uid, isAdmin, collectives, effectiveUser, activeCollectiveId, supabase,
}) {
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

  const updateQuoteStatus = (quoteId, status) => updateQuote(quoteId, { status });

  const deleteQuote = async (quoteId) => {
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba az ajánlat törlésekor');
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    setQuoteEntries(prev => prev.filter(e => e.quote_id !== quoteId));
    setQuoteSections(prev => prev.filter(s => s.quote_id !== quoteId));
  };

  const cacheQuote = (quote) => {
    setQuotes(prev => prev.some(q => q.id === quote.id) ? prev : [...prev, quote]);
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
    const quote   = quotes.find(q => q.id === quoteId);
    const section = quoteSections.find(s => s.id === sectionId);
    if (quote && !canMutateEntry({ doc: quote, entry: section, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
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
    const quote   = quotes.find(q => q.id === quoteId);
    const section = quoteSections.find(s => s.id === sectionId);
    if (quote && !canMutateEntry({ doc: quote, entry: section, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/quotes/${quoteId}/sections/${sectionId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a törléskor');
    setQuoteSections(prev => prev.filter(s => s.id !== sectionId));
    setQuoteEntries(prev => prev.map(e => e.section_id === sectionId ? { ...e, section_id: null } : e));
  };

  const shareQuoteWith = async (quoteId, userId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    if (quote.created_by !== effectiveUser?.id && !isAdmin) throw new Error('Nincs jogosultsága!');
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

  // ---- Quote entries ----------------------------------------------------------

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
    const quote = quotes.find(q => q.id === entry.quote_id);
    if (quote && !canMutateEntry({ doc: quote, entry, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
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
    const quote = quotes.find(q => q.id === entry.quote_id);
    if (quote && !canMutateEntry({ doc: quote, entry, uid, isAdmin, collectives }))
      throw new Error('Nincs jogosultsága!');
    const res = await fetch(`/api/quotes/${entry.quote_id}/entries/${entryId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a tétel törlésekor');
    setQuoteEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const convertQuoteToProject = async (quoteId) => {
    const res = await fetch(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Hiba történt. Kérjük, próbáld újra.');

    const proj = body.project;
    setProjects(prev => [{ ...proj, members: [] }, ...prev]);
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted', project_id: proj.id } : q));
    return proj;
  };

  return {
    createQuote, updateQuote, updateQuoteStatus, deleteQuote, cacheQuote,
    shareQuoteWith, unshareQuoteWith,
    createQuoteSection, updateQuoteSection, deleteQuoteSection,
    createQuoteEntry, updateQuoteEntry, deleteQuoteEntry,
    convertQuoteToProject,
  };
}
