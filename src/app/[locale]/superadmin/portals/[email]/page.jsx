'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, ExternalLink, Building2 } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

// ── constants ─────────────────────────────────────────────────────────────────

const BRAND  = '#0f172a';
const ACCENT = '#2563eb';

const STATUS_LABEL = { sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected' };
const STATUS_STYLE = {
  sent:     { bg: '#fefce8', color: '#a16207',  border: '#fde68a' },
  accepted: { bg: '#f0fdf4', color: '#15803d',  border: '#bbf7d0' },
  rejected: { bg: '#fef2f2', color: '#b91c1c',  border: '#fecaca' },
};
const TYPE_LABELS = { material: 'Material', labour: 'Labour', equipment: 'Equipment', transport: 'Transport', other: 'Other' };

function fmtHUF(n) { return Number(n || 0).toLocaleString('hu-HU') + ' Ft'; }
function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── sub-components ────────────────────────────────────────────────────────────

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
      <div
        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: allEntries.length ? 'pointer' : 'default' }}
        onClick={() => allEntries.length && setOpen(v => !v)}
      >
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.55rem', borderRadius: 99, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0 }}>
          {STATUS_LABEL[quote.status] || quote.status}
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: BRAND, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {quote.title}
        </span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569', flexShrink: 0 }}>
          {fmtHUF(net + tax)}
        </span>
        {allEntries.length > 0 && (open
          ? <ChevronUp size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
        )}
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
  const quotes  = project.quotes || [];
  const invoices = project.invoices || [];
  const labour   = project.labourEntries || [];
  const diary    = project.diaryEntries || [];
  const hasDetail = quotes.length + invoices.length + labour.length + diary.length > 0;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div
        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: hasDetail ? 'pointer' : 'default' }}
        onClick={() => hasDetail && setOpen(v => !v)}
      >
        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: BRAND, minWidth: 0 }}>
          {project.name}
          {project.description && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '0.4rem', fontSize: '0.825rem' }}>{project.description}</span>}
        </span>
        {project.invoiceTotal > 0 && (
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.825rem', color: '#475569', flexShrink: 0 }}>
            {fmtHUF(project.invoiceTotal)}
          </span>
        )}
        {hasDetail && (open
          ? <ChevronUp size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
        )}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          {/* Quotes linked to project */}
          {quotes.map(q => (
            <div key={q.id} style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
              <QuoteRow quote={q} />
            </div>
          ))}

          {/* Invoices */}
          {invoices.map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #f1f5f9', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: BRAND }}>{inv.description || '—'}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{inv.category} · {fmtDate(inv.created_at)}</div>
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569', flexShrink: 0 }}>
                {fmtHUF(inv.value_huf)}
              </div>
            </div>
          ))}

          {/* Labour entries */}
          {labour.map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', borderBottom: '1px solid #f1f5f9', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: BRAND }}>{l.labour_type}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {l.hours != null ? `${l.hours} ${l.unit || 'h'}` : ''}
                  {l.date ? ` · ${fmtDate(l.date)}` : ''}
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#475569', flexShrink: 0 }}>
                {fmtHUF(l.value_huf)}
              </div>
            </div>
          ))}

          {/* Diary entries */}
          {diary.map(e => (
            <div key={e.id} style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                {e.entry_date && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: ACCENT, color: '#fff', borderRadius: 99, padding: '0.1rem 0.5rem' }}>
                    {fmtDate(e.entry_date)}
                  </span>
                )}
                {e.work_type && (
                  <span style={{ fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', borderRadius: 99, padding: '0.1rem 0.45rem', border: '1px solid #e2e8f0' }}>
                    {e.work_type}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: BRAND }}>{e.title}</div>
              {e.body && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e.body}</p>}
            </div>
          ))}
        </div>
      )}
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

  const totalQuotes   = contractors.reduce((s, c) => s + (c.standaloneQuotes?.length || 0) + c.projects.reduce((ps, p) => ps + (p.quotes?.length || 0), 0), 0);
  const totalProjects = contractors.reduce((s, c) => s + c.projects.length, 0);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin/portals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Client Portals
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem' }}>{clientEmail}</h1>
          <p className="page-subtitle">
            {contractors.length} {contractors.length === 1 ? 'contractor' : 'contractors'}
            {' · '}{totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'}
            {' · '}{totalProjects} {totalProjects === 1 ? 'project' : 'projects'}
            {' · '}Superadmin view
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {!error && contractors.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          No client records found for this email address.
        </div>
      )}

      {contractors.map(c => {
        const standaloneQuotes = c.standaloneQuotes || [];
        const projects         = c.projects || [];

        return (
          <div key={c.owner_id} style={{ marginBottom: '2rem' }}>
            {/* Contractor header */}
            <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={16} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.contractor_name}</div>
                {c.contractor_email && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{c.contractor_email}</div>}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {standaloneQuotes.length + projects.reduce((s, p) => s + (p.quotes?.length || 0), 0)} {standaloneQuotes.length + projects.reduce((s, p) => s + (p.quotes?.length || 0), 0) === 1 ? 'quote' : 'quotes'}
                {' · '}
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </div>
            </div>

            {/* Standalone quotes (no project) */}
            {standaloneQuotes.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                  Standalone Quotes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {standaloneQuotes.map(q => <QuoteRow key={q.id} quote={q} />)}
                </div>
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                  Projects
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {projects.map(p => <ProjectRow key={p.id} project={p} />)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
