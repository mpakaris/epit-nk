'use client';

import React from 'react';
import { Camera, Play, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { convertIfHeif } from '@/lib/imageUtils';

function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = React.useState(startIndex);
  const cur = media[idx];
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setIdx(i => Math.min(i+1, media.length-1)); if (e.key === 'ArrowLeft') setIdx(i => Math.max(i-1, 0)); };
    window.addEventListener('keydown', h); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [media.length, onClose]);
  if (!cur) return null;
  const isVideo = cur.mime_type?.startsWith('video/');
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}><X size={20} /></button>
      {media.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>{idx+1} / {media.length}</div>}
      {idx > 0 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i-1); }} style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={22} /></button>}
      {idx < media.length-1 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i+1); }} style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronRight size={22} /></button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo ? <video src={cur.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} /> : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />}
        {media.length > 1 && <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>{media.map((m, i) => (<button key={m.id} type="button" onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}>{m.mime_type?.startsWith('video/') ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div> : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</button>))}</div>}
      </div>
    </div>
  );
}

export default function SectionMediaGrid({ surveyId, surveyEntryId, isLocked }) {
  const { surveyEntriesBySurvey, uploadSurveyMedia, deleteSurveyMedia } = useApp();
  const inputRef = React.useRef(null);
  const [lightbox, setLightbox] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState('');
  const [confirmId, setConfirmId] = React.useState(null);

  const entries = surveyEntriesBySurvey[surveyId] || [];
  const entry = entries.find(e => e.id === surveyEntryId);
  const media = entry?.media || [];

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(convertIfHeif));
    setUploading(true); setUploadErr('');
    try { await uploadSurveyMedia(surveyId, files, { entryId: surveyEntryId, mediaType: 'photo' }); }
    catch (err) { setUploadErr(err.message || 'Hiba'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (mediaId) => {
    try { await deleteSurveyMedia(mediaId, surveyId, surveyEntryId, 'photo'); }
    catch {}
    setConfirmId(null);
  };

  return (
    <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', background: '#fafbfc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: media.length > 0 ? '0.5rem' : 0 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Fotók ({media.length})</span>
        {!isLocked && (
          <>
            <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }}>
              {uploading ? <><Loader2 size={12} className="animate-spin" />Feltöltés…</> : <><Camera size={12} /> Fotó hozzáadása</>}
            </button>
          </>
        )}
      </div>
      {uploadErr && <p style={{ fontSize: '0.72rem', color: 'var(--danger-text)', margin: '0 0 0.35rem' }}>{uploadErr}</p>}
      {media.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {media.map((m, i) => {
            const isVideo = m.mime_type?.startsWith('video/');
            return (
              <div key={m.id} style={{ position: 'relative', flexShrink: 0 }}>
                <button type="button" onClick={() => setLightbox(i)} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
                  {isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div> : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </button>
                {!isLocked && (
                  confirmId === m.id
                    ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.9)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                        <button type="button" onClick={() => handleDelete(m.id)} style={{ background: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, color: 'var(--danger-text)' }}>✓</button>
                        <button type="button" onClick={() => setConfirmId(null)} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.65rem', color: '#fff' }}>✕</button>
                      </div>
                    : <button type="button" onClick={() => setConfirmId(m.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={10} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {lightbox !== null && <Lightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
