'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogOut, CheckCircle2, XCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

// ── constants ─────────────────────────────────────────────────────────────────
const BRAND  = '#0f172a';
const ACCENT = '#2563eb';
const FONT   = "'Plus Jakarta Sans', system-ui, sans-serif";

const STATUS_LABEL = { sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva', draft: 'Tervezet' };
const STATUS_STYLE = {
  sent:     { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};
const TYPE_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép', transport: 'Szállítás', other: 'Egyéb' };

function fmtHUF(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }
function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const cur = media[idx];
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [media.length, onClose]);
  if (!cur) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✕</button>
      {idx > 0 && <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>‹</button>}
      {idx < media.length - 1 && <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 10, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>›</button>}
      {media.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '94vw', maxHeight: '88vh' }}>
        {cur.mime_type?.startsWith('video/')
          ? <video src={cur.drive_view_url} controls autoPlay playsInline style={{ maxWidth: '94vw', maxHeight: '88vh', borderRadius: 12 }} />
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '94vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12 }} />
        }
      </div>
    </div>
  );
}

function PhotoGrid({ photos }) {
  const [lb, setLb] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 3, marginTop: '0.65rem', borderRadius: 8, overflow: 'hidden' }}>
        {photos.map((p, i) => (
          <button key={p.id} onClick={() => setLb(i)} style={{ aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0', border: 'none', cursor: 'pointer', padding: 0 }}>
            {p.mime_type?.startsWith('video/')
              ? <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>▶️</div>
              : <img src={p.thumbnail_url || p.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            }
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox media={photos} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ── entry row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, isLast }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.45rem 0', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: BRAND }}>{entry.work_description}</div>
        <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.1rem' }}>
          <span style={{ marginRight: '0.35rem', color: '#64748b' }}>{TYPE_LABELS[entry.entry_type] || entry.entry_type}</span>
          {entry.quantity != null && entry.unit ? `${entry.quantity} ${entry.unit}` : ''}
          {entry.unit_price ? ` × ${Number(entry.unit_price).toLocaleString('hu-HU')} Ft` : ''}
          {entry.notes ? <span style={{ fontStyle: 'italic', marginLeft: '0.35rem' }}>{entry.notes}</span> : null}
        </div>
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: BRAND, whiteSpace: 'nowrap', paddingTop: '0.1rem' }}>
        {fmtHUF(entry.amount_huf)}
      </div>
    </div>
  );
}

// ── room section ──────────────────────────────────────────────────────────────
function RoomSection({ section }) {
  const hasPhotos  = (section.photos || []).length > 0;
  const hasEntries = (section.entries || []).length > 0;
  const roomTotal  = (section.entries || []).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  return (
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: BRAND }}>🏠 {section.name}</span>
        {section.size_m2 != null && <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>{section.size_m2} m²</span>}
        {roomTotal > 0 && <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>{fmtHUF(roomTotal)}</span>}
      </div>
      {section.description && <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0 0 0.5rem', lineHeight: 1.55 }}>{section.description}</p>}
      {hasPhotos && <PhotoGrid photos={section.photos} />}
      {hasEntries && (
        <div style={{ marginTop: hasPhotos ? '0.75rem' : '0.25rem' }}>
          {section.entries.map((e, i) => <EntryRow key={e.id} entry={e} isLast={i === section.entries.length - 1} />)}
        </div>
      )}
    </div>
  );
}

