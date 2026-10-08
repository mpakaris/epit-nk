'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { AlertModal } from '@/components/Modal';
import SectionMediaGrid from '@/components/SectionMediaGrid';
import { formatHUF, QUOTE_ENTRY_TYPES, QUANTITY_UNITS, LABOUR_UNITS } from '@/lib/constants';
import {
  ArrowLeft, AlertCircle, Check, Loader2, Plus, Trash2, Edit3,
  Package, Hammer, Wrench, Truck, MoreHorizontal,
  User, Coins, Home, Ruler, X, Camera,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
const sortEntries = (arr) => [...arr].sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));

const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};
const QUOTE_ENTRY_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép/eszköz', transport: 'Szállítás', other: 'Egyéb' };

const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function calcAmount(t, qty, up, flat) {
  if ((t === 'material' || t === 'labour') && qty && up) return Math.round(parseFloat(qty) * parseInt(up, 10));
  return parseInt(flat, 10) || 0;
}

function NewClientModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setName(''); setPhone(''); setEmail(''); setAddress(''); setError(''); };
  const handleClose = () => { reset(); onClose(); };
  const handleSave = async () => {
    if (!name.trim()) { setError('A név megadása kötelező!'); return; }
    setSaving(true);
    try { await onCreate({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() }); reset(); }
    catch (err) { setError(err.message || 'Hiba'); }
    finally { setSaving(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Új ügyfél">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" /></div>
      <div className="grid-2col">
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+36 70 …" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@…" /></div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} placeholder="Irányítószám, Város, utca" /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>{saving ? 'Mentés...' : 'Létrehozás'}</button>
      </div>
    </Modal>
  );
}

