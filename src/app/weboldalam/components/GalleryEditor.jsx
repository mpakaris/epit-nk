'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, X, Video } from 'lucide-react';

export default function GalleryEditor({ content, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const items  = content.items || [];
  const imgCount = items.filter(i => i.type !== 'video').length;
  const vidCount = items.filter(i => i.type === 'video').length;

  const upload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('type', 'gallery');
      files.forEach(f => fd.append('files', f));
      const r = await fetch('/api/website/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Feltöltési hiba'); return; }
      onChange({ ...content, items: [...items, ...d.files] });
    } catch {
      setUploadErr('Hálózati hiba');
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = '';
      if (vidRef.current) vidRef.current.value = '';
    }
  };

  const handleImgUpload = (e) => upload(Array.from(e.target.files || []).slice(0, 10));

  const handleVidUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const f of files) {
      if (f.size > 25 * 1024 * 1024) { setUploadErr(`"${f.name}" túl nagy (max 25 MB)`); return; }
      const ok = await new Promise(resolve => {
        const url = URL.createObjectURL(f);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration <= 60); };
        v.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        v.src = url;
      });
      if (!ok) { setUploadErr(`"${f.name}" túl hosszú (max 1 perc)`); return; }
    }
    await upload(files);
  };

  const removeItem = async (idx) => {
    const item = items[idx];
    if (item.r2_key) {
      await fetch('/api/website/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2_key: item.r2_key }),
      }).catch(() => {});
    }
    onChange({ ...content, items: items.filter((_, i) => i !== idx) });
  };

  const updateCaption = (idx, caption) =>
    onChange({ ...content, items: items.map((it, i) => i === idx ? { ...it, caption } : it) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {items.length > 0 && (() => {
        const images = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type !== 'video');
        const videos = items.map((it, i) => ({ ...it, _i: i })).filter(it => it.type === 'video');
        const renderCard = (item) => (
          <div key={item._i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {item.type === 'video' ? (
              <div style={{ width: '100%', aspectRatio: '1', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={28} style={{ color: '#94a3b8' }} />
              </div>
            ) : (
              <img src={item.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
            )}
            <button type="button" onClick={() => removeItem(item._i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
            <input type="text" value={item.caption || ''} onChange={e => updateCaption(item._i, e.target.value)} placeholder="Felirat…" style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', fontSize: '0.72rem', padding: '0.3rem 0.4rem', boxSizing: 'border-box' }} />
          </div>
        );
        return (
          <>
            {images.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>{images.map(renderCard)}</div>}
            {images.length > 0 && videos.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Videók</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
            )}
            {videos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>{videos.map(renderCard)}</div>}
          </>
        );
      })()}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <input type="file" ref={imgRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleImgUpload} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => imgRef.current?.click()} disabled={uploading || imgCount >= 25} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
            Képek ({imgCount}/25)
          </button>
        </div>
        <div>
          <input type="file" ref={vidRef} accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={handleVidUpload} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => vidRef.current?.click()} disabled={uploading || vidCount >= 10} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Video size={13} />}
            Videók ({vidCount}/10)
          </button>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Kép: max 15 MB · JPG, PNG, WebP · Videó: max 25 MB, max 1 perc · MP4, MOV, WebM
      </p>
      {uploadErr && <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--danger)' }}>{uploadErr}</p>}
    </div>
  );
}
