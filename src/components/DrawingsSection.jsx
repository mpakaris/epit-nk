'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PenLine, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import DrawingPad from '@/components/DrawingPad';

export default function DrawingsSection({ drawings = [], onSave, onDelete, canEdit = true, compact = false, triggerCount = 0 }) {
  const [showPad, setShowPad] = useState(false);

  const prevTriggerRef = useRef(triggerCount);
  useEffect(() => {
    if (triggerCount !== prevTriggerRef.current) {
      prevTriggerRef.current = triggerCount;
      if (triggerCount > 0) setShowPad(true);
    }
  }, [triggerCount]);
  const [saving, setSaving] = useState(false);

  const handleSave = async (svg) => {
    setSaving(true);
    try {
      await onSave(svg);
      setShowPad(false);
    } catch (err) {
      console.error('Drawing save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // compact = no drawings exist; just render the trigger button inline
  if (compact) {
    return (
      <>
        <button type="button" onClick={() => setShowPad(true)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
          <PenLine size={13} /> Vázlat
        </button>
        <Modal isOpen={showPad} onClose={() => !saving && setShowPad(false)} title="Új vázlat" maxWidth="860px" maxHeight="95vh" persistent>
          <DrawingPad onSave={handleSave} onCancel={() => setShowPad(false)} saving={saving} />
        </Modal>
      </>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: drawings.length > 0 ? '0.65rem' : 0 }}>
        {drawings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <PenLine size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Vázlatok ({drawings.length})
            </span>
          </div>
        )}
        {canEdit && (
          <button type="button" onClick={() => setShowPad(true)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem', marginLeft: drawings.length > 0 ? 'auto' : 0 }}>
            <Plus size={13} /> {drawings.length > 0 ? 'Új vázlat' : 'Vázlat'}
          </button>
        )}
      </div>

      {drawings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', marginBottom: '0.5rem' }}>
          {drawings.map(d => (
            <div key={d.id} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#f8fafc' }}>
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(d.svg_data)}`}
                alt="Vázlat"
                style={{ width: '100%', display: 'block' }}
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(d.id)}
                  className="btn btn-danger btn-sm"
                  style={{ position: 'absolute', top: '0.35rem', right: '0.35rem', padding: '0.25rem 0.45rem', opacity: 0.85 }}
                  title="Törlés"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showPad} onClose={() => !saving && setShowPad(false)} title="Új vázlat" maxWidth="860px" maxHeight="95vh" persistent>
        <DrawingPad onSave={handleSave} onCancel={() => setShowPad(false)} saving={saving} />
      </Modal>
    </div>
  );
}
