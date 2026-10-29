'use client';

import { useState } from 'react';
import { Play, AlertCircle, Loader2, X } from 'lucide-react';
import Lightbox from '@/components/Lightbox';

export default function MediaGrid({ media, onDelete, pendingItems = [] }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media?.length && !pendingItems.length) return null;
  const sorted = [...(media || [])].sort((a, b) => {
    const aVid = a.mime_type?.startsWith('video/') ? 1 : 0;
    const bVid = b.mime_type?.startsWith('video/') ? 1 : 0;
    return aVid - bVid;
  });
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.35rem', marginTop: '0.5rem' }}>
        {pendingItems.map(item => (
          <div key={item.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            {item.preview
              ? <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
              : <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={18} color="#fff" /></div>
            }
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
              {item.status === 'error'
                ? <AlertCircle size={16} color="#fca5a5" />
                : <Loader2 size={16} color="#fff" className="animate-spin" />
              }
            </div>
          </div>
        ))}
        {sorted.map((item, i) => {
          const isVideo = item.mime_type?.startsWith('video/');
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setLightbox(i)}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
                {isVideo
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                      <Play size={20} color="#fff" /><span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Videó</span>
                    </div>
                  : <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </button>
              {onDelete && (
                <button type="button" onClick={() => onDelete(item)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {lightbox !== null && <Lightbox media={sorted} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
