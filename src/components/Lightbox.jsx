'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

/**
 * Media lightbox with keyboard navigation and thumbnail strip.
 *
 * Each item may have:
 *   url | drive_view_url   — primary media URL (one is required)
 *   thumbnailUrl | thumbnail_url — thumbnail for the strip (falls back to url)
 *   mime_type              — 'video/*' triggers video player
 *   type                   — 'video' also triggers video player
 *   id                     — React key (falls back to index)
 *   alt                    — alt text for images
 */
export default function Lightbox({ media, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const cur = media[idx];
  useScrollLock(true);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [media.length, onClose]);

  if (!cur) return null;

  const src    = cur.url || cur.cdn_url || cur.drive_view_url;
  const thumb  = (m) => m.thumbnailUrl || m.thumbnail_url || m.url || m.cdn_url || m.drive_view_url;
  const isVid  = (m) => m.mime_type?.startsWith('video/') || m.type === 'video';
  const showThumbs = media.length > 1;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 2000,
               display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Close */}
      <button
        type="button" onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)',
                 border: 'none', borderRadius: '50%', width: 40, height: 40,
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 cursor: 'pointer', color: '#fff', zIndex: 10 }}
      >
        <X size={20} />
      </button>

      {/* Counter */}
      {showThumbs && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
                      color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontWeight: 600 }}>
          {idx + 1} / {media.length}
        </div>
      )}

      {/* Prev */}
      {idx > 0 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)',
                   border: 'none', borderRadius: '50%', width: 44, height: 44,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   cursor: 'pointer', color: '#fff' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next */}
      {idx < media.length - 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)',
                   border: 'none', borderRadius: '50%', width: 44, height: 44,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   cursor: 'pointer', color: '#fff' }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Media + thumbnail strip */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex',
                 flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
      >
        {isVid(cur)
          ? <video src={src} controls autoPlay playsInline
                   style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} />
          : <img src={src} alt={cur.alt || ''} loading="lazy"
                 style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
        }
        {cur.caption && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0,
                      padding: '0 1rem', textAlign: 'center', maxWidth: '80vw' }}>
            {cur.caption}
          </p>
        )}

        {showThumbs && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto',
                        maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button
                key={m.id ?? i}
                type="button"
                onClick={() => setIdx(i)}
                style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden',
                         border: i === idx ? '2px solid var(--accent)' : '2px solid transparent',
                         background: '#222', cursor: 'pointer', padding: 0 }}
              >
                {isVid(m)
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                  : <img src={thumb(m)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
