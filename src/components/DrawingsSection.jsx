'use client';

import React, { useState } from 'react';
import { PenLine, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import DrawingPad from '@/components/DrawingPad';

export default function DrawingsSection({ drawings = [], onSave, onDelete, canEdit = true }) {
  const [showPad, setShowPad] = useState(false);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <PenLine size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            Vázlatok ({drawings.length})
          </span>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setShowPad(true)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
            <Plus size={13} /> Új vázlat
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

      {drawings.length === 0 && !showPad && canEdit && (
        <div
          onClick={() => setShowPad(true)}
          style={{ cursor: 'pointer', textAlign: 'center', padding: '1.25rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.825rem' }}
        >
          <PenLine size={20} style={{ margin: '0 auto 0.35rem', display: 'block', opacity: 0.5 }} />
          Kattints az első vázlat létrehozásához
        </div>
      )}

      <Modal isOpen={showPad} onClose={() => !saving && setShowPad(false)} title="Új vázlat" maxWidth="860px" maxHeight="95vh" persistent>
        <DrawingPad onSave={handleSave} onCancel={() => setShowPad(false)} saving={saving} />
      </Modal>
    </div>
  );
}
