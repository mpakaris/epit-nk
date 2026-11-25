'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, ChevronLeft, ChevronRight, FileText, Loader2, X } from 'lucide-react';
import MediaThumb from '@/components/MediaThumb';
import Modal from '@/components/Modal';
import { processMediaFile } from '@/lib/mediaGate';

const ACCEPT_MEDIA = 'image/*,video/*';
const ACCEPT_DOCS  = 'application/pdf,.pdf';

function isMedia(item) {
  return item.mime_type?.startsWith('image/') || item.mime_type?.startsWith('video/');
}
function isDoc(item) {
  return !isMedia(item);
}

export default function QuoteMediaModal({ isOpen, onClose, quoteId, ownerType, ownerId, mode, items, onUploaded, onDeleted, canAdd = true }) {
  const t  = useTranslations('quotes');
  const tc = useTranslations('common');
  const fileInputRef = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [error,       setError]       = useState('');
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = closed

  const filtered = (items || []).filter(mode === 'documents' ? isDoc : isMedia);
  const accept   = mode === 'documents' ? ACCEPT_DOCS : ACCEPT_MEDIA;
  const title    = mode === 'documents' ? t('mediaDocumentsTitle') : t('mediaImagesTitle');
  const viewable = filtered.filter(i => i.mime_type?.startsWith('image/') || i.mime_type?.startsWith('video/'));

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e) => {
      if (e.key === 'Escape')     setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx(i => (i + 1) % viewable.length);
      if (e.key === 'ArrowLeft')  setLightboxIdx(i => (i - 1 + viewable.length) % viewable.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, viewable.length]);

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    setUploading(true); setError('');
    try {
      const processed = mode === 'documents' ? raw : await Promise.all(raw.map(processMediaFile));
      const form = new FormData();
      processed.forEach(f => form.append('files', f));
      form.append('owner_type', ownerType);
      form.append('owner_id',   ownerId);
      const res = await fetch(`/api/quotes/${quoteId}/media`, { method: 'POST', body: form });
      if (!res.ok) { const { error: e } = await res.json().catch(() => ({})); throw new Error(e || 'Hiba'); }
      const { media } = await res.json();
      onUploaded?.(media);
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (item) => {
    setDeleting(item.id); setError('');
    try {
      const res = await fetch(`/api/quotes/${quoteId}/media/${item.id}`, { method: 'DELETE' });
      if (!res.ok) { const { error: e } = await res.json().catch(() => ({})); throw new Error(e || 'Hiba'); }
      onDeleted?.(item.id);
      if (lightboxIdx !== null && images[lightboxIdx]?.id === item.id) setLightboxIdx(null);
    } catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  const lightboxItem = lightboxIdx !== null ? viewable[lightboxIdx] : null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.6rem 0.85rem', borderRadius: 16, fontSize: '0.825rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: mode === 'documents' ? '1fr' : 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: '1rem' }}>
            {filtered.map((item, idx) => {
              const viewIdx = viewable.indexOf(item);
              return (
                <div key={item.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F4F3F0' }}>
                  {mode === 'documents' ? (
                    <a href={item.cdn_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.85rem', textDecoration: 'none', color: '#0E1116' }}>
                      <FileText size={20} style={{ flexShrink: 0, color: '#6D3FD1' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.r2_key?.split('/').pop() || 'Dokumentum'}
                      </span>
                    </a>
                  ) : (
                    <MediaThumb item={item} radius={8} style={{ aspectRatio: '1 / 1', cursor: 'pointer' }} onClick={() => setLightboxIdx(viewIdx)} />
                  )}
                  <button type="button" onClick={() => handleDelete(item)} disabled={deleting === item.id}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    {deleting === item.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8A8F98', fontSize: 14, fontWeight: 600 }}>
            {mode === 'documents' ? t('mediaNoDocuments') : t('mediaNoImages')}
          </div>
        )}

        {canAdd && <input ref={fileInputRef} type="file" accept={accept} multiple onChange={handleFiles} style={{ display: 'none' }} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={onClose}>{tc('close')}</button>
          {canAdd && (
            <button type="button" className="dk-btn dk-btn-dark" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />{tc('uploading')}</>
                : <><Camera size={16} />{mode === 'documents' ? t('mediaUploadDoc') : t('mediaUploadImage')}</>}
            </button>
          )}
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Close */}
          <button type="button" onClick={() => setLightboxIdx(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1 }}>
            <X size={20} />
          </button>

          {/* Counter */}
          {viewable.length > 1 && (
            <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>
              {lightboxIdx + 1} / {viewable.length}
            </div>
          )}

          {/* Prev */}
          {viewable.length > 1 && (
            <button type="button" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + viewable.length) % viewable.length); }}
              style={{ position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Image or Video */}
          {lightboxItem.mime_type?.startsWith('video/') ? (
            <video
              src={lightboxItem.cdn_url}
              controls
              autoPlay
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 'calc(100vw - 120px)', maxHeight: 'calc(100vh - 100px)', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', background: '#000' }}
            />
          ) : (
            <img
              src={lightboxItem.cdn_url}
              alt=""
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 'calc(100vw - 120px)', maxHeight: 'calc(100vh - 100px)', objectFit: 'contain', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            />
          )}

          {/* Next */}
          {viewable.length > 1 && (
            <button type="button" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % viewable.length); }}
              style={{ position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
