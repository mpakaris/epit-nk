'use client';

import React from 'react';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtHUF(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }

const STATUS_LABELS = { sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };
const STATUS_STYLE = {
  sent:     { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};
const TYPE_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép', transport: 'Szállítás', other: 'Egyéb' };

// ── sidebar killer ────────────────────────────────────────────────────────────
function SidebarKiller() {
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', '0px');
    root.style.setProperty('--mobile-header-h', '0px');
    document.body.style.background = '#f1f5f9';
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

// ── lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = React.useState(startIndex);
  const cur = media[idx];
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
  const isVideo = cur.mime_type?.startsWith('video/');
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      {media.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>}
      {idx > 0 && <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>}
      {idx < media.length - 1 && <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '94vw', maxHeight: '88vh' }}>
        {isVideo
          ? <video src={cur.drive_view_url} controls autoPlay playsInline style={{ maxWidth: '94vw', maxHeight: '88vh', borderRadius: 12 }} />
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '94vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12 }} />
        }
      </div>
    </div>
  );
}

function PhotoGrid({ photos }) {
  const [lb, setLb] = React.useState(null);
  if (!photos || photos.length === 0) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 3, marginTop: '0.65rem', borderRadius: 8, overflow: 'hidden' }}>
        {photos.map((p, i) => {
          const isVideo = p.mime_type?.startsWith('video/');
          return (
            <button key={p.id} onClick={() => setLb(i)} style={{ aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0 }}>
              {isVideo
                ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>▶️</div>
                : <img src={p.thumbnail_url || p.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              }
            </button>
          );
        })}
      </div>
      {lb !== null && <Lightbox media={photos} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ── single entry row ──────────────────────────────────────────────────────────
function EntryRow({ entry, isLast }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.45rem 0', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{entry.work_description}</div>
        <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.1rem' }}>
          <span style={{ marginRight: '0.35rem', color: '#64748b' }}>{TYPE_LABELS[entry.entry_type] || entry.entry_type}</span>
          {entry.quantity != null && entry.unit ? `${entry.quantity} ${entry.unit}` : ''}
          {entry.unit_price ? ` × ${Number(entry.unit_price).toLocaleString('hu-HU')} Ft` : ''}
          {entry.notes ? <span style={{ fontStyle: 'italic', marginLeft: '0.35rem' }}>{entry.notes}</span> : null}
        </div>
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>{fmtHUF(entry.amount_huf)}</div>
    </div>
  );
}

// ── room section ──────────────────────────────────────────────────────────────
function RoomSection({ section }) {
  const hasPhotos = (section.photos || []).length > 0;
  const hasEntries = (section.entries || []).length > 0;
  const roomTotal = (section.entries || []).reduce((s, e) => s + Number(e.amount_huf || 0), 0);

  return (
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
      {/* Room header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>🏠 {section.name}</span>
        {section.size_m2 != null && (
          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>{section.size_m2} m²</span>
        )}
        {roomTotal > 0 && (
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>{fmtHUF(roomTotal)}</span>
        )}
      </div>
      {section.description && (
        <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0 0 0.5rem', lineHeight: 1.55 }}>{section.description}</p>
      )}

      {hasPhotos && <PhotoGrid photos={section.photos} />}

      {hasEntries && (
        <div style={{ marginTop: hasPhotos ? '0.75rem' : '0.25rem' }}>
          {section.entries.map((e, i) => (
            <EntryRow key={e.id} entry={e} isLast={i === section.entries.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── quote card ────────────────────────────────────────────────────────────────
function QuoteCard({ quote, clientId }) {
  const sections = quote.sections || [];
  const allEntries = quote.entries || [];
  const generalEntries = allEntries.filter(e => !e.section_id);

  const net = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate = Number(quote.tax_percent ?? 27);
  const tax = Math.round(net * taxRate / 100);
  const gross = net + tax;
  const ss = STATUS_STYLE[quote.status] || STATUS_STYLE.sent;
  const pdfHref = quote.project_id
    ? `/naplo/${quote.project_id}/ajanlat`
    : `/clients/${clientId}/ajanlat/${quote.id}`;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '1.1rem 1.25rem 0.9rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
            {STATUS_LABELS[quote.status] || quote.status}
          </span>
          {quote.work_type && <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{quote.work_type}</span>}
        </div>

        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem', lineHeight: 1.25 }}>{quote.title}</h3>

        {quote.description && (
          <p style={{ fontSize: '0.855rem', color: '#475569', margin: '0 0 0.55rem', lineHeight: 1.6 }}>{quote.description}</p>
        )}

        {/* Location + dates */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 1rem', fontSize: '0.83rem', color: '#64748b', marginBottom: '0.9rem' }}>
          {quote.location && <span>📍 {quote.location}</span>}
          {(quote.start_date || quote.end_date) && (
            <span>🗓 {quote.start_date ? fmt(quote.start_date) : '—'} – {quote.end_date ? fmt(quote.end_date) : '—'}</span>
          )}
        </div>

        {/* Financial summary */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            {taxRate > 0 ? (
              <>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.1rem' }}>Nettó: <strong style={{ color: '#475569' }}>{fmtHUF(net)}</strong> + ÁFA {taxRate}%: <strong style={{ color: '#475569' }}>{fmtHUF(tax)}</strong></div>
              </>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ÁFA mentes</div>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bruttó összesen</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>{fmtHUF(gross)}</div>
          </div>
          <a href={pdfHref} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.83rem', fontWeight: 700, color: '#fff', background: '#0f172a', borderRadius: 9, padding: '0.55rem 1.1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
            ↓ PDF letöltés
          </a>
        </div>
      </div>

      {/* ── Rooms ── */}
      {sections.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          <div style={{ padding: '0.6rem 1.25rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
            Helyiségek ({sections.length})
          </div>
          {sections.map(s => <RoomSection key={s.id} section={s} />)}
        </div>
      )}

      {/* ── General entries (no room) ── */}
      {generalEntries.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.5rem' }}>
            Általános tételek
          </div>
          {generalEntries.map((e, i) => (
            <EntryRow key={e.id} entry={e} isLast={i === generalEntries.length - 1} />
          ))}
        </div>
      )}

      {/* ── Flat entry list if no rooms ── */}
      {sections.length === 0 && allEntries.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.5rem' }}>
            Tételek
          </div>
          {allEntries.map((e, i) => (
            <EntryRow key={e.id} entry={e} isLast={i === allEntries.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project }) {
  const entries = project.diaryEntries || [];
  const allPhotos = entries.flatMap(e => e.photos || []);

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '1rem 1.25rem 0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>{project.name}</h3>
            {project.description && <p style={{ fontSize: '0.83rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>{project.description}</p>}
          </div>
          {project.invoiceTotal > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.63rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kiadás</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{fmtHUF(project.invoiceTotal)}</div>
            </div>
          )}
        </div>

        {(project.start_date || project.end_date) && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {project.start_date && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>🗓 {fmt(project.start_date)}</span>}
            {project.end_date && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>→ {fmt(project.end_date)}</span>}
          </div>
        )}

        {project.linkedQuote && (
          <div style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', borderRadius: 8, padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid #bfdbfe', marginBottom: '0.5rem' }}>
            📋 Ajánlat: {project.linkedQuote.title}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem 0.5rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.65rem' }}>
            Napló ({entries.length} bejegyzés)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {entries.map(entry => (
              <div key={entry.id}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                  {entry.entry_date && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: '#2563eb', borderRadius: 20, padding: '0.15rem 0.55rem' }}>
                      {fmt(entry.entry_date)}
                    </span>
                  )}
                  {entry.work_type && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.45rem', border: '1px solid #e2e8f0' }}>
                      {entry.work_type}
                    </span>
                  )}
                  {entry.author_name && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{entry.author_name}</span>}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>{entry.title}</h4>
                {entry.body && <p style={{ fontSize: '0.83rem', color: '#475569', margin: '0 0 0.35rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>}
                {entry.client_note && (
                  <div style={{ fontSize: '0.83rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '0.2rem' }}>Megjegyzés</div>
                    {entry.client_note}
                  </div>
                )}
                <PhotoGrid photos={entry.photos} />
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem 1.25rem', fontSize: '0.83rem', color: '#94a3b8', fontStyle: 'italic' }}>
          Még nincs megosztott napló bejegyzés ehhez a projekthez.
        </div>
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function ClientPortal({ client, entity, quotes, projects }) {
  const totalQuoteGross = quotes.reduce((s, q) => {
    const net = (q.entries || []).reduce((a, e) => a + Number(e.amount_huf || 0), 0);
    const tax = Math.round(net * Number(q.tax_percent ?? 27) / 100);
    return s + net + tax;
  }, 0);
  const totalProjectCost = projects.reduce((s, p) => s + (p.invoiceTotal || 0), 0);

  return (
    <>
      <SidebarKiller />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column' }}>

        {/* ── Hero ── */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '2rem 1.25rem 2.5rem' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', opacity: 0.65 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🏗</div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{entity?.name || 'Epitünk'}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: 900, margin: '0 0 0.4rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {client.name}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 1.25rem' }}>Ügyfél portál</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {client.address && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>📍 {client.address}</span>}
              {client.phone && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>📞 {client.phone}</span>}
              {client.email && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>✉ {client.email}</span>}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {quotes.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>Ajánlatok</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{quotes.length} db · {fmtHUF(totalQuoteGross)}</div>
                </div>
              )}
              {projects.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.85rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>Projektek</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{projects.length} db · {fmtHUF(totalProjectCost)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', padding: '1.5rem 1.1rem 1rem' }}>

          {quotes.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.75rem' }}>
                Árajánlatok ({quotes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {quotes.map(q => <QuoteCard key={q.id} quote={q} clientId={client.id} />)}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.75rem' }}>
                Projektek ({projects.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {projects.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {quotes.length === 0 && projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>Még nincsenek ajánlatok vagy projektek.</p>
            </div>
          )}
        </div>

        <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '1rem 1.25rem', marginTop: 'auto' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{entity?.name || 'Epitünk'}</span>
            <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Csak olvasható ügyfél nézet</span>
          </div>
        </footer>
      </div>
    </>
  );
}
