'use client';

import { useState } from 'react';
import { ZoomIn, Play } from 'lucide-react';
import Lightbox from '@/components/Lightbox';
import MediaThumb from '@/components/MediaThumb';

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
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}>
              <MediaThumb item={photo} radius={8} />
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
