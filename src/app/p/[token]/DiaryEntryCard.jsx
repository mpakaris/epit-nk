'use client';

import React from 'react';

function PublicMediaGrid({ photos }) {
  const [selected, setSelected] = React.useState(null);
  if (!photos || photos.length === 0) return null;

  const current = selected !== null ? photos[selected] : null;
  const isVideo = current?.mime_type?.startsWith('video/');

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 2 }}>
        {photos.map((photo, i) => {
          const vid = photo.mime_type?.startsWith('video/');
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(i)}
              style={{ display: 'block', aspectRatio: '1', overflow: 'hidden', background: '#f0f0f0', border: 'none', cursor: 'pointer', padding: 0, position: 'relative' }}
            >
              {vid ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.3rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>▶️</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>VIDEO</span>
                </div>
              ) : photo.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📷</div>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && current && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button type="button" onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.2rem' }}>✕</button>
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>{selected + 1} / {photos.length}</div>
          {selected > 0 && (
            <button type="button" onClick={e => { e.stopPropagation(); setSelected(s => s - 1); }} style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.3rem' }}>‹</button>
          )}
          {selected < photos.length - 1 && (
            <button type="button" onClick={e => { e.stopPropagation(); setSelected(s => s + 1); }} style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.3rem' }}>›</button>
          )}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh' }}>
            {isVideo
              ? <video src={current.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, background: '#000' }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={current.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
            }
          </div>
        </div>
      )}
    </>
  );
}

export default function DiaryEntryCard({ entry }) {
  const dateStr = entry.entry_date
    ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {dateStr && (
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#fff', background: '#3b82f6', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
              {dateStr}
            </span>
          )}
          {entry.work_type && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#555', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '0.15rem 0.55rem' }}>
              {entry.work_type}
            </span>
          )}
          {entry.author_name && (
            <span style={{ fontSize: '0.775rem', color: '#888' }}>{entry.author_name}</span>
          )}
        </div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1a2e', margin: '0 0 0.35rem' }}>{entry.title}</h2>
        {entry.body && (
          <p style={{ fontSize: '0.875rem', color: '#444', margin: '0 0 0.65rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>
        )}
        {entry.client_note && (
          <div style={{ fontSize: '0.85rem', color: '#334155', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.6rem 0.85rem', lineHeight: 1.55 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Megjegyzés
            </div>
            {entry.client_note}
          </div>
        )}
      </div>
      <PublicMediaGrid photos={entry.photos} />
    </div>
  );
}
