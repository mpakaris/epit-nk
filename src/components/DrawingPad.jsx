'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Undo2, Trash2, Check, X } from 'lucide-react';

const ReactSketchCanvas = dynamic(
  () => import('react-sketch-canvas').then(m => m.ReactSketchCanvas),
  { ssr: false, loading: () => <div style={{ height: 300, background: '#f8fafc', borderRadius: 'var(--radius-md)' }} /> }
);

const COLORS = [
  { value: '#1e293b', label: 'Fekete' },
  { value: '#2563eb', label: 'Kék' },
  { value: '#dc2626', label: 'Piros' },
  { value: '#16a34a', label: 'Zöld' },
];

const STROKES = [
  { value: 2, size: 2 },
  { value: 4, size: 4 },
  { value: 8, size: 7 },
];


export default function DrawingPad({ onSave, onCancel, saving }) {
  const canvasRef = useRef();
  const [color, setColor]   = useState('#1e293b');
  const [stroke, setStroke] = useState(4);

  const handleSave = async () => {
    const svg = await canvasRef.current.exportSvg();
    onSave(svg);
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
        {/* Colors */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.label}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: c.value,
                border: color === c.value ? '3px solid white' : '2px solid transparent',
                outline: color === c.value ? `2px solid ${c.value}` : 'none',
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Stroke widths */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {STROKES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStroke(s.value)}
              title={`${s.value}px`}
              style={{
                width: 34, height: 28, borderRadius: 'var(--radius-sm)',
                border: stroke === s.value ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: stroke === s.value ? 'var(--accent-light)' : '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <div style={{ width: 16, height: s.size, background: color, borderRadius: 2 }} />
            </button>
          ))}
        </div>

        {/* Undo + Clear */}
        <div style={{ display: 'flex', gap: '0.3rem', marginLeft: 'auto' }}>
          <button type="button" onClick={() => canvasRef.current?.undo()} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.55rem' }} title="Visszavonás">
            <Undo2 size={14} />
          </button>
          <button type="button" onClick={() => canvasRef.current?.clearCanvas()} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.55rem' }} title="Törlés">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        width: '100%',
        height: 'min(680px, 62vh)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
        border: '1.5px solid var(--border-subtle)',
        backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
        backgroundSize: '20px 20px', backgroundColor: '#f8fafc',
        touchAction: 'none',
      }}>
        <ReactSketchCanvas
          ref={canvasRef}
          width="800"
          height="760"
          strokeColor={color}
          strokeWidth={stroke}
          canvasColor="transparent"
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm" disabled={saving}>
          <X size={14} /> Mégse
        </button>
        <button type="button" onClick={handleSave} className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Mentés...' : <><Check size={14} /> Mentés</>}
        </button>
      </div>
    </div>
  );
}
