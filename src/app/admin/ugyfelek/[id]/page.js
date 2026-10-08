'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Percent,
  FolderKanban,
  FileText,
  Coins,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Vázlat',
  sent: 'Kiküldve',
  accepted: 'Elfogadva',
  rejected: 'Elutasítva'
};

const STATUS_COLORS = {
  draft: { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' }
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const { isAdmin, loading, dataReady, clients, quotes, quoteEntries, projects, invoices } = useApp();
  const [copied, setCopied] = useState(false);

  const copyPortalUrl = () => {
    const url = `${window.location.origin}/clients/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };


  if (loading || !dataReady) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza</Link>
      </div>
    );
  }

  const client = clients.find(c => c.id === id);
  if (!client) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Az ügyfél nem található</h2>
        <Link href="/admin/ugyfelek" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  // Include projects directly linked to the client AND those converted from a client quote
  const clientProjects = projects.filter(p => p.client_id === client.id || quoteProjectIds.has(p.id));

  const totalQuoteValue = clientQuotes.reduce((sum, q) => {
    const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    return sum + qTotal;
  }, 0);

  const totalInvoiceValue = clientProjects.reduce((sum, p) => {
    return sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  }, 0);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/admin/ugyfelek" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ügyfelekhez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> Ügyfél részletek
          </div>
          <h1 className="page-title">{client.name}</h1>
          {client.notes && <p className="page-subtitle">{client.notes}</p>}
        </div>
      </div>

      {/* Client Info Card */}
      <div className="card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Phone size={16} color="var(--accent)" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Mail size={16} color="var(--accent)" />
              <a href={`mailto:${client.email}`} style={{ color: 'var(--accent)' }}>{client.email}</a>
            </div>
          )}
          {client.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <MapPin size={16} color="var(--accent)" />
              <span>{client.address}</span>
            </div>
          )}
          {client.discount_percent > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Percent size={16} color="var(--warning)" />
              <span style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{client.discount_percent}% hűségkedvezmény</span>
            </div>
          )}
        </div>
      </div>

      {/* Portal URL */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              Ügyfél portál URL
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/clients/${id}` : `/clients/${id}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" onClick={copyPortalUrl} className="btn btn-secondary btn-sm">
              {copied ? <><Check size={13} /> Másolva!</> : <><Copy size={13} /> Másolás</>}
            </button>
            <a href={`/clients/${id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              <ExternalLink size={13} /> Előnézet
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Ajánlatok</div>
          <div className="stat-value">{clientQuotes.length} db</div>
          <div className="stat-sub">összesen {formatHUF(totalQuoteValue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Megvalósult projektek</div>
          <div className="stat-value">{clientProjects.length} db</div>
          <div className="stat-sub">{formatHUF(totalInvoiceValue)} kiadás</div>
        </div>
      </div>

      {/* Quotes */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={18} color="var(--accent)" /> Ajánlatok ({clientQuotes.length})
        </h2>
      </div>

      {clientQuotes.length === 0 ? (
        <div className="card mb-6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Nincs ajánlat ehhez az ügyfélhez.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {clientQuotes.map(q => {
            const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
            return (
              <div key={q.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{q.title}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {q.location && <span>{q.location} · </span>}
                    {formatDate(q.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(qTotal)}</span>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                    {STATUS_LABELS[q.status]}
                  </span>
                  <Link href={`/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    Részletek
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Projects */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FolderKanban size={18} color="var(--accent)" /> Megvalósult projektek ({clientProjects.length})
        </h2>
      </div>

      {clientProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Nincs megvalósult projekt ehhez az ügyfélhez.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clientProjects.map(p => {
            const pCost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <div key={p.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Coins size={14} color="var(--accent)" /> {formatHUF(pCost)}
                  </span>
                  <Link href={`/projektek/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    Részletek
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
