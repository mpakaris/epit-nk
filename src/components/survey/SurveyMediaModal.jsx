'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { processMediaFile } from '@/lib/mediaGate';
import { Plus, Loader2, X, FileText, Camera } from 'lucide-react';

/**
 * Reusable media gallery modal for both survey-level and section-level media.
 *
 * Props:
 *   surveyId   — required
 *   entryId    — null for survey-level, entry.id for section-level
 *   mediaItems — array of media objects to display
 *   canEdit    — whether the user can upload/delete
 *   enqueue    — optional upload queue fn (from useUploadQueue); if absent, uploads directly
 *   onUploaded(newItems[]) — called after a direct upload (no enqueue); parent updates local state
 *   onDeleted(mediaId)     — called after delete; parent updates local state
 */
export default function SurveyMediaModal({ isOpen, onClose, surveyId, entryId = null, canEdit, mediaItems, enqueue, onUploaded, onDeleted }) {
  const ts = useTranslations('surveys');
  const { uploadSurveyMedia, deleteSurveyMedia } = useApp();
  const inputRef  = useRef(null);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [previewIdx, setPreviewIdx] = useState(null);

  const items = mediaItems || [];
  const previewItem = previewIdx !== null ? items[previewIdx] : null;

  useEffect(() => {
    if (previewIdx === null) return;
    const handler = (e) => {
      if (e.key === 'Escape')     setPreviewIdx(null);
      if (e.key === 'ArrowLeft')  setPreviewIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setPreviewIdx(i => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewIdx, items.length]);

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    if (enqueue) {
      enqueue(raw, { surveyId, entryId, mediaType: 'photo' });
    } else {
      setUploading(true);
      try {
        const processed = await Promise.all(raw.map(processMediaFile));
        const newMedia = await uploadSurveyMedia(surveyId, processed, { entryId, mediaType: 'photo' });
        onUploaded?.(newMedia || []);
      } catch { }
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    setDeleting(mediaId);
    try {
      await deleteSurveyMedia(mediaId, surveyId, entryId, 'photo');
      onDeleted?.(mediaId);
      if (previewIdx !== null) setPreviewIdx(null);
    } finally { setDeleting(null); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ts('desktop.detailMediaTitle')} maxWidth="600px">
      <input ref={inputRef} type="file" accept="image/*,video/*,.pdf,.heic,.heif" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{items.length} {ts('desktop.detailLabelItem')}</span>
        {canEdit && (
          <button className="dk-btn dk-btn-l" onClick={() => inputRef.current?.click()} disabled={uploading} style={{ gap: 8 }}>
            {uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {ts('desktop.detailMediaUpload')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
          {ts('desktop.detailMediaEmpty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {items.map((item, idx) => {
            const isVideo = item.mime_type?.startsWith('video/');
            const isPdf   = item.mime_type === 'application/pdf' || item.file_name?.toLowerCase().endsWith('.pdf');
            const thumb   = item.thumbnail_url || item.drive_view_url;
            return (
              <div key={item.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F4F5F8', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => !isPdf && setPreviewIdx(idx)}
                  style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', cursor: isPdf ? 'default' : 'pointer', padding: 0 }}
                  aria-label={item.file_name || ''} />
                {thumb ? (
                  <img src={thumb} alt={item.file_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                ) : isPdf ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#5A5F68', pointerEvents: 'none' }}>
                    <FileText size={32} aria-hidden="true" />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>PDF</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#5A5F68', pointerEvents: 'none' }}>
                    <Camera size={32} aria-hidden="true" />
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{item.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                  </div>
                )}
                {isVideo && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.28)', pointerEvents: 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, paddingLeft: 3 }}>▶</div>
                  </div>
                )}
                {item.file_name && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.65))', padding: '20px 8px 6px', fontSize: 10, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {item.file_name}
                  </div>
                )}
                {canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} disabled={!!deleting}
                    aria-label={ts('desktop.detailMediaDeleteAria')}
                    style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, background: deleting === item.id ? 'rgba(0,0,0,.35)' : 'rgba(183,28,28,.85)', border: 0, color: '#fff', cursor: deleting === item.id ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    {deleting === item.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {previewItem && (
        <div onClick={() => setPreviewIdx(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={() => setPreviewIdx(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
            <X size={22} aria-hidden="true" />
          </button>
          {previewIdx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setPreviewIdx(i => i - 1); }}
              style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 22 }}>‹</button>
          )}
          {previewIdx < items.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setPreviewIdx(i => i + 1); }}
              style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 22 }}>›</button>
          )}
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '88vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewItem.mime_type?.startsWith('video/') ? (
              <video key={previewItem.id} controls autoPlay style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 12, outline: 'none' }}>
                <source src={previewItem.drive_view_url || previewItem.thumbnail_url} type={previewItem.mime_type} />
              </video>
            ) : (
              <img key={previewItem.id} src={previewItem.drive_view_url || previewItem.thumbnail_url} alt={previewItem.file_name || ''}
                style={{ maxWidth: '88vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            {previewItem.file_name && <span>{previewItem.file_name} · </span>}
            <span>{previewIdx + 1} / {items.length}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
