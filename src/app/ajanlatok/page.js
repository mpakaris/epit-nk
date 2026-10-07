'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  FileText,
  Plus,
  MapPin,
  Calendar,
  Coins,
  Trash2,
  ArrowUpRight,
  Filter
} from 'lucide-react';

const STATUS_COLORS = {
  draft: { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' }
};

export default function QuotesListPage() {
  const { currentUser, isAdmin, loading, dataReady, quotes, quoteEntries, clients, deleteQuote } = useApp();


  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  const filteredQuotes = quotes.filter(q => {
    if (statusFilter !== 'all' && q.status !== statusFilter) return false;
    return true;
  });

  const getQuoteTotal = (quoteId) =>
    quoteEntries.filter(e => e.quote_id === quoteId).reduce((s, e) => s + Number(e.amount_huf || 0), 0);

  const handleDelete = (q) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${q.title}" ajánlatot?`,
      onConfirm: async () => {
        try {
          await deleteQuote(q.id);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  if (loading || !dataReady) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Ajánlatok</h1>
            <p className="page-subtitle">Ügyfeleknek küldött árajánlatok és státuszaik</p>
          </div>
          <Link href="/ajanlatok/uj" className="btn btn-primary btn-sm">
            <Plus size={15} /> Új ajánlat
          </Link>
        </div>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[{ id: 'all', label: 'Összes' }, ...QUOTE_STATUSES].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusFilter(s.id)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              ...(statusFilter === s.id
                ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                : { background: '#fff', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' })
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {statusFilter !== 'all' ? 'Nincs ilyen státuszú ajánlat' : 'Nincsenek ajánlatok'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {statusFilter !== 'all' ? 'Próbáljon más szűrőt.' : 'Hozza létre az első ajánlatot.'}
          </p>
          {statusFilter === 'all' && (
            <Link href="/ajanlatok/uj" className="btn btn-primary btn-sm"><Plus size={15} /> Új ajánlat</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredQuotes.map(q => {
            const total = getQuoteTotal(q.id);
            const client = clients.find(c => c.id === q.client_id);
            const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
            const canDelete = q.created_by === currentUser?.id || isAdmin;
            return (
              <div key={q.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{q.title}</h3>
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {QUOTE_STATUSES.find(s => s.id === q.status)?.label || q.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      {client && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{client.name}</span>}
                      {q.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {q.location}</span>}
                      {q.work_type && <span>{q.work_type}</span>}
                    </div>

                    {(q.start_date || q.end_date) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        <Calendar size={12} />
                        <span>{q.start_date ? formatDate(q.start_date) : '?'} – {q.end_date ? formatDate(q.end_date) : '?'}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Coins size={16} color="var(--accent)" />
                      {formatHUF(total)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <Link href={`/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm">
                        <ArrowUpRight size={14} /> Részletek
                      </Link>
                      {canDelete && (
                        <button type="button" onClick={() => handleDelete(q)} className="btn btn-danger btn-sm">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Ajánlat törlése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
