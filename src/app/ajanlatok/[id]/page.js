'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES, QUOTE_ENTRY_TYPES, QUANTITY_UNITS, LABOUR_UNITS } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import SectionMediaGrid from '@/components/SectionMediaGrid';
import ClientSelect from '@/components/ClientSelect';
import {
  ArrowLeft, MapPin, Calendar, Coins, Plus, Trash2, User, Wrench, Printer,
  CheckCircle2, XCircle, Send, FolderKanban, AlertCircle,
  Edit3, Loader2, Package, Hammer, Truck, MoreHorizontal, Ruler, Home,
  X, Copy, ExternalLink, Check, Camera,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import { processMediaFile } from '@/lib/mediaGate';

const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
const sortEntries = (arr) => [...arr].sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));

const TYPE_ICONS  = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};
const STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',  color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent:     { bg: 'var(--warning-bg)', color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)', color: 'var(--success-text)',   border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',  color: 'var(--danger-text)',    border: 'var(--danger-border)' },
};
const QUOTE_ENTRY_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép/eszköz', transport: 'Szállítás', other: 'Egyéb' };
const EMPTY_ENTRY_FORM = { entry_type: 'material', work_description: '', quantity: '', unit: 'db', unit_price: '', flat_amount: '', notes: '', user_id: '' };
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function calcAmount(t, qty, up, flat) {
  if ((t === 'material' || t === 'labour') && qty && up) return Math.round(parseFloat(qty) * parseInt(up, 10));
  return parseInt(flat, 10) || 0;
}

// ── Area summary (shared with felmeres) ───────────────────────────────────────
const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;
const PILL_STYLE = { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };

