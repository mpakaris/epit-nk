'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  FileText, Plus, MapPin, Calendar, Coins, Trash2, User, Clock, PencilLine,
  Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

const PREVIEW_COUNT = 3;

const STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',    color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent:     { bg: 'var(--warning-bg)',   color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)',   color: 'var(--success-text)',   border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' },
};

function SectionHeader({ icon, label, count, accentColor = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', marginTop: '1.75rem' }}>
      <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.cloneElement(icon, { size: 13, color: accentColor })}
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)' }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)', marginLeft: '0.25rem' }} />
    </div>
  );
}

function ShowMoreButton({ total, expanded, onToggle }) {
  if (total <= PREVIEW_COUNT) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.65rem' }}>
      <button type="button" onClick={onToggle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '0.35rem 1rem', cursor: 'pointer' }}>
        {expanded ? <><ChevronUp size={13} /> Kevesebb</> : <><ChevronDown size={13} /> + {total - PREVIEW_COUNT} további</>}
      </button>
    </div>
  );
}

function QuoteCard({ q, clients, users, currentUser, isAdmin, quoteEntries, surveys, onDelete, navPrefix }) {
  const total   = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const client  = clients.find(c => c.id === q.client_id);
  const creator = users.find(u => u.id === q.created_by);
  const sc      = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
  const canDelete = q.created_by === currentUser?.id || isAdmin;
  const survey  = q.survey_id ? surveys.find(s => s.id === q.survey_id) : null;
  const previews = survey?._preview_urls || [];

  return (
    <Link key={q.id} href={`${navPrefix}/ajanlatok/${q.id}`} className="card card-interactive"
      style={{ padding: 0, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}>

      {previews.length === 0 ? (
        <div style={{ height: 72, background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          <Coins size={48} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', right: 16, bottom: -8, transform: 'rotate(-10deg)' }} />
          <FileText size={28} color="rgba(255,255,255,0.35)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(previews.length, 4)}, 1fr)`, height: 90, overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
          {previews.map((url, i) => (
            <div key={i} style={{ overflow: 'hidden', background: 'var(--bg-subtle)' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{q.title}</h3>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: 'nowrap' }}>
                {QUOTE_STATUSES.find(s => s.id === q.status)?.label || q.status}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              {client && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{client.name}</span>}
              {q.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {q.location}</span>}
              {q.work_type && <span>{q.work_type}</span>}
            </div>
            {(q.start_date || q.end_date) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <Calendar size={12} />
                <span>{q.start_date ? formatDate(q.start_date) : '?'} – {q.end_date ? formatDate(q.end_date) : '?'}</span>
              </div>
            )}
          </div>
          {canDelete && (
            <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(q); }} className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {creator && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 'var(--radius-pill)', background: creator.id === currentUser?.id ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-subtle)', color: creator.id === currentUser?.id ? 'var(--primary)' : 'var(--text-secondary)', border: `1px solid ${creator.id === currentUser?.id ? 'var(--primary)33' : 'var(--border-subtle)'}` }}>
              <User size={10} /> {creator.id === currentUser?.id ? 'Én' : creator.display_name}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Clock size={10} /> {formatDate(q.created_at)}
            </span>
            {q.updated_at && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <PencilLine size={10} /> {q.updated_by_name ? `${q.updated_by_name} · ` : ''}{formatDate(q.updated_at)}
              </span>
            )}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Coins size={15} color="var(--accent)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatHUF(total)}</span>
        </div>
      </div>
    </Link>
  );
}

function QuoteGrid({ quotes, ...props }) {
  if (quotes.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.65rem' }}>
      {quotes.map(q => <QuoteCard key={q.id} q={q} {...props} />)}
    </div>
  );
}

export default function QuotesListPage() {
  const { currentUser, isAdmin, loading, dataReady, quoteEntries, clients, surveys, users, deleteQuote, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [statusFilter, setStatusFilter] = useState('all');
  const [combined, setCombined]         = useState(null);
  const [fetching, setFetching]         = useState(true);
  const [expandPersonal, setExpandPersonal] = useState(false);
  const [expandShared, setExpandShared]     = useState({});
  const [confirmModal, setConfirmModal]     = useState(null);
  const [alertModal, setAlertModal]         = useState(null);

  useEffect(() => {
    if (!dataReady) return;
    fetch('/api/workspace/combined', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { personal: { quotes: [] }, shared: { quotes: [] }, collectives: [] })
      .then(d => { setCombined(d); setFetching(false); })
      .catch(() => setFetching(false));
  }, [dataReady]);

  const handleDelete = (q) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${q.title}" ajánlatot?`,
      onConfirm: async () => {
        try { await deleteQuote(q.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      },
    });
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const applyFilter = (list) => {
    if (statusFilter === 'all') return list;
    return list.filter(q => q.status === statusFilter);
  };

  const personalAll = combined?.personal?.quotes || [];
  const sharedAll   = combined?.shared?.quotes   || [];
  const collectives = combined?.collectives       || [];
  const hasCollectives = collectives.length > 0;

  const filteredPersonal = applyFilter(personalAll);
  const sharedByCollective = collectives.map(col => ({
    ...col,
    quotes: applyFilter(sharedAll.filter(q => q.collective_id === col.id)),
  }));

  const isEmpty = filteredPersonal.length === 0 && sharedByCollective.every(c => c.quotes.length === 0);

  const cardProps = { clients, users, currentUser, isAdmin, quoteEntries, surveys, onDelete: handleDelete, navPrefix };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Ajánlatok</h1>
            <p className="page-subtitle">Ügyfeleknek küldött árajánlatok és státuszaik</p>
          </div>
          <Link href={`${navPrefix}/ajanlatok/uj`} className="btn btn-primary btn-sm">
            <Plus size={15} /> Új ajánlat
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[{ id: 'all', label: 'Összes' }, ...QUOTE_STATUSES].map(s => (
          <button key={s.id} type="button" onClick={() => setStatusFilter(s.id)}
            style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)', border: '1px solid', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', ...(statusFilter === s.id ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : { background: '#fff', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }) }}>
            {s.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {statusFilter !== 'all' ? 'Nincs ilyen státuszú ajánlat' : 'Nincsenek ajánlatok'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {statusFilter !== 'all' ? 'Próbáljon más szűrőt.' : 'Hozza létre az első ajánlatot.'}
          </p>
          {statusFilter === 'all' && (
            <Link href={`${navPrefix}/ajanlatok/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Új ajánlat</Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Personal section ── */}
          <SectionHeader icon={<User />} label="Személyes" count={filteredPersonal.length} />
          {filteredPersonal.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nincs személyes ajánlat ebben a nézetben.</p>
          ) : (
            <>
              <QuoteGrid quotes={expandPersonal ? filteredPersonal : filteredPersonal.slice(0, PREVIEW_COUNT)} {...cardProps} />
              <ShowMoreButton total={filteredPersonal.length} expanded={expandPersonal} onToggle={() => setExpandPersonal(v => !v)} />
            </>
          )}

          {/* ── Collective sections ── */}
          {sharedByCollective.map(col => (
            <div key={col.id}>
              <SectionHeader icon={<Users />} label={col.name} count={col.quotes.length} accentColor="#16a34a" />
              {col.quotes.length === 0 ? (
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nincs megosztott ajánlat ebben a nézetben.</p>
              ) : (
                <>
                  <QuoteGrid quotes={expandShared[col.id] ? col.quotes : col.quotes.slice(0, PREVIEW_COUNT)} {...cardProps} />
                  <ShowMoreButton total={col.quotes.length} expanded={!!expandShared[col.id]} onToggle={() => setExpandShared(v => ({ ...v, [col.id]: !v[col.id] }))} />
                </>
              )}
            </div>
          ))}

          {!hasCollectives && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.15rem' }}>Csapatban is dolgozol?</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  Hozz létre egy kollektívát és dolgozzatok közösen ajánlatokon. <Link href={`${navPrefix}/kollektivak`} style={{ color: 'var(--accent)', fontWeight: 700 }}>Kollektívák →</Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Ajánlat törlése" message={confirmModal?.message} />
      <AlertModal   isOpen={!!alertModal}   onClose={() => setAlertModal(null)}   message={alertModal?.message} />
    </div>
  );
}
