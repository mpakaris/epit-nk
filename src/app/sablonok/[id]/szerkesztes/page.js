'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import { formatHUF, formatDate, QUOTE_ENTRY_TYPES, QUANTITY_UNITS, LABOUR_UNITS } from '@/lib/constants';
import {
  ArrowLeft, AlertCircle, Check, Loader2, Plus, Trash2, Edit3,
  Package, Hammer, Wrench, Truck, MoreHorizontal,
  Coins, Ruler, Calendar, X,
} from 'lucide-react';

const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
const sortEntries = arr => [...arr].sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));
const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};
const QUOTE_ENTRY_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép/eszköz', transport: 'Szállítás', other: 'Egyéb' };
const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '' };

function calcAmount(t, qty, up, flat) {
  if ((t === 'material' || t === 'labour') && qty && up) return Math.round(parseFloat(qty) * parseInt(up, 10));
  return parseInt(flat, 10) || 0;
}

function SectionForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [sizeM2, setSizeM2] = useState(initial?.size_m2 != null ? String(initial.size_m2) : '');
  const [startDate, setStartDate] = useState(initial?.start_date || '');
  const [endDate, setEndDate] = useState(initial?.end_date || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('A helyiség neve kötelező!'); return; }
    onSave({ name: name.trim(), description: description.trim() || null, size_m2: sizeM2 ? Number(sizeM2) : null, start_date: startDate || null, end_date: endDate || null });
  };

  return (
    <div style={{ padding: '0.85rem', background: 'var(--accent-light)', border: '2px solid var(--accent-border)', borderRadius: 'var(--radius-md)' }}>
      {error && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Helyiség neve *</label>
          <input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="pl. Fürdőszoba, Konyha…" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Alapterület (m²)</label>
          <input type="number" min="0" step="0.1" className="form-control" value={sizeM2} onChange={e => setSizeM2(e.target.value)} />
        </div>
      </div>
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Kezdés</label>
          <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value && endDate && endDate < e.target.value) setEndDate(''); }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Befejezés</label>
          <input type="date" className="form-control" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label className="form-label">Leírás</label>
        <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>{initial ? 'Módosítás' : 'Helyiség hozzáadása'}</button>
      </div>
    </div>
  );
}

