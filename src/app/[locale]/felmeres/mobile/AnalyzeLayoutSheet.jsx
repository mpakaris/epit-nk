'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

const SURVEY_BG  = '#0A7F72';
const SURVEY_INK = '#0A5C53';

function f(n) {
  if (n == null) return null;
  return String(Number(n).toFixed(1)).replace('.', ',');
}

// ── Room card in review step ──────────────────────────────────────────────────

const DIM_INPUT = {
  width: '100%', border: 0, borderRadius: 10, background: '#F7F5EF',
  padding: '6px 8px', fontSize: 14, fontWeight: 600, color: '#0E1116',
  outline: 'none', textAlign: 'center', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function DimCell({ label, value, field, onUpdate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#5A5F68', textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        inputMode="decimal"
        value={value ?? ''}
        onChange={e => onUpdate(field, e.target.value === '' ? null : Number(e.target.value))}
        style={DIM_INPUT}
      />
    </div>
  );
}

function CountCell({ label, value, field, onUpdate }) {
  const n = Number(value) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#5A5F68', textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 10, background: '#F7F5EF', overflow: 'hidden' }}>
        <button type="button" onClick={() => onUpdate(field, Math.max(0, n - 1))} style={{ width: 30, height: 32, border: 0, background: 'transparent', fontSize: 18, fontWeight: 700, color: '#0E1116', cursor: 'pointer', flexShrink: 0 }}>−</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{n}</span>
        <button type="button" onClick={() => onUpdate(field, n + 1)} style={{ width: 30, height: 32, border: 0, background: 'transparent', fontSize: 18, fontWeight: 700, color: '#0E1116', cursor: 'pointer', flexShrink: 0 }}>+</button>
      </div>
    </div>
  );
}

