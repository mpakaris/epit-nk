'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Package, Hammer, Wrench, Truck, MoreHorizontal,
  Check, Loader2, Trash2, Plus, Sparkles, Edit3, ChevronDown, X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import useMobile from '@/hooks/useMobile';
import AudioRecorder from '@/components/AudioRecorder';
import ErrorBanner from '@/components/ErrorBanner';

// ── Item type metadata ────────────────────────────────────────────────────────

export const ITEM_TYPE_ORDER  = ['material', 'labour', 'equipment', 'transport', 'other'];
export const ITEM_TYPE_ICONS  = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
export const ITEM_TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};
export const ITEM_TYPE_LABELS = { material: 'Anyag', labour: 'Munkadíj', equipment: 'Eszközbérlés', transport: 'Szállítás', other: 'Egyéb' };
const ITEM_UNITS_BY_TYPE = {
  material:  ['m²', 'm', 'fm', 'db', 'kg', 'l', 'zsák', 'csomag', 'm³', 't'],
  labour:    ['m²', 'm', 'fm', 'db', 'nap', 'h'],
  equipment: ['nap', 'db', 'h'],
  transport: ['db', 'km', 'nap'],
  other:     ['db', 'h', 'nap', 'm²'],
};
const ALL_UNITS = ['m²', 'm', 'fm', 'db', 'h', 'nap', 'kg', 'l', 'zsák', 'csomag', 'm³', 't', 'km'];
const DEFAULT_UNIT_BY_TYPE = { material: 'm²', labour: 'm²', equipment: 'nap', transport: 'db', other: 'db' };

// ── Infer type for legacy items saved before entry_type was introduced ─────────

export function inferType(item) {
  if (item.entry_type && item.entry_type !== 'material') return item.entry_type;
  const u = (item.unit || '').toLowerCase();
  if (u === 'munkafázis' || u === 'munka') return 'labour';
  return item.entry_type || 'material';
}

// ── ItemDrawer — add/edit a single item (modal on desktop, bottom-sheet on mobile) ──

function ItemDrawer({ initial, surveyId, entryId, onClose, createSurveyItem, updateSurveyItem, deleteSurveyItem }) {
  const isEdit = !!initial;
  const isMobile = useMobile();
  const [entryType, setEntryType] = useState(initial?.entry_type || 'material');
  const [desc,  setDesc]  = useState(initial?.description || '');
  const [qty,   setQty]   = useState(initial?.quantity != null ? String(initial.quantity) : '');
  const [unit,  setUnit]  = useState(initial?.unit || DEFAULT_UNIT_BY_TYPE[initial?.entry_type || 'material']);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');

  const handleTypeChange = (t) => {
    setEntryType(t);
    if (!initial) setUnit(DEFAULT_UNIT_BY_TYPE[t]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!desc.trim()) { setError('A leírás kötelező'); return; }
    setSaving(true); setError('');
    try {
      const payload = { description: desc.trim(), entry_type: entryType, quantity: qty ? parseFloat(qty) : null, unit: unit.trim() || null, notes: notes.trim() || null };
      if (isEdit) await updateSurveyItem(surveyId, initial.id, payload);
      else await createSurveyItem(surveyId, { entry_id: entryId, ...payload, source: 'manual', is_confirmed: true });
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteSurveyItem(surveyId, initial.id); onClose(); }
    catch (e) { setError(e.message); setDeleting(false); }
  };

  const PLACEHOLDERS = {
    material: 'pl. Csempe, Ragasztó, Gipszkarton',
    labour:   'pl. Csempe rakás, Festés, Glettelés',
    equipment:'pl. Állványzat bérlés, Betonkeverő',
    transport:'pl. Törmelék elszállítás, Anyagbeszerzés',
    other:    'pl. Engedély, Tervezési díj',
  };

  const panelStyle = isMobile
    ? { position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', padding: '1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom))' }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 500, borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 40px rgba(0,0,0,0.22)', padding: '1.5rem' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
      <div style={{ ...panelStyle, zIndex: 301, background: 'var(--bg-card)', maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>{isEdit ? 'Tétel szerkesztése' : 'Új tétel'}</span>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
            {ITEM_TYPE_ORDER.map(t => {
              const tc = ITEM_TYPE_COLORS[t];
              const active = entryType === t;
              const Icon = ITEM_TYPE_ICONS[t];
              return (
                <button key={t} type="button" onClick={() => handleTypeChange(t)}
                  style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0.55rem 0.65rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: active ? `2px solid ${tc.color}` : '2px solid var(--border-subtle)', background: active ? tc.bg : 'var(--bg-card)', transition: 'all 0.12s', minWidth: 72 }}>
                  <Icon size={15} color={active ? tc.color : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ITEM_TYPE_LABELS[t]}</span>
                </button>
              );
            })}
          </div>

          <div className="form-group">
            <label className="form-label">Leírás *</label>
            <input autoFocus type="text" className="form-control" placeholder={PLACEHOLDERS[entryType]} value={desc} onChange={e => setDesc(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mennyiség</label>
              <input type="number" min="0" step="0.01" className="form-control" placeholder="pl. 9" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Egység</label>
              <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)}>
                {(ITEM_UNITS_BY_TYPE[entryType] || ALL_UNITS).map(u => <option key={u} value={u}>{u}</option>)}
                {unit && !(ITEM_UNITS_BY_TYPE[entryType] || []).includes(unit) && <option value={unit}>{unit}</option>}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Megjegyzés</label>
            <input type="text" className="form-control" placeholder="Opcionális" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', justifyContent: 'space-between' }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ minWidth: 80 }}>
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={14} /> Törlés</>}
              </button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Mégse</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={15} className="animate-spin" />Mentés…</> : <><Check size={15} />{isEdit ? 'Módosítás' : 'Hozzáadás'}</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ── TételekSection ─────────────────────────────────────────────────────────────