function AreaSummary({ entry }) {
  const { width_m, length_m, size_m2, height_m, window_count, door_count } = entry;
  const w = Number(width_m), l = Number(length_m);
  const floorArea = w > 0 && l > 0 ? w * l : (size_m2 != null ? Number(size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const hasFloor = floorArea != null;
  const hasWall  = height_m != null && perimeter != null;
  if (!hasFloor && !hasWall) return null;
  const windowArea = (window_count || 0) * WINDOW_M2;
  const doorArea   = (door_count   || 0) * DOOR_M2;
  const openings   = windowArea + doorArea;
  const grossWall  = hasWall ? perimeter * height_m : null;
  const netWall    = grossWall != null ? Math.max(0, grossWall - openings) : null;
  const fmt = v => Number(v).toFixed(2).replace('.', ',') + ' m²';
  const Row = ({ label, value, sub, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: sub ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: sub ? 400 : 600, paddingLeft: sub ? '0.75rem' : 0 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: bold ? 800 : 600, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Területek</div>
      {hasFloor && <Row label="Padló / Mennyezet" value={fmt(floorArea)} />}
      {grossWall != null && <Row label="Falfelület (bruttó)" value={fmt(grossWall)} />}
      {openings > 0 && <Row label={`Kivonások (${window_count||0} ablak + ${door_count||0} ajtó)`} value={`− ${fmt(openings)}`} sub />}
      {netWall != null && <Row label="Falfelület (nettó)" value={fmt(netWall)} bold />}
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Ablak: ~1,5 m² · Ajtó: ~2,0 m²</div>
    </div>
  );
}

// ── Section add form (for new sections only) ──────────────────────────────────
function SectionAddForm({ surveyId, onSave, onCancel }) {
  const { uploadSurveyMedia } = useApp();
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [widthM, setWidthM]           = useState('');
  const [lengthM, setLengthM]         = useState('');
  const [heightM, setHeightM]         = useState('');
  const [windowCount, setWindowCount] = useState('');
  const [doorCount, setDoorCount]     = useState('');
  const [wallM2, setWallM2]           = useState('');
  const [wallAuto, setWallAuto]       = useState(true);
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews]           = useState([]);
  const fileInputRef = React.useRef(null);

  const w = parseFloat(widthM), l = parseFloat(lengthM);
  const computedArea      = w > 0 && l > 0 ? w * l : null;
  const computedPerimeter = w > 0 && l > 0 ? 2 * (w + l) : null;

  useEffect(() => {
    if (!wallAuto) return;
    const h   = parseFloat(heightM);
    const ded = (parseInt(windowCount)||0)*WINDOW_M2 + (parseInt(doorCount)||0)*DOOR_M2;
    const net = computedPerimeter && h > 0 ? Math.max(0, computedPerimeter * h - ded) : null;
    setWallM2(net != null ? net.toFixed(2) : '');
  }, [widthM, lengthM, heightM, windowCount, doorCount, wallAuto]);

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const arr = await Promise.all(raw.map(processMediaFile));
    setSelectedFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => ({ key: `${f.name}-${f.size}`, isVideo: f.type.startsWith('video/'), url: f.type.startsWith('video/') ? null : URL.createObjectURL(f) }))]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('A helyiség neve kötelező!'); return; }
    setSaving(true);
    try {
      const hNum = heightM     ? Number(heightM)         : null;
      const wNum = windowCount ? parseInt(windowCount,10) : 0;
      const dNum = doorCount   ? parseInt(doorCount,  10) : 0;
      await onSave({
        name: name.trim(), description: description.trim()||null,
        width_m: parseFloat(widthM)||null, length_m: parseFloat(lengthM)||null,
        height_m: hNum, window_count: wNum, door_count: dNum,
        start_date: startDate||null, end_date: endDate||null,
        _pendingFiles: selectedFiles, _surveyId: surveyId,
      });
    } catch (err) { setError(err.message||'Hiba'); setSaving(false); }
  };

  return (
    <div style={{ padding: '0.85rem', background: 'var(--accent-light)', border: '2px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
      {error && <div style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
        <label className="form-label">Helyiség neve *</label>
        <input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="pl. Fürdőszoba, Konyha…" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: computedArea != null ? '0.25rem' : '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Szél. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={widthM} onChange={e => setWidthM(e.target.value)} placeholder="3.5" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Hossz. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={lengthM} onChange={e => setLengthM(e.target.value)} placeholder="4.2" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Magass. (m)</label><input type="number" min="0" step="0.05" className="form-control" value={heightM} onChange={e => setHeightM(e.target.value)} placeholder="2.6" /></div>
      </div>
      {computedArea != null && <div style={{ marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>Alapterület: {computedArea.toFixed(2).replace('.', ',')} m²</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ablak (db)</label><input type="number" min="0" step="1" className="form-control" value={windowCount} onChange={e => setWindowCount(e.target.value)} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ajtó (db)</label><input type="number" min="0" step="1" className="form-control" value={doorCount} onChange={e => setDoorCount(e.target.value)} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Falfel. (m²)</label><input type="number" min="0" step="0.01" className="form-control" value={wallM2} onChange={e => { setWallAuto(false); setWallM2(e.target.value); }} placeholder="m²" /></div>
      </div>
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Kezdés</label><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Befejezés</label><input type="date" className="form-control" min={startDate||undefined} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="form-label">Leírás</label><textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Elvégzendő munkák, állapot…" /></div>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: previews.length ? '0.4rem' : 0 }}>
          <label className="form-label" style={{ margin: 0 }}>Fotók</label>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}><Camera size={12} /> Fotó</button>
        </div>
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {previews.map((p, i) => (
              <div key={p.key} style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                  {p.isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>▶</div>
                  : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <button type="button" onClick={() => { setSelectedFiles(f=>f.filter((_,fi)=>fi!==i)); setPreviews(p=>p.filter((_,pi)=>pi!==i)); }} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={9} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />Hozzáadás</> : 'Helyiség hozzáadása'}
        </button>
      </div>
    </div>
  );
}

// ── Section card — felmeres-style read/edit toggle ────────────────────────────
function SectionCard({ section, surveyEntry, surveyId, quoteId, canEdit, onDelete, onAddEntry, onEditEntry, onDeleteEntry, sectionEntries, quote }) {
  const { updateQuoteSection } = useApp();
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [name, setName]               = useState('');
  const [widthM, setWidthM]           = useState('');
  const [lengthM, setLengthM]         = useState('');
  const [heightM, setHeightM]         = useState('');
  const [windowCount, setWindowCount] = useState('');
  const [doorCount, setDoorCount]     = useState('');
  const [wallM2, setWallM2]           = useState('');
  const [wallAuto, setWallAuto]       = useState(true);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [saving, setSaving]           = useState(false);

  // Populate form when entering edit mode — use section's own stored measurements
  useEffect(() => {
    if (!isEditing) return;
    setName(section.name || '');
    setWidthM(section.width_m   != null ? String(section.width_m)   : (surveyEntry?.width_m   != null ? String(surveyEntry.width_m)   : ''));
    setLengthM(section.length_m != null ? String(section.length_m)  : (surveyEntry?.length_m  != null ? String(surveyEntry.length_m)  : ''));
    setHeightM(section.height_m != null ? String(section.height_m)  : (surveyEntry?.height_m  != null ? String(surveyEntry.height_m)  : ''));
    setWindowCount(section.window_count != null ? String(section.window_count) : (surveyEntry?.window_count != null ? String(surveyEntry.window_count) : ''));
    setDoorCount(section.door_count   != null ? String(section.door_count)   : (surveyEntry?.door_count   != null ? String(surveyEntry.door_count)   : ''));
    setWallM2(''); setWallAuto(true);
    setDescription(section.description || '');
    setStartDate(section.start_date || '');
    setEndDate(section.end_date     || '');
  }, [isEditing]);

  const w = parseFloat(widthM), l = parseFloat(lengthM);
  const computedArea      = w > 0 && l > 0 ? w * l : null;
  const computedPerimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const existingSize = surveyEntry?.size_m2 ?? section.size_m2;

  useEffect(() => {
    if (!wallAuto) return;
    const h   = parseFloat(heightM);
    const ded = (parseInt(windowCount)||0)*WINDOW_M2 + (parseInt(doorCount)||0)*DOOR_M2;
    const net = computedPerimeter && h > 0 ? Math.max(0, computedPerimeter * h - ded) : null;
    setWallM2(net != null ? net.toFixed(2) : '');
  }, [widthM, lengthM, heightM, windowCount, doorCount, wallAuto]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const hNum = heightM     ? Number(heightM)         : null;
      const wNum = windowCount ? parseInt(windowCount,10) : 0;
      const dNum = doorCount   ? parseInt(doorCount,  10) : 0;
      await updateQuoteSection(quoteId, section.id, {
        name: name.trim(), description: description.trim()||null,
        width_m: parseFloat(widthM)||null, length_m: parseFloat(lengthM)||null,
        height_m: hNum, window_count: wNum, door_count: dNum,
        start_date: startDate||null, end_date: endDate||null,
        survey_entry_id: section.survey_entry_id||null,
      });
      setIsEditing(false);
    } catch { } finally { setSaving(false); }
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) return (
    <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Szerkesztés: {section.name}</div>
      <div className="form-group">
        <label className="form-label">Helyiség neve *</label>
        <input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: computedArea != null ? '0.25rem' : '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Szél. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={widthM} onChange={e => setWidthM(e.target.value)} placeholder="3.5" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Hossz. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={lengthM} onChange={e => setLengthM(e.target.value)} placeholder="4.2" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Magass. (m)</label><input type="number" min="0" step="0.05" className="form-control" value={heightM} onChange={e => setHeightM(e.target.value)} placeholder="2.6" /></div>
      </div>
      {computedArea != null && <div style={{ marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>Alapterület: {computedArea.toFixed(2).replace('.', ',')} m²</div>}
      {existingSize != null && computedArea == null && <div style={{ marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jelenlegi: {Number(existingSize).toFixed(1).replace('.', ',')} m² — add meg a méreteket a frissítéshez</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ablak (db)</label><input type="number" min="0" step="1" className="form-control" value={windowCount} onChange={e => setWindowCount(e.target.value)} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ajtó (db)</label><input type="number" min="0" step="1" className="form-control" value={doorCount} onChange={e => setDoorCount(e.target.value)} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Falfel. (m²)</label><input type="number" min="0" step="0.01" className="form-control" value={wallM2} onChange={e => { setWallAuto(false); setWallM2(e.target.value); }} placeholder="m²" /></div>
      </div>
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Kezdés</label><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Befejezés</label><input type="date" className="form-control" min={startDate||undefined} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}><label className="form-label">Leírás</label><textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Elvégzendő munkák, állapot…" /></div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)} disabled={saving}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Módosítás'}
        </button>
      </div>
    </div>
  );

  // ── Read mode (felmeres style) ────────────────────────────────────────────
  // Prefer measurements stored directly on the section; fall back to surveyEntry for legacy data
  const displayEntry = {
    width_m:      section.width_m      ?? surveyEntry?.width_m      ?? null,
    length_m:     section.length_m     ?? surveyEntry?.length_m     ?? null,
    size_m2:      section.size_m2      ?? surveyEntry?.size_m2      ?? null,
    height_m:     section.height_m     ?? surveyEntry?.height_m     ?? null,
    window_count: section.window_count ?? surveyEntry?.window_count ?? 0,
    door_count:   section.door_count   ?? surveyEntry?.door_count   ?? 0,
  };
  const displaySize = (displayEntry.width_m > 0 && displayEntry.length_m > 0)
    ? displayEntry.width_m * displayEntry.length_m
    : displayEntry.size_m2;
  const hasAnyMeasurement = displaySize != null || displayEntry.height_m != null;
  const hasMedia = !!(quote?.survey_id && section.survey_entry_id);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      {/* Name + pills + edit/delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{section.name}</span>
            {displaySize != null && <span style={PILL_STYLE}><Ruler size={11}/>{Number(displaySize).toFixed(1).replace('.', ',')} m²</span>}
            {displayEntry.height_m     != null && <span style={PILL_STYLE}>{displayEntry.height_m} m mag.</span>}
            {displayEntry.window_count  > 0    && <span style={PILL_STYLE}>{displayEntry.window_count} ablak</span>}
            {displayEntry.door_count    > 0    && <span style={PILL_STYLE}>{displayEntry.door_count} ajtó</span>}
            {(section.start_date || section.end_date) && <span style={PILL_STYLE}><Calendar size={11}/>{section.start_date ? formatDate(section.start_date) : '?'} – {section.end_date ? formatDate(section.end_date) : '?'}</span>}
          </div>
          {section.description && <p style={{ marginTop: '0.3rem', marginBottom: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</p>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
            <button type="button" onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Edit3 size={13} /></button>
            <button type="button" onClick={() => onDelete(section)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Trash2 size={13} /></button>
          </div>
        )}
      </div>
      {hasAnyMeasurement && <AreaSummary entry={displayEntry} />}

      {/* Photos */}
      <div style={{ marginTop: '0.75rem', borderTop: hasAnyMeasurement ? 'none' : '1px solid var(--border-subtle)', paddingTop: hasAnyMeasurement ? 0 : '0.75rem' }}>
        {canEdit ? (
          <SectionPhotoZone
            quoteId={quoteId}
            quoteSurveyId={quote?.survey_id}
            quoteTitle={quote?.title}
            quoteClientId={quote?.client_id}
            section={{ ...section, survey_entry_id: section.survey_entry_id||null }}
            onEntryCreated={(sId, svId, eId) => updateQuoteSection(quoteId, sId, { survey_entry_id: eId }).catch(()=>{})}
          />
        ) : hasMedia ? (
          <SectionMediaGrid surveyId={quote.survey_id} surveyEntryId={section.survey_entry_id} isLocked={true} />
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs fotó.</div>
        )}
      </div>

      {/* Tételek */}
      <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sectionEntries.length ? '0.5rem' : 0 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Tételek ({sectionEntries.length})
          </span>
          {canEdit && (
            <button type="button" onClick={() => onAddEntry(section.id)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Plus size={13} /> Tétel
            </button>
          )}
        </div>
        {sectionEntries.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sectionEntries.map((entry, idx) => {
              const Icon = TYPE_ICONS[entry.entry_type] || MoreHorizontal;
              const tc   = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
              const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0', borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={13} color={tc.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{entry.work_description}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                      <span style={{ padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.67rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_LABELS[entry.entry_type]}</span>
                      {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit||'db'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>}
                      {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{formatHUF(entry.amount_huf)}</span>
                    {canEdit && <>
                      <button type="button" onClick={() => onEditEntry(section.id, entry.id)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><Edit3 size={11} /></button>
                      <button type="button" onClick={() => onDeleteEntry(entry)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Photo zone for a section ──────────────────────────────────────────────────
function SectionPhotoZone({ quoteId, quoteSurveyId, quoteTitle, quoteClientId, section, onEntryCreated }) {
  const { createSurvey, createSurveyEntry, uploadSurveyMedia, updateQuote, updateQuoteSection, fetchSurveyMedia } = useApp();
  const [uploading, setUploading] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState('');
  const fileInputRef = React.useRef(null);

  if (quoteSurveyId && section.survey_entry_id) {
    return <SectionMediaGrid surveyId={quoteSurveyId} surveyEntryId={section.survey_entry_id} isLocked={false} />;
  }

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(processMediaFile));
    setUploading(true); setUploadErr('');
    try {
      let surveyId = quoteSurveyId;
      if (!surveyId) {
        const s = await createSurvey({ title: quoteTitle });
        surveyId = s.id;
        await updateQuote(quoteId, { survey_id: surveyId });
      }
      const entry = await createSurveyEntry(surveyId, { name: section.name, description: section.description || null, size_m2: section.size_m2 || null });
      await uploadSurveyMedia(surveyId, files, { entryId: entry.id, mediaType: 'photo' });
      if (section.id) await updateQuoteSection(quoteId, section.id, { survey_entry_id: entry.id });
      await fetchSurveyMedia(surveyId);
      onEntryCreated(section.id, surveyId, entry.id);
    } catch (err) { setUploadErr(err.message || 'Hiba'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Fotók (0)</span>
      {uploadErr && <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)', marginLeft: '0.5rem' }}>{uploadErr}</span>}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
        {uploading ? <><Loader2 size={12} className="animate-spin" />Feltöltés…</> : <><Camera size={12} /> Fotó hozzáadása</>}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    currentUser, isAdmin, loading, dataReady,
    quotes, quoteEntries, quoteSections, clients, users, projects, surveys,
    updateQuote, updateQuoteStatus, deleteQuote, convertQuoteToProject,
    createQuoteSection, updateQuoteSection, deleteQuoteSection,
    createQuoteEntry, updateQuoteEntry, deleteQuoteEntry,
    fetchSurveyMedia, surveyEntriesBySurvey,
  } = useApp();

  // Inline meta state
  const [metaTitle, setMetaTitle]           = useState('');
  const [metaLocation, setMetaLocation]     = useState('');
  const [metaWorkType, setMetaWorkType]     = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaStartDate, setMetaStartDate]   = useState('');
  const [metaEndDate, setMetaEndDate]       = useState('');
  const [metaClientId, setMetaClientId]     = useState('');
  const [metaTaxPercent, setMetaTaxPercent] = useState('27');
  const [metaInitialized, setMetaInitialized] = useState(false);
  const [savingMeta, setSavingMeta]         = useState(false);

  // Section management
  const [showAddSection, setShowAddSection] = useState(false);

  // Entry modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [editingEntryId, setEditingEntryId]   = useState(null);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [pendingEntries, setPendingEntries] = useState([]);
  const [savingEntry, setSavingEntry] = useState(false);

  // Convert to project modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMembers, setConvertMembers]     = useState([]);
  const [isConverting, setIsConverting]         = useState(false);

  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [attachTerms, setAttachTerms] = useState(true);
  const [termsPdfName, setTermsPdfName] = useState(null);

  const openSendConfirm = async () => {
    if (!client?.email) { setAlertModal({ message: 'Az ügyfélnek nincs megadva email cím.' }); return; }
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();
      setTermsPdfName(data.profile?.terms_pdf_name || null);
      setAttachTerms(!!data.profile?.terms_pdf_url);
    } catch { setTermsPdfName(null); setAttachTerms(false); }
    setShowSendConfirm(true);
  };
  const [sendProgress, setSendProgress] = useState(null); // null | { step, done, error }

  const SEND_STEPS = [
    { key: 'pdf',        label: 'PDF összeállítása…',      ms: 0    },
    { key: 'message',    label: 'E-mail szöveg elkészítése…', ms: 18000 },
    { key: 'recipients', label: 'Címzett hozzáadása…',     ms: 22000 },
    { key: 'sending',    label: 'Küldés…',                 ms: 25000 },
  ];

  const handleSendEmail = async () => {
    setShowSendConfirm(false);
    setSendProgress({ step: 0, done: false, error: null });

    // Advance steps on a timer while API runs
    const timers = [];
    SEND_STEPS.forEach((s, i) => {
      if (i === 0) return; // step 0 starts immediately
      timers.push(setTimeout(() => setSendProgress(p => p && !p.done && !p.error ? { ...p, step: i } : p), s.ms));
    });

    try {
      const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachTerms }) });
      const data = await res.json();
      timers.forEach(clearTimeout);
      if (!res.ok) throw new Error(data.error || 'Ismeretlen hiba');
      await updateQuoteStatus(id, 'sent');
      setSendProgress({ step: SEND_STEPS.length - 1, done: true, error: null, sentTo: data.sentTo });
    } catch (err) {
      timers.forEach(clearTimeout);
      setSendProgress(p => ({ ...p, done: false, error: err.message }));
    }
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal]     = useState(null);
  const [copied, setCopied]             = useState(false);

  const quote = quotes.find(q => q.id === id);

  useEffect(() => {
    if (quote?.survey_id) fetchSurveyMedia(quote.survey_id).catch(() => {});
  }, [quote?.survey_id]);

  useEffect(() => {
    if (!quote || metaInitialized) return;
    setMetaTitle(quote.title || '');
    setMetaLocation(quote.location || '');
    setMetaWorkType(quote.work_type || '');
    setMetaDescription(quote.description || '');
    setMetaStartDate(quote.start_date || '');
    setMetaEndDate(quote.end_date || '');
    setMetaClientId(quote.client_id || '');
    setMetaTaxPercent(String(quote.tax_percent ?? 27));
    setMetaInitialized(true);
  }, [quote, metaInitialized]);

  if (loading || !dataReady) return <PageSpinner />;
  if (!quote) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>Az ajánlat nem található</h2>
      <Link href="/ajanlatok" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client        = clients.find(c => c.id === quote.client_id);
  const creator       = users.find(u => u.id === quote.created_by);
  const entries       = quoteEntries.filter(e => e.quote_id === id);
  const netTotal      = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate       = Number(quote.tax_percent ?? 27);
  const taxAmount     = Math.round(netTotal * taxRate / 100);
  const grossTotal    = netTotal + taxAmount;
  const canModify     = quote.created_by === currentUser?.id || isAdmin || (quote.shared_with || []).includes(currentUser?.id);
  const isLocked      = quote.status === 'accepted' || quote.status === 'rejected';
  const canEdit       = canModify && !isLocked;
  const sc            = STATUS_COLORS[quote.status] || STATUS_COLORS.draft;
  const linkedProject = quote.project_id ? projects.find(p => p.id === quote.project_id) : null;
  const linkedSurvey  = quote.survey_id  ? surveys.find(s => s.id === quote.survey_id)   : null;
  const sections      = quoteSections.filter(s => s.quote_id === id).sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));

  const previewAmount = calcAmount(entryForm.entry_type, entryForm.quantity, entryForm.unit_price, entryForm.flat_amount);

  const isMetaDirty = canEdit && metaInitialized && (
    metaTitle       !== (quote.title        || '')                ||
    metaLocation    !== (quote.location     || '')                ||
    metaWorkType    !== (quote.work_type    || '')                ||
    metaDescription !== (quote.description || '')                ||
    metaStartDate   !== (quote.start_date   || '')                ||
    metaEndDate     !== (quote.end_date     || '')                ||
    metaClientId    !== (quote.client_id    || '')                ||
    metaTaxPercent  !== String(quote.tax_percent ?? 27)
  );

  const STATUS_LABELS_HU = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };

  const doSaveMeta = async (revert) => {
    setSavingMeta(true);
    try {
      await updateQuote(id, {
        title: metaTitle.trim(), location: metaLocation.trim(), work_type: metaWorkType.trim(),
        description: metaDescription.trim(), start_date: metaStartDate || null, end_date: metaEndDate || null,
        client_id: metaClientId || null, tax_percent: Number(metaTaxPercent) || 0,
      });
      if (revert) await updateQuoteStatus(id, 'draft');
      setMetaInitialized(false);
    } catch (err) { setAlertModal({ message: err.message }); }
    finally { setSavingMeta(false); }
  };

  const handleSaveMeta = async () => {
    if (!metaTitle.trim()) return;
    if (!quote || quote.status === 'draft') { doSaveMeta(false); return; }
    setConfirmModal({
      message: `Az ajánlat jelenlegi státusza: „${STATUS_LABELS_HU[quote.status] || quote.status}". Visszaállítja „Tervezet" státuszra?`,
      confirmLabel: 'Igen, visszaállítás',
      cancelLabel: 'Nem, maradjon',
      onConfirm: () => doSaveMeta(true),
      onClose:   () => doSaveMeta(false),
    });
  };

  // ── Status handlers ───────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') { setConvertMembers(currentUser ? [currentUser.id] : []); setShowConvertModal(true); return; }
    try { await updateQuoteStatus(id, newStatus); }
    catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try { const proj = await convertQuoteToProject(id, convertMembers); setShowConvertModal(false); router.push(`/projektek/${proj.id}`); }
    catch (err) { setAlertModal({ message: err.message }); }
    finally { setIsConverting(false); }
  };

  const handleDeleteQuote = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${quote.title}" ajánlatot?`,
      onConfirm: async () => {
        try { await deleteQuote(id); router.push('/ajanlatok'); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  // ── Section handlers ──────────────────────────────────────────────────────
  const handleAddSection = async (fields) => {
    try {
      await createQuoteSection(id, {
        name: fields.name, description: fields.description || null,
        size_m2: fields.size_m2 ?? null, height_m: fields.height_m ?? null,
        perimeter_m: fields.perimeter_m ?? null, window_count: fields.window_count || 0,
        door_count: fields.door_count || 0,
        survey_entry_id: fields._surveyEntryId || null,
        start_date: fields.start_date || null, end_date: fields.end_date || null,
      });
      setShowAddSection(false);
    } catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleDeleteSection = (section) => {
    const entryCount = entries.filter(e => e.section_id === section.id).length;
    setConfirmModal({
      message: `Biztosan törölni kívánja „${section.name}" szekciót?${entryCount ? ` ${entryCount} tétel is törlődik.` : ''}`,
      onConfirm: async () => {
        try { await deleteQuoteSection(id, section.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  // ── Entry modal ───────────────────────────────────────────────────────────
  const openEntryModal = (sectionId, editEntryId = null) => {
    setActiveSectionId(sectionId);
    setPendingEntries([]);
    if (editEntryId) {
      const entry = entries.find(e => e.id === editEntryId);
      if (entry) {
        const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
        setEntryForm({ entry_type: entry.entry_type, work_description: entry.work_description, quantity: entry.quantity != null ? String(entry.quantity) : '', unit: entry.unit || 'db', unit_price: entry.unit_price != null ? String(entry.unit_price) : '', flat_amount: !useQty ? String(entry.amount_huf) : '', notes: entry.notes || '', user_id: entry.user_id || currentUser.id });
        setEditingEntryId(editEntryId);
      }
    } else {
      setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: currentUser.id });
      setEditingEntryId(null);
    }
    setEntryError('');
    setShowEntryModal(true);
  };

  const buildEntry = () => {
    const useQty = entryForm.entry_type === 'material' || entryForm.entry_type === 'labour';
    return {
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
    if (!entryForm.work_description.trim()) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    setPendingEntries(prev => [...prev, { ...buildEntry(), _tmpKey: Date.now() + Math.random() }]);
    setEntryForm({ ...EMPTY_ENTRY_FORM, user_id: entryForm.user_id, entry_type: entryForm.entry_type });
    setEntryError('');
  };

  const doSaveEntry = async (revert) => {
    const hasCurrent = entryForm.work_description.trim();
    setSavingEntry(true);
    try {
      if (editingEntryId) {
        await updateQuoteEntry(editingEntryId, { ...buildEntry(), section_id: activeSectionId });
      } else {
        const allEntries = hasCurrent ? [...pendingEntries, buildEntry()] : pendingEntries;
        for (const e of allEntries) {
          await createQuoteEntry({ quoteId: id, userId: e.user_id, workDescription: e.work_description, amountHuf: e.amount_huf, notes: e.notes, entryType: e.entry_type, quantity: e.quantity, unit: e.unit, unitPrice: e.unit_price, sectionId: activeSectionId });
        }
      }
      if (revert) await updateQuoteStatus(id, 'draft');
      setPendingEntries([]);
      setShowEntryModal(false);
    } catch (err) {
      setEntryError(err.message || 'Hiba a mentésnél');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleSaveEntry = async () => {
    setEntryError('');
    const hasCurrent = entryForm.work_description.trim();
    if (!hasCurrent && pendingEntries.length === 0) { setEntryError('A megnevezés megadása kötelező!'); return; }
    if (hasCurrent && previewAmount <= 0) { setEntryError('Az összeg nem lehet nulla!'); return; }
    if (!quote || quote.status === 'draft') { doSaveEntry(false); return; }
    setConfirmModal({
      message: `Az ajánlat jelenlegi státusza: „${STATUS_LABELS_HU[quote.status] || quote.status}". Visszaállítja „Tervezet" státuszra?`,
      confirmLabel: 'Igen, visszaállítás',
      cancelLabel: 'Nem, maradjon',
      onConfirm: () => doSaveEntry(true),
      onClose:   () => doSaveEntry(false),
    });
  };

  const handleDeleteEntry = (entry) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.work_description}" tételt?`,
      onConfirm: async () => {
        try { await deleteQuoteEntry(entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const renderSectionCard = (section) => {
    const sectionEntries = section ? entries.filter(e => e.section_id === section.id) : entries.filter(e => !e.section_id);
    const sectionTotal   = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    const surveyEntry    = section?.survey_entry_id && quote.survey_id
      ? (surveyEntriesBySurvey[quote.survey_id] || []).find(e => e.id === section.survey_entry_id)
      : null;

    // Named section — felmeres-style SectionCard
    if (section) return (
      <SectionCard
        key={section.id}
        section={section}
        surveyEntry={surveyEntry}
        surveyId={quote.survey_id}
        quoteId={id}
        canEdit={canEdit}
        onDelete={handleDeleteSection}
        onAddEntry={(sId) => openEntryModal(sId)}
        onEditEntry={(sId, eId) => openEntryModal(sId, eId)}
        onDeleteEntry={handleDeleteEntry}
        sectionEntries={sortEntries(sectionEntries)}
        quote={quote}
      />
    );

    // General (unsectioned) entries — simple header card
    return (
      <div key="_general" className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: 'var(--bg-subtle)', borderBottom: sectionEntries.length > 0 ? '1px solid var(--border-subtle)' : 'none', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MoreHorizontal size={14} />Általános tételek</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {sectionTotal > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{formatHUF(sectionTotal)}</span>}
            {canEdit && <button type="button" onClick={() => openEntryModal(null)} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.45rem' }} title="Tétel hozzáadása"><Plus size={12} /></button>}
          </div>
        </div>
        {sectionEntries.length === 0 ? (
          <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortEntries(sectionEntries).map((entry, idx) => renderEntryRow(entry, idx, null))}
          </div>
        )}
      </div>
    );
  };

  const renderEntryRow = (entry, idx, sectionId) => {
    const Icon = TYPE_ICONS[entry.entry_type] || MoreHorizontal;
    const tc   = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
    const contributor = users.find(u => u.id === entry.user_id);
    const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
    return (
      <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.65rem 1rem', borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
        <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={14} color={tc.color} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.15rem', fontSize: '0.9rem' }}>{entry.work_description}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_LABELS[entry.entry_type]}</span>
            {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit || 'db'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>}
            {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} />{contributor.display_name}</span>}
            {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(entry.amount_huf)}</span>
          {canEdit && (
            <>
              <button type="button" onClick={() => openEntryModal(sectionId, entry.id)} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><Edit3 size={11} /></button>
              <button type="button" onClick={() => handleDeleteEntry(entry)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
            </>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/ajanlatok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlatokhoz
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{metaTitle || quote.title}</h1>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {QUOTE_STATUSES.find(s => s.id === quote.status)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Link href={`/ajanlatok/${id}/nyomtatas`} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Printer size={14} /> Előnézet / PDF
            </Link>
            {canModify && (
              <>
                {canEdit && (
                  <button type="button" onClick={handleSaveMeta} disabled={!isMetaDirty || savingMeta} className="btn btn-primary btn-sm">
                    {savingMeta ? <><Loader2 size={13} className="animate-spin" />Mentés</> : <><Check size={13} />Mentés</>}
                  </button>
                )}
                <button type="button" onClick={handleDeleteQuote} className="btn btn-danger btn-sm">
                  <Trash2 size={14} /> Törlés
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status actions */}
      {canModify && !isLocked && (
        <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {/* Current status badge */}
            <span style={{ ...sc, fontSize: '0.78rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)', border: `1px solid`, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              {quote.status === 'draft' && <><Edit3 size={12} /> Tervezet</>}
              {quote.status === 'sent'  && <><Send size={12} /> Kiküldve</>}
            </span>

            <span style={{ color: 'var(--border-subtle)', fontSize: '1rem', marginLeft: '0.25rem' }}>→</span>

            {/* Primary next action */}
            {quote.status === 'draft' && (
              <button type="button" onClick={openSendConfirm} className="btn btn-primary btn-sm" title={!client?.email ? 'Az ügyfélnek nincs email címe' : ''}>
                <Send size={14} /> Küldés emailben
              </button>
            )}

            {/* Resend for sent status */}
            {quote.status === 'sent' && (
              <button type="button" onClick={openSendConfirm} className="btn btn-secondary btn-sm" title={!client?.email ? 'Az ügyfélnek nincs email címe' : ''}>
                <Send size={14} /> Újraküldés
              </button>
            )}

            {/* Accept — primary on sent, secondary on draft */}
            {(quote.status === 'draft' || quote.status === 'sent') && (
              <button
                type="button"
                onClick={() => handleStatusChange('accepted')}
                className={quote.status === 'sent' ? 'btn btn-sm' : 'btn btn-secondary btn-sm'}
                style={quote.status === 'sent' ? { background: 'var(--success)', color: '#fff', border: 'none' } : {}}
              >
                <CheckCircle2 size={14} /> Elfogadva → Projektté
              </button>
            )}

            {/* Reject — always subtle */}
            {(quote.status === 'draft' || quote.status === 'sent') && (
              <button
                type="button"
                onClick={() => handleStatusChange('rejected')}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
              >
                <XCircle size={14} /> Elutasítva
              </button>
            )}
          </div>
        </div>
      )}

      {/* Client portal link */}
      {quote.status !== 'draft' && client && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flexWrap: 'wrap' }}>
          <ExternalLink size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>Az ajánlat látható az ügyfél portálon</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { const url = `${window.location.origin}/clients/${client.id}`; navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                {copied ? <><CheckCircle2 size={13} /> Másolva!</> : <><Copy size={13} /> Link másolása</>}
              </button>
              <Link href={`/clients/${client.id}`} target="_blank" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}><ExternalLink size={13} /> Megnyitás</Link>
            </div>
          </div>
        </div>
      )}

      {/* Meta card — always editable when canEdit */}
      <div className="card mb-4" style={{ padding: '1.1rem 1.25rem' }}>
        {canEdit ? (
          <>
            <div className="form-group">
              <label className="form-label">Ajánlat neve *</label>
              <input type="text" className="form-control" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="pl. Fürdőszoba felújítás" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Helyszín</label>
                <input type="text" className="form-control" value={metaLocation} onChange={e => setMetaLocation(e.target.value)} placeholder="pl. Budapest, Fő u. 12." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Munka típusa</label>
                <input type="text" className="form-control" value={metaWorkType} onChange={e => setMetaWorkType(e.target.value)} placeholder="pl. Teljes felújítás" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Leírás</label>
              <textarea rows={2} className="form-control" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Részletes munkaleírás…" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tervezett kezdés</label>
                <input type="date" className="form-control" value={metaStartDate} onChange={e => { const v = e.target.value; setMetaStartDate(v); if (v && (!metaEndDate || metaEndDate <= v)) setMetaEndDate(nextDay(v)); }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tervezett befejezés</label>
                <input type="date" className="form-control" min={metaStartDate ? nextDay(metaStartDate) : undefined} value={metaEndDate} onChange={e => setMetaEndDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">ÁFA kulcs</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {['0', '5', '18', '27'].map(v => (
                  <button key={v} type="button" onClick={() => setMetaTaxPercent(v)}
                    style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: metaTaxPercent === v ? 'var(--accent)' : 'var(--bg-subtle)', color: metaTaxPercent === v ? '#fff' : 'var(--text-secondary)', border: `1px solid ${metaTaxPercent === v ? 'var(--accent)' : 'var(--border-subtle)'}` }}>{v}%</button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ügyfél</label>
              <ClientSelect value={metaClientId} onChange={e => setMetaClientId(e.target.value)} clients={clients} />
            </div>
            {creator && <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Létrehozta: <strong>{creator.display_name}</strong>{quote.created_at && ` · ${formatDate(quote.created_at)}`}</div>}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '0.6rem 0.85rem', alignItems: 'center' }}>
            {client && (<><User size={15} color="var(--accent)" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link href={`/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>{client.name}</Link>
                {client.discount_percent > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>{client.discount_percent}% kedv.</span>}
              </div>
            </>)}
            {quote.location && (<><MapPin size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.location}</span></>)}
            {quote.work_type && (<><Wrench size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.work_type}</span></>)}
            <><Calendar size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.start_date ? formatDate(quote.start_date) : '—'} – {quote.end_date ? formatDate(quote.end_date) : '—'}</span></>
            <><Coins size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ÁFA: <strong style={{ color: 'var(--text-primary)' }}>{taxRate}%</strong></span></>
            <><User size={15} color="var(--text-muted)" /><span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Létrehozta: <strong style={{ color: 'var(--text-primary)' }}>{creator?.display_name || '—'}</strong>{quote.created_at && <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatDate(quote.created_at)}</span>}</span></>
          </div>
        )}
        {(linkedSurvey || linkedProject) && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.85rem', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {linkedSurvey && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Ruler size={15} color="var(--accent)" /><Link href={`/felmeres/${linkedSurvey.id}`} style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.875rem' }}>{linkedSurvey.title}</Link>{linkedSurvey.date && <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatDate(linkedSurvey.date)}</span>}</div>}
            {linkedProject && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FolderKanban size={15} color="var(--success)" /><Link href={`/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.875rem' }}>{linkedProject.name}</Link></div>}
          </div>
        )}
      </div>

      {/* Sections + totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Tételek</h2>
        {canEdit && (
          <button type="button" onClick={() => { setShowAddSection(true); }} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Helyiség
          </button>
        )}
      </div>

      {/* Totals bar */}
      {entries.length > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nettó: </span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatHUF(netTotal)}</span></div>
          {taxRate > 0 && <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ÁFA ({taxRate}%): </span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatHUF(taxAmount)}</span></div>}
          <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bruttó: </span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Coins size={14} color="var(--accent)" />{formatHUF(grossTotal)}</span></div>
        </div>
      )}

      {canEdit && showAddSection && (
        <SectionAddForm surveyId={quote.survey_id} onSave={handleAddSection} onCancel={() => setShowAddSection(false)} />
      )}

      {sections.length === 0 && !showAddSection && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <Home size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ marginBottom: canEdit ? '1rem' : 0 }}>Még nincsenek helyiségek.</p>
          {canEdit && (
            <button type="button" onClick={() => { setShowAddSection(true); }} className="btn btn-primary btn-sm">
              <Plus size={14} /> Helyiség hozzáadása
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {sections.map(s => renderSectionCard(s))}
        {renderSectionCard(null)}
      </div>

      {/* Shared members */}
      {canModify && (quote.shared_with || []).length > 0 && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Meghívott tagok</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {users.filter(u => (quote.shared_with || []).includes(u.id)).map(u => (
              <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
                <User size={12} />{u.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Entry modal */}
      <Modal isOpen={showEntryModal} onClose={() => { setShowEntryModal(false); setPendingEntries([]); }} title={editingEntryId ? 'Tétel szerkesztése' : 'Tételek hozzáadása'}>
        {pendingEntries.length > 0 && (
          <div style={{ marginBottom: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--success-bg)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Hozzáadásra kész: {pendingEntries.length} db</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(pendingEntries.reduce((s, e) => s + e.amount_huf, 0))}</span>
            </div>
            {pendingEntries.map((e, i) => (
              <div key={e._tmpKey || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: '#fff', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.work_description}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{formatHUF(e.amount_huf)}</span>
                <button type="button" onClick={() => setPendingEntries(p => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        {(() => {
          const section = sections.find(s => s.id === activeSectionId);
          if (!section && activeSectionId) return null;
          return section ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
              <Home size={13} />{section.name}{section.size_m2 ? ` · ${section.size_m2} m²` : ''}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <MoreHorizontal size={13} /> Általános tételek
            </div>
          );
        })()}

        {entryError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{entryError}</span></div>}

        <div className="entry-type-grid">
          {QUOTE_ENTRY_TYPES.map(t => { const Icon = TYPE_ICONS[t.id]; const tc = TYPE_COLORS[t.id]; const active = entryForm.entry_type === t.id; return (
            <button key={t.id} type="button" onClick={() => setEntryForm(f => ({ ...f, entry_type: t.id, quantity: '', unit: 'db', unit_price: '', flat_amount: '' }))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.6rem 0.3rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? tc.color : 'var(--border-subtle)'}`, background: active ? tc.bg : '#fff', cursor: 'pointer' }}>
              <Icon size={18} color={active ? tc.color : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? tc.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
            </button>
          ); })}
        </div>

        <div className="form-group">
          <label className="form-label">Megnevezés *</label>
          <input type="text" className="form-control" autoFocus placeholder={entryForm.entry_type === 'material' ? 'pl. Gipszkarton lap 12,5mm' : entryForm.entry_type === 'labour' ? 'pl. Gipszkarton szerelés' : 'pl. Állványzat bérlés'} value={entryForm.work_description} onChange={e => setEntryForm(f => ({ ...f, work_description: e.target.value }))} />
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
          <label className="form-label">Kivitelező</label>
          <select className="form-control" value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))}>
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
            {!editingEntryId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddAnother}>+ Következő tétel</button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry ? <><Loader2 size={13} className="animate-spin" />Mentés…</> : editingEntryId ? 'Módosítás' : pendingEntries.length > 0 ? `Mentés (${pendingEntries.length + (entryForm.work_description.trim() ? 1 : 0)} db)` : 'Tétel hozzáadása'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Convert to project modal */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Projektté alakítás">
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Válassza ki a projekt tagjait. A cím és dátumok az ajánlatból kerülnek át.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {[...(currentUser && !users.find(u => u.id === currentUser.id) ? [{ id: currentUser.id, display_name: `${currentUser.display_name} (Ön)` }] : []), ...users].map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: convertMembers.includes(u.id) ? 'var(--accent-light)' : '#fff' }}>
              <input type="checkbox" checked={convertMembers.includes(u.id)} onChange={e => setConvertMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.display_name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConvertModal(false)}>Mégse</button>
          <button type="button" onClick={handleConvert} disabled={isConverting} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
            {isConverting ? <><Loader2 size={14} className="animate-spin" />Átalakítás...</> : <><FolderKanban size={14} />Projekt létrehozása</>}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => { confirmModal?.onClose?.(); setConfirmModal(null); }}
        onConfirm={() => confirmModal?.onConfirm?.()}
        title="Megerősítés"
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
        cancelLabel={confirmModal?.cancelLabel}
      />
      {/* Email sending progress — blocking modal */}
      {sendProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: '2rem 2.5rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 800 }}>
              {sendProgress.error ? 'Hiba történt' : sendProgress.done ? 'Elküldve!' : 'Ajánlat küldése…'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {SEND_STEPS.map((s, i) => {
                const isActive  = !sendProgress.done && !sendProgress.error && sendProgress.step === i;
                const isDone    = sendProgress.done || sendProgress.step > i;
                const isPending = !isDone && !isActive;
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--bg-subtle)',
                      border: isPending ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      {isDone  && <CheckCircle2 size={14} color="#fff" />}
                      {isActive && <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500, color: isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {sendProgress.error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.825rem', marginBottom: '1rem' }}>
                {sendProgress.error}
              </div>
            )}

            {(sendProgress.done || sendProgress.error) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setSendProgress(null)}>
                  Bezárás
                </button>
              </div>
            )}

            {sendProgress.done && sendProgress.sentTo && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                Elküldve: <strong>{sendProgress.sentTo}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Email send confirmation */}
      {showSendConfirm && (
        <Modal isOpen={true} onClose={() => setShowSendConfirm(false)} title="Ajánlat kiküldése emailben">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
            Biztosan elküldi az ajánlatot{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{client?.name}</strong>{' '}
            email-címére?
          </p>
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent)' }}>
            {client?.email}
          </div>

          {termsPdfName && (
            <button
              type="button"
              onClick={() => setAttachTerms(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: attachTerms ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${attachTerms ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left', marginBottom: '1.25rem' }}
            >
              <div style={{ width: 36, height: 20, borderRadius: 10, background: attachTerms ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: attachTerms ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: attachTerms ? 'var(--success-text)' : 'var(--text-primary)' }}>
                  {attachTerms ? 'ÁSZF csatolva' : 'ÁSZF nem csatolva'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{termsPdfName}</div>
              </div>
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSendConfirm(false)}>Mégse</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSendEmail}>
              <Send size={14} /> Küldés
            </button>
          </div>
        </Modal>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant} />
    </div>
  );
}
