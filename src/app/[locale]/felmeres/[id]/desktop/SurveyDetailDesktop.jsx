'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { podColor } from '@/lib/podColor';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import LayoutAnalysisModal from '../components/LayoutAnalysisModal';
import AudioRecorder from '@/components/AudioRecorder';
import InlineUpload from '../components/InlineUpload';
import PageSpinner from '@/components/PageSpinner';
import { processMediaFile } from '@/lib/mediaGate';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import {
  Plus, Trash2, FileText, Check, Loader2, AlertCircle,
  RefreshCw, CheckCircle2, Edit3, X, Copy,
  ArrowLeft, MoreHorizontal, GripVertical, Search, Camera, ChevronLeft,
  ChevronRight, Ruler,
} from 'lucide-react';
import {
  ITEM_TYPE_ORDER, ITEM_TYPE_ICONS, ITEM_TYPE_COLORS, ITEM_TYPE_LABEL_KEYS, inferType,
} from '../components/TételekSection';

// ── Pod colour palette — index-derived, stable ────────────────────────────────
const POD_COLORS = [
  { c: '#2F5BFF', tint: '#E3EAFF', ink: '#1B3AA8' }, // blue
  { c: '#C2562B', tint: '#FBE6DC', ink: '#8A3512' }, // orange
  { c: '#6D3FD1', tint: '#EDE9FF', ink: '#4A2A9A' }, // violet
  { c: '#B8456B', tint: '#FDEAF0', ink: '#7D2047' }, // rose
  { c: '#0E7490', tint: '#CFFAFE', ink: '#164E63' }, // cyan
  { c: '#B45309', tint: '#FEF3C7', ink: '#78350F' }, // amber
  { c: '#15803D', tint: '#DCFCE7', ink: '#14532D' }, // green
  { c: '#6B21A8', tint: '#F3E8FF', ink: '#581C87' }, // purple
];
function getPodColor(idx) { return POD_COLORS[idx % POD_COLORS.length]; }

import { UNITS_BY_TYPE as ITEM_UNITS_BY_TYPE, DEFAULT_UNIT_BY_TYPE, getUnitLabel } from '@/lib/surveyUnits';

