'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Camera, Loader2, X } from 'lucide-react';
import { processMediaFile } from '@/lib/mediaGate';
import { WINDOW_M2, DOOR_M2 } from './AreaSummary';

const LBL = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6, display: 'block' };

export default function SectionAddForm({ surveyId, onSave, onCancel }) {
  const t  = useTranslations('quotes');
  const tc = useTranslations('common');
  const { uploadSurveyMedia } = useApp();

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [widthM,      setWidthM]      = useState('');
  const [lengthM,     setLengthM]     = useState('');
  const [heightM,     setHeightM]     = useState('');
  const [windowCount, setWindowCount] = useState('');
  const [doorCount,   setDoorCount]   = useState('');
  const [wallM2,      setWallM2]      = useState('');
  const [wallAuto,    setWallAuto]    = useState(true);
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews,      setPreviews]      = useState([]);
  const fileInputRef = React.useRef(null);

  const w = parseFloat(widthM), l = parseFloat(lengthM);
  const computedArea      = w > 0 && l > 0 ? w * l : null;
  const computedPerimeter = w > 0 && l > 0 ? 2 * (w + l) : null;

  useEffect(() => {
    if (!wallAuto) return;
    const h   = parseFloat(heightM);
    const ded = (parseInt(windowCount) || 0) * WINDOW_M2 + (parseInt(doorCount) || 0) * DOOR_M2;
    const net = computedPerimeter && h > 0 ? Math.max(0, computedPerimeter * h - ded) : null;
    setWallM2(net != null ? net.toFixed(2) : '');
  }, [widthM, lengthM, heightM, windowCount, doorCount, wallAuto]);

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const arr = await Promise.all(raw.map(processMediaFile));
    setSelectedFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => ({
      key: `${f.name}-${f.size}`,
      isVideo: f.type.startsWith('video/'),
      url: f.type.startsWith('video/') ? null : URL.createObjectURL(f),
    }))]);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError(t('sectionNameRequired')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name:         name.trim(),
        description:  description.trim() || null,
        width_m:      parseFloat(widthM)       || null,
        length_m:     parseFloat(lengthM)      || null,
        height_m:     heightM ? Number(heightM) : null,
        window_count: parseInt(windowCount, 10) || 0,
        door_count:   parseInt(doorCount,   10) || 0,
        start_date:   startDate || null,
        end_date:     endDate   || null,
        _pendingFiles: selectedFiles,
        _surveyId:    surveyId,
      });
    } catch (err) {
      setError(err.message || t('sectionSaveError'));
      setSaving(false);
    }
  };

  return (
    <>
      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.6rem 0.85rem', borderRadius: 16, fontSize: '0.825rem', display: 'flex', gap: '0.45rem', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={LBL}>{t('sectionNameLabel')}</span>
        <input type="text" className="dk-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={t('sectionNamePh')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: computedArea != null ? '0.25rem' : '0.75rem' }}>
        <div><span style={LBL}>{t('sectionWidthLabel')}</span><input type="number" min="0" step="0.1" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={widthM} onChange={e => setWidthM(e.target.value)} placeholder="3.5" /></div>
        <div><span style={LBL}>{t('sectionLengthLabel')}</span><input type="number" min="0" step="0.1" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={lengthM} onChange={e => setLengthM(e.target.value)} placeholder="4.2" /></div>
        <div><span style={LBL}>{t('sectionHeightLabel')}</span><input type="number" min="0" step="0.05" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={heightM} onChange={e => setHeightM(e.target.value)} placeholder="2.6" /></div>
      </div>

      {computedArea != null && (
        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#6D3FD1', fontWeight: 700 }}>
          {t('sectionAreaCalc', { area: computedArea.toFixed(2).replace('.', ',') })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div><span style={LBL}>{t('sectionWindowsLabel')}</span><input type="number" min="0" step="1" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={windowCount} onChange={e => setWindowCount(e.target.value)} placeholder="0" /></div>
        <div><span style={LBL}>{t('sectionDoorsLabel')}</span><input type="number" min="0" step="1" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={doorCount} onChange={e => setDoorCount(e.target.value)} placeholder="0" /></div>
        <div><span style={LBL}>{t('sectionWallLabel')}</span><input type="number" min="0" step="0.01" className="dk-input" style={{ fontFamily: 'var(--font-mono)' }} value={wallM2} onChange={e => { setWallAuto(false); setWallM2(e.target.value); }} placeholder="m²" /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div><span style={LBL}>{t('sectionStartDate')}</span><input type="date" className="dk-input" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><span style={LBL}>{t('sectionEndDate')}</span><input type="date" className="dk-input" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span style={LBL}>{t('sectionDescLabel')}</span>
        <textarea rows={2} className="dk-input" style={{ height: 72, resize: 'none', paddingTop: 12, paddingBottom: 12 }} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('sectionDescPh')} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: previews.length ? '0.5rem' : 0 }}>
          <span style={{ ...LBL, margin: 0 }}>{t('sectionPhotosLabel')}</span>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="dk-btn dk-btn-l" style={{ height: 34, padding: '0 12px', fontSize: 13 }}>
            <Camera size={14} /> {t('sectionPhotoBtn')}
          </button>
        </div>
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {previews.map((p, i) => (
              <div key={p.key} style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, overflow: 'hidden', background: '#F4F3F0' }}>
                  {p.isVideo
                    ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>▶</div>
                    : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <button type="button" onClick={() => { setSelectedFiles(f => f.filter((_, fi) => fi !== i)); setPreviews(p => p.filter((_, pi) => pi !== i)); }}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="dk-btn dk-btn-l" onClick={onCancel} disabled={saving}>{tc('cancel')}</button>
        <button type="button" className="dk-btn dk-btn-dark" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin" />{tc('creating')}</> : t('sectionAddBtn')}
        </button>
      </div>
    </>
  );
}