export default function TételekSection({ surveyId, entry, canAdd, canEditAll = true, triggerAudio = 0, triggerGenerate = 0, triggerAddItem = 0 }) {
  const { surveyItemsBySurvey, createSurveyItem, updateSurveyItem, deleteSurveyItem, generateSurveyEntryItems, updateSurveyEntry, currentUser } = useApp();
  const isMobile = useMobile();

  const canEditItem = (item) => canEditAll || item.created_by === currentUser?.id;

  const allItems  = surveyItemsBySurvey[surveyId] || [];
  const items     = allItems.filter(i => i.entry_id === entry.id).sort((a, b) => {
    const tOrder = ITEM_TYPE_ORDER.indexOf(inferType(a)) - ITEM_TYPE_ORDER.indexOf(inferType(b));
    return tOrder !== 0 ? tOrder : (a.sort_order - b.sort_order || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  });
  const confirmed   = items.filter(i => i.is_confirmed);
  const suggestions = items.filter(i => !i.is_confirmed);

  const [open, setOpen]         = useState(false);
  const [drawer, setDrawer]     = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting]   = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [audioError, setAudioError]             = useState('');
  const [pendingTranscript, setPendingTranscript] = useState('');
  const [pendingFields, setPendingFields]         = useState({});
  const [pendingMerge, setPendingMerge]           = useState('append'); // 'append' | 'overwrite'
  const [pendingStep, setPendingStep]             = useState(1);        // 1 = merge choice, 2 = generate choice
  const [aiStatus, setAiStatus]                   = useState('idle');

  const doSaveAndGenerate = async (description, extraFields = {}) => {
    setAiStatus('generating'); setGenError('');
    setGenerating(true);
    try {
      await updateSurveyEntry(surveyId, entry.id, { description, ...extraFields });
      await generateSurveyEntryItems(surveyId, entry.id);
      setOpen(true);
      setAiStatus('done');
      setTimeout(() => setAiStatus('idle'), 2000);
    } catch (e) {
      setGenError(e.message || 'Generálás sikertelen');
      setAiStatus('idle');
    } finally {
      setGenerating(false);
    }
  };

  const doSaveOnly = async (description, extraFields = {}) => {
    setGenError('');
    setGenerating(true);
    try {
      await updateSurveyEntry(surveyId, entry.id, { description, ...extraFields });
      setAiStatus('idle');
    } catch (e) {
      setGenError(e.message || 'Mentés sikertelen');
    } finally {
      setGenerating(false);
    }
  };

  const resolvePendingDescription = () => {
    const existing = (entry.description || '').trim();
    if (!existing || pendingMerge === 'overwrite') return pendingTranscript;
    return existing + '\n\n' + pendingTranscript;
  };

  const clearPending = () => { setPendingTranscript(''); setPendingFields({}); setPendingMerge('append'); setPendingStep(1); };

  const handleAudioTranscript = async (text) => {
    setAudioError('');
    setPendingTranscript('');
    setPendingFields({});
    setPendingMerge('append');
    setAiStatus('filling');

    let description = text;
    const extraFields = {};

    try {
      const res = await fetch(`/api/surveys/${surveyId}/entries/${entry.id}/fill-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      if (res.ok) {
        const data = await res.json();
        const f = data.fields;
        if (f.width_m      != null) extraFields.width_m      = f.width_m;
        if (f.length_m     != null) extraFields.length_m     = f.length_m;
        if (f.height_m     != null) extraFields.height_m     = f.height_m;
        if (f.window_count != null) extraFields.window_count = f.window_count;
        if (f.door_count   != null) extraFields.door_count   = f.door_count;
        if (f.description)           description = f.description;
      }
    } catch { /* fall back to raw transcript */ }

    setAiStatus('idle');
    // Always route through pending so user confirms whether to generate items.
    // Skip the merge step if there's no existing description.
    const hasExisting = !!(entry.description || '').trim();
    setPendingStep(hasExisting ? 1 : 2);
    setPendingMerge('append');
    setPendingTranscript(description);
    setPendingFields(extraFields);
  };

  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !didAutoOpen.current) {
      setOpen(true);
      didAutoOpen.current = true;
    }
  }, [items.length]);

  const handleGenerateRef = useRef(null);
  const handleGenerate = async () => {
    setGenerating(true); setGenError('');
    try { await generateSurveyEntryItems(surveyId, entry.id); setOpen(true); }
    catch (e) { setGenError(e.message || 'Generálás sikertelen'); }
    finally { setGenerating(false); }
  };
  handleGenerateRef.current = handleGenerate;

  const prevAudioTrigger    = useRef(triggerAudio);
  const prevGenerateTrigger = useRef(triggerGenerate);
  const prevAddItemTrigger  = useRef(triggerAddItem);

  useEffect(() => {
    if (triggerAudio !== prevAudioTrigger.current) { prevAudioTrigger.current = triggerAudio; if (triggerAudio > 0) setAudioError(''); }
  }, [triggerAudio]);
  useEffect(() => {
    if (triggerGenerate !== prevGenerateTrigger.current) { prevGenerateTrigger.current = triggerGenerate; if (triggerGenerate > 0) handleGenerateRef.current?.(); }
  }, [triggerGenerate]);
  useEffect(() => {
    if (triggerAddItem !== prevAddItemTrigger.current) { prevAddItemTrigger.current = triggerAddItem; if (triggerAddItem > 0) { setDrawer({ mode: 'add' }); setOpen(true); } }
  }, [triggerAddItem]);

  const editableItems = items.filter(i => canEditItem(i));
  const toggleSelect = (id) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll  = () => setSelectedIds(new Set(editableItems.map(i => i.id)));
  const selectNone = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (!selectedIds.size || bulkDeleting) return;
    setBulkDeleting(true);
    await Promise.allSettled([...selectedIds].map(id => deleteSurveyItem(surveyId, id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };

  const handleBulkConfirm = async () => {
    const unconfirmedSelected = suggestions.filter(i => selectedIds.has(i.id));
    if (!unconfirmedSelected.length || bulkConfirming) return;
    setBulkConfirming(true);
    await Promise.allSettled(unconfirmedSelected.map(i => updateSurveyItem(surveyId, i.id, { is_confirmed: true })));
    setSelectedIds(prev => { const next = new Set(prev); unconfirmedSelected.forEach(i => next.delete(i.id)); return next; });
    setBulkConfirming(false);
  };

  const grouped = ITEM_TYPE_ORDER
    .map(type => ({ type, items: confirmed.filter(i => inferType(i) === type) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? '0.65rem' : 0 }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
            Tételek {items.length > 0 ? `(${items.length})` : ''}
          </span>
          <ChevronDown size={13} color="var(--text-muted)" style={{ transition: 'transform 0.18s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        </button>
        {canAdd && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <AudioRecorder
              size="sm"
              disabled={generating}
              externalTrigger={triggerAudio}
              hasContent={!!(entry.description || '').trim()}
              onTranscript={handleAudioTranscript}
              onError={msg => setAudioError(msg)}
              hideTriggerButton={isMobile}
              hint={`Ez a „${entry.name}" felmérése. Mondd el a méreteket (szélesség, hossz, belmagasság), ablak- és ajtószámot, az állapotot és az elvégzendő munkákat.`}
            />
            {!isMobile && <>
              <button type="button" onClick={handleGenerate} disabled={generating}
                className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? 'Generálás…' : 'AI javaslat'}
              </button>
              <button type="button" onClick={() => { setDrawer({ mode: 'add' }); setOpen(true); }}
                className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>
                <Plus size={13} /> Tétel
              </button>
            </>}
          </div>
        )}
      </div>

      {aiStatus !== 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)', background: aiStatus === 'error' ? 'var(--danger-bg)' : aiStatus === 'done' ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${aiStatus === 'error' ? 'var(--danger-border)' : aiStatus === 'done' ? 'var(--success-border)' : 'var(--border-subtle)'}`, fontSize: '0.8rem', fontWeight: 600, color: aiStatus === 'error' ? 'var(--danger-text)' : aiStatus === 'done' ? 'var(--success-text)' : 'var(--text-secondary)' }}>
          {(aiStatus === 'filling' || aiStatus === 'generating') && <Loader2 size={13} className="animate-spin" />}
          {aiStatus === 'done'  && <Check size={13} />}
          {aiStatus === 'filling'    && 'Méretek és leírás kinyerése…'}
          {aiStatus === 'generating' && 'Tételek generálása…'}
          {aiStatus === 'done'       && 'Kész — tételek hozzáadva'}
          {aiStatus === 'error'      && 'Hiba a feldolgozás során'}
        </div>
      )}

      {audioError && (
        <div style={{ fontSize: '0.78rem', color: 'var(--danger-text)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem', marginBottom: '0.5rem' }}>
          {audioError}
        </div>
      )}

      {pendingTranscript && aiStatus === 'idle' && (
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
          {/* Transcript + dims preview — always visible */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
            🎙 &ldquo;{pendingTranscript}&rdquo;
          </div>
          {Object.keys(pendingFields).length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {pendingFields.width_m      != null && <span>Szél: {pendingFields.width_m} m</span>}
              {pendingFields.length_m     != null && <span>Hossz: {pendingFields.length_m} m</span>}
              {pendingFields.height_m     != null && <span>Mag: {pendingFields.height_m} m</span>}
              {pendingFields.window_count != null && <span>{pendingFields.window_count} ablak</span>}
              {pendingFields.door_count   != null && <span>{pendingFields.door_count} ajtó</span>}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.4rem', paddingTop: '0.5rem' }}>

            {/* Step 1 — merge choice (only when existing description) */}
            {pendingStep === 1 && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Már van leírás — mit szeretnél?
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}
                    onClick={() => { setPendingMerge('append'); setPendingStep(2); }}>
                    Hozzáfűzés →
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}
                    onClick={() => { setPendingMerge('overwrite'); setPendingStep(2); }}>
                    Felülírás →
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}
                    onClick={clearPending}>
                    <X size={12} /> Mégse
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — generate choice */}
            {pendingStep === 2 && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Generáljuk a tételeket?
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => { doSaveAndGenerate(resolvePendingDescription(), pendingFields); clearPending(); }}>
                    <Sparkles size={11} /> Igen, generálás
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}
                    onClick={() => { doSaveOnly(resolvePendingDescription(), pendingFields); clearPending(); }}>
                    Csak mentés
                  </button>
                  {(entry.description || '').trim() ? (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}
                      onClick={() => setPendingStep(1)}>
                      ← Vissza
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}
                      onClick={clearPending}>
                      <X size={12} /> Mégse
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {genError && (
        <div style={{ fontSize: '0.78rem', color: 'var(--danger-text)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem', marginBottom: '0.5rem' }}>
          {genError}
        </div>
      )}

      {open && (
        <>
          {canAdd && items.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
              <button type="button" onClick={selectedIds.size === editableItems.length ? selectNone : selectAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: '0.78rem' }}>
                {selectedIds.size === editableItems.length ? 'Egyik sem' : 'Összes'}
              </button>
              {selectedIds.size > 0 && suggestions.some(i => selectedIds.has(i.id)) && (
                <button type="button" onClick={handleBulkConfirm} disabled={bulkConfirming} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                  {bulkConfirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Elfogad ({suggestions.filter(i => selectedIds.has(i.id)).length})
                </button>
              )}
              {selectedIds.size > 0 && (
                <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting} className="btn btn-danger btn-sm" style={{ fontSize: '0.78rem', marginLeft: 'auto' }}>
                  {bulkDeleting ? <Loader2 size={13} className="animate-spin" /> : <></>}
                  Törlés ({selectedIds.size})
                </button>
              )}
            </div>
          )}

          {grouped.length === 0 && suggestions.length === 0 && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</p>
          )}

          {grouped.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {grouped.map(({ type, items: typeItems }) => {
                const tc   = ITEM_TYPE_COLORS[type] || ITEM_TYPE_COLORS.other;
                const Icon = ITEM_TYPE_ICONS[type]  || MoreHorizontal;
                return (
                  <div key={type} style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                      <div style={{ padding: '0.15rem', borderRadius: 'var(--radius-sm)', background: tc.bg }}>
                        <Icon size={10} color={tc.color} />
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: tc.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {ITEM_TYPE_LABELS[type]}
                      </span>
                    </div>
                    {typeItems.map(item => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto auto', gap: '0 0.5rem', alignItems: 'center', padding: '0.3rem 0' }}>
                        {canAdd && canEditItem(item)
                          ? <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', margin: 0 }} />
                          : <span />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                          {item.notes && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.notes}</div>}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {item.quantity != null ? Number(item.quantity).toLocaleString('hu-HU') : ''}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.unit || ''}</span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {canAdd && canEditItem(item) && (
                            <button type="button" onClick={() => setDrawer({ mode: 'edit', item })} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}>
                              <Edit3 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {suggestions.length > 0 && (
            <div style={{ marginTop: grouped.length ? '0.5rem' : 0, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                <Sparkles size={10} color="var(--text-muted)" />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI javaslat</span>
              </div>
              {suggestions.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto auto', gap: '0 0.5rem', alignItems: 'center', padding: '0.3rem 0', opacity: 0.8 }}>
                  {canAdd && canEditItem(item)
                    ? <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', margin: 0 }} />
                    : <span />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {item.quantity != null ? Number(item.quantity).toLocaleString('hu-HU') : ''}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.unit || ''}</span>
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                    {canAdd && canEditItem(item) && (
                      <button type="button"
                        onClick={() => updateSurveyItem(surveyId, item.id, { is_confirmed: true }).catch(() => {})}
                        className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                        <Check size={12} /> Elfogad
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {drawer && (
        <ItemDrawer
          initial={drawer.mode === 'edit' ? drawer.item : null}
          surveyId={surveyId}
          entryId={entry.id}
          onClose={() => setDrawer(null)}
          createSurveyItem={createSurveyItem}
          updateSurveyItem={updateSurveyItem}
          deleteSurveyItem={deleteSurveyItem}
        />
      )}
    </div>
  );
}
