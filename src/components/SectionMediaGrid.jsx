'use client';

import React from 'react';
import { Camera, Loader2, Play, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import Lightbox from '@/components/Lightbox';

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
    const files = await Promise.all(raw.map(processMediaFile));
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
