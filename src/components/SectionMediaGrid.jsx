'use client';

import React from 'react';
import { ImageIcon, Loader2, Play, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import Lightbox from '@/components/Lightbox';
import CameraCapture from '@/components/CameraCapture';

export default function SectionMediaGrid({ surveyId, surveyEntryId, isLocked, triggerUpload = 0, mediaItems }) {
  const { surveyEntriesBySurvey, uploadSurveyMedia, deleteSurveyMedia } = useApp();
  const inputRef = React.useRef(null);
  const [lightbox, setLightbox] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState('');
  const [confirmId, setConfirmId] = React.useState(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const prevTriggerRef = React.useRef(0);

  const entries = surveyEntriesBySurvey[surveyId] || [];
  const entry = entries.find(e => e.id === surveyEntryId);
  const surveyMedia = entry?.media || [];
  const media = mediaItems ?? surveyMedia;

  React.useEffect(() => {
    if (triggerUpload !== prevTriggerRef.current && triggerUpload > 0) {
      prevTriggerRef.current = triggerUpload;
      inputRef.current?.click();
    }
  }, [triggerUpload]);

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

  if (media.length === 0) return (
    <>
      {!isLocked && <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />}
    </>
  );

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Fotók ({media.length})</span>
        {!isLocked && uploading && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Loader2 size={11} className="animate-spin" />Feltöltés…
          </span>
        )}
      </div>
      {!isLocked && <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />}
      {uploadErr && <p style={{ fontSize: '0.72rem', color: 'var(--danger-text)', margin: '0 0 0.35rem' }}>{uploadErr}</p>}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {media.map((m, i) => {
            const isVideo = m.mime_type?.startsWith('video/');
            return (
              <div key={m.id} style={{ position: 'relative', flexShrink: 0 }}>
                <button type="button" onClick={() => setLightbox(i)} style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
                  {isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div> : <img src={m.thumbnail_url || m.cdn_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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
      {lightbox !== null && <Lightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      {showCamera && (
        <CameraCapture
          surveyId={surveyId}
          surveyEntryId={surveyEntryId}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