export default function EditTemplatePage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, fetchTemplateDetail, updateTemplate, isAdmin } = useApp();

  const [templateName, setTemplateName] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [description, setDescription] = useState('');
  const [taxPercent, setTaxPercent] = useState('27');
  const [localSections, setLocalSections] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSectionKey, setEditingSectionKey] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const [editingEntryKey, setEditingEntryKey] = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [pendingEntries, setPendingEntries] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialized || !id) return;
    fetchTemplateDetail(id)
      .then(({ template, sections }) => {
        setTemplateName(template.name || '');
        setTitle(template.title || '');
        setLocation(template.location || '');
        setWorkType(template.work_type || '');
        setDescription(template.description || '');
        setTaxPercent(String(template.tax_percent ?? 27));
        setLocalSections(sections.map(s => ({
          _key: s.id,
          name: s.name,
          description: s.description || '',
          size_m2: s.size_m2 != null ? String(s.size_m2) : '',
          start_date: s.start_date || null,
          end_date: s.end_date || null,
          entries: s.entries.map(e => ({
            _ekey: e.id,
            entry_type: e.entry_type,
            work_description: e.work_description,
            quantity: e.quantity,
            unit: e.unit,
            unit_price: e.unit_price,
            amount_huf: e.amount_huf,
            notes: e.notes || '',
          })),
        })));
        setInitialized(true);
      })
      .catch(err => setFetchError(err.message || 'Hiba a sablon betöltésekor'));
  }, [id, initialized]);

  if (loading || !initialized) {
    if (fetchError) return (
      <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>
        {fetchError} — <Link href="/sablonok">Vissza</Link>
      </div>
    );
    return <PageSpinner />;
  }
  if (!isAdmin) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>Nincs jogosultsága.</div>;

  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);
  const totalValue = localSections.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + Number(e.amount_huf || 0), 0), 0);

  const addSection = (fields) => {
    setLocalSections(prev => [...prev, { _key: `new-${Date.now()}`, name: fields.name, description: fields.description || '', size_m2: fields.size_m2 != null ? String(fields.size_m2) : '', start_date: fields.start_date || null, end_date: fields.end_date || null, entries: [] }]);
    setShowAddSection(false);
  };
  const updateSection = (key, fields) => {
    setLocalSections(prev => prev.map(s => s._key === key ? { ...s, ...fields, size_m2: fields.size_m2 != null ? String(fields.size_m2) : '' } : s));
    setEditingSectionKey(null);
  };
  const removeSection = (key) => setLocalSections(prev => prev.filter(s => s._key !== key));

  const openEntryModal = (sectionKey, editKey = null) => {
    setActiveSectionKey(sectionKey);
    setPendingEntries([]);
    if (editKey) {
      const section = localSections.find(s => s._key === sectionKey);
      const entry = section?.entries.find(e => e._ekey === editKey);
      if (entry) {
        const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
        setEntryForm({ entry_type: entry.entry_type, work_description: entry.work_description, quantity: entry.quantity != null ? String(entry.quantity) : '', unit: entry.unit || 'db', unit_price: entry.unit_price != null ? String(entry.unit_price) : '', flat_amount: !useQty ? String(entry.amount_huf) : '', notes: entry.notes || '' });
        setEditingEntryKey(editKey);
      }
    } else {
      setEntryForm(EMPTY_ENTRY_FORM);
      setEditingEntryKey(null);
    }
    setEntryError('');
    setShowEntryModal(true);
  };

  const buildEntry = (ekey) => {
    const useQty = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    return {
      _ekey: ekey || `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entry_type: entryForm.entry_type,
      work_description: entryForm.work_description.trim(),
      quantity: useQty && entryForm.quantity ? parseFloat(entryForm.quantity) : null,
      unit: useQty && entryForm.unit ? entryForm.unit : null,
      unit_price: useQty && entryForm.unit_price ? parseInt(entryForm.unit_price, 10) : null,
      amount_huf: previewAmount,
      notes: entryForm.notes.trim(),
    };
  };

  const handleAddAnother = () => {
    if (!entryForm.work_description.trim()) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    setPendingEntries(prev => [...prev, buildEntry()]);
    setEntryForm({ ...EMPTY_ENTRY_FORM, entry_type: entryForm.entry_type });
    setEntryError('');
  };

  const handleSaveEntry = () => {
    const hasCurrent = entryForm.work_description.trim();
    if (!hasCurrent && pendingEntries.length === 0) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (hasCurrent && previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    const allEntries = hasCurrent ? [...pendingEntries, buildEntry(editingEntryKey || undefined)] : pendingEntries;
    setLocalSections(prev => prev.map(s => {
      if (s._key !== activeSectionKey) return s;
      if (editingEntryKey) return { ...s, entries: s.entries.map(e => e._ekey === editingEntryKey ? allEntries[0] : e) };
      return { ...s, entries: [...s.entries, ...allEntries] };
    }));
    setPendingEntries([]);
    setShowEntryModal(false);
  };

  const removeEntry = (sectionKey, ekey) => {
    setLocalSections(prev => prev.map(s => s._key === sectionKey ? { ...s, entries: s.entries.filter(e => e._ekey !== ekey) } : s));
  };

  const handleSubmit = async () => {
    setError('');
    if (!templateName.trim()) { setError('A sablon neve kötelező!'); return; }
    setIsSubmitting(true);
    try {
      const sections = localSections.map(s => ({
        name: s.name, description: s.description || null, size_m2: s.size_m2 ? Number(s.size_m2) : null,
        start_date: s.start_date || null, end_date: s.end_date || null,
        entries: s.entries.map(e => ({
          entry_type: e.entry_type, work_description: e.work_description,
          quantity: e.quantity, unit: e.unit, unit_price: e.unit_price, amount_huf: e.amount_huf, notes: e.notes,
        })),
      }));
      await updateTemplate(id, { name: templateName.trim(), title: title.trim() || null, location: location.trim() || null, work_type: workType.trim() || null, description: description.trim() || null, tax_percent: Number(taxPercent) || 27, sections });
      router.push('/sablonok');
    } catch (err) {
      setError(err.message || 'Hiba a sablon mentésekor');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '720px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/sablonok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a sablonokhoz
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="page-title">Sablon szerkesztése</h1>
        <p className="page-subtitle" style={{ wordBreak: 'break-word' }}>{templateName}</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <div className="card mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Sablon neve</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="tpl-name">Sablon neve *</label>
          <input id="tpl-name" type="text" className="form-control" value={templateName} onChange={e => setTemplateName(e.target.value)} />
        </div>
      </div>

      <div className="card mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Előtöltési adatok (opcionális)</div>
        <div className="form-group">
          <label className="form-label">Ajánlat előtöltési cím</label>
          <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Helyszín</label>
            <input type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Munka típusa</label>
            <input type="text" className="form-control" value={workType} onChange={e => setWorkType(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Leírás</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
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

      <div className="card mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Helyiségek és tételek</div>
          <button type="button" onClick={() => { setShowAddSection(true); setEditingSectionKey(null); }} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Helyiség
          </button>
        </div>

        {showAddSection && (
          <div style={{ marginBottom: '0.75rem' }}>
            <SectionForm onSave={addSection} onCancel={() => setShowAddSection(false)} />
          </div>
        )}

        {localSections.length === 0 && !showAddSection && (
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nincs helyiség.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {localSections.map(s => {
            const sectionTotal = s.entries.reduce((sum, e) => sum + Number(e.amount_huf || 0), 0);
            return (
              <div key={s._key} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff' }}>
                {editingSectionKey === s._key ? (
                  <div style={{ padding: '1rem' }}>
                    <SectionForm initial={{ name: s.name, description: s.description, size_m2: s.size_m2 ? Number(s.size_m2) : null, start_date: s.start_date || '', end_date: s.end_date || '' }} onSave={(fields) => updateSection(s._key, fields)} onCancel={() => setEditingSectionKey(null)} />
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '0.85rem 1rem 0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', flex: 1 }}>{s.name}</span>
                        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                          <button type="button" onClick={() => openEntryModal(s._key)} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem' }} title="Tétel"><Plus size={12} /></button>
                          <button type="button" onClick={() => { setEditingSectionKey(s._key); setShowAddSection(false); }} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.45rem' }}><Edit3 size={12} /></button>
                          <button type="button" onClick={() => removeSection(s._key)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem' }}><X size={12} /></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {s.size_m2 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Ruler size={12} />{s.size_m2} m²</span>}
                        {(s.start_date || s.end_date) && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Calendar size={12} />{s.start_date ? formatDate(s.start_date) : '?'} – {s.end_date ? formatDate(s.end_date) : '?'}
                          </span>
                        )}
                        {sectionTotal > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatHUF(sectionTotal)}</span>}
                      </div>
                      {s.description && <p style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{s.description}</p>}
                    </div>
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
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{e.work_description}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                                  <span style={{ padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.67rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_LABELS[e.entry_type]}</span>
                                  {useQty && e.quantity != null && <span>{e.quantity} {e.unit || 'h'}{e.unit_price ? ` × ${formatHUF(e.unit_price)}` : ''}</span>}
                                  {e.notes && <span style={{ fontStyle: 'italic' }}>{e.notes}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{formatHUF(Number(e.amount_huf || 0))}</span>
                                <button type="button" onClick={() => openEntryModal(s._key, e._ekey)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><Edit3 size={11} /></button>
                                <button type="button" onClick={() => removeEntry(s._key, e._ekey)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <Link href="/sablonok" className="btn btn-secondary">Mégse</Link>
        <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Mentés…</> : <><Check size={16} />Sablon mentése</>}
        </button>
      </div>

      <Modal isOpen={showEntryModal} onClose={() => { setShowEntryModal(false); setPendingEntries([]); }} title={editingEntryKey ? 'Tétel szerkesztése' : 'Tételek hozzáadása'}>
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--success-bg)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hozzáadásra kész: {pendingEntries.length} db</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._ekey} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatHUF(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(p => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {(() => {
          const section = localSections.find(s => s._key === activeSectionKey);
          return section ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
              {section.name}{section.size_m2 ? ` · ${section.size_m2} m²` : ''}
            </div>
          ) : null;
        })()}
        {entryError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}
        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(t => { const Icon = TYPE_ICONS[t.id]; const tc = TYPE_COLORS[t.id]; const active = entryForm.entry_type === t.id; return (<button key={t.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`, background: active ? tc.bg : '#fff', cursor: 'pointer' }}><Icon size={18} color={active ? tc.color : 'var(--text-muted)'} /><span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span></button>); })}
        </div>
        <div className="form-group">
          <label className="form-label">Megnevezés *</label>
          <input type="text" className="form-control" autoFocus value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
        </div>
        {(entryForm.entry_type === 'material' || entryForm.entry_type === 'labour') && (
          <div className="qty-grid">
            <div><label className="form-label">Mennyiség</label><input type="number" min="0" step="0.01" className="form-control text-mono" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            <div><label className="form-label">Egység</label><select className="form-control" value={entryForm.unit} onChange={e => setEntryForm(f => ({ ...f, unit: e.target.value }))}>{(entryForm.entry_type === 'labour' ? LABOUR_UNITS : QUANTITY_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className="form-label">Egységár (Ft)</label><input type="number" min="0" className="form-control text-mono" placeholder="0" value={entryForm.unit_price} onChange={e => setEntryForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
          </div>
        )}
        {['equipment', 'transport', 'other'].includes(entryForm.entry_type) && (
          <div className="form-group"><label className="form-label">Összeg (Ft) *</label><input type="number" min="1" className="form-control text-mono" placeholder="0" value={entryForm.flat_amount} onChange={e => setEntryForm(f => ({ ...f, flat_amount: e.target.value }))} /></div>
        )}
        {previewAmount > 0 && <div style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Coins size={15} /> Tétel: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(previewAmount)}</span></div>}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés (opcionális)</label>
          <input type="text" className="form-control" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowEntryModal(false); setPendingEntries([]); }}>Mégse</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!editingEntryKey && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAnother}>+ Következő tétel</button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry}>
              {editingEntryKey ? 'Módosítás' : pendingEntries.length > 0 ? `Mentés (${pendingEntries.length + (entryForm.work_description.trim() ? 1 : 0)} db)` : 'Tétel hozzáadása'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
