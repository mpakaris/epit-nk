'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { QUOTE_STATUSES } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import { FileText, Plus, Search, ChevronLeft, Users } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import ItemCard from '@/components/mobile/ItemCard';
import WorkspaceSectionHeader from '@/components/mobile/WorkspaceSectionHeader';
import ExpandButton from '@/components/mobile/ExpandButton';

const PREVIEW_COUNT = 3;

export default function QuotesListPage() {
  const {
    currentUser, isAdmin, loading, dataReady,
    quoteEntries, clients, surveys, users, deleteQuote, isDemoMode,
  } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [combined,       setCombined]       = useState(null);
  const [fetching,       setFetching]       = useState(true);
  const [expandPersonal, setExpandPersonal] = useState(false);
  const [expandShared,   setExpandShared]   = useState({});
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [alertModal,     setAlertModal]     = useState(null);

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

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(search);

  const applyFilters = (list) => {
    let filtered = statusFilter === 'all' ? list : list.filter(x => x.status === statusFilter);
    if (!q) return filtered;
    return filtered.filter(x => {
      const client = clients.find(c => c.id === x.client_id);
      return norm(x.title).includes(q) || norm(client?.name).includes(q);
    });
  };

  const personalAll    = combined?.personal?.quotes || [];
  const sharedAll      = combined?.shared?.quotes   || [];
  const collectives    = combined?.collectives      || [];
  const filteredPersonal = applyFilters(personalAll);
  const sharedByColl   = collectives.map(col => ({
    ...col,
    quotes: applyFilters(sharedAll.filter(x => x.collective_id === col.id)),
  }));
  const isEmpty = filteredPersonal.length === 0 && sharedByColl.every(c => c.quotes.length === 0);

  const renderQuoteCard = (quote) => {
    const client  = clients.find(c => c.id === quote.client_id);
    const survey  = quote.survey_id ? surveys.find(s => s.id === quote.survey_id) : null;
    const canDelete = quote.owner_id === currentUser?.id || quote.created_by === currentUser?.id;
    return (
      <ItemCard
        key={quote.id}
        href={`${navPrefix}/ajanlatok/${quote.id}`}
        title={quote.title}
        clientName={client?.name}
        date={quote.created_at}
        status={quote.status || 'draft'}
        photoUrls={survey?._preview_urls || []}
        isShared={!!quote.collective_id}
        onDelete={canDelete ? () => handleDelete(quote) : undefined}
      />
    );
  };

  return (
    <div className="container page-body">

      {/* ── Mobile-only header ── */}
      <div className="list-page-mobile-header" style={{ marginBottom: 20 }}>
        <Link
          href={`${navPrefix}/dashboard`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 15, fontWeight: 600, color: '#475569',
            textDecoration: 'none', height: 44, marginBottom: 4,
          }}
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Kezdőlap
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '38px', marginBottom: 16 }}>
          Ajánlatok
        </h1>
        <div className="mobile-search-wrap">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Keresés cím vagy ügyfél szerint"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="page-header list-page-header">
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

      {/* Desktop status filter */}
      <div className="hide-mobile" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[{ id: 'all', label: 'Összes' }, ...QUOTE_STATUSES].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusFilter(s.id)}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-pill)', border: '1px solid',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
              ...(statusFilter === s.id
                ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                : { background: '#fff', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }),
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} aria-hidden="true" />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {statusFilter !== 'all' ? 'Nincs ilyen státuszú ajánlat' : 'Nincsenek ajánlatok'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {statusFilter !== 'all' ? 'Próbáljon más szűrőt.' : 'Hozza létre az első ajánlatot.'}
          </p>
          {statusFilter === 'all' && (
            <Link href={`${navPrefix}/ajanlatok/uj`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új ajánlat
            </Link>
          )}
        </div>
      ) : (
        <>
          <WorkspaceSectionHeader type="personal" count={filteredPersonal.length} />
          {filteredPersonal.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Nincs személyes ajánlat.</p>
          ) : (
            <>
              <div className="card-grid">
                {(expandPersonal ? filteredPersonal : filteredPersonal.slice(0, PREVIEW_COUNT)).map(renderQuoteCard)}
              </div>
              <ExpandButton
                total={filteredPersonal.length}
                showing={PREVIEW_COUNT}
                expanded={expandPersonal}
                onToggle={() => setExpandPersonal(v => !v)}
              />
            </>
          )}

          {sharedByColl.map(col => (
            <div key={col.id} className="collective-inset-panel" style={{ marginTop: 24 }}>
              <WorkspaceSectionHeader type="collective" name={col.name} count={col.quotes.length} />
              {col.quotes.length === 0 ? (
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 8 }}>Nincs megosztott ajánlat.</p>
              ) : (
                <>
                  <div className="card-grid">
                    {(expandShared[col.id] ? col.quotes : col.quotes.slice(0, PREVIEW_COUNT)).map(renderQuoteCard)}
                  </div>
                  <ExpandButton
                    total={col.quotes.length}
                    showing={PREVIEW_COUNT}
                    expanded={!!expandShared[col.id]}
                    onToggle={() => setExpandShared(v => ({ ...v, [col.id]: !v[col.id] }))}
                  />
                </>
              )}
            </div>
          ))}

          {collectives.length === 0 && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.15rem' }}>Csapatban is dolgozol?</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  Hozz létre egy kollektívát és dolgozzatok közösen ajánlatokon.{' '}
                  <Link href={`${navPrefix}/kollektivak`} style={{ color: 'var(--accent)', fontWeight: 700 }}>Kollektívák →</Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title="Ajánlat törlése"
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
      />
    </div>
  );
}
