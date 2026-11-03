'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

// ── helpers & sub-components ─────────────────────────────────────────────────
// Imported inline to avoid cross-app imports; mirrors portal/dashboard visual style.

const BRAND  = '#0f172a';
const ACCENT = '#2563eb';
const FONT   = "'Plus Jakarta Sans', system-ui, sans-serif";

const STATUS_LABEL = { sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };
const STATUS_STYLE = {
  sent:     { bg: '#fefce8', color: '#a16207',  border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d',  border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c',  border: '#fecaca' },
};
const TYPE_LABELS = { material: 'Anyag', labour: 'Munka', equipment: 'Gép', transport: 'Szállítás', other: 'Egyéb' };

function fmtHUF(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }
function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function EntryRow({ entry, isLast }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4rem 0', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: BRAND }}>{entry.work_description}</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
          <span style={{ marginRight: '0.35rem', color: '#64748b' }}>{TYPE_LABELS[entry.entry_type] || entry.entry_type}</span>
          {entry.quantity != null && entry.unit ? `${entry.quantity} ${entry.unit}` : ''}
          {entry.unit_price ? ` × ${Number(entry.unit_price).toLocaleString('hu-HU')} Ft` : ''}
        </div>
      </div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: BRAND, whiteSpace: 'nowrap' }}>
        {fmtHUF(entry.amount_huf)}
      </div>
    </div>
  );
}

function QuoteRow({ quote }) {
  const [open, setOpen] = useState(false);
  const allEntries = quote.entries || [];
  const sections   = quote.sections || [];
  const net        = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const tax        = Math.round(net * Number(quote.tax_percent ?? 27) / 100);
  const ss         = STATUS_STYLE[quote.status] || STATUS_STYLE.sent;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.55rem', borderRadius: 99, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0 }}>
          {STATUS_LABEL[quote.status] || quote.status}
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: BRAND, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {quote.title}
        </span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569', flexShrink: 0 }}>
          {fmtHUF(net + tax)}
        </span>
        {open ? <ChevronUp size={14} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
      </div>
      {open && allEntries.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.75rem 1rem' }}>
          {sections.length > 0
            ? sections.map(s => (
                <div key={s.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{s.name}</div>
                  {s.entries.map((e, i) => <EntryRow key={e.id} entry={e} isLast={i === s.entries.length - 1} />)}
                </div>
              ))
            : allEntries.map((e, i) => <EntryRow key={e.id} entry={e} isLast={i === allEntries.length - 1} />)
          }
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project }) {
  const [open, setOpen] = useState(false);
  const diary = project.diaryEntries || [];
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: diary.length ? 'pointer' : 'default' }} onClick={() => diary.length && setOpen(v => !v)}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: BRAND, minWidth: 0 }}>
          {project.name}
          {project.description && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '0.4rem', fontSize: '0.825rem' }}>{project.description}</span>}
        </span>
        {project.invoiceTotal > 0 && <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.825rem', color: '#475569', flexShrink: 0 }}>{fmtHUF(project.invoiceTotal)}</span>}
        {diary.length > 0 && (open ? <ChevronUp size={14} style={{ color: '#94a3b8', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />)}
      </div>
      {open && diary.map(e => (
        <div key={e.id} style={{ borderTop: '1px solid #f1f5f9', padding: '0.65rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            {e.entry_date && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: ACCENT, color: '#fff', borderRadius: 99, padding: '0.1rem 0.5rem' }}>{fmt(e.entry_date)}</span>}
            {e.work_type  && <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', borderRadius: 99, padding: '0.1rem 0.45rem', border: '1px solid #e2e8f0' }}>{e.work_type}</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: BRAND }}>{e.title}</div>
          {e.body && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e.body}</p>}
        </div>
      ))}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function SAPortalViewPage() {
  const params  = useParams();
  const router  = useRouter();
  const { isSuperAdmin, loading, dataReady } = useApp();
  const clientEmail = decodeURIComponent(params.email || '');

  const [contractors, setContractors] = useState([]);
  const [fetching, setFetching]       = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!dataReady) return;
    if (!isSuperAdmin) { router.replace('/dashboard'); return; }
    fetch(`/api/portal/data?email=${encodeURIComponent(clientEmail)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setContractors(data.contractors || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setFetching(false));
  }, [dataReady, isSuperAdmin, clientEmail]);

  if (loading || !dataReady || fetching) return <PageSpinner />;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin/portals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Portálok listája
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem' }}>{clientEmail}</h1>
          <p className="page-subtitle">{contractors.length} vállalkozó · Superadmin nézet</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {!error && contractors.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          Ehhez az email-címhez nem tartozik ügyfél rekord.
        </div>
      )}

      {contractors.map(c => (
        <div key={c.owner_id} style={{ marginBottom: '2rem' }}>
          {/* Contractor header */}
          <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.9rem' }}>🏗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.contractor_name}</div>
              {c.contractor_email && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{c.contractor_email}</div>}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {c.quotes.length} ajánlat · {c.projects.length} projekt
            </div>
          </div>

          {/* Quotes */}
          {c.quotes.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                Ajánlatok
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {c.quotes.map(q => <QuoteRow key={q.id} quote={q} />)}
              </div>
            </div>
          )}

          {/* Projects */}
          {c.projects.length > 0 && (
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                Projektek
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {c.projects.map(p => <ProjectRow key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
