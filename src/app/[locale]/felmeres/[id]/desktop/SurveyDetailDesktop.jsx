'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { podColor } from '@/lib/podColor';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import DrawingPad from '@/components/DrawingPad';
import SurveyMediaModal from '@/components/survey/SurveyMediaModal';
import SurveyDrawingsModal from '@/components/survey/SurveyDrawingsModal';
import NewClientModal from '@/components/NewClientModal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import LayoutAnalysisModal from '../components/LayoutAnalysisModal';
import AudioRecorder from '@/components/AudioRecorder';
import InlineUpload from '../components/InlineUpload';
import PageSpinner from '@/components/PageSpinner';
import { processMediaFile } from '@/lib/mediaGate';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import {
  Plus, Trash2, FileText, Check, Loader2, AlertCircle,
  RefreshCw, CheckCircle2, Edit3, X, Copy, Clipboard,
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
        <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
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

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={onClose} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>{tc('cancel')}</button>
          <button type="submit" className="dk-btn dk-btn-dark" disabled={saving} style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{t('itemsSavingBtn')}</> : <><Check size={15} aria-hidden="true" />{t('itemsAddNewBtn')}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── SectionDimensionsContent ──────────────────────────────────────────────────
function SectionDimensionsContent({ entry, surveyId, canEdit }) {
  const t  = useTranslations('surveyDetail');
  const td = useTranslations('surveys');
  const { updateSurveyEntry } = useApp();
  const [localLength,  setLocalLength]  = useState(entry.length_m     != null ? String(entry.length_m)     : '');
  const [localWidth,   setLocalWidth]   = useState(entry.width_m      != null ? String(entry.width_m)      : '');
  const [localHeight,  setLocalHeight]  = useState(entry.height_m     != null ? String(entry.height_m)     : '');
  const [localWindows, setLocalWindows] = useState(entry.window_count != null ? String(entry.window_count) : '');
  const [localDoors,   setLocalDoors]   = useState(entry.door_count   != null ? String(entry.door_count)   : '');
  const valuesRef = useRef({});
  valuesRef.current = { localLength, localWidth, localHeight, localWindows, localDoors };
  const handleBlur = useCallback(async () => {
    if (!canEdit) return;
    const v = valuesRef.current;
    try {
      await updateSurveyEntry(surveyId, entry.id, {
        length_m:     parseFloat(v.localLength)   || null,
        width_m:      parseFloat(v.localWidth)    || null,
        height_m:     parseFloat(v.localHeight)   || null,
        window_count: parseInt(v.localWindows, 10) || null,
        door_count:   parseInt(v.localDoors, 10)   || null,
      });
    } catch { }
  }, [canEdit, entry.id, surveyId, updateSurveyEntry]);
  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 };
  const inputSt = { background: '#F4F5F8', boxShadow: 'none' };
  const fmt = v => `${v.toFixed(2).replace('.', ',')} m²`;
  const l = parseFloat(localLength)   || 0;
  const w = parseFloat(localWidth)    || 0;
  const h = parseFloat(localHeight)   || 0;
  const wins = parseInt(localWindows, 10) || 0;
  const drs  = parseInt(localDoors,   10) || 0;
  const floor      = l > 0 && w > 0 ? l * w : 0;
  const wallGross  = floor > 0 && h > 0 ? 2 * (l + w) * h : 0;
  const deductions = wins * 1.5 + drs * 2.0;
  const wallNet    = Math.max(0, wallGross - deductions);
  const SumRow = ({ label, value, muted, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: '1px solid #E8E8EC' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: muted ? '#8A8F98' : '#5A5F68' }}>{label}</span>
      <b style={{ fontSize: 14, fontWeight: bold ? 800 : 700, color: bold ? '#0E1116' : '#3A3F48', fontFamily: 'var(--font-mono)' }}>{value}</b>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* L / W / H */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[{ label: t('entryLengthLabel'), val: localLength, set: setLocalLength, step: '0.1' },
          { label: t('entryWidthLabel'),  val: localWidth,  set: setLocalWidth,  step: '0.1' },
          { label: t('entryHeightLabel'), val: localHeight, set: setLocalHeight, step: '0.1' }].map(d => (
          <label key={d.label} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={lbl}>{d.label}</span>
            <input className="dk-input" type="number" min="0" step={d.step} value={d.val} disabled={!canEdit}
              onChange={e => d.set(e.target.value)} onBlur={handleBlur} style={inputSt} />
          </label>
        ))}
      </div>
      {/* Windows / Doors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ label: t('entryWindowsLabel'), val: localWindows, set: setLocalWindows },
          { label: t('entryDoorsLabel'),   val: localDoors,   set: setLocalDoors   }].map(d => (
          <label key={d.label} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={lbl}>{d.label}</span>
            <input className="dk-input" type="number" min="0" step="1" value={d.val} disabled={!canEdit}
              onChange={e => d.set(e.target.value)} onBlur={handleBlur} style={inputSt} />
          </label>
        ))}
      </div>
      {/* Area summary */}
      {floor > 0 && (
        <div style={{ background: '#F4F5F8', borderRadius: 14, padding: '10px 14px' }}>
          <SumRow label={td('desktop.detailMeasFloorLabel')} value={fmt(floor)} />
          <SumRow label={td('desktop.detailMeasCeilLabel')}  value={fmt(floor)} />
          {wallGross > 0 && (
            <>
              {deductions > 0 && <SumRow label={t('areaSummaryDeductions', { windowCount: wins, doorCount: drs })} value={`− ${fmt(deductions)}`} muted />}
              <SumRow label={td('desktop.detailMeasWallLabel')} value={fmt(wallNet)} bold />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionNotesContent ───────────────────────────────────────────────────────
function SectionNotesContent({ entry, surveyId, canEdit }) {
  const t = useTranslations('surveyDetail');
  const { updateSurveyEntry } = useApp();
  const [localNotes, setLocalNotes] = useState(entry.description || '');
  const valuesRef = useRef({});
  valuesRef.current = { localNotes };
  const handleBlur = useCallback(async () => {
    if (!canEdit) return;
    try { await updateSurveyEntry(surveyId, entry.id, { description: valuesRef.current.localNotes.trim() || null }); }
    catch { }
  }, [canEdit, entry.id, surveyId, updateSurveyEntry]);
  return (
    <textarea
      className="dk-input"
      disabled={!canEdit}
      value={localNotes}
      onChange={e => setLocalNotes(e.target.value)}
      onBlur={handleBlur}
      placeholder={t('entryNotesPlaceholder')}
      style={{ background: '#F4F5F8', boxShadow: 'none', height: 180, padding: '12px 14px', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
    />
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

// ── EntryForm — add a new section (name + notes only; measurements added later via context menu) ──
function EntryForm({ surveyId, onSave, onCancel }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError(t('entryNameRequired')); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), description: description.trim() || null });
      onCancel();
    } catch (err) { setError(err.message || t('entrySaveError')); setSaving(false); }
  };

  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 };
  const inputSt = { background: '#F4F5F8', boxShadow: 'none' };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('entryNameLabel')}</span>
          <input className="dk-input" type="text" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('entryNamePlaceholder')} style={inputSt} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('entryNotesLabel')}</span>
          <textarea className="dk-input" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('entryNotesPlaceholder')} style={{ ...inputSt, padding: '12px 14px', resize: 'vertical' }} />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={onCancel} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>{tc('cancel')}</button>
          <button type="submit" className="dk-btn dk-btn-dark" disabled={saving} style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{tc('saving')}</> : t('addRoomBtn')}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── MetaDrawer — edit survey-level title, date, client etc. ───────────────────
