'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, PenLine, Plus, X } from 'lucide-react';
import DrawingPad from '@/components/DrawingPad';
import useMobile from '@/hooks/useMobile';

const extractInner = s => s?.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? '';

export default function DrawingsSection({ drawings = [], onSave, onDelete, canEdit = true, canAdd = canEdit, canDelete = canEdit, compact = false, triggerCount = 0, hideHeader = false }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {!hideHeader && drawings.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <PenLine size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {t('header', { count: drawings.length })}
          </span>
        </div>
      )}

      {drawings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: '0.65rem', marginBottom: '0.5rem' }}>
          {drawings.map((d, idx) => (
            <div key={d.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F7F5EF', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              {canAdd && (
                <button onClick={() => setEditingDrawing(d)}
                  style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
                  aria-label={`${t('alt')} ${idx + 1}`} />
              )}
              <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: svgThumb(d) }} />
              {canDelete && (
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

      {canAdd && (
        <button type="button" onClick={() => setEditingDrawing({})}
          style={{ width: '100%', height: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          <Plus size={18} strokeWidth={2.5} />
          {t('newTitle')}
        </button>
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
  const isMobile = useMobile();

  if (isMobile) {
    // Survey-style: 96dvh sheet sliding up from bottom
    return (
      <>
        <button type="button" onClick={onCancel} aria-hidden="true"
          style={{ position: 'fixed', inset: 0, zIndex: 298, border: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
        <div role="dialog" style={{ position: 'fixed', zIndex: 300, left: 0, right: 0, bottom: 0, height: '96dvh', borderRadius: '24px 24px 0 0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0, borderBottom: '1px solid #EDEBE5' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>{title}</span>
            <button type="button" onClick={onCancel}
              style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F0F0F2', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DrawingPad ref={drawingPadRef} backgroundSvg={editingDrawing?.svg_data} saving={saving} onSave={onSave} onCancel={onCancel} />
          </div>
        </div>
      </>
    );
  }

  // Desktop: centered card on sand background
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#EDEBE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #EDEBE5', flexShrink: 0 }}>
          <div style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>{title}</div>
        </div>
        <DrawingPad ref={drawingPadRef} backgroundSvg={editingDrawing?.svg_data} saving={saving} onSave={onSave} onCancel={onCancel} />
      </div>
    </div>
  );
}