function SectionForm({ initial, surveyId, onSave, onCancel }) {
  const { createSurveyEntry, uploadSurveyMedia } = useApp();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [sizeM2, setSizeM2] = useState(initial?.size_m2 != null ? String(initial.size_m2) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = React.useRef(null);

  const addFiles = (e) => {
    const arr = Array.from(e.target.files || []);
    if (!arr.length) return;
    setSelectedFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => ({ key: `${f.name}-${f.size}`, isVideo: f.type.startsWith('video/'), url: f.type.startsWith('video/') ? null : URL.createObjectURL(f) }))]);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('A helyiség neve kötelező!'); return; }
    setSaving(true);
    try {
      const fields = { name: name.trim(), description: description.trim() || null, size_m2: sizeM2 ? Number(sizeM2) : null };
      let surveyEntryId = null;
      if (!initial && surveyId) {
        try { const e = await createSurveyEntry(surveyId, fields); surveyEntryId = e.id; } catch {}
      }
      if (surveyEntryId && selectedFiles.length) {
        try { await uploadSurveyMedia(surveyId, selectedFiles, { entryId: surveyEntryId, mediaType: 'photo' }); } catch {}
      }
      await onSave({ ...fields, _surveyEntryId: surveyEntryId });
    } catch (err) {
      setError(err.message || 'Hiba');
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '0.85rem', background: 'var(--accent-light)', border: '2px solid var(--accent-border)', borderRadius: 'var(--radius-md)' }}>
      {error && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Helyiség neve *</label><input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="pl. Fürdőszoba, Konyha…" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Alapterület (m²)</label><input type="number" min="0" step="0.1" className="form-control" value={sizeM2} onChange={e => setSizeM2(e.target.value)} placeholder="pl. 12.5" /></div>
      </div>
      <div className="form-group" style={{ marginBottom: !initial && surveyId ? '0.5rem' : '0.75rem' }}><label className="form-label">Leírás</label><textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Elvégzendő munkák, állapot…" /></div>
      {!initial && surveyId && (
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: previews.length ? '0.4rem' : 0 }}>
            <label className="form-label" style={{ margin: 0 }}>Fotók</label>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
              <Camera size={12} /> Fotó hozzáadása
            </button>
          </div>
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {previews.map((p, i) => (
                <div key={p.key} style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                    {p.isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff', fontSize: '1rem' }}>▶</div>
                    : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <button type="button" onClick={() => { setSelectedFiles(f => f.filter((_, fi) => fi !== i)); setPreviews(p => p.filter((_, pi) => pi !== i)); }} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={9} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />…</> : (initial ? 'Módosítás' : 'Helyiség hozzáadása')}
        </button>
      </div>
    </div>
  );
}

const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '', user_id: '' };

export default function EditQuotePage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    clients, users, loading, dataReady, quotes, quoteSections, quoteEntries,
    updateQuote, createClient, createQuoteSection, updateQuoteSection, deleteQuoteSection,
    createQuoteEntry, updateQuoteEntry, deleteQuoteEntry,
    currentUser, isAdmin, effectiveEntityId,
    surveyEntriesBySurvey, fetchSurveyMedia,
  } = useApp();

  // Header fields
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [taxPercent, setTaxPercent] = useState('27');
  const [sharedWith, setSharedWith] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Sections with embedded entries
  const [localSections, setLocalSections] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSectionKey, setEditingSectionKey] = useState(null);

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const [editingEntryKey, setEditingEntryKey] = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [pendingEntries, setPendingEntries] = useState([]);

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quote = quotes.find(q => q.id === id);

  // Initialize form from existing quote + sections + entries
  useEffect(() => {
    if (!quote || initialized) return;
    const sections = quoteSections.filter(s => s.quote_id === id)
      .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
    const entries = quoteEntries.filter(e => e.quote_id === id);

    setTitle(quote.title || '');
    setLocation(quote.location || '');
    setWorkType(quote.work_type || '');
    setDescription(quote.description || '');
    setStartDate(quote.start_date || '');
    setEndDate(quote.end_date || '');
    setClientId(quote.client_id || '');
    setTaxPercent(String(quote.tax_percent ?? 27));
    setSharedWith(quote.shared_with || []);

    setLocalSections(sections.map(s => ({
      _key: s.id,
      _id: s.id,
      _surveyEntryId: s.survey_entry_id || null,
      _surveyMedia: [],
      name: s.name,
      description: s.description || '',
      size_m2: s.size_m2 != null ? String(s.size_m2) : '',
      entries: entries
        .filter(e => e.section_id === s.id)
        .map(e => ({
          _ekey: e.id,
          _id: e.id,
          entry_type: e.entry_type,
          work_description: e.work_description,
          quantity: e.quantity,
          unit: e.unit,
          unit_price: e.unit_price,
          amount_huf: e.amount_huf,
          notes: e.notes || '',
          user_id: e.user_id,
        })),
    })));

    setInitialized(true);
  }, [quote, quoteSections, quoteEntries, id, initialized]);

  useEffect(() => {
    if (quote?.survey_id) fetchSurveyMedia(quote.survey_id).catch(() => {});
  }, [quote?.survey_id]);

  if (loading || !dataReady) return <PageSpinner />;

  if (!quote) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Az ajánlat nem található</h2>
        <Link href="/ajanlatok" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const canModify = quote.created_by === currentUser?.id || isAdmin;
  const isLocked = quote.status === 'accepted' || quote.status === 'rejected';
  if (!canModify || isLocked) { router.replace(`/ajanlatok/${id}`); return null; }

  const selectedClient = clients.find(c => c.id === clientId);
  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);
  const totalValue = localSections.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + Number(e.amount_huf || 0), 0), 0);

  // ── Section helpers ──────────────────────────────────────────────────────────
  const addSection = (fields) => {
    setLocalSections(prev => [...prev, { _key: `new-${Date.now()}`, _id: null, _surveyEntryId: fields._surveyEntryId || null, _surveyMedia: [], name: fields.name, description: fields.description || '', size_m2: fields.size_m2 != null ? String(fields.size_m2) : '', entries: [] }]);
    setShowAddSection(false);
  };
  const updateSection = (key, fields) => {
    setLocalSections(prev => prev.map(s => s._key === key ? { ...s, ...fields, size_m2: fields.size_m2 != null ? String(fields.size_m2) : '' } : s));
    setEditingSectionKey(null);
  };
  const removeSection = (key) => setLocalSections(prev => prev.filter(s => s._key !== key));

  // ── Entry helpers ────────────────────────────────────────────────────────────
  const openEntryModal = (sectionKey, editKey = null) => {
    setActiveSectionKey(sectionKey);
    setPendingEntries([]);
    if (editKey) {
      const section = localSections.find(s => s._key === sectionKey);
      const entry = section?.entries.find(e => e._ekey === editKey);
      if (entry) {
        const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
        setEntryForm({ entry_type: entry.entry_type, work_description: entry.work_description, quantity: entry.quantity != null ? String(entry.quantity) : '', unit: entry.unit || 'db', unit_price: entry.unit_price != null ? String(entry.unit_price) : '', flat_amount: !useQty ? String(entry.amount_huf) : '', notes: entry.notes || '', user_id: entry.user_id || currentUser.id });
        setEditingEntryKey(editKey);
      }
    } else {
      setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: currentUser.id });
      setEditingEntryKey(null);
    }
    setEntryError('');
    setShowEntryModal(true);
  };

  const buildEntryFromForm = (ekey, existingId = null) => {
    const useQty = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    return {
      _ekey: ekey || `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      _id: existingId,
      entry_type: entryForm.entry_type,
      work_description: entryForm.work_description.trim(),
      quantity: useQty && entryForm.quantity ? parseFloat(entryForm.quantity) : null,
      unit: useQty && entryForm.unit ? entryForm.unit : null,
      unit_price: useQty && entryForm.unit_price ? parseInt(entryForm.unit_price, 10) : null,
      amount_huf: previewAmount,
      notes: entryForm.notes.trim(),
      user_id: entryForm.user_id || currentUser.id,
    };
  };

  const handleAddAnother = () => {
    setEntryError('');
    if (!entryForm.work_description.trim()) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    setPendingEntries(prev => [...prev, buildEntryFromForm()]);
    setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: entryForm.user_id, entry_type: entryForm.entry_type });
    setEntryError('');
  };

  const handleSaveEntry = () => {
    setEntryError('');
    const hasCurrent = entryForm.work_description.trim();
    if (!hasCurrent && pendingEntries.length === 0) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (hasCurrent && previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }

    const existingId = editingEntryKey
      ? (localSections.find(s => s._key === activeSectionKey)?.entries.find(e => e._ekey === editingEntryKey)?._id || null)
      : null;

    const allEntries = hasCurrent
      ? [...pendingEntries, buildEntryFromForm(editingEntryKey || undefined, existingId)]
      : pendingEntries;

    setLocalSections(prev => prev.map(s => {
      if (s._key !== activeSectionKey) return s;
      if (editingEntryKey) {
        return { ...s, entries: s.entries.map(e => e._ekey === editingEntryKey ? allEntries[0] : e) };
      }
      return { ...s, entries: [...s.entries, ...allEntries] };
    }));
    setPendingEntries([]);
    setShowEntryModal(false);
  };

  const removeEntry = (sectionKey, ekey) => {
    setLocalSections(prev => prev.map(s => s._key === sectionKey ? { ...s, entries: s.entries.filter(e => e._ekey !== ekey) } : s));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Az ajánlat neve kötelező!'); return; }
    setIsSubmitting(true);
    try {
      // Update header
      await updateQuote(id, {
        title: title.trim(),
        location: location.trim(),
        work_type: workType.trim(),
        description: description.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        client_id: clientId || null,
        tax_percent: Number(taxPercent) || 0,
        shared_with: sharedWith,
      });

      const originalSections = quoteSections.filter(s => s.quote_id === id);
      const originalEntries = quoteEntries.filter(e => e.quote_id === id);
      const keptSectionIds = new Set(localSections.filter(s => s._id).map(s => s._id));

      // Delete removed sections (and their entries first)
      for (const s of originalSections) {
        if (!keptSectionIds.has(s.id)) {
          for (const e of originalEntries.filter(e => e.section_id === s.id)) {
            await deleteQuoteEntry(e.id);
          }
          await deleteQuoteSection(id, s.id);
        }
      }

      // Create / update sections and their entries
      for (const s of localSections) {
        let sectionId;
        if (s._id) {
          await updateQuoteSection(id, s._id, { name: s.name, description: s.description || null, size_m2: s.size_m2 ? Number(s.size_m2) : null });
          sectionId = s._id;
        } else {
          const created = await createQuoteSection(id, { name: s.name, description: s.description || null, size_m2: s.size_m2 ? Number(s.size_m2) : null, survey_entry_id: s._surveyEntryId || null });
          sectionId = created.id;
        }

        const originalSectionEntries = s._id ? originalEntries.filter(e => e.section_id === s._id) : [];
        const keptEntryIds = new Set(s.entries.filter(e => e._id).map(e => e._id));

        // Delete removed entries
        for (const e of originalSectionEntries) {
          if (!keptEntryIds.has(e.id)) await deleteQuoteEntry(e.id);
        }

        // Create / update entries
        for (const entry of s.entries) {
          const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
          const fields = {
            entry_type: entry.entry_type,
            work_description: entry.work_description,
            quantity: useQty && entry.quantity ? parseFloat(entry.quantity) : null,
            unit: useQty && entry.unit ? entry.unit : null,
            unit_price: useQty && entry.unit_price ? parseInt(entry.unit_price, 10) : null,
            amount_huf: entry.amount_huf,
            notes: entry.notes || '',
            user_id: entry.user_id,
            section_id: sectionId,
          };
          if (entry._id) {
            await updateQuoteEntry(entry._id, fields);
          } else {
            await createQuoteEntry({ quoteId: id, userId: fields.user_id, workDescription: fields.work_description, amountHuf: fields.amount_huf, notes: fields.notes, entryType: fields.entry_type, quantity: fields.quantity, unit: fields.unit, unitPrice: fields.unit_price, sectionId });
          }
        }
      }

      router.push(`/ajanlatok/${id}`);
    } catch (err) {
      setError(err.message || 'Hiba a mentésekor');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/ajanlatok/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlathoz
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="page-title">Ajánlat szerkesztése</h1>
        <p className="page-subtitle">{quote.title}</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── ALAPADATOK ── */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alapadatok</div>
          <div className="form-group">
            <label className="form-label" htmlFor="q-title">Ajánlat neve *</label>
            <input id="q-title" type="text" className="form-control" required value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felújítás" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-location">Helyszín</label>
              <input id="q-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. Budapest, Fő utca 12." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-type">Munka típusa</label>
              <input id="q-type" type="text" className="form-control" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Teljes felújítás" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="q-desc">Leírás / Megjegyzés</label>
            <textarea id="q-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Részletes munkaleírás…" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-start">Tervezett kezdés</label>
              <input id="q-start" type="date" className="form-control" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="q-end">Tervezett befejezés</label>
              <input id="q-end" type="date" className="form-control" min={startDate ? nextDay(startDate) : undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">ÁFA kulcs</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {['0', '5', '18', '27'].map(v => (
                <button key={v} type="button" onClick={() => setTaxPercent(v)} style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: taxPercent === v ? 'var(--accent)' : 'var(--bg-subtle)', color: taxPercent === v ? '#fff' : 'var(--text-secondary)', border: `1px solid ${taxPercent === v ? 'var(--accent)' : 'var(--border-subtle)'}` }}>{v}%</button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <input type="number" min="0" max="100" step="0.5" className="form-control text-mono" style={{ width: '80px' }} value={taxPercent} onChange={e => setTaxPercent(e.target.value)} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MEGRENDELŐ ── */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>Megrendelő</div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" htmlFor="q-client">Ügyfél</label>
              <select id="q-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">– Ügyfél nélkül –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.discount_percent > 0 ? ` (${c.discount_percent}% kedv.)` : ''}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}><Plus size={14} /> Új ügyfél</button>
          </div>
          {selectedClient && (
            <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              <User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {selectedClient.name}{selectedClient.phone && ` · ${selectedClient.phone}`}
            </div>
          )}
        </div>

        {/* ── HELYISÉGEK + TÉTELEK ── */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Helyiségek és tételek</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Adja meg a helyiségeket, majd minden helyiséghez az anyag-, munka- és egyéb költségeket</div>
            </div>
            <button type="button" onClick={() => { setShowAddSection(true); setEditingSectionKey(null); }} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
              <Plus size={14} /> Helyiség
            </button>
          </div>

          {showAddSection && (
            <div style={{ marginBottom: '0.75rem' }}>
              <SectionForm surveyId={quote?.survey_id} onSave={addSection} onCancel={() => setShowAddSection(false)} />
            </div>
          )}

          {localSections.length === 0 && !showAddSection && (
            <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nincs helyiség. Kattintson a „Helyiség" gombra az első hozzáadásához.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {localSections.map(s => {
              const sectionTotal = s.entries.reduce((sum, e) => sum + Number(e.amount_huf || 0), 0);
              return (
                <div key={s._key} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {editingSectionKey === s._key ? (
                    <div style={{ padding: '0.75rem' }}>
                      <SectionForm initial={{ name: s.name, description: s.description, size_m2: s.size_m2 ? Number(s.size_m2) : null }} onSave={(fields) => updateSection(s._key, fields)} onCancel={() => setEditingSectionKey(null)} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.85rem', background: 'var(--bg-subtle)', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <Home size={14} color="var(--accent)" />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{s.name}</span>
                          {s.size_m2 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}><Ruler size={11} />{s.size_m2} m²</span>}
                        </div>
                        {s.description && <p style={{ margin: '0.1rem 0 0 1.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {sectionTotal > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{formatHUF(sectionTotal)}</span>}
                        <button type="button" onClick={() => openEntryModal(s._key)} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem' }} title="Tétel hozzáadása"><Plus size={12} /></button>
                        <button type="button" onClick={() => { setEditingSectionKey(s._key); setShowAddSection(false); }} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.45rem' }}><Edit3 size={12} /></button>
                        <button type="button" onClick={() => removeSection(s._key)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem' }}><X size={12} /></button>
                      </div>
                    </div>
                  )}

                  {/* Photo management for survey-linked sections */}
                  {quote?.survey_id && s._surveyEntryId && (
                    <SectionMediaGrid surveyId={quote.survey_id} surveyEntryId={s._surveyEntryId} isLocked={false} />
                  )}

                  {s.entries.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {sortEntries(s.entries).map((e, eIdx) => {
                        const Icon = TYPE_ICONS[e.entry_type] || MoreHorizontal;
                        const tc = TYPE_COLORS[e.entry_type] || TYPE_COLORS.other;
                        const useQty = e.entry_type === 'material' || e.entry_type === 'labour';
                        return (
                          <div key={e._ekey} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.85rem', borderTop: eIdx > 0 ? '1px solid var(--border-subtle)' : 'none', background: '#fff' }}>
                            <div style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={13} color={tc.color} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{e.work_description}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                <span style={{ padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.67rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_LABELS[e.entry_type]}</span>
                                {useQty && e.quantity != null && <span>{e.quantity} {e.unit || 'h'}{e.unit_price ? ` × ${formatHUF(e.unit_price)}` : ''}</span>}
                                {e.notes && <span style={{ fontStyle: 'italic' }}>{e.notes}</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{formatHUF(e.amount_huf)}</span>
                              <button type="button" onClick={() => openEntryModal(s._key, e._ekey)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><Edit3 size={11} /></button>
                              <button type="button" onClick={() => removeEntry(s._key, e._ekey)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalValue > 0 && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nettó összesen:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Coins size={15} color="var(--accent)" />{formatHUF(totalValue)}
              </span>
            </div>
          )}
        </div>

        {/* ── MEGHÍVOTT TAGOK ── */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>Meghívott tagok</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {users.filter(u => u.id !== currentUser?.id).map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: sharedWith.includes(u.id) ? 'var(--accent-light)' : '#fff' }}>
                <input type="checkbox" checked={sharedWith.includes(u.id)} onChange={e => setSharedWith(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.display_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Link href={`/ajanlatok/${id}`} className="btn btn-secondary">Mégse</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Mentés…</> : <><Check size={16} />Módosítások mentése</>}
          </button>
        </div>
      </form>

      {/* ── ENTRY MODAL ── */}
      <Modal isOpen={showEntryModal} onClose={() => { setShowEntryModal(false); setPendingEntries([]); }} title={editingEntryKey ? 'Tétel szerkesztése' : 'Tételek hozzáadása'}>
        {/* Pending entries list */}
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--success-bg)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Hozzáadásra kész: {pendingEntries.length} db</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._ekey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatHUF(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(p => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, flexShrink: 0, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Section breadcrumb */}
        {(() => {
          const section = localSections.find(s => s._key === activeSectionKey);
          return section ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
              <Home size={13} />{section.name}{section.size_m2 ? ` · ${section.size_m2} m²` : ''}
            </div>
          ) : null;
        })()}

        {entryError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}
        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(t => { const Icon = TYPE_ICONS[t.id]; const tc = TYPE_COLORS[t.id]; const active = entryForm.entry_type === t.id; return (<button key={t.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`, background: active ? tc.bg : '#fff', cursor: 'pointer', transition: 'all 0.12s ease' }}><Icon size={18} color={active ? tc.color : 'var(--text-muted)'} /><span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span></button>); })}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="e-desc">Megnevezés *</label>
          <input id="e-desc" type="text" className="form-control" autoFocus placeholder={entryForm.entry_type === 'material' ? 'pl. Gipszkarton lap 12,5mm' : entryForm.entry_type === 'labour' ? 'pl. Gipszkarton szerelés' : 'pl. Állványzat bérlés'} value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
        </div>
        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div className="qty-grid">
            <div><label className="form-label">Mennyiség</label><input type="number" min="0" step="0.01" className="form-control text-mono" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div><label className="form-label">Egység</label><select className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>{(entryForm.entry_type === 'labour' ? LABOUR_UNITS : QUANTITY_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="form-label">Egységár (Ft)</label><input type="number" min="0" className="form-control text-mono" placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
          </div>
        )}
        {(entryForm.entry_type === 'equipment' || entryForm.entry_type === 'transport' || entryForm.entry_type === 'other') && (
          <div className="form-group"><label className="form-label">Összeg (Ft) *</label><input type="number" min="1" className="form-control text-mono" placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} /></div>
        )}
        {previewAmount > 0 && <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Coins size={15} /> Tétel: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(previewAmount)}</span></div>}
        <div className="form-group">
          <label className="form-label" htmlFor="e-user">Kivitelező</label>
          <select id="e-user" className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
            <option value={currentUser.id}>Saját magam ({currentUser.display_name})</option>
            {users.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés (opcionális)</label>
          <input type="text" className="form-control" placeholder="pl. Anyaggal együtt, 2. emelet" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowEntryModal(false); setPendingEntries([]); }}>Mégse</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!editingEntryKey && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAnother}>
                + Következő tétel
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry}>
              {editingEntryKey ? 'Módosítás' : pendingEntries.length > 0 ? `Mentés (${pendingEntries.length + (entryForm.work_description.trim() ? 1 : 0)} db)` : 'Tétel hozzáadása'}
            </button>
          </div>
        </div>
      </Modal>

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={async (fields) => { const c = await createClient({ ...fields, entityId: effectiveEntityId }); setClientId(c.id); setShowNewClientModal(false); }}
      />
    </div>
  );
}