function MetaDrawer({ survey, clients: clientsProp, isOpen, onClose, onSave }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const [title, setTitle] = useState(''); const [date, setDate] = useState('');
  const [location, setLocation] = useState(''); const [notes, setNotes] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [localClients, setLocalClients] = useState(clientsProp || []);
  const [newClientOpen, setNewClientOpen] = useState(false);

  useEffect(() => { setLocalClients(clientsProp || []); }, [clientsProp]);

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

  const lbl = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070', display: 'block', marginBottom: 6 };
  const inputSt = { background: '#F4F5F8', boxShadow: 'none' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('metaDrawerTitle')} maxWidth="560px">
      {error && (
        <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('metaNameLabel')}</span>
          <input type="text" className="dk-input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={t('metaNamePlaceholder')} style={inputSt} />
        </label>

        {/* Date + Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={lbl}>{t('metaDateLabel')}</span>
            <input type="date" className="dk-input" value={date} onChange={e => setDate(e.target.value)} style={inputSt} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={lbl}>{t('metaLocationLabel')}</span>
            <input type="text" className="dk-input" value={location} onChange={e => setLocation(e.target.value)} placeholder={t('metaLocationPlaceholder')} style={inputSt} />
          </label>
        </div>

        {/* Client */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={lbl}>{t('metaClientLabel')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="dk-input" value={clientId} onChange={e => setClientId(e.target.value)} style={{ ...inputSt, flex: 1 }}>
              <option value="">{t('metaNoClient')}</option>
              {localClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setNewClientOpen(true)}
              title="Új ügyfél"
              style={{ width: 46, height: 46, borderRadius: 23, border: 0, background: '#1E3A8A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 24, lineHeight: 1 }}
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={lbl}>{t('metaNotesLabel')}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9AA1AD', background: '#F4F5F8', borderRadius: 8, padding: '3px 8px' }}>
              🎙 Coming soon
            </span>
          </div>
          <textarea rows={4} className="dk-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('metaNotesPlaceholder')} style={{ ...inputSt, padding: '12px 14px', resize: 'vertical' }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={onClose} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>{tc('cancel')}</button>
          <button type="button" className="dk-btn dk-btn-dark" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{tc('saving')}</> : tc('save')}
          </button>
        </div>
      </div>

      <NewClientModal
        isOpen={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onCreated={(client) => {
          setLocalClients(prev => [...prev, client]);
          setClientId(client.id);
          setNewClientOpen(false);
        }}
      />
    </Modal>
  );
}

// ── ItemEditModal — edit a single survey item ─────────────────────────────────
function ItemEditModal({ item, surveyId, isOpen, onClose, onDuplicate, onDelete }) {
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

      {/* Duplicate + Delete */}
      {(onDuplicate || onDelete) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid #EDEBE5' }}>
          {onDuplicate && (
            <button type="button" className="dk-btn dk-btn-l" onClick={onDuplicate} disabled={saving} style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
              <Copy size={15} aria-hidden="true" />
              {td('desktop.detailDuplicateItem')}
            </button>
          )}
          {onDelete && (
            <button type="button" className="dk-btn" onClick={onDelete} disabled={saving} style={{ flex: 1, justifyContent: 'center', gap: 8, background: '#FDECEC', color: '#B71C1C' }}>
              <Trash2 size={15} aria-hidden="true" />
              {td('desktop.detailDeleteItem')}
            </button>
          )}
        </div>
      )}
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
                enqueue={enqueue} photoCount={photoCount} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── ApplyTemplateModal ────────────────────────────────────────────────────────
const TMPL_TRADE_ORDER = ['burkoló', 'festő', 'gipszkartonos', 'kőműves', 'vízszerelő', 'villanyszerelő', 'ács', 'általános'];

function TemplateRowDesktop({ tmpl, onSelect, border }) {
  const count = (tmpl.template_entries || []).length;
  return (
    <button
      type="button"
      className="dk-sr"
      onClick={() => onSelect(tmpl)}
      style={{ minHeight: 50, padding: '0 2px', borderTopWidth: border ? 1 : 0, borderTopStyle: 'solid', borderTopColor: '#EDEBE5', borderRadius: 0 }}
    >
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0E1116', textAlign: 'left' }}>{tmpl.name}</span>
      <span style={{ fontSize: 13, color: '#8A8F97', flexShrink: 0, marginRight: 4 }}>{count}×</span>
      <ChevronRight size={16} style={{ color: '#C0BDB8', flexShrink: 0 }} aria-hidden="true" />
    </button>
  );
}

function ApplyTemplateModal({ isOpen, onClose, surveyId, entryId }) {
  const tM = useTranslations('mobilePods');
  const t  = useTranslations('surveyDetail');
  const { createSurveyItem } = useApp();

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [platform,     setPlatform]     = useState([]);
  const [userTmpls,    setUserTmpls]    = useState([]);
  const [tab,          setTab]          = useState('platform');
  const [query,        setQuery]        = useState('');
  const [preview,      setPreview]      = useState(null);
  const [applying,     setApplying]     = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true); setError(false); setPreview(null);
    setTab('platform'); setQuery(''); setAppliedCount(0);
    fetch('/api/sablonok')
      .then(r => r.json())
      .then(data => { setPlatform(data.platform || []); setUserTmpls(data.user || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleApply = async (template) => {
    const entries = template.template_entries || [];
    if (!entries.length) return;
    setApplying(true);
    try {
      await Promise.allSettled(
        entries.map(e => createSurveyItem(surveyId, {
          entry_id: entryId,
          description: e.name,
          entry_type: e.entry_type,
          quantity: e.qty_rate || null,
          unit: e.unit || null,
          source: 'manual',
          is_confirmed: true,
        }).catch(() => {}))
      );
      setAppliedCount(c => c + entries.length);
      setPreview(null);
    } catch {}
    setApplying(false);
  };

  const activeList = tab === 'platform' ? platform : userTmpls;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? activeList.filter(tmpl => tmpl.name.toLowerCase().includes(q) || (tmpl.trade || '').toLowerCase().includes(q))
    : activeList;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tM('itemsTemplatePickerTitle')} maxWidth="500px">

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ key: 'platform', label: tM('itemsTabPlatform') }, { key: 'user', label: tM('itemsTabMine') }].map(({ key, label }) => (
          <button key={key} type="button"
            className={`dk-btn ${tab === key ? 'dk-btn-dark' : 'dk-btn-l'}`}
            onClick={() => { setTab(key); setQuery(''); setPreview(null); }}
            style={{ height: 36, padding: '0 16px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      {!preview && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A8F9A', pointerEvents: 'none' }} aria-hidden="true" />
          <input className="dk-input" type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder={tM('itemsTemplateSearch')}
            style={{ paddingLeft: 42, background: '#F4F5F8', boxShadow: 'none' }} />
        </div>
      )}

      {/* Applied banner */}
      {appliedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#E7F4EC', border: '1px solid #A7F3D0', fontSize: 14, fontWeight: 700, color: '#14532D', marginBottom: 14 }}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {tM('itemsTemplateApplied', { count: appliedCount })}
        </div>
      )}

      {/* ── Preview mode ── */}
      {preview ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button type="button" className="dk-btn dk-btn-l" onClick={() => setPreview(null)}
              style={{ width: 36, height: 36, padding: 0, justifyContent: 'center', borderRadius: 18, flexShrink: 0 }}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, color: '#0E1116' }}>
              {preview.name}
            </span>
          </div>

          <div style={{ border: '1px solid #EDEBE5', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {[...(preview.template_entries || [])].sort((a, b) => a.sort_order - b.sort_order).map((e, i) => {
              const tc2 = ITEM_TYPE_COLORS[e.entry_type] || ITEM_TYPE_COLORS.other;
              return (
                <div key={e.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '10px 14px', borderTop: i > 0 ? '1px solid #F4F5F8' : 'none', background: i % 2 === 1 ? '#FAFAF9' : '#fff' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0E1116' }}>{e.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68', whiteSpace: 'nowrap' }}>
                    {e.qty_rate != null ? `${e.qty_rate} ` : ''}{e.unit || ''}
                  </span>
                  <span style={{ height: 22, padding: '0 8px', borderRadius: 11, background: tc2.bg, color: tc2.color, border: `1px solid ${tc2.border}`, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    {t(ITEM_TYPE_LABEL_KEYS[e.entry_type] || 'itemsTypeOther')}
                  </span>
                </div>
              );
            })}
          </div>

          <button type="button" className="dk-btn dk-btn-dark" onClick={() => handleApply(preview)} disabled={applying}
            style={{ width: '100%', justifyContent: 'center', gap: 8, opacity: applying ? 0.6 : 1 }}>
            {applying
              ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" />{tM('itemsTemplateApplying')}</>
              : <><Check size={15} aria-hidden="true" />{tM('itemsTemplateApplyBtn')}</>}
          </button>
        </>
      ) : (
        <>
          {loading && (
            <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#8A8F9A' }} aria-hidden="true" />
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#B71C1C' }}>
              {tM('itemsTemplateLoadError')}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>
              {q ? tM('itemsTemplateNoResults') : tM('itemsTemplateEmpty')}
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            tab === 'platform' && !q ? (
              (() => {
                const groups = {}, tradeLabel = {};
                for (const tmpl of filtered) {
                  const key = tmpl.trade_key || tmpl.trade;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(tmpl);
                  tradeLabel[key] = tmpl.trade;
                }
                const orderedKeys = [
                  ...TMPL_TRADE_ORDER.filter(k => groups[k]),
                  ...Object.keys(groups).filter(k => !TMPL_TRADE_ORDER.includes(k)).sort(),
                ];
                return orderedKeys.map(key => (
                  <div key={key}>
                    <div style={{ padding: '10px 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F97' }}>
                      {tradeLabel[key]}
                    </div>
                    {groups[key].map((tmpl, i) => (
                      <TemplateRowDesktop key={tmpl.id} tmpl={tmpl} onSelect={setPreview} border={i > 0} />
                    ))}
                  </div>
                ));
              })()
            ) : (
              filtered.map((tmpl, i) => (
                <TemplateRowDesktop key={tmpl.id} tmpl={tmpl} onSelect={setPreview} border={i > 0} />
              ))
            )
          )}
        </>
      )}
    </Modal>
  );
}

// ── SectionPod ────────────────────────────────────────────────────────────────
function SectionPod({
  entry, idx, allItems, drawings, canAdd, canEditFn, surveyId,
  isOpen, onToggle,
  openMenuId, onMenuToggle,
  onAddItem, onEditItem,
  onRename, onApplyTemplate, onMeasurements, onNotes, onMedia, onDrawings,
}) {
  const t  = useTranslations('surveyDetail');
  const ts = useTranslations('surveys');
  const [itemSearch, setItemSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const pc         = getPodColor(idx);
  const isMenuOpen = openMenuId === entry.id;
  const entryItems = allItems.filter(item => item.entry_id === entry.id);
  const area       = entryArea(entry);

  useEffect(() => {
    if (!isOpen) { setItemSearch(''); setTypeFilter('all'); }
  }, [isOpen]);

  const filtered = itemSearch.trim()
    ? entryItems.filter(i => i.description?.toLowerCase().includes(itemSearch.toLowerCase()))
    : entryItems;
  const display = typeFilter === 'all' ? filtered : filtered.filter(i => inferType(i) === typeFilter);

  return (
    <div className="dk-card" style={{ padding: 0 }}>

      {/* ── Pod header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 0 0', background: pc.c, minHeight: 60, borderRadius: isOpen ? '24px 24px 0 0' : 24 }}>

        {/* Toggle area — takes up most of the row */}
        <button type="button" onClick={onToggle}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 0, cursor: 'pointer', color: '#fff', padding: '14px 0 14px 16px', textAlign: 'left', minWidth: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          <span style={{ height: 26, padding: '0 10px', borderRadius: 13, background: 'rgba(255,255,255,.18)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {entryItems.length} {ts('desktop.detailLabelItem')}
          </span>
          {area && (
            <span style={{ height: 26, padding: '0 10px', borderRadius: 13, background: 'rgba(255,255,255,.18)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {area}
            </span>
          )}
        </button>

        {/* Add item button — only when open */}
        {isOpen && canAdd && (
          <button type="button" onClick={() => onAddItem(entry.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', border: 0, borderRadius: 16, background: 'rgba(255,255,255,.22)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={14} aria-hidden="true" />
            {ts('desktop.detailAddItemBtn')}
          </button>
        )}

        {/* Context menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); onMenuToggle(isMenuOpen ? null : entry.id); }}
            style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: 'rgba(255,255,255,.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
          {isMenuOpen && (
            <div onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', right: 0, top: 42, zIndex: 50, background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px -8px rgba(0,0,0,.35), 0 2px 8px -2px rgba(0,0,0,.12)', padding: 6, minWidth: 210 }}>
              {[
                { icon: Edit3,     label: ts('desktop.renameSection'),       action: onRename        },
                { icon: Clipboard, label: ts('desktop.applyTemplate'),       action: onApplyTemplate },
                { icon: Ruler,     label: ts('desktop.detailDimsTitle'),     action: onMeasurements  },
                { icon: FileText,  label: ts('desktop.detailNotesTitle'),    action: onNotes         },
                { icon: Camera,    label: ts('desktop.detailMediaTitle'),    action: onMedia         },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} type="button"
                  onClick={() => { action(); onMenuToggle(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 0, borderRadius: 10, background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E1116', cursor: 'pointer', textAlign: 'left' }}>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pod body ── */}
      {isOpen && (
        <div style={{ overflow: 'hidden', borderRadius: '0 0 24px 24px' }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', flexWrap: 'nowrap', overflowX: 'auto', background: '#F8F8F9', borderBottom: '1px solid #EDEBE5', alignItems: 'center' }}>
            <label style={{ position: 'relative', display: 'block', flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
                <Search size={15} aria-hidden="true" />
              </span>
              <input className="dk-input" placeholder={ts('desktop.detailSearchItems')} value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, width: 190, background: '#fff', boxShadow: 'none', borderRadius: 18, fontSize: 13 }} />
            </label>
            <button className="dk-chip" onClick={() => setTypeFilter('all')}
              style={{ background: typeFilter === 'all' ? pc.c : '#fff', color: typeFilter === 'all' ? '#fff' : '#5A5F68', flexShrink: 0, height: 36 }}>
              {ts('desktop.filterAll')} ({filtered.length})
            </button>
            {ITEM_TYPE_ORDER.map(type => {
              const cnt = filtered.filter(i => inferType(i) === type).length;
              return (
                <button key={type} className="dk-chip" onClick={() => cnt > 0 && setTypeFilter(type)}
                  style={{ background: typeFilter === type ? pc.c : '#fff', color: typeFilter === type ? '#fff' : '#5A5F68', flexShrink: 0, height: 36, opacity: cnt === 0 ? 0.35 : 1, cursor: cnt === 0 ? 'default' : 'pointer' }}>
                  {t(ITEM_TYPE_LABEL_KEYS[type])} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Column headers — quote style */}
          {display.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 80px 70px', padding: '0 18px', height: 40, alignItems: 'center', gap: 12, borderTop: '1px solid #EDEBE5', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>
              <span>{ts('desktop.detailColType')}</span>
              <span>{ts('desktop.detailColItem')}</span>
              <span>{ts('desktop.detailColQty')}</span>
              <span>{ts('desktop.detailColUnit')}</span>
            </div>
          )}

          {/* Empty state */}
          {display.length === 0 && (
            <div style={{ padding: '10px 18px', fontSize: 13, color: '#8A8F98', fontStyle: 'italic', borderTop: '1px solid #EDEBE5' }}>
              {ts('desktop.detailNoItems')}
            </div>
          )}

          {/* Item rows — flat, quote style */}
          {display.map(item => {
            const type      = inferType(item);
            const TypeIcon  = ITEM_TYPE_ICONS[type]  || MoreHorizontal;
            const typeColor = ITEM_TYPE_COLORS[type] || ITEM_TYPE_COLORS.other;
            return (
              <button key={item.id} type="button"
                onClick={() => onEditItem(item)}
                style={{ display: 'grid', gridTemplateColumns: '96px 1fr 80px 70px', padding: '0 18px', minHeight: 60, alignItems: 'center', gap: 12, borderTop: '1px solid #EDEBE5', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: 'none', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#EDEBE5', width: '100%', textAlign: 'left' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 12, background: typeColor.bg, color: typeColor.color, border: `1px solid ${typeColor.border}`, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <TypeIcon size={10} aria-hidden="true" />
                    {t(ITEM_TYPE_LABEL_KEYS[type])}
                  </span>
                </span>
                <span style={{ minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                  {item.notes && <span style={{ fontSize: 12, color: '#8A8F98', fontWeight: 500, marginLeft: 6 }}>{item.notes}</span>}
                </span>
                <span style={{ color: '#5A5F68' }}>{item.quantity != null ? item.quantity : ''}</span>
                <span style={{ color: '#5A5F68' }}>{item.unit || ''}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
    ? { '--dk-c': podColor(activeCollectiveId).deep }
    : {};

  // Page state
  const [openPodIds,          setOpenPodIds]          = useState(() => new Set());
  const [openPodMenuId,       setOpenPodMenuId]       = useState(null);
  const [search,              setSearch]              = useState('');
  const [addItemEntryId,      setAddItemEntryId]      = useState(null);
  const [showMenu,            setShowMenu]            = useState(false);
  const [showAddEntry,        setShowAddEntry]        = useState(false);
  const [editingEntry,        setEditingEntry]        = useState(null); // { id, name } for rename
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
  const [measOpen,            setMeasOpen]            = useState(false);
  const [notesOpen,           setNotesOpen]           = useState(false);
  const [mediaOpen,           setMediaOpen]           = useState(false);
  const [drawingsOpen,        setDrawingsOpen]        = useState(false);
  const [modalEntry,          setModalEntry]          = useState(null);
  const [deleteItemModal,     setDeleteItemModal]     = useState(null);
  const [deleteItemLoading,   setDeleteItemLoading]   = useState(false);
  const [showApplyTemplate,   setShowApplyTemplate]   = useState(false);
  const layoutInputRef = useRef(null);

  useEffect(() => {
    if (!openItemMenuId && !openPodMenuId) return;
    const close = () => { setOpenItemMenuId(null); setOpenPodMenuId(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openItemMenuId, openPodMenuId]);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {});
  }, [id, dataReady]);

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
  const isReadOnly       = !!survey.is_read_only;
  const canAdd           = !isDocLocked && !isReadOnly && (isOwner || isCollMember);
  const canEditMeta      = !isDocLocked && !isReadOnly && (isKollektivOwner || isOwner);
  const canEditEntry     = (entry) => !isDocLocked && !isReadOnly && (isKollektivOwner || entry.created_by === currentUser?.id);

  // Totals for header counters
  const totalItems = allItems.length;
  const totalArea  = entries.reduce((sum, e) => {
    const w = Number(e.width_m) || 0, l = Number(e.length_m) || 0;
    return sum + (w > 0 && l > 0 ? w * l : 0);
  }, 0);
  const totalAreaStr = totalArea > 0 ? totalArea.toFixed(1).replace('.', ',') : '0';

  // Modal entry derived values (used by measurements/notes/media/drawings/template modals)
  const modalEntryMedia    = modalEntry?.media || [];
  const modalEntryDrawings = modalEntry ? drawings.filter(d => d.entry_id === modalEntry.id) : [];

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
          setOpenPodIds(prev => { const next = new Set(prev); next.delete(entry.id); return next; });
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
          <span className="dk-kick">{ts('desktop.kicker')}</span>
          <h1 className="dk-h1">{survey.title}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {client && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 17, background: 'rgba(0,0,0,.25)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {client.name}
              </span>
            )}
            {survey.location && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 17, background: 'rgba(0,0,0,.25)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {survey.location}
              </span>
            )}
            {[
              { val: totalItems, label: ts('desktop.detailLabelItem') },
              { val: entries.length, label: ts('desktop.detailLabelRoom') },
              { val: totalAreaStr, label: ts('desktop.detailLabelM2') },
            ].map(c => (
              <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 17, background: 'rgba(0,0,0,.25)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
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
            {isReadOnly && <ReadOnlyBanner />}
            {/* ── Top bar: search + add section (right-aligned) ───────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <label style={{ position: 'relative', display: 'block', width: 280 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
                  <Search size={18} aria-hidden="true" />
                </span>
                <input className="dk-input" placeholder={ts('desktop.detailSearchAll')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 42, borderRadius: 23, height: 44, width: '100%' }} />
              </label>
              {canAdd && entries.length < 30 && (
                <button className="dk-btn dk-btn-g" onClick={() => setShowAddEntry(true)} style={{ gap: 6, flexShrink: 0 }}>
                  <Plus size={16} aria-hidden="true" />
                  {t('addRoomBtn')}
                </button>
              )}
            </div>

            {/* ── Section pods ─────────────────────────────────────────────────── */}
            {entries
              .filter(entry => !search.trim() ||
                entry.name.toLowerCase().includes(search.toLowerCase()) ||
                allItems.filter(i => i.entry_id === entry.id).some(i => i.description?.toLowerCase().includes(search.toLowerCase()))
              )
              .map((entry, idx) => (
                <SectionPod
                  key={entry.id}
                  entry={entry}
                  idx={idx}
                  allItems={allItems}
                  drawings={drawings}
                  canAdd={canAdd}
                  canEditFn={canEditEntry}
                  surveyId={id}
                  isOpen={openPodIds.has(entry.id)}
                  onToggle={() => setOpenPodIds(prev => {
                    const next = new Set(prev);
                    next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
                    return next;
                  })}
                  openMenuId={openPodMenuId}
                  onMenuToggle={setOpenPodMenuId}
                  onAddItem={eid => setAddItemEntryId(eid)}
                  onEditItem={item => setEditingItem(item)}
                  onRename={() => setEditingEntry({ id: entry.id, name: entry.name })}
                  onApplyTemplate={() => { setModalEntry(entry); setShowApplyTemplate(true); }}
                  onMeasurements={() => { setModalEntry(entry); setMeasOpen(true); }}
                  onNotes={() => { setModalEntry(entry); setNotesOpen(true); }}
                  onMedia={() => { setModalEntry(entry); setMediaOpen(true); }}
                  onDrawings={() => { setModalEntry(entry); setDrawingsOpen(true); }}
                />
              ))
            }

            {entries.length === 0 && (
              <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{ts('desktop.detailNoItems')}</span>
                {canAdd && (
                  <button className="dk-btn dk-btn-g" onClick={() => setShowAddEntry(true)} style={{ gap: 6 }}>
                    <Plus size={16} aria-hidden="true" />
                    {t('addRoomBtn')}
                  </button>
                )}
              </div>
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
            { label: ts('desktop.detailEditClient'), icon: Edit3, onClick: () => { setShowMenu(false); setShowMetaDrawer(true); } },
            { label: ts('desktop.createQuote'), icon: FileText, onClick: () => { setShowMenu(false); router.push(p(`/ajanlatok/uj?from_survey=${id}`)); } },
            ...(!survey.is_seed ? [{ label: t('deleteBtn'), icon: Trash2, danger: true, onClick: () => { setShowMenu(false); handleDeleteSurvey(); } }] : []),
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

      {/* ── Rename section modal ───────────────────────────────────────────────── */}
      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title={ts('desktop.renameSection')} maxWidth="420px">
        {editingEntry && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const name = editingEntry.name.trim();
            if (!name) return;
            await updateSurveyEntry(id, editingEntry.id, { name });
            setEditingEntry(null);
          }}>
            <input
              autoFocus
              className="dk-input"
              value={editingEntry.name}
              onChange={e => setEditingEntry(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', marginBottom: 16, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => setEditingEntry(null)}>{t('cancelBtn')}</button>
              <button type="submit" className="dk-btn dk-btn-dark">{ts('desktop.renameSave')}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add room modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showAddEntry} onClose={() => setShowAddEntry(false)} title={t('newRoomHeader')} maxWidth="560px">
        {showAddEntry && (
          <EntryForm surveyId={id} onSave={(fields) => createSurveyEntry(id, fields)} onCancel={() => setShowAddEntry(false)} />
        )}
      </Modal>

      {/* ── Add item modal ─────────────────────────────────────────────────────── */}
      <AddItemModal
        isOpen={!!addItemEntryId}
        onClose={() => setAddItemEntryId(null)}
        surveyId={id}
        entryId={addItemEntryId}
      />

      {/* ── Edit item modal ────────────────────────────────────────────────────── */}
      <ItemEditModal
        item={editingItem}
        surveyId={id}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onDuplicate={() => { handleDuplicate(editingItem); setEditingItem(null); }}
        onDelete={() => { handleDeleteItem(editingItem); setEditingItem(null); }}
      />

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

      {/* ── Measurements modal ────────────────────────────────────────────────── */}
      <Modal isOpen={measOpen} onClose={() => setMeasOpen(false)} title={ts('desktop.detailDimsTitle')} maxWidth="480px">
        {modalEntry && <SectionDimensionsContent key={modalEntry.id} entry={modalEntry} surveyId={id} canEdit={canEditEntry(modalEntry)} />}
      </Modal>

      {/* ── Notes modal ───────────────────────────────────────────────────────── */}
      <Modal isOpen={notesOpen} onClose={() => setNotesOpen(false)} title={ts('desktop.detailNotesTitle')} maxWidth="480px">
        {modalEntry && <SectionNotesContent key={modalEntry.id} entry={modalEntry} surveyId={id} canEdit={canEditEntry(modalEntry)} />}
      </Modal>

      {/* ── Media modal ───────────────────────────────────────────────────────── */}
      {modalEntry && (
        <SurveyMediaModal
          isOpen={mediaOpen}
          onClose={() => setMediaOpen(false)}
          surveyId={id}
          entryId={modalEntry.id}
          canEdit={canEditEntry(modalEntry)}
          enqueue={canAdd ? enqueue : undefined}
          mediaItems={modalEntryMedia}
        />
      )}

      {/* ── Drawings modal ────────────────────────────────────────────────────── */}
      {modalEntry && (
        <SurveyDrawingsModal
          isOpen={drawingsOpen}
          onClose={() => setDrawingsOpen(false)}
          surveyId={id}
          entryId={modalEntry.id}
          entryName={modalEntry.name}
          drawings={modalEntryDrawings}
        />
      )}

      {/* ── Apply template modal ──────────────────────────────────────────────── */}
      <ApplyTemplateModal
        isOpen={showApplyTemplate}
        onClose={() => setShowApplyTemplate(false)}
        surveyId={id}
        entryId={modalEntry?.id}
      />

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
