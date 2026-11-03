'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Camera, Loader2, X } from 'lucide-react';
import { processMediaFile } from '@/lib/mediaGate';
import { WINDOW_M2, DOOR_M2 } from './AreaSummary';

export default function SectionAddForm({ surveyId, onSave, onCancel }) {
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