function RoomCard({ room, existingNames, onToggle, onRename, onUpdate }) {
  const alreadyExists = existingNames.has(room.name.trim().toLowerCase());

  const w = room.width_m != null ? Number(room.width_m) : null;
  const l = room.length_m != null ? Number(room.length_m) : null;
  const computedM2 = w > 0 && l > 0 ? (w * l) : null;

  return (
    <div style={{
      borderRadius: 20,
      border: `2px solid ${room.selected ? SURVEY_BG : '#E0DED7'}`,
      background: room.selected ? 'rgba(10,127,114,0.06)' : '#fff',
      overflow: 'hidden',
      marginBottom: 8,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={room.selected}
          style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 13, border: `2px solid ${room.selected ? SURVEY_BG : '#B0ADA6'}`, background: room.selected ? SURVEY_BG : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {room.selected && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10"/>
            </svg>
          )}
        </button>

        <input
          type="text"
          value={room.name}
          onChange={e => onRename(e.target.value)}
          style={{ flex: 1, border: 0, background: 'transparent', fontSize: 17, fontWeight: 700, color: '#0E1116', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}
        />

        {alreadyExists && (
          <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 10, background: '#F1F1F3', color: '#5A5F68', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
            már létezik
          </span>
        )}
      </div>

      {/* Editable dim cells */}
      <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6 }}>
        <DimCell   label="Sz (m)"  value={room.width_m}      field="width_m"      onUpdate={onUpdate} />
        <DimCell   label="H (m)"   value={room.length_m}     field="length_m"     onUpdate={onUpdate} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#5A5F68', textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase' }}>m²</span>
          <div style={{ height: 32, borderRadius: 10, background: '#EDF7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: computedM2 ? SURVEY_INK : '#B0ADA6' }}>
            {computedM2 ? f(computedM2) : (room.size_m2 ? f(room.size_m2) : '—')}
          </div>
        </div>
        <CountCell label="Ajtó"    value={room.door_count}   field="door_count"   onUpdate={onUpdate} />
        <CountCell label="Ablak"   value={room.window_count} field="window_count" onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyzeLayoutSheet({ surveyId, existingEntries = [], onCreated, onClose, createSurveyEntry }) {
  const tS = useTranslations('surveyDetail');
  const tM = useTranslations('mobilePods');
  const tc = useTranslations('common');

  const [step,     setStep]     = useState('pick');
  const [imageUrl, setImageUrl] = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [rooms,    setRooms]    = useState([]);
  const [error,    setError]    = useState('');
  const [creating, setCreating] = useState(false);

  const fileRef = useRef(null);
  const previewObjRef = useRef(null);

  const existingNames = new Set(existingEntries.map(e => e.name.trim().toLowerCase()));

  // Auto-open file picker immediately
  useEffect(() => {
    const timer = setTimeout(() => fileRef.current?.click(), 60);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup blob URL
  useEffect(() => {
    return () => { if (previewObjRef.current) URL.revokeObjectURL(previewObjRef.current); };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }
    e.target.value = '';

    const objUrl = URL.createObjectURL(file);
    previewObjRef.current = objUrl;
    setPreview(objUrl);
    setStep('uploading');

    try {
      const fd = new FormData();
      fd.append('survey_id', surveyId);
      fd.append('media_type', 'layout');
      fd.append('files', file);

      const res = await fetch('/api/surveys/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Feltöltési hiba');
      }
      const data = await res.json();
      const url  = data.media?.[0]?.drive_view_url;
      if (!url) throw new Error('URL nem érkezett vissza a szervertől');
      setImageUrl(url);
      setStep('confirm');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const handleAnalyze = async () => {
    setStep('scanning');
    setError('');
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analyze-layout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tS('layoutAnalysisError'));
      if (!data.rooms?.length) throw new Error(tS('layoutAnalysisNoRooms'));
      setRooms(data.rooms.map((r, i) => ({
        ...r,
        _id:      i,
        selected: !existingNames.has(r.name.trim().toLowerCase()),
      })));
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  const handleCreate = async () => {
    const toCreate = rooms.filter(r => r.selected && r.name.trim());
    if (!toCreate.length || creating) return;
    setCreating(true);
    try {
      for (const r of toCreate) {
        const w = r.width_m  != null ? Number(r.width_m)  : null;
        const l = r.length_m != null ? Number(r.length_m) : null;
        const computedM2 = w > 0 && l > 0 ? w * l : null;
        await createSurveyEntry(surveyId, {
          name:         r.name.trim(),
          width_m:      w > 0 ? w : null,
          length_m:     l > 0 ? l : null,
          size_m2:      computedM2 ?? (r.size_m2 ? Number(r.size_m2) : null),
          door_count:   Number(r.door_count)   || 0,
          window_count: Number(r.window_count) || 0,
        });
      }
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || tS('layoutAnalysisCreateError'));
      setCreating(false);
    }
  };

  const updateRoom = (id, field, value) =>
    setRooms(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));

  const selectedCount = rooms.filter(r => r.selected).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input — auto-triggered on mount */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── PICK: file picker opening, nothing shown yet ── */}
      {step === 'pick' && null}

      {/* ── UPLOADING ── */}
      {step === 'uploading' && (
        <>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          {preview && (
            <div style={{ width: '100%', height: 160, borderRadius: 20, background: `url(${preview}) center/cover`, flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SURVEY_BG} strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="analyze-spin" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/>
            </svg>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>
              {tM('layoutUploading')}
            </span>
          </div>
        </>
      )}

      {/* ── CONFIRM ── */}
      {step === 'confirm' && (
        <>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          {(preview || imageUrl) && (
            <div style={{ width: '100%', height: 160, borderRadius: 20, background: `url(${preview || imageUrl}) center/cover`, flexShrink: 0 }} />
          )}
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
            {tS('analysisConfirmTitle')}
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: '#4A4F57' }}>
            {tS('analysisConfirmMsg')}
          </span>
          <button
            type="button"
            onClick={handleAnalyze}
            style={{ height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>
            {tS('analysisConfirmYes')}
          </button>
          <button type="button" onClick={onClose} style={{ height: 54, border: 0, borderRadius: 27, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {tS('analysisConfirmSkip')}
          </button>
        </>
      )}

      {/* ── SCANNING ── */}
      {step === 'scanning' && (
        <>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          {/* Image with animated scan line */}
          <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 20, overflow: 'hidden', background: '#EFEDE6', flexShrink: 0 }}>
            {(preview || imageUrl) && (
              <img
                src={preview || imageUrl}
                alt=""
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
              />
            )}
            <div className="analyze-scan" style={{ position: 'absolute', left: 0, right: 0, height: 3, background: `linear-gradient(to right, transparent, ${SURVEY_BG}, transparent)`, animation: 'scanline 2s ease-in-out infinite', top: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(10,127,114,0.1), rgba(10,127,114,0.05))` }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>
              {tS('layoutAnalysisAnalyzing')}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#5A5F68' }}>
              {tS('layoutAnalysisAnalyzingSubtitle')}
            </span>
          </div>
        </>
      )}

      {/* ── REVIEW ── */}
      {step === 'review' && (
        <>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
              {rooms.length} szoba azonosítva
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', flexShrink: 0 }}>
              {selectedCount} kijelölve
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#5A5F68', marginTop: -4 }}>
            Módosítsd ha szükséges, majd add hozzá a kijelölt szobákat.
          </span>

          {/* Room cards */}
          <div>
            {rooms.map(room => (
              <RoomCard
                key={room._id}
                room={room}
                existingNames={existingNames}
                onToggle={() => updateRoom(room._id, 'selected', !room.selected)}
                onRename={val => updateRoom(room._id, 'name', val)}
                onUpdate={(field, val) => updateRoom(room._id, field, val)}
              />
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 16, background: '#FDECEC', color: '#B71C1C', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !selectedCount}
            style={{ height: 60, border: 0, borderRadius: 30, background: creating || !selectedCount ? '#B0ADA6' : SURVEY_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: creating || !selectedCount ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 }}
          >
            {creating ? (
              <>{tS('layoutAnalysisCreatingBtn')}</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
                {tS('layoutAnalysisCreateCount', { count: selectedCount })}
              </>
            )}
          </button>
          <button type="button" onClick={onClose} disabled={creating} style={{ height: 50, border: 0, borderRadius: 25, background: '#EFEDE6', color: '#0E1116', fontSize: 15, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            {tc('cancel')}
          </button>
        </>
      )}

      {/* ── ERROR ── */}
      {step === 'error' && (
        <>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ padding: '16px', borderRadius: 20, background: '#FDECEC', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B71C1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#B71C1C' }}>{error}</span>
            </div>
          </div>
          {imageUrl && (
            <button type="button" onClick={handleAnalyze} style={{ height: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {tM('itemsRetry')}
            </button>
          )}
          <button type="button" onClick={onClose} style={{ height: 50, border: 0, borderRadius: 25, background: '#EFEDE6', color: '#0E1116', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {tc('close')}
          </button>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanline { 0% { top: 0% } 50% { top: calc(100% - 3px) } 100% { top: 0% } }
        @media (prefers-reduced-motion: reduce) {
          .analyze-spin { animation: none !important; }
          .analyze-scan { animation: none !important; opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
