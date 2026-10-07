'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { FileText, ArrowLeft, ArrowUpRight, Building2, Search } from 'lucide-react';

const STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',    color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent:     { bg: 'var(--warning-bg)',  color: 'var(--warning-text)',  border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: 'var(--danger-border)' },
};

export default function SuperAdminQuotesPage() {
  const { isSuperAdmin, loading, entities, quotes, quoteEntries, clients, deleteQuote } = useApp();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!isSuperAdmin) return <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}><h2 style={{ color: 'var(--danger)' }}>Access Denied</h2></div>;

  const entityMap = Object.fromEntries(entities.map(e => [e.id, e]));
  const clientMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

  const getTotal = id => quoteEntries.filter(e => e.quote_id === id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);

  const filtered = quotes.filter(q => {
    if (entityFilter && q.entity_id !== entityFilter) return false;
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to overview
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <FileText size={15} /> Superadmin
            </div>
            <h1 className="page-title">All Quotes</h1>
            <p className="page-subtitle">{quotes.length} quotes across all entities</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="form-control" placeholder="Search quotes…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.1rem' }} />
        </div>
        <select className="form-control" style={{ minWidth: 150 }} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All entities</option>
          {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className="form-control" style={{ minWidth: 130 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {QUOTE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No quotes match the current filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filtered.map(q => {
            const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
            const entity = entityMap[q.entity_id];
            const client = q.client_id ? clientMap[q.client_id] : null;
            const total = getTotal(q.id);

            return (
              <div key={q.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <Link href={`/ajanlatok/${q.id}`} style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {q.title} <ArrowUpRight size={13} color="var(--text-muted)" />
                    </Link>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {QUOTE_STATUSES.find(s => s.id === q.status)?.label || q.status}
                    </span>
                    {entity && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Building2 size={10} /> {entity.name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {client && <span>👤 {client.name}</span>}
                    {q.location && <span>📍 {q.location}</span>}
                    <span>{formatDate(q.created_at)}</span>
                  </div>
                </div>
                <div className="text-mono" style={{ fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{formatHUF(total)}</div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
