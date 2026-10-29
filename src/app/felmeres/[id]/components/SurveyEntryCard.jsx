'use client';

import { useState, useRef } from 'react';
import { Edit3, Trash2, MoreHorizontal, Camera, Plus, PenLine, Ruler, Mic, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Pill style for the light sub-header
  const PILL = {
    fontSize: '0.68rem', fontWeight: 700,
    padding: '0.1rem 0.45rem',
    borderRadius: 'var(--radius-pill)',
    background: 'rgba(30, 58, 95, 0.09)',
    border: '1px solid rgba(30, 58, 95, 0.18)',
    color: '#1e3a5f',
    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
  };

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

  const pills = [
    entry.size_m2       != null && <span key="m2"    style={PILL}><Ruler size={10} />{Number(entry.size_m2).toFixed(1).replace('.', ',')} m²</span>,
    entry.height_m      != null && <span key="h"     style={PILL}>{entry.height_m} m mag.</span>,
    entry.window_count   > 0    && <span key="win"   style={PILL}>{entry.window_count} ablak</span>,
    entry.door_count     > 0    && <span key="door"  style={PILL}>{entry.door_count} ajtó</span>,
    entry.media?.length  > 0    && <span key="media" style={PILL}>{entry.media.length} fotó</span>,
  ].filter(Boolean);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #cbd5e1' }}>

      {/* ── Row 1: Title + Options ── */}
      <div style={{ background: '#1e3a5f', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
        </span>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
          {(canEditEntry || canAdd) && (
            isMobile ? (
              <button type="button" onClick={() => setCtxOpen(true)}
                style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                <MoreHorizontal size={16} />
              </button>
            ) : canEditEntry ? (
              <>
                <button type="button" onClick={onEdit}
                  style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                  <Edit3 size={13} />
                </button>
                <button type="button" onClick={onDelete}
                  style={{ padding: '0.3rem 0.5rem', background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.45)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </>
            ) : null
          )}
        </div>
      </div>

      {/* ── Row 2: Pills + Collapse toggle ── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          background: '#eef2ff',
          padding: '0.4rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #dde6f5',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', minWidth: 0 }}>
          {pills.length > 0
            ? pills
            : <span style={{ fontSize: '0.68rem', color: '#6b7280', fontStyle: 'italic' }}>Nincs adat</span>
          }
        </div>
        <div style={{ flexShrink: 0, color: '#4f6696', display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
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
