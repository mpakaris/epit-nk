'use client';

import { useState } from 'react';
import { Play, ZoomIn } from 'lucide-react';
import Lightbox from '@/components/Lightbox';

export default function EntryMediaGrid({ photos }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.4rem', marginTop: '0.5rem' }}>
        {photos.map((photo, i) => {
          const isVideo = photo.mime_type?.startsWith('video/');
          return (
            <button key={photo.id} type="button" onClick={() => setLightbox(i)}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0 }}>
              {isVideo ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                  <Play size={22} color="#fff" />
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Videó</span>
                </div>
              ) : (
                <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0'; }}>
                {isVideo ? <Play size={24} color="#fff" /> : <ZoomIn size={20} color="#fff" />}
              </div>
            </button>
          );
        })}
      </div>
      {lightbox !== null && <Lightbox media={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
