'use client';

import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const ReactSketchCanvas = dynamic(
  () => import('react-sketch-canvas').then(m => m.ReactSketchCanvas),
  { ssr: false, loading: () => <div style={{ flex: 1, background: '#f8fafc' }} /> }
);

const COLOR_VALUES = [
  { value: '#1e293b', key: 'colorBlack' },
  { value: '#2563eb', key: 'colorBlue'  },
  { value: '#dc2626', key: 'colorRed'   },
  { value: '#16a34a', key: 'colorGreen' },
];

const STROKES = [
  { value: 2,  size: 2 },
  { value: 4,  size: 4 },
  { value: 8,  size: 7 },
];

const DrawingPad = forwardRef(function DrawingPad({ onSave, onCancel, saving, backgroundSvg, onDirtyChange }, ref) {
  const t  = useTranslations('drawings');
  const tc = useTranslations('common');
  const canvasRef = useRef();
  const [color,          setColor]          = useState('#1e293b');
  const [stroke,         setStroke]         = useState(4);
  const [isDirty,        setIsDirty]        = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Convert SVG string to a data URL so ReactSketchCanvas can use it as background
  const bgDataUrl = backgroundSvg
    ? 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(backgroundSvg)))
    : undefined;

  // Expose requestClose() so the parent sheet's ✕ button can go through the dirty check
  useImperativeHandle(ref, () => ({
    requestClose: () => {
      if (isDirty) { setConfirmDiscard(true); }
      else { onCancel(); }
    },
  }), [isDirty, onCancel]);

  const handleSave = async () => {
    const svg = await canvasRef.current.exportSvg();
    setIsDirty(false);
    onDirtyChange?.(false);
    onSave(svg);
  };

  const handleCancel = () => {
    if (isDirty) { setConfirmDiscard(true); return; }
    onCancel();
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px 14px 14px', gap: 10, boxSizing: 'border-box' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Color dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {COLOR_VALUES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              aria-label={t(c.key)}
              aria-pressed={color === c.value}
              style={{
                width: 30, height: 30, borderRadius: 15, padding: 0, cursor: 'pointer',
                background: c.value,
                border: color === c.value ? '3px solid #fff' : '2px solid transparent',
                outline: color === c.value ? `2px solid ${c.value}` : 'none',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Stroke widths */}
        <div style={{ display: 'flex', gap: 4 }}>
          {STROKES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStroke(s.value)}
              aria-pressed={stroke === s.value}
              style={{
                width: 38, height: 34, borderRadius: 17, border: 0, cursor: 'pointer',
                background: stroke === s.value ? '#0E1116' : '#F0F0F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <div style={{ width: 16, height: s.size, background: stroke === s.value ? '#fff' : color, borderRadius: 2 }} />
            </button>
          ))}
        </div>

        {/* Undo */}
        <button
          type="button"
          onClick={() => canvasRef.current?.undo()}
          aria-label={t('undo')}
          style={{ marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, border: 0, background: '#F0F0F2', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"/>
          </svg>
        </button>
      </div>

      {/* Canvas — fixed 4:3 ratio so sketches look identical on every device */}
      <div style={{
        width: '100%', aspectRatio: '4/3', borderRadius: 16, overflow: 'hidden',
        border: '1.5px solid #EDEBE5',
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px', backgroundColor: '#f8fafc',
        touchAction: 'none',
      }}>
        <ReactSketchCanvas
          ref={canvasRef}
          strokeColor={color}
          strokeWidth={stroke}
          canvasColor="transparent"
          backgroundImage={bgDataUrl}
          preserveBackgroundImageAspectRatio="none"
          onChange={(paths) => { if (paths?.length > 0 && !isDirty) { setIsDirty(true); onDirtyChange?.(true); } }}
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
        />
      </div>

      {/* Actions — or discard confirmation */}
      {confirmDiscard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#5A5F68' }}>{t('unsavedWarning')}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setConfirmDiscard(false)} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#F0F0F2', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {t('keepDrawing')}
            </button>
            <button type="button" onClick={() => { onDirtyChange?.(false); onCancel(); }} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#B71C1C', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {t('discardBtn')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={handleCancel} disabled={saving} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#F0F0F2', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {tc('cancel')}
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 2, height: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'dpspin 1s linear infinite' }} aria-hidden="true"><path d="M21 12a9 9 0 1 1-18 0"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
            )}
            {tc('save')}
          </button>
        </div>
      )}
      <style>{`@keyframes dpspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
});

export default DrawingPad;
