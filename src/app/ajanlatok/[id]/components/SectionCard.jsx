'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate } from '@/lib/constants';
import SectionMediaGrid from '@/components/SectionMediaGrid';
import {
  Edit3, Loader2, Check, Trash2, Plus, User, Ruler, Calendar,
  ChevronDown, ChevronUp, X, MoreHorizontal, Mic, Camera,
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import BottomSheet from '@/components/mobile/BottomSheet';
import AreaSummary, { WINDOW_M2, DOOR_M2, PILL_STYLE } from './AreaSummary';
import SectionPhotoZone from './SectionPhotoZone';
import { TYPE_ICONS, TYPE_COLORS, QUOTE_ENTRY_LABELS } from './constants';

export default function SectionCard({ section, surveyEntry, surveyId, quoteId, canEdit, isQuoteOwner, currentUserId, onDelete, onAddEntry, onEditEntry, onDeleteEntry, sectionEntries, quote, onEntriesGenerated, sectionMediaItems = [] }) {
  const { updateQuoteSection, activeCollectiveId, createQuoteEntry, deleteQuoteEntry } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const canEditSection   = canEdit && (isQuoteOwner || section.created_by === currentUserId);
  const canEditEntry     = (entry) => canEdit && (isQuoteOwner || entry.user_id === currentUserId);
  const [isEditing, setIsEditing] = useState(false);
  const [ctxOpen, setCtxOpen]           = useState(false);
  const [triggerAudio, setTriggerAudio] = useState(0);
  const [triggerPhoto, setTriggerPhoto] = useState(0);
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioError, setAudioError]           = useState('');
  const [audioAdded, setAudioAdded]           = useState(0);
  const [selectedEntries, setSelectedEntries] = useState(new Set());

  const handleAudioTranscript = async (transcript) => {
    setAudioError('');
    setAudioGenerating(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/sections/${section.id}/generate-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generálás sikertelen');
      const entries = data.entries || [];
      let saved = 0;
      for (const e of entries) {
        const amount = e.unit_price != null && e.quantity != null
          ? Math.round(e.quantity * e.unit_price)
          : (e.flat_amount ?? 0);
        if (amount <= 0) continue;
        await createQuoteEntry({
          quoteId,
          workDescription: e.work_description,
          amountHuf: amount,
          entryType: e.entry_type,
          quantity:  e.quantity,
          unit:      e.unit,
          unitPrice: e.unit_price,
          notes:     e.notes || '',
          sectionId: section.id,
        });
        saved++;
      }
      setCollapsed(false);
      setAudioAdded(saved);
      setTimeout(() => setAudioAdded(0), 3000);
      onEntriesGenerated?.();
    } catch (e) {
      setAudioError(e.message || 'Hiba a generáláskor');
    } finally {
      setAudioGenerating(false);
    }
  };

  useEffect(() => { if (collapsed) setSelectedEntries(new Set()); }, [collapsed]);

  const toggleEntry = (id) => setSelectedEntries(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleBatchDelete = async () => {
    const ids = [...selectedEntries];
    for (const id of ids) {
      try { await deleteQuoteEntry(id); } catch {}
    }
    setSelectedEntries(new Set());
  };

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
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const valuesRef = useRef({});

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

  // Keep latest form values accessible from blur handler without stale closure
  valuesRef.current = { name, description, widthM, lengthM, heightM, windowCount, doorCount, startDate, endDate };

  const saveOnly = async () => {
    const v = valuesRef.current;
    if (!v.name.trim()) return;
    setSaving(true);
    try {
      await updateQuoteSection(quoteId, section.id, {
        name: v.name.trim(), description: v.description.trim()||null,
        width_m: parseFloat(v.widthM)||null, length_m: parseFloat(v.lengthM)||null,
        height_m: v.heightM ? Number(v.heightM) : null,
        window_count: v.windowCount ? parseInt(v.windowCount,10) : 0,
        door_count:   v.doorCount   ? parseInt(v.doorCount,  10) : 0,
        start_date: v.startDate||null, end_date: v.endDate||null,
        survey_entry_id: section.survey_entry_id||null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch { } finally { setSaving(false); }
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) return (
    <div className="card compact-form" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        disabled={saving}
        aria-label="Bezár"
        style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}
      >
        <X size={16} />
      </button>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingRight: '1.5rem' }}>Szerkesztés: {section.name}</div>
      <div className="form-group">
        <label className="form-label">Helyiség neve *</label>
        <input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={saveOnly} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: computedArea != null ? '0.25rem' : '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Szél. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={widthM} onChange={e => setWidthM(e.target.value)} onBlur={saveOnly} placeholder="3.5" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Hossz. (m)</label><input type="number" min="0" step="0.1" className="form-control" value={lengthM} onChange={e => setLengthM(e.target.value)} onBlur={saveOnly} placeholder="4.2" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Magass. (m)</label><input type="number" min="0" step="0.05" className="form-control" value={heightM} onChange={e => setHeightM(e.target.value)} onBlur={saveOnly} placeholder="2.6" /></div>
      </div>
      {computedArea != null && <div style={{ marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>Alapterület: {computedArea.toFixed(2).replace('.', ',')} m²</div>}
      {existingSize != null && computedArea == null && <div style={{ marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jelenlegi: {Number(existingSize).toFixed(1).replace('.', ',')} m² — add meg a méreteket a frissítéshez</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ablak (db)</label><input type="number" min="0" step="1" className="form-control" value={windowCount} onChange={e => setWindowCount(e.target.value)} onBlur={saveOnly} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Ajtó (db)</label><input type="number" min="0" step="1" className="form-control" value={doorCount} onChange={e => setDoorCount(e.target.value)} onBlur={saveOnly} placeholder="0" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Falfel. (m²)</label><input type="number" min="0" step="0.01" className="form-control" value={wallM2} onChange={e => { setWallAuto(false); setWallM2(e.target.value); }} onBlur={saveOnly} placeholder="m²" /></div>
      </div>
      <div className="grid-2col" style={{ marginBottom: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Kezdés</label><input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={saveOnly} /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Befejezés</label><input type="date" className="form-control" min={startDate||undefined} value={endDate} onChange={e => setEndDate(e.target.value)} onBlur={saveOnly} /></div>
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Leírás</label>
        <textarea
          rows={7}
          className="form-control"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={saveOnly}
          placeholder="Elvégzendő munkák, állapot…"
          style={{ resize: 'vertical' }}
        />
      </div>
      {(saving || saveStatus === 'saved') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {saving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Loader2 size={12} className="animate-spin" />Mentés…</span>}
          {saveStatus === 'saved' && !saving && <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={12} />Mentve</span>}
        </div>
      )}
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
  const hasMedia = !!(quote?.survey_id && section.survey_entry_id) || sectionMediaItems.length > 0;

  const sectionSubtotalForHeader = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const contributors = [...new Set(sectionEntries.map(e => e.created_by_name).filter(Boolean))];

  const SUBTOTAL_PILL = { display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-pill)' };
  const SECTION_TOTAL_PILL = { ...SUBTOTAL_PILL, fontSize: '0.875rem', fontWeight: 800 };

  // Dark-header pill variants
  const PILL_DARK  = { ...PILL_STYLE, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' };
  const TOTAL_PILL_DARK = { display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-pill)' };
  const PILL_LIGHT = { fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'rgba(30,58,95,0.09)', border: '1px solid rgba(30,58,95,0.18)', color: '#1e3a5f', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };
  const TOTAL_PILL_LIGHT = { display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem', background: 'rgba(30,58,95,0.09)', border: '1px solid rgba(30,58,95,0.22)', color: '#1e3a5f', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-pill)' };

  const hasMeasurementPills = displaySize != null || displayEntry.height_m != null || displayEntry.window_count > 0 || displayEntry.door_count > 0 || section.start_date || section.end_date;

  const measurementPillsDark = hasMeasurementPills && <>
    {displaySize != null && <span style={PILL_DARK}><Ruler size={11}/>{Number(displaySize).toFixed(1).replace('.', ',')} m²</span>}
    {displayEntry.height_m     != null && <span style={PILL_DARK}>{displayEntry.height_m} m mag.</span>}
    {displayEntry.window_count  > 0    && <span style={PILL_DARK}>{displayEntry.window_count} ablak</span>}
    {displayEntry.door_count    > 0    && <span style={PILL_DARK}>{displayEntry.door_count} ajtó</span>}
    {(section.start_date || section.end_date) && <span style={PILL_DARK}><Calendar size={11}/>{section.start_date ? formatDate(section.start_date) : '?'} – {section.end_date ? formatDate(section.end_date) : '?'}</span>}
  </>;

  const headerEditButtons = canEditSection && (
    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => setIsEditing(true)} style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Edit3 size={13} /></button>
      <button type="button" onClick={() => onDelete(section)} style={{ padding: '0.3rem 0.5rem', background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.45)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={13} /></button>
    </div>
  );

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #cbd5e1' }}>

      {/* ── Dark navy header ── */}
      <div style={{ background: '#1e3a5f', padding: '0.85rem 1rem', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>

        {/* DESKTOP (hidden on mobile) */}
        <div className="hide-mobile">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{section.name}</span>
                {measurementPillsDark}
              </div>
            </div>
            {headerEditButtons}
          </div>
        </div>

        {/* MOBILE (hidden on desktop) */}
        <div className="show-mobile">
          {/* Title + options button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
            <span style={{ flex: 1, fontWeight: 800, fontSize: '1.05rem', color: '#fff', lineHeight: 1.35 }} onClick={() => setCollapsed(c => !c)}>
              {section.name}
            </span>
            {(canEditSection || canEdit) && (
              <button type="button" onClick={() => setCtxOpen(true)} aria-label="Műveletek"
                style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                <MoreHorizontal size={16} />
              </button>
            )}
          </div>

          {/* Measurements + creator (collective only) — only when data exists */}
          {(hasMeasurementPills || (activeCollectiveId && (section.created_by_name || contributors[0]))) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }} onClick={() => setCollapsed(c => !c)}>
              {measurementPillsDark}
              {activeCollectiveId && (section.created_by_name || contributors[0]) && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <User size={11} />{section.created_by_name || contributors[0]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Light blue sub-header ── */}
      <div
        style={{ background: '#eef2ff', borderBottom: collapsed ? 'none' : '1px solid #dde6f5', cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}
      >
        {/* DESKTOP */}
        <div className="hide-mobile" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e3a5f' }}>{sectionEntries.length} tétel</span>
            {contributors.map(name => <span key={name} style={PILL_LIGHT}><User size={10} />{name}</span>)}
          </div>
          <span style={TOTAL_PILL_LIGHT}>{formatHUF(sectionSubtotalForHeader)}</span>
          <div style={{ color: '#4b6a91', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </div>
        </div>

        {/* MOBILE */}
        <div className="show-mobile">
          <div style={{ padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: '#1e3a5f', flexShrink: 0 }}>
                {formatHUF(sectionSubtotalForHeader)}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#4b6a91', fontWeight: 600, flexShrink: 0 }}>
                {sectionEntries.length} tétel
              </span>
            </div>
            <div style={{ color: '#4b6a91', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>
          </div>
        </div>
      </div>

      <BottomSheet
        isOpen={ctxOpen}
        onClose={() => setCtxOpen(false)}
        title={section.name}
        actions={[
          ...(canEdit ? [
            { icon: Mic,    label: 'Diktálás',        onClick: () => { setCtxOpen(false); setCollapsed(false); setTimeout(() => setTriggerAudio(n => n + 1), 80); } },
            { icon: Plus,   label: 'Tétel hozzáadása', onClick: () => { setCtxOpen(false); setCollapsed(false); setTimeout(() => onAddEntry(section.id), 80); } },
          ] : []),
          ...(canEditSection ? [
            { icon: Camera, label: 'Fotó / kamera',   onClick: () => { setCtxOpen(false); setCollapsed(false); setTimeout(() => setTriggerPhoto(n => n + 1), 80); } },
            { icon: Edit3,  label: 'Szerkesztés', dividerBefore: true, onClick: () => { setCtxOpen(false); setIsEditing(true); } },
            { icon: Trash2, label: 'Törlés',      danger: true,        onClick: () => { setCtxOpen(false); onDelete(section); } },
          ] : []),
        ]}
      />

      {/* ── Expanded body ── */}
      {!collapsed && (
        <div style={{ padding: '0.85rem 1rem 1rem' }} onClick={e => e.stopPropagation()}>

          {/* Description + author */}
          {(section.description || (activeCollectiveId && section.created_by_name)) && (
            <div style={{ marginBottom: '0.75rem' }}>
              {section.description && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</p>}
              {activeCollectiveId && section.created_by_name && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.75 }}>{section.created_by_name}</div>}
            </div>
          )}

          {hasAnyMeasurement && <AreaSummary entry={displayEntry} />}

          {/* Items */}
          {(() => {
            const TYPE_ORDER_LIST = ['material', 'labour', 'transport', 'equipment', 'other'];
            const grouped = TYPE_ORDER_LIST
              .map(type => ({ type, entries: sectionEntries.filter(e => e.entry_type === type) }))
              .filter(g => g.entries.length > 0);
            const sectionSubtotal = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);

            return (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Tételek ({sectionEntries.length})
                  </span>
                  {canEdit && (
                    <button type="button" onClick={() => onAddEntry(section.id)} className="btn btn-primary btn-sm" style={{ padding: '0.3rem 0.55rem' }}>
                      <Plus size={15} />
                    </button>
                  )}
                </div>

                {/* AudioRecorder — hidden, triggered only via BottomSheet Diktálás */}
                {canEdit && (
                  <AudioRecorder
                    size="sm"
                    hideTriggerButton
                    disabled={audioGenerating}
                    externalTrigger={triggerAudio}
                    onTranscript={handleAudioTranscript}
                    onError={msg => setAudioError(msg)}
                    hint={`Elmondhatsz általános leírást a helyiségről, vagy konkrét tételeket anyagnévvel, mennyiséggel és egységárral.\n\nPl.: „Tíz négyzetméter padlócsempe, négyezer-ötszáz forint. Csempézés munkadíj tíz négyzetméterre, háromezer forint per négyzetméter."`}
                  />
                )}

                {audioGenerating && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <Loader2 size={14} className="animate-spin" /> AI tételek generálása…
                  </div>
                )}

                {audioAdded > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Check size={13} /> {audioAdded} tétel hozzáadva
                  </div>
                )}

                {audioError && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--danger-text)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem', marginBottom: '0.5rem' }}>
                    {audioError}
                  </div>
                )}

                {canEdit && selectedEntries.size > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.35rem 0.65rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-text)' }}>{selectedEntries.size} kijelölve</span>
                    <button type="button" onClick={handleBatchDelete} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}>Törlés</button>
                    <button type="button" onClick={() => setSelectedEntries(new Set())} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem' }}><X size={11} /></button>
                  </div>
                )}

                {grouped.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {grouped.map(({ type, entries: typeEntries }) => {
                      const Icon      = TYPE_ICONS[type]  || MoreHorizontal;
                      const tc        = TYPE_COLORS[type]  || TYPE_COLORS.other;
                      const typeTotal = typeEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
                      return (
                        <div key={type} style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.65rem' }}>
                          {/* Type label */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                            <div style={{ padding: '0.15rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={10} color={tc.color} /></div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tc.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{QUOTE_ENTRY_LABELS[type]}</span>
                          </div>
                          {typeEntries.map((entry) => {
                            const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
                            const isSelected = selectedEntries.has(entry.id);
                            return (
                              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', background: isSelected ? 'var(--danger-bg)' : 'transparent', borderRadius: 'var(--radius-sm)', marginLeft: '-0.25rem', paddingLeft: '0.25rem' }}>
                                {canEditEntry(entry) && (
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleEntry(entry.id)}
                                    style={{ flexShrink: 0, width: 14, height: 14, accentColor: 'var(--danger)', cursor: 'pointer', margin: 0 }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{entry.work_description}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit||'db'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>}
                                    {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
                                    {activeCollectiveId && entry.created_by_name && <span style={{ opacity: 0.7 }}>· {entry.created_by_name}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>{formatHUF(entry.amount_huf)}</span>
                                  {canEditEntry(entry) && (
                                    <button type="button" onClick={() => onEditEntry(section.id, entry.id)} className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.35rem' }}><Edit3 size={11} /></button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatHUF(typeTotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {grouped.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Összesen:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{formatHUF(sectionSubtotal)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Media gallery — always at the bottom, only shown when photos exist */}
          {hasMedia && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              {canEditSection ? (
                <SectionPhotoZone
                  quoteId={quoteId}
                  quoteSurveyId={quote?.survey_id}
                  quoteTitle={quote?.title}
                  quoteClientId={quote?.client_id}
                  section={{ ...section, survey_entry_id: section.survey_entry_id || null }}
                  onEntryCreated={(sId, svId, eId) => updateQuoteSection(quoteId, sId, { survey_entry_id: eId }).catch(() => {})}
                  triggerUpload={triggerPhoto}
                />
              ) : (
                <SectionMediaGrid surveyId={quote.survey_id} surveyEntryId={section.survey_entry_id} isLocked={true} mediaItems={sectionMediaItems.length > 0 ? sectionMediaItems : undefined} />
              )}
            </div>
          )}

          {/* Hidden SectionPhotoZone — upload logic only, no visible UI, triggered via BottomSheet */}
          {!hasMedia && canEditSection && (
            <div style={{ display: 'none' }}>
              <SectionPhotoZone
                quoteId={quoteId}
                quoteSurveyId={quote?.survey_id}
                quoteTitle={quote?.title}
                quoteClientId={quote?.client_id}
                section={{ ...section, survey_entry_id: section.survey_entry_id || null }}
                onEntryCreated={(sId, svId, eId) => updateQuoteSection(quoteId, sId, { survey_entry_id: eId }).catch(() => {})}
                triggerUpload={triggerPhoto}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