// ── AddItemModal ──────────────────────────────────────────────────────────────
function AddItemModal({ isOpen, onClose, surveyId, entryId }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const { createSurveyItem } = useApp();

  const [entryType, setEntryType] = useState('material');
  const [desc,  setDesc]  = useState('');
  const [qty,   setQty]   = useState('');
  const [unit,  setUnit]  = useState(DEFAULT_UNIT_BY_TYPE.material);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEntryType('material'); setDesc(''); setQty('');
    setUnit(DEFAULT_UNIT_BY_TYPE.material); setNotes(''); setError(''); setSaving(false);
  }, [isOpen]);

  const handleTypeChange = (type) => {
    setEntryType(type);
    setUnit(DEFAULT_UNIT_BY_TYPE[type]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!desc.trim()) { setError(t('itemsDescRequired')); return; }
    setSaving(true); setError('');
    try {
      await createSurveyItem(surveyId, {
        entry_id: entryId, description: desc.trim(), entry_type: entryType,
        quantity: qty ? parseFloat(qty) : null, unit: unit.trim() || null,
        notes: notes.trim() || null, source: 'manual', is_confirmed: true,
      });
      onClose();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  const PLACEHOLDERS = {
    material: t('itemsPlaceholderMaterial'), labour: t('itemsPlaceholderLabour'),
    equipment: t('itemsPlaceholderEquipment'), transport: t('itemsPlaceholderTransport'),
    other: t('itemsPlaceholderOther'),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('itemsDrawerTitleNew')} maxWidth="500px">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSave}>
        {/* Entry type picker */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
          {ITEM_TYPE_ORDER.map(type => {
            const tc2 = ITEM_TYPE_COLORS[type];
            const active = entryType === type;
            const Icon = ITEM_TYPE_ICONS[type];
            return (
              <button key={type} type="button" onClick={() => handleTypeChange(type)} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0.3rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)',
                border: active ? `2px solid ${tc2.color}` : '2px solid var(--border-subtle)',
                background: active ? tc2.bg : 'var(--bg-card)', cursor: 'pointer', minWidth: 72,
              }}>
                <Icon size={16} color={active ? tc2.color : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: active ? tc2.color : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {t(ITEM_TYPE_LABEL_KEYS[type])}
                </span>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 }}>{t('itemsDescLabel')}</span>
          <input autoFocus className="dk-input" type="text" placeholder={PLACEHOLDERS[entryType]}
            value={desc} onChange={e => setDesc(e.target.value)} required />
        </div>

        {/* Qty + unit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 }}>{t('itemsQtyLabel')}</span>
            <input className="dk-input" type="number" min="0" step="0.01" placeholder="pl. 9"
              value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 }}>{t('itemsUnitLabel')}</span>
            <select className="dk-input" value={unit} onChange={e => setUnit(e.target.value)}>
              {(ITEM_UNITS_BY_TYPE[entryType] || []).map(u => <option key={u} value={u}>{getUnitLabel(u, t)}</option>)}
              {unit && !(ITEM_UNITS_BY_TYPE[entryType] || []).includes(unit) && <option value={unit}>{getUnitLabel(unit, t)}</option>}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 }}>{t('itemsNotesLabel')}</span>
          <input className="dk-input" type="text" placeholder={t('itemsNotesPlaceholder')}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{tc('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><Loader2 size={15} className="animate-spin" />{t('itemsSavingBtn')}</> : <><Check size={15} />{t('itemsAddNewBtn')}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

function entryArea(entry) {
  const w = Number(entry?.width_m) || 0;
  const l = Number(entry?.length_m) || 0;
  if (!w || !l) return null;
  return `${(w * l).toFixed(1).replace('.', ',')} m²`;
}

function measSummaryStr(entry, overrideL, overrideW, overrideH, td) {
  const l = parseFloat(overrideL) || Number(entry?.length_m) || 0;
  const w = parseFloat(overrideW) || Number(entry?.width_m)  || 0;
  const h = parseFloat(overrideH) || Number(entry?.height_m) || 0;
  if (!l && !w) return '';
  const parts = [];
  if (l && w && h) parts.push(`${l.toFixed(2).replace('.',',')} × ${w.toFixed(2).replace('.',',')} × ${h.toFixed(2).replace('.',',')} m`);
  else if (l && w) parts.push(`${l.toFixed(2).replace('.',',')} × ${w.toFixed(2).replace('.',',')} m`);
  if (l && w) parts.push(`${td('desktop.detailMeasFloorLabel')} ${(l * w).toFixed(2).replace('.',',')} m²`);
  if (l && w && h) {
    const gross = 2 * (l + w) * h;
    const ded   = (Number(entry?.window_count) || 0) * WINDOW_M2 + (Number(entry?.door_count) || 0) * DOOR_M2;
    parts.push(`${td('desktop.detailMeasWallLabel')} ${Math.max(0, gross - ded).toFixed(1).replace('.',',')} m²`);
  }
  return parts.join(' · ');
}

// ── EntryForm — add / edit a room ─────────────────────────────────────────────
function EntryForm({ initial, surveyId, onSave, onCancel }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const { uploadSurveyMedia, deleteSurveyEntry } = useApp();
  const [name,         setName]         = useState(initial?.name || '');
  const [widthM,       setWidthM]       = useState(initial?.width_m  != null ? String(initial.width_m)  : '');
  const [lengthM,      setLengthM]      = useState(initial?.length_m != null ? String(initial.length_m) : '');
  const [heightM,      setHeightM]      = useState(initial?.height_m != null ? String(initial.height_m) : '');
  const [windowCount,  setWindowCount]  = useState(initial?.window_count != null ? String(initial.window_count) : '');
  const [doorCount,    setDoorCount]    = useState(initial?.door_count   != null ? String(initial.door_count)   : '');
  const [description,  setDescription]  = useState(initial?.description || '');
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const valuesRef = useRef({});
  valuesRef.current = { name, widthM, lengthM, heightM, windowCount, doorCount, description };

  const handleBlurSave = async () => {
    if (!initial) return;
    const v = valuesRef.current;
    if (!v.name.trim()) { setError(t('entryNameRequired')); return; }
    setError(''); setSaving(true);
    try {
      await onSave({
        name: v.name.trim(), description: v.description.trim() || null,
        width_m: parseFloat(v.widthM) || null, length_m: parseFloat(v.lengthM) || null,
        height_m: parseFloat(v.heightM) || null,
        window_count: parseInt(v.windowCount) || 0, door_count: parseInt(v.doorCount) || 0,
      });
      setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 1800);
    } catch (err) { setError(err.message || t('entrySaveError')); }
    finally { setSaving(false); }
  };

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []); e.target.value = '';
    if (!raw.length) return;
    const converted = await Promise.all(raw.map(processMediaFile));
    setSelectedFiles(prev => [...prev, ...converted]);
    setPreviews(prev => [...prev, ...converted.map(f => ({ key: `${f.name}-${f.size}`, url: f.type.startsWith('video/') ? null : URL.createObjectURL(f) }))]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!name.trim()) { setError(t('entryNameRequired')); return; }
    setSaving(true);
    try {
      const entry = await onSave({
        name: name.trim(), description: description.trim() || null,
        width_m: parseFloat(widthM) || null, length_m: parseFloat(lengthM) || null,
        height_m: parseFloat(heightM) || null,
        window_count: parseInt(windowCount) || 0, door_count: parseInt(doorCount) || 0,
      });
      if (!initial && selectedFiles.length && entry?.id) {
        try { await uploadSurveyMedia(surveyId, selectedFiles, { entryId: entry.id, mediaType: 'photo' }); }
        catch (uploadErr) { try { await deleteSurveyEntry(surveyId, entry.id); } catch {} throw uploadErr; }
      }
      onCancel();
    } catch (err) { setError(err.message || t('entrySaveError')); setSaving(false); }
  };

  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', marginBottom: 6, display: 'block' };
  const field = { marginBottom: '1rem' };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}

      {/* Name */}
      <div style={field}>
        <span style={lbl}>{t('entryNameLabel')}</span>
        <input className="dk-input" type="text" autoFocus={!initial} value={name} onChange={e => setName(e.target.value)} onBlur={handleBlurSave} placeholder={t('entryNamePlaceholder')} />
      </div>

      {/* Dimensions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1rem' }}>
        {[['entryLengthLabel', lengthM, setLengthM], ['entryWidthLabel', widthM, setWidthM], ['entryHeightLabel', heightM, setHeightM]].map(([lk, val, setter]) => (
          <div key={lk}>
            <span style={lbl}>{t(lk)}</span>
            <input className="dk-input" type="number" min="0" step="0.1" value={val} onChange={e => setter(e.target.value)} onBlur={handleBlurSave} />
          </div>
        ))}
      </div>

      {/* Openings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '1rem' }}>
        <div>
          <span style={lbl}>{t('entryWindowsLabel')}</span>
          <input className="dk-input" type="number" min="0" step="1" value={windowCount} onChange={e => setWindowCount(e.target.value)} onBlur={handleBlurSave} placeholder="0" />
        </div>
        <div>
          <span style={lbl}>{t('entryDoorsLabel')}</span>
          <input className="dk-input" type="number" min="0" step="1" value={doorCount} onChange={e => setDoorCount(e.target.value)} onBlur={handleBlurSave} placeholder="0" />
        </div>
      </div>

      {/* Notes */}
      <div style={field}>
        <span style={lbl}>{t('entryNotesLabel')}</span>
        <textarea
          className="dk-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={handleBlurSave}
          placeholder={t('entryNotesPlaceholder')}
          style={{ height: 80, padding: '12px 14px', resize: 'none' }}
        />
      </div>

      {/* Photo upload — new entry only */}
      {!initial && (
        <div style={field}>
          <span style={lbl}>{t('entryMediaLabel')}</span>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
          {previews.length === 0 ? (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="dk-btn dk-btn-l" style={{ width: '100%', justifyContent: 'center', gap: 6 }}>
              <Camera size={16} /> {t('entryGalleryBtn')}
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
              {previews.map((p, i) => (
                <div key={p.key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#F4F5F8' }}>
                  {p.url && <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <button type="button" onClick={() => { setSelectedFiles(f => f.filter((_,j) => j !== i)); setPreviews(f => f.filter((_,j) => j !== i)); }} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(198,40,40,.88)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', border: '2px dashed #D0D5DD', borderRadius: 12, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8F98' }}>
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {initial ? (
          <>
            {saving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Loader2 size={12} className="animate-spin" />{t('entrySavingStatus')}</span>}
            {saveStatus === 'saved' && !saving && <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={12} />{t('entrySavedStatus')}</span>}
            <button type="button" className="btn btn-primary" onClick={async () => { await handleBlurSave(); onCancel(); }} disabled={saving}>{t('entryDoneBtn')}</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>{tc('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />{t('entrySavingStatus')}</> : t('addRoomBtn')}</button>
          </>
        )}
      </div>
    </form>
  );
}

// ── MetaDrawer — edit survey-level title, date, client etc. ───────────────────
function MetaDrawer({ survey, clients, isOpen, onClose, onSave }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const [title, setTitle] = useState(''); const [date, setDate] = useState('');
  const [location, setLocation] = useState(''); const [notes, setNotes] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [formatting, setFormatting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(survey.title || ''); setDate(survey.date || '');
    setLocation(survey.location || ''); setNotes(survey.notes || '');
    setClientId(survey.client_id || ''); setError(''); setSaving(false);
  }, [isOpen, survey]);

  const handleSave = async () => {
    if (!title.trim()) { setError(t('metaNameRequired')); return; }
    setSaving(true); setError('');
    try { await onSave({ title: title.trim(), date: date || null, location: location.trim(), notes: notes.trim(), client_id: clientId || null }); onClose(); }
    catch (err) { setError(err.message || t('metaSaveError')); setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('metaDrawerTitle')} maxWidth="560px">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}><AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <div className="form-group"><label className="form-label">{t('metaNameLabel')}</label><input type="text" className="form-control" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={t('metaNamePlaceholder')} /></div>
      <div className="grid-2col">
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">{t('metaDateLabel')}</label><input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">{t('metaLocationLabel')}</label><input type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('metaLocationPlaceholder')} /></div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem' }}><label className="form-label">{t('metaClientLabel')}</label><select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}><option value="">{t('metaNoClient')}</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <label className="form-label" style={{ margin: 0 }}>{t('metaNotesLabel')}</label>
          <AudioRecorder size="sm" disabled={formatting} hasContent={!!notes.trim()}
            onTranscript={async (text) => {
              setFormatting(true);
              try { const res = await fetch('/api/format-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: text }) }); const data = await res.json(); setNotes(n => n.trim() ? n.trim() + '\n\n' + (res.ok ? data.formatted || text : text) : (res.ok ? data.formatted || text : text)); }
              catch { setNotes(n => n.trim() ? n.trim() + '\n\n' + text : text); }
              finally { setFormatting(false); }
            }}
            onError={() => {}}
          />
          {formatting && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
        </div>
        <textarea rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('metaNotesPlaceholder')} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>{tc('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? <><Loader2 size={15} className="animate-spin" />{tc('saving')}</> : tc('save')}</button>
      </div>
    </Modal>
  );
}

// ── ItemEditModal — edit a single survey item ─────────────────────────────────
function ItemEditModal({ item, surveyId, isOpen, onClose }) {
  const t  = useTranslations('surveyDetail');
  const td = useTranslations('surveys');
  const tc = useTranslations('common');
  const { updateSurveyItem } = useApp();
  const [desc,  setDesc]  = useState('');
  const [qty,   setQty]   = useState('');
  const [unit,  setUnit]  = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!isOpen || !item) return;
    setDesc(item.description || ''); setQty(item.quantity != null ? String(item.quantity) : '');
    setUnit(item.unit || ''); setNotes(item.notes || ''); setError(''); setSaving(false);
  }, [isOpen, item]);

  const handleSave = async () => {
    if (!desc.trim()) { setError(t('itemsDescRequired')); return; }
    setSaving(true); setError('');
    try { await updateSurveyItem(surveyId, item.id, { description: desc.trim(), quantity: qty ? parseFloat(qty) : null, unit: unit.trim() || null, notes: notes.trim() || null }); onClose(); }
    catch (err) { setError(err.message); setSaving(false); }
  };

  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={td('desktop.detailEditItemTitle')} maxWidth="460px">
      {error && <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}><AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <div style={{ marginBottom: '1rem' }}>
        <span style={lbl}>{t('itemsDescLabel')}</span>
        <input className="dk-input" type="text" autoFocus value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
        <div>
          <span style={lbl}>{t('itemsQtyLabel')}</span>
          <input className="dk-input" type="number" min="0" step="0.01" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div>
          <span style={lbl}>{t('itemsUnitLabel')}</span>
          <select className="dk-input" value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="">—</option>
            {(ITEM_UNITS_BY_TYPE[item?.entry_type] || ITEM_UNITS_BY_TYPE.material).map(u => (
              <option key={u} value={u}>{getUnitLabel(u, t)}</option>
            ))}
            {unit && !(ITEM_UNITS_BY_TYPE[item?.entry_type] || ITEM_UNITS_BY_TYPE.material).includes(unit) && (
              <option value={unit}>{getUnitLabel(unit, t)}</option>
            )}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={lbl}>{t('itemsNotesLabel')}</span>
        <textarea className="dk-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('itemsNotesPlaceholder')} style={{ height: 72, padding: '12px 14px', resize: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" className="dk-btn dk-btn-l" onClick={onClose} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>{tc('cancel')}</button>
        <button type="button" className="dk-btn dk-btn-dark" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
          {saving ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{tc('saving')}</> : tc('save')}
        </button>
      </div>
    </Modal>
  );
}

// ── MeasurementsBar — collapsible dims section inside an open pod ─────────────
function MeasurementsBar({ entry, surveyId, canEdit, enqueue, mediaItems }) {
  const t  = useTranslations('surveyDetail');
  const td = useTranslations('surveys');
  const { updateSurveyEntry } = useApp();
  const [open, setOpen] = useState(false);
  const [localLength, setLocalLength] = useState('');
  const [localWidth,  setLocalWidth]  = useState('');
  const [localHeight, setLocalHeight] = useState('');
  const [localNotes,  setLocalNotes]  = useState('');

  useEffect(() => {
    setLocalLength(entry.length_m != null ? String(entry.length_m) : '');
    setLocalWidth(entry.width_m   != null ? String(entry.width_m)  : '');
    setLocalHeight(entry.height_m != null ? String(entry.height_m) : '');
    setLocalNotes(entry.description || '');
  }, [entry.id]);

  const valuesRef = useRef({});
  valuesRef.current = { localLength, localWidth, localHeight, localNotes };

  const handleBlur = useCallback(async () => {
    if (!canEdit) return;
    const v = valuesRef.current;
    try {
      await updateSurveyEntry(surveyId, entry.id, {
        length_m: parseFloat(v.localLength) || null, width_m: parseFloat(v.localWidth) || null,
        height_m: parseFloat(v.localHeight) || null, description: v.localNotes.trim() || null,
      });
    } catch { /* silent */ }
  }, [canEdit, entry.id, surveyId, updateSurveyEntry]);

  const summary = measSummaryStr(entry, localLength, localWidth, localHeight, td);
  const photoCount = mediaItems?.length || 0;
  const inputSt = { background: '#F4F5F8', boxShadow: 'none' };

  return (
    <section className="dk-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button className="dk-sr" onClick={() => setOpen(o => !o)} style={{ gap: 14 }}>
        <span className="dk-ic" style={{ background: '#D9F2EE', color: '#0A5C53' }}>
          <Ruler size={20} aria-hidden="true" />
        </span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <b>{td('desktop.detailMeasTitle')}</b>
          <span className="dk-m">{summary || td('desktop.detailMeasNoData')}</span>
        </span>
        <span className="dk-badge" style={{ background: '#D9F2EE', color: '#0A5C53' }}>
          {open ? td('desktop.detailMeasClose') : td('desktop.detailMeasEdit')}
        </span>
      </button>

      {open && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', gap: 10 }}>
            {[
              { label: t('entryLengthLabel'), val: localLength, set: setLocalLength },
              { label: t('entryWidthLabel'),  val: localWidth,  set: setLocalWidth  },
              { label: t('entryHeightLabel'), val: localHeight, set: setLocalHeight },
            ].map(d => (
              <label key={d.label} className="fl" style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
                <span>{d.label}</span>
                <input className="dk-input" type="number" min="0" step="0.1" value={d.val} disabled={!canEdit}
                  onChange={e => d.set(e.target.value)} onBlur={handleBlur} style={inputSt} />
              </label>
            ))}
          </div>
          <label className="fl" style={{ flex: 1.3, fontSize: 13, fontWeight: 700 }}>
            <span>{t('entryNotesLabel')}</span>
            <textarea className="dk-input" disabled={!canEdit} value={localNotes}
              onChange={e => setLocalNotes(e.target.value)} onBlur={handleBlur}
              placeholder={t('entryNotesPlaceholder')}
              style={{ ...inputSt, height: 46, padding: '12px 14px', resize: 'none' }} />
          </label>
          {canEdit && enqueue && (
            <div style={{ marginTop: 22 }}>
              <InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo"
                label={td('desktop.detailPhotosBtn', { count: photoCount })}
                enqueue={enqueue} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main desktop component ────────────────────────────────────────────────────
export default function SurveyDetailDesktop() {
  const { id }   = useParams();
  const router   = useRouter();
  const t        = useTranslations('surveyDetail');
  const ts       = useTranslations('surveys');
  const {
    loading, dataReady, surveys, quotes, clients, users,
    currentUser, collectives, activeCollectiveId,
    cacheSurvey, deleteSurvey, updateSurvey,
    surveyItemsBySurvey, surveyMediaBySurvey,
    surveyEntriesBySurvey, surveyLayoutsBySurvey, surveyDrawingsBySurvey,
    fetchSurveyMedia, uploadSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
    createSurveyItem, updateSurveyItem, deleteSurveyItem,
    isDemoMode, contextSwitching,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;

  const uploadFn = useCallback(async (rawFile, { surveyId, entryId, mediaType }) => {
    const uploaded = await uploadSurveyMedia(surveyId, [rawFile], { entryId, mediaType });
    if (mediaType === 'layout' && uploaded?.length) setPendingAnalysisLayout(uploaded[0]);
  }, [uploadSurveyMedia]);

  const { enqueue } = useUploadQueue({ uploadFn });

  const wsStyle = activeCollectiveId
    ? (() => { const c = podColor(activeCollectiveId); return { '--dk-c': c.deep, '--dk-deep': c.deep }; })()
    : {};

  // Page state
  const [openPodIdx,          setOpenPodIdx]          = useState(null);
  const [search,              setSearch]              = useState('');
  const [itemSearch,          setItemSearch]          = useState('');
  const [showAddItem,         setShowAddItem]         = useState(false);
  const [showMenu,            setShowMenu]            = useState(false);
  const [showAddEntry,        setShowAddEntry]        = useState(false);
  const [editingItem,         setEditingItem]         = useState(null);
  const [showMetaDrawer,      setShowMetaDrawer]      = useState(false);
  const [confirmModal,        setConfirmModal]        = useState(null);
  const [alertModal,          setAlertModal]          = useState(null);
  const [lockedModalOpen,     setLockedModalOpen]     = useState(false);
  const [transferAttemptCount,setTransferAttemptCount]= useState(0);
  const [pendingAnalysisLayout,setPendingAnalysisLayout]= useState(null);
  const [analyzeLayout,       setAnalyzeLayout]       = useState(null);
  const [directSurvey,        setDirectSurvey]        = useState(null);
  const [directFetching,      setDirectFetching]      = useState(false);
  const [openItemMenuId,      setOpenItemMenuId]      = useState(null);
  const [typeFilter,          setTypeFilter]          = useState('all');
  const [measOpen,            setMeasOpen]            = useState(false);
  const [openHeaderMenu,      setOpenHeaderMenu]      = useState(false);
  const [deleteItemModal,     setDeleteItemModal]     = useState(null);
  const [deleteItemLoading,   setDeleteItemLoading]   = useState(false);
  const layoutInputRef = useRef(null);

  useEffect(() => {
    if (!openItemMenuId && !openHeaderMenu) return;
    const close = () => { setOpenItemMenuId(null); setOpenHeaderMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openItemMenuId, openHeaderMenu]);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {});
  }, [id, dataReady]);

  useEffect(() => { setTypeFilter('all'); setItemSearch(''); setMeasOpen(false); }, [openPodIdx]);

  useEffect(() => {
    if (!dataReady) return;
    if (surveys.find(s => s.id === id)) return;
    setDirectFetching(true);
    fetch(`/api/surveys/${id}`).then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.survey) { setDirectSurvey(d.survey); cacheSurvey(d.survey); } })
      .catch(() => {}).finally(() => setDirectFetching(false));
  }, [id, dataReady, surveys]);

  useEffect(() => {
    const s = surveys.find(sv => sv.id === id) || directSurvey;
    if (s?.locked_reason) {
      setLockedModalOpen(true);
      if (!isDemoMode) {
        fetch('/api/transfer-requests?outgoing=true').then(r => r.ok ? r.json() : { requests: [] })
          .then(d => { const count = (d.requests || []).filter(tr => tr.document_id === id && (tr.status === 'rejected' || tr.status === 'transfer_expired')).length; setTransferAttemptCount(count); })
          .catch(() => {});
      }
    }
  }, [id, surveys, directSurvey, isDemoMode]);

  // Reset per-pod state when switching pods
  useEffect(() => { setItemSearch(''); setShowAddItem(false); }, [openPodIdx]);

  if (loading || !dataReady || directFetching) return <PageSpinner />;

  const survey = surveys.find(s => s.id === id) || directSurvey;
  if (!survey) return (
    <div className="dk-page dk-mod-surveys" style={wsStyle}>
      <header className="dk-mh"><span className="dk-gl" /><div style={{ flex: 1 }}><h1 className="dk-h1">{ts('notFound')}</h1></div></header>
      <div className="dk-body"><button className="dk-btn dk-btn-l" onClick={() => router.push(p('/felmeres'))}><ChevronLeft size={18} />{ts('back')}</button></div>
    </div>
  );

  const client   = clients.find(c => c.id === survey.client_id);
  const entries  = surveyEntriesBySurvey[id] || [];
  const layouts  = surveyLayoutsBySurvey[id]  || [];
  const drawings = surveyDrawingsBySurvey[id] || [];
  const allItems = surveyItemsBySurvey?.[id]  || [];
  const mediaAll = surveyMediaBySurvey?.[id]  || [];

  const isOwner          = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
  const myCollectiveRole = collectives?.find(c => c.collective_id === survey.collective_id)?.role;
  const isKollektivOwner = myCollectiveRole === 'owner' || myCollectiveRole === 'admin';
  const isCollMember     = !!myCollectiveRole;
  const isDocLocked      = !!survey.locked_reason;
  const canAdd           = !isDocLocked && (isOwner || isCollMember);
  const canEditMeta      = !isDocLocked && (isKollektivOwner || isOwner);
  const canEditEntry     = (entry) => !isDocLocked && (isKollektivOwner || entry.created_by === currentUser?.id);

  // Totals for header counters
  const totalItems = allItems.length;
  const totalArea  = entries.reduce((sum, e) => {
    const w = Number(e.width_m) || 0, l = Number(e.length_m) || 0;
    return sum + (w > 0 && l > 0 ? w * l : 0);
  }, 0);
  const totalAreaStr = totalArea > 0 ? totalArea.toFixed(1).replace('.', ',') : '0';

  // Open pod data
  const openEntry      = openPodIdx !== null ? (entries[openPodIdx] || null) : null;
  const openPodColor   = openPodIdx !== null ? getPodColor(openPodIdx) : null;
  const openEntryItems = openEntry ? allItems.filter(item => item.entry_id === openEntry.id) : [];
  const filteredItems  = itemSearch.trim()
    ? openEntryItems.filter(item => item.description?.toLowerCase().includes(itemSearch.toLowerCase()))
    : openEntryItems;
  const displayItems   = typeFilter === 'all'
    ? filteredItems
    : filteredItems.filter(item => inferType(item) === typeFilter);
  const typesInEntry   = ITEM_TYPE_ORDER.filter(type => openEntryItems.some(item => inferType(item) === type));
  const openEntryMedia = openEntry ? mediaAll.filter(m => m.entry_id === openEntry.id) : [];

  const kicker = [ts('desktop.kicker'), client?.name].filter(Boolean).join(' · ');

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDuplicate = async (item) => {
    try {
      await createSurveyItem(id, { entry_id: item.entry_id, description: item.description, entry_type: item.entry_type || 'material', quantity: item.quantity, unit: item.unit, notes: item.notes, source: 'manual', is_confirmed: true });
    } catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleDeleteItem = (item) => {
    setDeleteItemModal(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteItemModal) return;
    setDeleteItemLoading(true);
    try {
      await deleteSurveyItem(id, deleteItemModal.id);
      setDeleteItemModal(null);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setDeleteItemLoading(false);
    }
  };

  const handleDeleteSurvey = () => {
    const entryCount  = entries.length;
    const mediaCount  = [...layouts, ...mediaAll].length;
    const drawingCount = drawings.length;
    const parts = [];
    if (entryCount)   parts.push(t('deleteSurveyRooms',    { count: entryCount }));
    if (mediaCount)   parts.push(t('deleteSurveyMedia',    { count: mediaCount }));
    if (drawingCount) parts.push(t('deleteSurveyDrawings', { count: drawingCount }));
    const detail = parts.length ? t('deleteSurveyPermanent', { items: parts.join(', ') }) : t('deleteSurveyNoUndo');
    setConfirmModal({
      message: t('deleteSurveyConfirm', { title: survey.title, detail }),
      onConfirm: async () => {
        try { await deleteSurvey(id); router.push(p('/felmeres')); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleDeleteEntry = (entry) => {
    const mediaCount   = entry.media?.length || 0;
    const drawingCount = drawings.filter(d => d.entry_id === entry.id).length;
    const parts = []; if (mediaCount) parts.push(t('deleteSurveyMedia', { count: mediaCount })); if (drawingCount) parts.push(t('deleteSurveyDrawings', { count: drawingCount }));
    const detail = parts.length ? t('deleteEntryWith', { items: parts.join(', ') }) : '';
    setConfirmModal({
      message: t('deleteEntryConfirm', { name: entry.name, detail }),
      onConfirm: async () => {
        try {
          await deleteSurveyEntry(id, entry.id);
          if (openPodIdx !== null && entries[openPodIdx]?.id === entry.id) setOpenPodIdx(null);
        } catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="dk-page dk-mod-surveys" style={wsStyle}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        {/* Back icon — always visible; at ≤1023px sits right of the hamburger */}
        <button className="dk-btn dk-btn-g" onClick={() => router.push(p('/felmeres'))} aria-label={ts('back')} style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{kicker}</span>
          <h1 className="dk-h1">{survey.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[
              { val: totalItems, label: ts('desktop.detailLabelItem') },
              { val: entries.length, label: ts('desktop.detailLabelRoom') },
              { val: totalAreaStr, label: ts('desktop.detailLabelM2') },
            ].map(c => (
              <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 17, background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                <b>{c.val}</b>{c.label}
              </span>
            ))}
          </div>
        </div>
        <button className="dk-btn dk-btn-g" aria-label={ts('desktop.detailActionsTitle')} onClick={() => setShowMenu(true)} style={{ width: 44, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
          <MoreHorizontal size={22} aria-hidden="true" />
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="dk-body">

        {contextSwitching ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div className="dk-ws-spinner" />
          </div>
        ) : (
          <>
            {/* ── Section strip — always visible ───────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 2 }}>
              {/* "All sections" chip — active when in overview */}
              <button
                className="dk-chip"
                onClick={() => setOpenPodIdx(null)}
                style={{
                  background: openPodIdx === null ? '#0A7F72' : '#fff',
                  color:      openPodIdx === null ? '#fff'    : '#0E1116',
                  flexShrink: 0,
                }}
              >
                {ts('desktop.detailBackToAll')}
              </button>

              {/* Per-section chips — active chip matches the section's own colour */}
              {entries.map((entry, idx) => {
                const pc      = getPodColor(idx);
                const isActive = idx === openPodIdx;
                const count   = allItems.filter(item => item.entry_id === entry.id).length;
                return (
                  <button
                    key={entry.id}
                    className="dk-chip"
                    onClick={() => setOpenPodIdx(idx)}
                    style={{
                      background: isActive ? pc.c   : '#fff',
                      color:      isActive ? '#fff' : '#0E1116',
                      flexShrink: 0,
                    }}
                  >
                    {entry.name}
                    {count > 0 && <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>}
                  </button>
                );
              })}

              {/* + Section chip */}
              {canAdd && entries.length < 30 && (
                <button
                  className="dk-chip"
                  onClick={() => setShowAddEntry(true)}
                  style={{ background: 'transparent', color: '#fff', border: '2px dashed rgba(255,255,255,.4)', flexShrink: 0, gap: 6 }}
                >
                  <Plus size={16} aria-hidden="true" />
                  {ts('desktop.detailNewRoomChip')}
                </button>
              )}
            </div>

            {/* ── Overview or open section ─────────────────────────────────────── */}
            {openPodIdx === null ? (
              <>
                {/* Search bar + hint */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ position: 'relative', display: 'block', width: 340 }}>
                    <span style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
                      <Search size={20} aria-hidden="true" />
                    </span>
                    <input className="dk-input" placeholder={ts('desktop.detailSearchAll')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 42, borderRadius: 23, height: 44 }} />
                  </label>
                </div>

                {/* Section pods grid */}
                {(() => {
                  const n = entries.length;
                  const cols = n > 10 ? 4 : 3;
                  const compact = n > 20;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: compact ? 8 : 12 }}>
                      {entries.map((entry, idx) => {
                        const pc         = getPodColor(idx);
                        const entryItems = allItems.filter(item => item.entry_id === entry.id);
                        const area       = entryArea(entry);
                        const matchSearch = !search.trim() || entry.name.toLowerCase().includes(search.toLowerCase()) || entryItems.some(i => i.description?.toLowerCase().includes(search.toLowerCase()));
                        if (!matchSearch) return null;
                        return (
                          <button key={entry.id} className="dk-card" onClick={() => setOpenPodIdx(idx)}
                            style={{ border: 0, textAlign: 'left', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                            {/* Header — always shown */}
                            <span style={{ padding: compact ? '10px 12px' : '12px 14px 10px', background: pc.c, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span className="dk-n" style={{ fontSize: compact ? 15 : 20, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                              {area && <span className="dk-badge" style={{ background: '#fff', color: pc.ink, fontSize: 11, flexShrink: 0 }}>{area}</span>}
                              {compact && <span className="dk-badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff', fontSize: 11, flexShrink: 0 }}>{entryItems.length}</span>}
                            </span>
                            {/* Body + footer — hidden in compact mode */}
                            {!compact && (
                              <>
                                <span style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                  {entryItems.length === 0 && <span style={{ padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#8A8F98' }}>{ts('desktop.detailNoItems')}</span>}
                                  {entryItems.slice(0, 2).map(item => (
                                    <span key={item.id} style={{ padding: '5px 0', borderTop: '1px solid #EDEBE5', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.description}</span>
                                      <span className="dk-m" style={{ flexShrink: 0, fontSize: 12 }}>{item.quantity != null ? `${item.quantity}${item.unit ? ' ' + item.unit : ''}` : ''}</span>
                                    </span>
                                  ))}
                                </span>
                                <span style={{ padding: '8px 14px', borderTop: '1px solid #EDEBE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                  <span style={{ color: '#5A5F68', fontWeight: 600 }}>{entryItems.length} {ts('desktop.detailLabelItem')}{entryItems.length > 2 ? ` · +${entryItems.length - 2}` : ''}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: pc.ink }}>{ts('desktop.detailOpenPod')} <ChevronRight size={15} aria-hidden="true" /></span>
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                      {canAdd && entries.length < 30 && (
                        <button onClick={() => setShowAddEntry(true)}
                          style={{ border: '2px dashed rgba(255,255,255,.35)', background: 'transparent', boxShadow: 'none', color: '#fff', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: compact ? 44 : 120 }}>
                          <Plus size={24} aria-hidden="true" />
                          {!compact && t('addRoomBtn')}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : null}

            {/* Items card */}
            {openEntry && openPodColor && (
              <section className="dk-card" style={{ overflow: 'hidden' }}>
                {/* Title band — section's own colour, matches the active chip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: openPodColor.c, color: '#fff', gap: 12 }}>
                  <span className="dk-n" style={{ fontSize: 24, flexShrink: 0 }}>
                    {openEntry.name}{' '}
                    <span style={{ opacity: 0.8, fontSize: 18 }}>· {openEntryItems.length} {ts('desktop.detailLabelItem')}</span>
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <label style={{ position: 'relative', display: 'block', width: 240 }}>
                      <span style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
                        <Search size={20} aria-hidden="true" />
                      </span>
                      <input className="dk-input" placeholder={ts('desktop.detailSearchItems')} value={itemSearch} onChange={e => setItemSearch(e.target.value)} style={{ paddingLeft: 42, borderRadius: 23, height: 44 }} />
                    </label>
                    {canAdd && (
                      <button className="dk-btn dk-btn-w" onClick={() => setShowAddItem(true)} style={{ gap: 6, flexShrink: 0 }}>
                        <Plus size={18} aria-hidden="true" />
                        {ts('desktop.detailAddItemBtn')}
                      </button>
                    )}
                    {/* Section context menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenHeaderMenu(v => !v); }}
                        style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(255,255,255,.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <MoreHorizontal size={20} aria-hidden="true" />
                      </button>
                      {openHeaderMenu && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', right: 0, top: 48, zIndex: 50, background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px -8px rgba(0,0,0,.35), 0 2px 8px -2px rgba(0,0,0,.12)', padding: 6, minWidth: 200 }}
                        >
                          <button
                            onClick={() => { setMeasOpen(true); setOpenHeaderMenu(false); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 0, borderRadius: 10, background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E1116', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <Ruler size={15} aria-hidden="true" />
                            {t('desktop.detailMeasTitle')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Type filter chips — always show all 5, dim empty ones */}
                <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'nowrap', overflowX: 'auto' }} className="scroll-x-hidden">
                  <button
                    className="dk-chip"
                    onClick={() => setTypeFilter('all')}
                    style={{ background: typeFilter === 'all' ? openPodColor.c : '#F4F5F8', color: typeFilter === 'all' ? '#fff' : '#5A5F68', flexShrink: 0 }}
                  >
                    {ts('desktop.filterAll')} ({filteredItems.length})
                  </button>
                  {ITEM_TYPE_ORDER.map(type => {
                    const count   = filteredItems.filter(item => inferType(item) === type).length;
                    const isEmpty = count === 0;
                    return (
                      <button
                        key={type}
                        className="dk-chip"
                        onClick={() => !isEmpty && setTypeFilter(type)}
                        style={{ background: typeFilter === type ? openPodColor.c : '#F4F5F8', color: typeFilter === type ? '#fff' : '#5A5F68', flexShrink: 0, opacity: isEmpty ? 0.35 : 1, cursor: isEmpty ? 'default' : 'pointer' }}
                      >
                        {t(ITEM_TYPE_LABEL_KEYS[type])} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Table header */}
                <div className="dk-th" style={{ gridTemplateColumns: '24px 1fr 100px 80px 1.2fr 44px' }}>
                  <span />
                  <span>{ts('desktop.detailColItem')}</span>
                  <span>{ts('desktop.detailColQty')}</span>
                  <span>{ts('desktop.detailColUnit')}</span>
                  <span>{ts('desktop.detailColNote')}</span>
                  <span />
                </div>

                {displayItems.length === 0 && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
                    {ts('desktop.detailNoItems')}
                  </div>
                )}

                {/* Item rows — grouped by type */}
                {ITEM_TYPE_ORDER
                  .map(type => ({ type, items: displayItems.filter(item => inferType(item) === type) }))
                  .filter(g => g.items.length > 0)
                  .map(({ type, items: typeItems }) => {
                    const typeColor = ITEM_TYPE_COLORS[type] || ITEM_TYPE_COLORS.other;
                    const TypeIcon  = ITEM_TYPE_ICONS[type]  || MoreHorizontal;
                    return (
                      <div key={type}>
                        {/* Type group header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: typeColor.bg, borderTop: '1px solid #EDEBE5' }}>
                          <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff', border: `1.5px solid ${typeColor.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <TypeIcon size={15} color={typeColor.color} aria-hidden="true" />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: typeColor.color }}>
                            {t(ITEM_TYPE_LABEL_KEYS[type])}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: typeColor.color, opacity: 0.6 }}>({typeItems.length})</span>
                        </div>

                        {typeItems.map((item, j) => (
                  <div key={item.id} className="dk-tr" style={{ gridTemplateColumns: '24px 1fr 100px 80px 1.2fr 44px', minHeight: 58, background: j % 2 === 1 ? openPodColor.tint : 'transparent' }}>
                    <span style={{ color: '#9AA1AD', display: 'flex', alignItems: 'center' }}>
                      <GripVertical size={18} aria-hidden="true" />
                    </span>
                    <b style={{ fontSize: 15 }}>{item.description}</b>
                    <b>{item.quantity != null ? item.quantity : ''}</b>
                    <span className="dk-m">{item.unit || ''}</span>
                    <span className="dk-m" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes || ''}</span>
                    <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                      <button
                        aria-label={ts('desktop.detailActionsTitle')}
                        onClick={(e) => { e.stopPropagation(); setOpenItemMenuId(openItemMenuId === item.id ? null : item.id); }}
                        style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: 'transparent', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <MoreHorizontal size={20} aria-hidden="true" />
                      </button>
                      {openItemMenuId === item.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', right: 0, top: 40, zIndex: 50, background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px -8px rgba(0,0,0,.35), 0 2px 8px -2px rgba(0,0,0,.12)', padding: 6, minWidth: 170 }}
                        >
                          {[
                            { label: ts('desktop.detailEditItem'),      icon: Edit3,  danger: false, action: () => { setEditingItem(item); setOpenItemMenuId(null); } },
                            { label: ts('desktop.detailDuplicateItem'), icon: Copy,   danger: false, action: () => { handleDuplicate(item); setOpenItemMenuId(null); } },
                            { label: ts('desktop.detailDeleteItem'),    icon: Trash2, danger: true,  action: () => { handleDeleteItem(item); setOpenItemMenuId(null); } },
                          ].map(({ label, icon: Icon, danger, action }) => (
                            <button
                              key={label}
                              onClick={action}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 0, borderRadius: 10, background: 'transparent', fontSize: 14, fontWeight: 600, color: danger ? '#B71C1C' : '#0E1116', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <Icon size={15} aria-hidden="true" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                        ))}
                      </div>
                    );
                  })
                }
              </section>
            )}

          </>
        )}
      </div>

      {/* ── Hidden layout upload ───────────────────────────────────────────────── */}
      <input ref={layoutInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { const raw = Array.from(e.target.files || []); e.target.value = ''; if (raw.length && enqueue) enqueue(raw, { surveyId: id, entryId: null, mediaType: 'layout' }); }}
      />

      {/* ── ⋯ Actions modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} title={ts('desktop.detailActionsTitle')} maxWidth="560px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: ts('desktop.createQuote'), icon: FileText, onClick: () => { setShowMenu(false); router.push(p(`/ajanlatok/uj?from_survey=${id}`)); } },
            { label: ts('desktop.detailEditClient'), icon: Edit3, onClick: () => { setShowMenu(false); setShowMetaDrawer(true); } },
            { label: t('deleteBtn'), icon: Trash2, danger: true, onClick: () => { setShowMenu(false); handleDeleteSurvey(); } },
          ].map(action => (
            <button key={action.label} className="dk-sr"
              onClick={action.onClick}
              style={{ minHeight: 60, padding: '0 14px', borderRadius: 18, background: action.danger ? '#FDECEC' : '#F4F5F8', color: action.danger ? '#B71C1C' : '#0E1116', gap: 14, fontSize: 16, fontWeight: 700 }}>
              <action.icon size={22} aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* ── Add room modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showAddEntry} onClose={() => setShowAddEntry(false)} title={t('newRoomHeader')} maxWidth="560px">
        {showAddEntry && (
          <EntryForm surveyId={id} onSave={(fields) => createSurveyEntry(id, fields)} onCancel={() => setShowAddEntry(false)} />
        )}
      </Modal>

      {/* ── Add item modal ─────────────────────────────────────────────────────── */}
      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        surveyId={id}
        entryId={openEntry?.id}
      />

      {/* ── Edit item modal ────────────────────────────────────────────────────── */}
      <ItemEditModal item={editingItem} surveyId={id} isOpen={!!editingItem} onClose={() => setEditingItem(null)} />

      {/* ── Delete item modal (Pods design) ───────────────────────────────────── */}
      <Modal isOpen={!!deleteItemModal} onClose={deleteItemLoading ? undefined : () => setDeleteItemModal(null)} maxWidth="420px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} color="#B71C1C" aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116', letterSpacing: '-0.02em', marginBottom: 6 }}>
                {ts('desktop.detailDeleteItemConfirm')}
              </div>
              {deleteItemModal && (
                <p style={{ fontSize: 14, color: '#5A5F68', lineHeight: 1.5, margin: 0 }}>
                  <b style={{ color: '#0E1116' }}>{deleteItemModal.description}</b>
                  {deleteItemModal.quantity != null && (
                    <span> · {deleteItemModal.quantity} {deleteItemModal.unit || ''}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="dk-btn dk-btn-l" onClick={() => setDeleteItemModal(null)} disabled={deleteItemLoading} style={{ flex: 1, justifyContent: 'center' }}>
              {ts('cancelAction')}
            </button>
            <button className="dk-btn" onClick={confirmDeleteItem} disabled={deleteItemLoading} style={{ flex: 1, justifyContent: 'center', background: '#B71C1C', color: '#fff', opacity: deleteItemLoading ? 0.6 : 1 }}>
              <Trash2 size={16} aria-hidden="true" />
              {deleteItemLoading ? ts('deletingAction') : ts('desktop.deleteAction')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Measurements & notes modal ────────────────────────────────────────── */}
      <Modal isOpen={measOpen} onClose={() => setMeasOpen(false)} title={ts('desktop.detailMeasTitle')} maxWidth="560px">
        {openEntry && (
          <MeasurementsBar
            key={openEntry.id}
            entry={openEntry}
            surveyId={id}
            canEdit={canEditEntry(openEntry)}
            enqueue={canAdd ? enqueue : undefined}
            mediaItems={openEntryMedia}
          />
        )}
      </Modal>

      {/* ── Survey meta drawer ────────────────────────────────────────────────── */}
      <MetaDrawer survey={survey} clients={clients} isOpen={showMetaDrawer} onClose={() => setShowMetaDrawer(false)} onSave={(fields) => updateSurvey(id, fields)} />

      {/* ── Confirm / Alert ───────────────────────────────────────────────────── */}
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={t('confirmTitle')} message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      {/* ── Layout analysis ───────────────────────────────────────────────────── */}
      <ConfirmModal isOpen={!!pendingAnalysisLayout} onClose={() => setPendingAnalysisLayout(null)} onConfirm={() => { setAnalyzeLayout(pendingAnalysisLayout); setPendingAnalysisLayout(null); }} title={t('analysisConfirmTitle')} message={t('analysisConfirmMsg')} confirmLabel={t('analysisConfirmYes')} cancelLabel={t('analysisConfirmSkip')} />
      {analyzeLayout && <LayoutAnalysisModal surveyId={id} layout={analyzeLayout} existingEntries={entries} onClose={() => setAnalyzeLayout(null)} onCreated={() => setAnalyzeLayout(null)} createSurveyEntry={createSurveyEntry} />}

      {/* ── Locked document modal ─────────────────────────────────────────────── */}
      <LockedDocumentModal isOpen={lockedModalOpen} documentType="survey" documentId={id} lockedReason={survey.locked_reason} transferAttempts={transferAttemptCount} onDelete={async () => { await deleteSurvey(id); router.push(p('/felmeres')); }} onUnlocked={() => setLockedModalOpen(false)} onKeepReadOnly={() => setLockedModalOpen(false)} />
    </div>
  );
}
