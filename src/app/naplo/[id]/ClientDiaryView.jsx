'use client';

import React from 'react';

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtShort(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

// ── Fix sidebar offset ────────────────────────────────────────────────────────
function SidebarKiller() {
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', '0px');
    root.style.setProperty('--mobile-header-h', '0px');
    document.body.style.background = '#f1f5f9';
    // Also directly zero the app-main element in case it already got padding applied
    const main = document.querySelector('.app-main');
    if (main) { main.style.paddingTop = '0'; main.style.marginLeft = '0'; }
    return () => {
      root.style.removeProperty('--sidebar-w');
      root.style.removeProperty('--mobile-header-h');
      document.body.style.background = '';
      if (main) { main.style.paddingTop = ''; main.style.marginLeft = ''; }
    };
  }, []);
  return null;
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = React.useState(startIndex);
  const cur = media[idx];
  const isVideo = cur?.mime_type?.startsWith('video/');

  React.useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [media.length, onClose]);

  if (!cur) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>✕</button>
      {media.length > 1 && <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>}
      {idx > 0 && <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>}
      {idx < media.length - 1 && <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '94vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
        {isVideo
          ? <video src={cur.drive_view_url} controls autoPlay playsInline style={{ maxWidth: '94vw', maxHeight: '82vh', borderRadius: 12, background: '#000' }} />
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '94vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 12 }} />
        }
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', maxWidth: '94vw', padding: '0.15rem 0' }}>
            {media.map((m, i) => (
              <button key={m.id} onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 7, overflow: 'hidden', border: i === idx ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0, background: '#1e293b' }}>
                {m.mime_type?.startsWith('video/')
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>▶</div>
                  : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Photo grid ────────────────────────────────────────────────────────────────
function PhotoGrid({ photos }) {
  const [lb, setLb] = React.useState(null);
  if (!photos || photos.length === 0) return null;
  const show = photos.slice(0, 9);
  const extra = photos.length - 9;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : photos.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 3, marginTop: '1rem', borderRadius: 12, overflow: 'hidden' }}>
        {show.map((p, i) => {
          const isVideo = p.mime_type?.startsWith('video/');
          const isLast = i === show.length - 1 && extra > 0;
          return (
            <button key={p.id} onClick={() => setLb(i)}
              style={{ aspectRatio: photos.length === 1 ? '16/9' : '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0, position: 'relative', display: 'block' }}>
              {isVideo
                ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: photos.length === 1 ? '2.5rem' : '1.5rem' }}>▶️</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Videó</span>
                  </div>
                : <img src={p.thumbnail_url || p.drive_view_url} alt="" loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isLast ? 'brightness(0.45)' : 'none' }} />
              }
              {isLast && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.35rem', fontWeight: 800 }}>
                  +{extra + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {lb !== null && <Lightbox media={photos} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, index }) {
  const dateStr = fmtShort(entry.entry_date);
  const fullDate = fmt(entry.entry_date);

  return (
    <article style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '0.15rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', lineHeight: 1 }}>
            {dateStr ? dateStr.replace('.', '').split(' ')[0] : ''}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {dateStr ? dateStr.replace('.', '').split(' ')[1] : index + 1}
          </span>
        </div>
        <div style={{ width: 1, flex: 1, background: '#e2e8f0', minHeight: 20, marginTop: 4 }} />
      </div>

      {/* Card */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: '1rem' }}>
        <div style={{ padding: '1rem 1.1rem 0.9rem' }}>
          {/* Top meta */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
              {entry.work_type && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '0.18rem 0.6rem', border: '1px solid #bfdbfe' }}>
                  {entry.work_type}
                </span>
              )}
              {entry.author_name && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                  {entry.author_name}
                </span>
              )}
            </div>
            {fullDate && (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {fullDate}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
            {entry.title}
          </h3>

          {/* Body */}
          {entry.body && (
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {entry.body}
            </p>
          )}

          {/* Client note */}
          {entry.client_note && (
            <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', border: '1px solid #bae6fd', borderRadius: 10, padding: '0.7rem 0.9rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#0284c7', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                💬 Megjegyzés
              </div>
              <p style={{ fontSize: '0.875rem', color: '#0c4a6e', margin: 0, lineHeight: 1.6 }}>
                {entry.client_note}
              </p>
            </div>
          )}
        </div>

        {/* Photos flush to card edge */}
        {entry.photos && entry.photos.length > 0 && (
          <div style={{ padding: '0 1.1rem 1rem' }}>
            <PhotoGrid photos={entry.photos} />
          </div>
        )}
      </div>
    </article>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ClientDiaryView({ project, client, entity, entries }) {
  return (
    <>
      <SidebarKiller />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

        {/* ── Hero header ── */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '2rem 1.25rem 2.5rem' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem', opacity: 0.7 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🏗</div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{entity?.name || 'Epitünk'}</span>
            </div>

            {/* Project name */}
            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900, margin: '0 0 0.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                {project.description}
              </p>
            )}

            {/* Info pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {client && (
                <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>Megrendelő</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{client.name}</div>
                  {client.address && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.1rem' }}>📍 {client.address}</div>}
                </div>
              )}
              {(project.start_date || project.end_date) && (
                <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>Időszak</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                    {fmt(project.start_date) || '–'}{project.end_date ? ` → ${fmt(project.end_date)}` : ''}
                  </div>
                </div>
              )}
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>Bejegyzések</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{entries.length} db</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Entries ── */}
        <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '1.75rem 1.1rem 0.5rem' }}>
          {entries.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600, margin: 0 }}>
                Még nincsenek nyilvános bejegyzések ehhez a projekthez.
              </p>
            </div>
          ) : (
            <div>
              {entries.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer style={{ padding: '1.5rem 1.25rem', marginTop: 'auto', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 22, height: 22, borderRadius: 5, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>🏗</div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{entity?.name || 'Epitünk'}</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Projekt dokumentáció · Csak olvasásra</span>
          </div>
        </footer>

      </div>
    </>
  );
}
