'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import DrawingPad from '@/components/DrawingPad';
import { Plus, Loader2, X } from 'lucide-react';

const extractInner = s => s?.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? '';

/**
 * Reusable drawings modal for both survey-level and section-level sketches.
 *
 * Props:
 *   surveyId   — required
 *   entryId    — null for survey-level, entry.id for section-level
 *   entryName  — optional label shown in the DrawingPad header
 *   drawings   — array of drawing objects to display
 *   onCreated(newDrawing) — called after save; parent updates local state
 *   onDeleted(drawingId)  — called after delete; parent updates local state
 */
export default function SurveyDrawingsModal({ isOpen, onClose, surveyId, entryId = null, entryName, drawings, onCreated, onDeleted }) {
  const ts = useTranslations('surveys');
  const { deleteSurveyDrawing, createSurveyDrawing } = useApp();
  const drawingPadRef = useRef(null);

  const [deleting,       setDeleting]       = useState(null);
  const [editingDrawing, setEditingDrawing] = useState(null);
  const [sketchSaving,   setSketchSaving]   = useState(false);

  const items = drawings || [];
  const svgThumb = (d) => d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;object-fit:contain;pointer-events:none"') || '';

  const openNew  = () => setEditingDrawing({});
  const openEdit = (d) => setEditingDrawing(d);
  const closeEditor = () => { setEditingDrawing(null); setSketchSaving(false); };

  const handleSave = async (newSvg) => {
    setSketchSaving(true);
    try {
      let finalSvg = newSvg;
      if (editingDrawing?.id) {
        const oldInner = extractInner(editingDrawing.svg_data);
        const newInner = extractInner(newSvg);
        if (!newInner.trim()) { closeEditor(); return; }
        // Use the opening tag from newSvg to preserve the current canvas coordinate system.
        // Hardcoding 800×760 mismatches desktop canvas dimensions and distorts saved strokes.
        const openTag = newSvg.match(/<svg[^>]*>/)?.[0] || '<svg>';
        const openTagWithXlink = openTag.includes('xmlns:xlink') ? openTag : openTag.replace('>', ' xmlns:xlink="http://www.w3.org/1999/xlink">');
        finalSvg = `${openTagWithXlink}${oldInner}${newInner}</svg>`;
        await deleteSurveyDrawing(surveyId, editingDrawing.id);
        onDeleted?.(editingDrawing.id);
      }
      const newDrawing = await createSurveyDrawing(surveyId, { svg_data: finalSvg, entry_id: entryId });
      onCreated?.(newDrawing);
      closeEditor();
    } catch { }
    setSketchSaving(false);
  };

  const handleDelete = async (drawingId) => {
    setDeleting(drawingId);
    try {
      await deleteSurveyDrawing(surveyId, drawingId);
      onDeleted?.(drawingId);
    } finally { setDeleting(null); }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={ts('desktop.detailDrawingsTitle')} maxWidth="600px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{items.length} {ts('desktop.detailLabelItem')}</span>
          <button className="dk-btn dk-btn-l" onClick={openNew} style={{ gap: 8 }}>
            <Plus size={16} aria-hidden="true" />
            {ts('desktop.detailAddItemBtn')}
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
            {ts('desktop.detailDrawingsEmpty')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {items.map((drawing, idx) => (
              <div key={drawing.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F7F5EF', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <button onClick={() => openEdit(drawing)}
                  style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
                  aria-label={`Vázlat ${idx + 1} szerkesztése`} />
                <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: svgThumb(drawing) }} />
                <button onClick={(e) => { e.stopPropagation(); handleDelete(drawing.id); }} disabled={!!deleting}
                  aria-label={ts('desktop.detailDrawingsDeleteAria')}
                  style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, background: deleting === drawing.id ? 'rgba(0,0,0,.35)' : 'rgba(183,28,28,.85)', border: 0, color: '#fff', cursor: deleting === drawing.id ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  {deleting === drawing.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* DrawingPad overlay */}
      {editingDrawing !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#EDEBE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #EDEBE5', flexShrink: 0 }}>
              <div style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>
                {editingDrawing?.id ? ts('desktop.detailDrawingsTitle') : ts('desktop.detailAddItemBtn')}
              </div>
              {entryName && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{entryName}</span>}
            </div>
            <DrawingPad
              ref={drawingPadRef}
              backgroundSvg={editingDrawing?.svg_data}
              saving={sketchSaving}
              onSave={handleSave}
              onCancel={closeEditor}
            />
          </div>
        </div>
      )}
    </>
  );
}