// ── quote card ────────────────────────────────────────────────────────────────
function QuoteCard({ quote, onRespond }) {
  const [expanded, setExpanded] = useState(false);
  const [responding, setResponding] = useState(false);
  const allEntries    = quote.entries || [];
  const sections      = quote.sections || [];
  const generalEntries = allEntries.filter(e => !e.section_id);
  const net           = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate       = Number(quote.tax_percent ?? 27);
  const tax           = Math.round(net * taxRate / 100);
  const gross         = net + tax;
  const ss            = STATUS_STYLE[quote.status] || STATUS_STYLE.sent;
  const canRespond    = quote.status === 'sent' && !!onRespond;
  const hasDetail     = sections.length > 0 || allEntries.length > 0;

  const respond = async (action) => {
    setResponding(true);
    try {
      await onRespond(quote.id, action);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* Header */}
      <div style={{ padding: '1.1rem 1.25rem 0.9rem' }}>

        {/* Status + sent date row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: 99, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {quote.status === 'sent'     && '⏳ '}
            {quote.status === 'accepted' && '✅ '}
            {quote.status === 'rejected' && '❌ '}
            {STATUS_LABEL[quote.status] || quote.status}
          </span>
          {quote.created_at && (
            <span style={{ fontSize: '0.775rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Kiküldve: <strong style={{ color: '#64748b' }}>{fmt(quote.created_at)}</strong>
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: BRAND, margin: '0 0 0.3rem', lineHeight: 1.25 }}>{quote.title}</h3>

        {quote.work_type && <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, margin: '0 0 0.3rem' }}>{quote.work_type}</p>}

        {quote.description && <p style={{ fontSize: '0.855rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.6 }}>{quote.description}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 1rem', fontSize: '0.83rem', color: '#64748b', marginBottom: '0.85rem' }}>
          {quote.location && <span>📍 {quote.location}</span>}
          {(quote.start_date || quote.end_date) && <span>🗓 {quote.start_date ? fmt(quote.start_date) : '—'} – {quote.end_date ? fmt(quote.end_date) : '—'}</span>}
        </div>

        {/* Financial summary */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: canRespond ? '0.85rem' : 0 }}>
          {taxRate > 0 && (
            <div style={{ fontSize: '0.775rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
              Nettó: <strong style={{ color: '#475569' }}>{fmtHUF(net)}</strong>
              {' + '}ÁFA {taxRate}%: <strong style={{ color: '#475569' }}>{fmtHUF(tax)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Bruttó összesen</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.2rem', color: BRAND }}>{fmtHUF(gross)}</div>
            </div>
            {hasDetail && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: FONT }}
              >
                {expanded ? <><ChevronUp size={14} /> Elrejt</> : <><ChevronDown size={14} /> Részletek</>}
              </button>
            )}
          </div>
        </div>

        {/* Accept / decline */}
        {canRespond && (
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => respond('accepted')}
              disabled={responding}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, color: '#15803d', fontWeight: 700, fontSize: '0.875rem', cursor: responding ? 'not-allowed' : 'pointer', fontFamily: FONT, opacity: responding ? 0.6 : 1 }}
            >
              {responding ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={15} />}
              Elfogadom
            </button>
            <button
              type="button"
              onClick={() => respond('rejected')}
              disabled={responding}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontWeight: 700, fontSize: '0.875rem', cursor: responding ? 'not-allowed' : 'pointer', fontFamily: FONT, opacity: responding ? 0.6 : 1 }}
            >
              {responding ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={15} />}
              Elutasítom
            </button>
          </div>
        )}
      </div>

      {/* Expandable detail */}
      {expanded && (
        <>
          {sections.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <div style={{ padding: '0.5rem 1.25rem 0.2rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>
                Helyiségek ({sections.length})
              </div>
              {sections.map(s => <RoomSection key={s.id} section={s} />)}
            </div>
          )}
          {generalEntries.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                {sections.length > 0 ? 'Általános tételek' : 'Tételek'}
              </div>
              {generalEntries.map((e, i) => <EntryRow key={e.id} entry={e} isLast={i === generalEntries.length - 1} />)}
            </div>
          )}
          {sections.length === 0 && allEntries.length > 0 && generalEntries.length === 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.85rem 1.25rem' }}>
              {allEntries.map((e, i) => <EntryRow key={e.id} entry={e} isLast={i === allEntries.length - 1} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project }) {
  const [expanded, setExpanded] = useState(false);
  const entries    = project.diaryEntries || [];
  const hasContent = entries.length > 0;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '1rem 1.25rem 0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: BRAND, margin: '0 0 0.25rem' }}>{project.name}</h3>
            {project.description && <p style={{ fontSize: '0.83rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>{project.description}</p>}
          </div>
          {project.invoiceTotal > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kiadás</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: BRAND }}>{fmtHUF(project.invoiceTotal)}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
          {project.start_date && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>🗓 {fmt(project.start_date)}</span>}
          {project.end_date   && <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.5rem', border: '1px solid #e2e8f0' }}>→ {fmt(project.end_date)}</span>}
          {project.linkedQuote && (
            <span style={{ fontSize: '0.72rem', color: ACCENT, background: '#eff6ff', borderRadius: 20, padding: '0.1rem 0.55rem', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              📋 {project.linkedQuote.title}
            </span>
          )}
        </div>

        {hasContent && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{ marginTop: '0.65rem', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: FONT }}
          >
            {expanded ? <><ChevronUp size={13} /> Napló elrejtése</> : <><ChevronDown size={13} /> Napló megtekintése ({entries.length})</>}
          </button>
        )}
      </div>

      {expanded && entries.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.9rem 1.25rem 0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {entries.map(entry => (
              <div key={entry.id}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                  {entry.entry_date && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: ACCENT, borderRadius: 20, padding: '0.15rem 0.55rem' }}>{fmt(entry.entry_date)}</span>}
                  {entry.work_type  && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', borderRadius: 20, padding: '0.1rem 0.45rem', border: '1px solid #e2e8f0' }}>{entry.work_type}</span>}
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: BRAND, margin: '0 0 0.25rem' }}>{entry.title}</h4>
                {entry.body && <p style={{ fontSize: '0.83rem', color: '#475569', margin: '0 0 0.35rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.body}</p>}
                {entry.client_note && (
                  <div style={{ fontSize: '0.83rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '0.2rem' }}>Megjegyzés</div>
                    {entry.client_note}
                  </div>
                )}
                <PhotoGrid photos={entry.photos || []} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── contractor section ────────────────────────────────────────────────────────
function ContractorSection({ contractor, onRespond }) {
  const pendingCount = contractor.quotes.filter(q => q.status === 'sent').length;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Contractor header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>🏗</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: BRAND }}>{contractor.contractor_name}</div>
          {contractor.contractor_email && <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>{contractor.contractor_email}</div>}
        </div>
        {pendingCount > 0 && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 99, padding: '0.2rem 0.65rem', whiteSpace: 'nowrap' }}>
            {pendingCount} várakozó ajánlat
          </span>
        )}
      </div>

      {/* Quotes */}
      {contractor.quotes.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.65rem', paddingLeft: '0.25rem' }}>
            Ajánlatok ({contractor.quotes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {contractor.quotes.map(q => (
              <QuoteCard key={q.id} quote={q} onRespond={onRespond} />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {contractor.projects.length > 0 && (
        <div>
          <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.65rem', paddingLeft: '0.25rem' }}>
            Projektek ({contractor.projects.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {contractor.projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      {contractor.quotes.length === 0 && contractor.projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#94a3b8' }}>
          Még nincsenek ajánlatok vagy projektek.
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function PortalDashboardPage() {
  const router                        = useRouter();
  const searchParams                  = useSearchParams();
  const asEmail                       = searchParams.get('as'); // SA impersonation
  const [supabase]                    = useState(() => createClient());
  const [email, setEmail]             = useState('');
  const [saMode, setSaMode]           = useState(false);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (asEmail) {
      // SA impersonation mode — verify SA via profile API, skip OTP check
      fetch('/api/auth/profile')
        .then(r => r.json())
        .then(({ profile }) => {
          if (profile?.role !== 'superadmin') { router.replace('/portal'); return; }
          setSaMode(true);
          setEmail(asEmail);
          fetchData(asEmail);
        })
        .catch(() => router.replace('/portal'));
    } else {
      // Normal client OTP session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.replace('/portal'); return; }
        setEmail(session.user.email || '');
        fetchData(null);
      });
    }
  }, [asEmail]);

  const fetchData = useCallback(async (overrideEmail) => {
    setLoading(true);
    setError('');
    try {
      const url  = overrideEmail
        ? `/api/portal/data?email=${encodeURIComponent(overrideEmail)}`
        : '/api/portal/data';
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      setContractors(data.contractors || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRespond = async (quoteId, action) => {
    const res  = await fetch(`/api/portal/quotes/${quoteId}/respond`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action }),
    });
    if (!res.ok) return;
    // Update local state
    setContractors(prev => prev.map(c => ({
      ...c,
      quotes: c.quotes.map(q => q.id === quoteId ? { ...q, status: action } : q),
    })));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/portal');
  };

  const totalPending = contractors.reduce((s, c) => s + c.quotes.filter(q => q.status === 'sent').length, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: FONT, WebkitFontSmoothing: 'antialiased' }}>

      {/* SA impersonation banner */}
      {saMode && (
        <div style={{ background: '#854d0e', color: '#fef9c3', padding: '0.4rem 1rem', fontSize: '0.775rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: FONT }}>
          <span style={{ flex: 1 }}>👁 Superadmin nézet: {email}</span>
          <button
            type="button"
            onClick={() => router.push('/superadmin/portals')}
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', color: '#fef9c3', fontWeight: 700, fontSize: '0.75rem', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ArrowLeft size={12} /> Vissza
          </button>
        </div>
      )}

      {/* Top bar */}
      <div style={{ position: 'sticky', top: saMode ? 32 : 0, zIndex: 100, background: BRAND, boxShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', height: 52 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🏗</div>
          <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ügyfél portál
          </span>
          {email && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexShrink: 0, display: 'none', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} className="portal-email">{email}</span>}
          {!saMode && (
            <button
              type="button"
              onClick={handleLogout}
              title="Kijelentkezés"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', fontWeight: 600, fontFamily: FONT, flexShrink: 0 }}
            >
              <LogOut size={13} /> Kilépés
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* Welcome + pending badge */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: BRAND, margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
            Üdvözöllek!
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            {email && <><strong style={{ color: BRAND }}>{email}</strong> · </>}
            {contractors.length === 0 && !loading ? 'Még nem kapcsoltak hozzád ajánlatot.' : `${contractors.length} vállalkozó`}
          </p>
          {totalPending > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 99, padding: '0.3rem 0.85rem', fontSize: '0.825rem', fontWeight: 700, color: '#a16207' }}>
              ⏳ {totalPending} ajánlat vár a visszajelzésedre
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Adatok betöltése…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', color: '#b91c1c', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!loading && !error && contractors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <p style={{ fontWeight: 700, color: BRAND, margin: '0 0 0.4rem' }}>Még nincs tartalom</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              Amikor egy vállalkozó ajánlatot küld vagy projektet rögzít neked,<br />az itt fog megjelenni.
            </p>
          </div>
        )}

        {!loading && contractors.map(c => (
          <ContractorSection key={c.owner_id} contractor={c} onRespond={saMode ? null : handleRespond} />
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 480px) { .portal-email { display: block !important; } }
      `}</style>
    </div>
  );
}
