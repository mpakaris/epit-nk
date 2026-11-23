'use client';

// Reusable modal for managing quote media (images/video OR documents/PDFs).
// mode: 'media' (images + video) | 'documents' (PDF, etc.)
// ownerType: 'quote' | 'quote_section'
// ownerId: quoteId for doc-level, sectionId for section-level

import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, FileText, Loader2, Trash2, X } from 'lucide-react';
import Modal from '@/components/Modal';
import { processMediaFile } from '@/lib/mediaGate';

const ACCEPT_MEDIA = 'image/*,video/*';
const ACCEPT_DOCS  = 'application/pdf,.pdf';

function isMedia(item) {
  return item.mime_type?.startsWith('image/') || item.mime_type?.startsWith('video/');
}

function isDoc(item) {
  return item.mime_type === 'application/pdf' || (!item.mime_type?.startsWith('image/') && !item.mime_type?.startsWith('video/'));
}

export default function QuoteMediaModal({ isOpen, onClose, quoteId, ownerType, ownerId, mode, items, onUploaded, onDeleted }) {
  const t  = useTranslations('quotes');
  const tc = useTranslations('common');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [error,     setError]     = useState('');

  const filtered = (items || []).filter(mode === 'documents' ? isDoc : isMedia);
  const accept   = mode === 'documents' ? ACCEPT_DOCS : ACCEPT_MEDIA;
  const title    = mode === 'documents' ? t('mediaDocumentsTitle') : t('mediaImagesTitle');

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    setUploading(true); setError('');
    try {
      const processed = mode === 'documents'
        ? raw  // skip compression for PDFs
        : await Promise.all(raw.map(processMediaFile));

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
    } catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.6rem 0.85rem', borderRadius: 16, fontSize: '0.825rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Grid of existing items */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'documents' ? '1fr' : 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: '1rem' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#F4F3F0' }}>
              {mode === 'documents' ? (
                <a href={item.cdn_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.85rem', textDecoration: 'none', color: '#0E1116' }}>
                  <FileText size={20} style={{ flexShrink: 0, color: '#6D3FD1' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.r2_key?.split('/').pop() || 'Dokumentum'}
                  </span>
                </a>
              ) : item.mime_type?.startsWith('video/') ? (
                <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff', fontSize: 24 }}>▶</div>
              ) : (
                <img src={item.thumbnail_url || item.cdn_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              )}
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={deleting === item.id}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                {deleting === item.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8A8F98', fontSize: 14, fontWeight: 600 }}>
          {mode === 'documents' ? t('mediaNoDocuments') : t('mediaNoImages')}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept={accept} multiple onChange={handleFiles} style={{ display: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" className="dk-btn dk-btn-l" onClick={onClose}>{tc('close')}</button>
        <button type="button" className="dk-btn dk-btn-dark" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />{tc('uploading')}</>
            : <><Camera size={16} />{mode === 'documents' ? t('mediaUploadDoc') : t('mediaUploadImage')}</>}
        </button>
      </div>
    </Modal>
  );
}
