'use client';

import { useState, useRef } from 'react';
import { Edit3, Trash2, MoreHorizontal, Camera, Plus, PenLine, Ruler, Mic, Sparkles } from 'lucide-react';
import useMobile from '@/hooks/useMobile';
import BottomSheet from '@/components/mobile/BottomSheet';
import DrawingsSection from '@/components/DrawingsSection';
import UploadProgressBadge from '@/components/mobile/UploadProgressBadge';
import Lightbox from '@/components/Lightbox';
import TételekSection from './TételekSection';
import AreaSummary from './AreaSummary';
import InlineUpload from './InlineUpload';
import MediaGrid from './MediaGrid';

export default function SurveyEntryCard({ entry, surveyId, canEditEntry, canAdd, canEditAll = true, onEdit, onDelete, handleDeleteMedia, drawings, createSurveyDrawing, deleteSurveyDrawing, canDrawings, currentUser, pendingUploads = [], enqueue }) {
  const [collapsed, setCollapsed] = useState(true);
  const isMobile = useMobile();
  const [ctxOpen, setCtxOpen] = useState(false);

  const [triggerAudio,    setTriggerAudio]    = useState(0);
  const [triggerGenerate, setTriggerGenerate] = useState(0);
  const [triggerAddItem,  setTriggerAddItem]  = useState(0);
  const [triggerDrawing,  setTriggerDrawing]  = useState(0);
  const photoInputRef = useRef(null);

  const PILL_DARK = { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };

  const handlePhotoFromCtx = (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length || !enqueue) return;
    enqueue(raw, { surveyId, entryId: entry.id, mediaType: 'photo' });
    setCollapsed(false);
  };

  const ctxActions = canAdd ? [
    { icon: Mic,      label: 'Diktálás',         onClick: () => { setCollapsed(false); setTimeout(() => setTriggerAudio(n => n + 1), 0); } },
    { icon: Sparkles, label: 'AI javaslat',       onClick: () => { setCollapsed(false); setTimeout(() => setTriggerGenerate(n => n + 1), 0); } },
    { icon: Plus,     label: 'Tétel hozzáadása',  onClick: () => { setCollapsed(false); setTimeout(() => setTriggerAddItem(n => n + 1), 0); } },
    { icon: Camera,   label: 'Fotó / videó',      onClick: () => { setCollapsed(false); photoInputRef.current?.click(); } },
    ...(canDrawings ? [{ icon: PenLine, label: 'Vázlat', onClick: () => { setCollapsed(false); setTriggerDrawing(n => n + 1); } }] : []),
    ...(canEditEntry ? [
      { icon: Edit3,  label: 'Szerkesztés', dividerBefore: true, onClick: onEdit },
      { icon: Trash2, label: 'Törlés',      danger: true,        onClick: onDelete },
    ] : []),
  ] : canEditEntry ? [
    { icon: Edit3,  label: 'Szerkesztés', onClick: onEdit },
    { icon: Trash2, label: 'Törlés',      danger: true, onClick: onDelete },
  ] : [];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #cbd5e1' }}>
      {/* Dark header */}
      <div
        style={{ background: '#1e3a5f', padding: '0.85rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
        onClick={() => setCollapsed(c => !c)}
      >
        {(() => {
          const pills = [
            entry.size_m2      != null && <span key="m2"   style={PILL_DARK}><Ruler size={10} />{Number(entry.size_m2).toFixed(1).replace('.', ',')} m²</span>,
            entry.height_m     != null && <span key="h"    style={PILL_DARK}>{entry.height_m} m mag.</span>,
            entry.window_count  > 0    && <span key="win"  style={PILL_DARK}>{entry.window_count} ablak</span>,
            entry.door_count    > 0    && <span key="door" style={PILL_DARK}>{entry.door_count} ajtó</span>,
            entry.media?.length > 0    && <span key="media" style={PILL_DARK}>{entry.media.length} fotó</span>,
          ].filter(Boolean);

          return isMobile ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'block' }}>{entry.name}</span>
              {pills.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>{pills}</div>}
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{entry.name}</span>
              {pills}
            </div>
          );
        })()}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {(canEditEntry || canAdd) && (
            isMobile ? (
              <button type="button" onClick={() => setCtxOpen(true)}
                style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                <MoreHorizontal size={16} />
              </button>
            ) : canEditEntry ? (
              <>
                <button type="button" onClick={onEdit} style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Edit3 size={13} /></button>
                <button type="button" onClick={onDelete} style={{ padding: '0.3rem 0.5rem', background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.45)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={13} /></button>
              </>
            ) : null
          )}
        </div>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple onChange={handlePhotoFromCtx} style={{ display: 'none' }} />

      <BottomSheet isOpen={ctxOpen} onClose={() => setCtxOpen(false)} title={entry.name} actions={ctxActions} />

      {!collapsed && (
        <div style={{ padding: '1rem' }}>
          {entry.description && (
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
          )}

          <AreaSummary entry={entry} />

          <TételekSection
            surveyId={surveyId}
            entry={entry}
            canAdd={canAdd}
            canEditAll={canEditAll}
            triggerAudio={triggerAudio}
            triggerGenerate={triggerGenerate}
            triggerAddItem={triggerAddItem}
          />

          {(() => {
            const entryDrawings = drawings.filter(d => d.entry_id === entry.id);
            const hasMedia      = (entry.media?.length > 0) || pendingUploads.length > 0;
            const hasDrawings   = entryDrawings.length > 0;

            if (!hasMedia && !hasDrawings) {
              const showPhotoBtn   = canAdd && !isMobile;
              const showDrawingBtn = canDrawings && !isMobile;
              if (!showPhotoBtn && !showDrawingBtn) return null;
              return (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {showPhotoBtn && <InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo" label="Fotó / videó" enqueue={enqueue} />}
                  {showDrawingBtn && (
                    <DrawingsSection
                      drawings={[]}
                      onSave={svg => createSurveyDrawing(surveyId, { svg_data: svg, entry_id: entry.id })}
                      onDelete={drawingId => deleteSurveyDrawing(surveyId, drawingId)}
                      canEdit={true}
                      compact
                      triggerCount={triggerDrawing}
                    />
                  )}
                </div>
              );
            }

            return (
              <>
                {(hasMedia || canAdd) && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    {hasMedia ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {entry.media?.length || 0} fotó / videó
                            <UploadProgressBadge
                              pending={pendingUploads.filter(i => i.status === 'pending').length}
                              uploading={pendingUploads.filter(i => i.status === 'uploading').length}
                              done={pendingUploads.filter(i => i.status === 'done').length}
                              error={pendingUploads.filter(i => i.status === 'error').length}
                            />
                          </span>
                          {canAdd && (
                            <>
                              <span className="hide-mobile"><InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo" label="Hozzáadás" enqueue={enqueue} /></span>
                              <span className="show-mobile"><InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo" label="Hozzáadás" enqueue={enqueue} iconOnly /></span>
                            </>
                          )}
                        </div>
                        <MediaGrid media={entry.media} onDelete={canEditEntry ? handleDeleteMedia : undefined} pendingItems={pendingUploads.filter(i => i.status !== 'done')} />
                      </>
                    ) : (
                      <InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo" label="Fotó / videó" enqueue={enqueue} />
                    )}
                  </div>
                )}
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <DrawingsSection
                    drawings={entryDrawings}
                    onSave={canDrawings ? (svg => createSurveyDrawing(surveyId, { svg_data: svg, entry_id: entry.id })) : undefined}
                    onDelete={canDrawings ? (drawingId => deleteSurveyDrawing(surveyId, drawingId)) : undefined}
                    canEdit={canDrawings}
                    triggerCount={triggerDrawing}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
