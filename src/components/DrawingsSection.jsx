'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, PenLine, Plus, X } from 'lucide-react';
import DrawingPad from '@/components/DrawingPad';

const extractInner = s => s?.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? '';

export default function DrawingsSection({ drawings = [], onSave, onDelete, canEdit = true, compact = false, triggerCount = 0, hideHeader = false }) {
  const t  = useTranslations('drawings');
  const tc = useTranslations('common');

  // null = closed, {} = new, drawing object = edit
  const [editingDrawing, setEditingDrawing] = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [deleting,       setDeleting]       = useState(null);
  const drawingPadRef = useRef(null);

  const prevTriggerRef = useRef(triggerCount);
  useEffect(() => {
    if (triggerCount !== prevTriggerRef.current) {
      prevTriggerRef.current = triggerCount;
      if (triggerCount > 0) setEditingDrawing({});
    }
  }, [triggerCount]);

  const handleSave = async (newSvg) => {
    setSaving(true);
    try {
      let finalSvg = newSvg;
      if (editingDrawing?.id) {
        const oldInner = extractInner(editingDrawing.svg_data);
        const newInner = extractInner(newSvg);
        if (!newInner.trim()) { setEditingDrawing(null); return; }
        const openTag = newSvg.match(/<svg[^>]*>/)?.[0] || '<svg>';
        const openTagWithXlink = openTag.includes('xmlns:xlink') ? openTag
          : openTag.replace('>', ' xmlns:xlink="http://www.w3.org/1999/xlink">');
        finalSvg = `${openTagWithXlink}${oldInner}${newInner}</svg>`;
        await onDelete(editingDrawing.id);
      }
      await onSave(finalSvg);
      setEditingDrawing(null);
    } catch (err) {
      console.error('Drawing save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await onDelete(id); }
    finally { setDeleting(null); }
  };

  const svgThumb = (d) =>
    d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;object-fit:contain;pointer-events:none"') || '';

  // compact = inline trigger only (no grid rendered here)
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setEditingDrawing({})}
          aria-label={t('drawLabel')}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Plus size={16} color="var(--text-secondary)" strokeWidth={1.75} />
        </button>
        {editingDrawing !== null && (
          <DrawingOverlay
            editingDrawing={editingDrawing}
            saving={saving}
            onSave={handleSave}
            onCancel={() => setEditingDrawing(null)}
            drawingPadRef={drawingPadRef}
            title={t('newTitle')}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: drawings.length > 0 ? '0.65rem' : 0 }}>
          {drawings.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <PenLine size={14} color="var(--accent)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                {t('header', { count: drawings.length })}
              </span>
            </div>
          )}
          {canEdit && (
            <button type="button" onClick={() => setEditingDrawing({})}
              style={{ height: 34, padding: '0 12px', borderRadius: 17, border: 0, background: '#F4F3F0', color: '#0E1116', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: drawings.length > 0 ? 'auto' : 0 }}>
              <Plus size={13} /> {drawings.length > 0 ? t('newTitle') : t('addBtn')}
            </button>
          )}
        </div>
      )}

      {drawings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', marginBottom: '0.5rem' }}>
          {drawings.map((d, idx) => (
            <div key={d.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F7F5EF', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              {canEdit && (
                <button onClick={() => setEditingDrawing(d)}
                  style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
                  aria-label={`${t('alt')} ${idx + 1}`} />
              )}
              <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: svgThumb(d) }} />
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                  disabled={deleting === d.id}
                  style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, background: deleting === d.id ? 'rgba(0,0,0,.35)' : 'rgba(183,28,28,.85)', border: 0, color: '#fff', cursor: deleting === d.id ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                  aria-label={tc('delete')}
                >
                  {deleting === d.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editingDrawing !== null && (
        <DrawingOverlay
          editingDrawing={editingDrawing}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditingDrawing(null)}
          drawingPadRef={drawingPadRef}
          title={editingDrawing?.id ? t('editTitle') : t('newTitle')}
        />
      )}
    </div>
  );
}

function DrawingOverlay({ editingDrawing, saving, onSave, onCancel, drawingPadRef, title }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#EDEBE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #EDEBE5', flexShrink: 0 }}>
          <div style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>
            {title}
          </div>
        </div>
        <DrawingPad
          ref={drawingPadRef}
          backgroundSvg={editingDrawing?.svg_data}
          saving={saving}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
