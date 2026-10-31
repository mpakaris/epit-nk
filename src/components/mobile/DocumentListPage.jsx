'use client';

/**
 * Shared list-page shell for Surveys and Quotes.
 *
 * Both pages are structurally identical: they fetch from /api/workspace/combined,
 * split results into personal + per-collective sections, support search/filter,
 * and render ItemCards with transfer / delete actions.
 *
 * Callers supply only what differs:
 *   - config strings (title, routes, placeholders, empty state copy)
 *   - applyFilter(list)  — document-specific search/status filtering
 *   - renderCard(item)   — builds the ItemCard with doc-specific fields
 *   - buildDeleteMessage(item) — constructs the confirm modal text
 *   - onDeleteItem(item) — calls the correct AppContext delete action
 *   - renderDesktopFilterBar(search, setSearch) — optional (status pills for quotes)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import TransferToCollectiveModal from '@/components/TransferToCollectiveModal';
import { Plus, Search, ChevronLeft, Users } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceSectionHeader from '@/components/mobile/WorkspaceSectionHeader';
import ExpandButton from '@/components/mobile/ExpandButton';

const PREVIEW_COUNT = 3;

export default function DocumentListPage({
  // Document identity
  documentType,          // 'quote' | 'survey'
  documentKey,           // 'quotes' | 'surveys' — key in combined API response

  // Page strings
  pageTitle,
  pageSubtitle,
  mobileSearchPlaceholder,
  newHref,
  nudgeText,

  // Empty state
  EmptyIcon,
  emptyTitle,
  emptyTitleFiltered,    // shown when search/filter active and result is empty
  emptyText,
  emptyTextFiltered,

  // Delete modal
  deleteConfirmTitle,

  // Doc-specific callbacks (bound to AppContext values by the caller)
  applyFilter,           // (list, search) => filtered list
  renderCard,            // (item, { setTransferModal, handleDelete }) => ReactNode
  buildDeleteMessage,    // (item) => string
  onDeleteItem,          // async (item) => void — called after user confirms

  // Optional: desktop filter bar rendered above the grid (status pills, extra inputs…)
  // Signature: (search, setSearch) => ReactNode
  renderDesktopFilterBar,

  // Whether there's an active non-search filter (e.g. status !== 'all')
  isFiltered = false,
}) {
  const { loading, dataReady, isDemoMode, collectives: userMemberships } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [search,         setSearch]         = useState('');
  const [combined,       setCombined]       = useState(null);
  const [fetching,       setFetching]       = useState(true);
  const [expandPersonal, setExpandPersonal] = useState(false);
  const [expandShared,   setExpandShared]   = useState({});
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [alertModal,     setAlertModal]     = useState(null);
  const [transferModal,  setTransferModal]  = useState(null);

  const { outgoingTransfers, addTransfer, retractTransfer } =
    useTransferRequests({ dataReady, isDemoMode });

  const fetchCombined = () => {
    setFetching(true);
    fetch('/api/workspace/combined', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { personal: {}, shared: {}, collectives: [] })
      .then(d => { setCombined(d); setFetching(false); })
      .catch(() => setFetching(false));
  };

  useEffect(() => {
    if (!dataReady) return;
    fetchCombined();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  // Re-fetch whenever the page becomes visible again — covers returning from
  // a detail page where the user may have changed a document's status.
  useEffect(() => {
    if (!dataReady) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCombined();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  const handleTransferSuccess = (result) => {
    if (result.moved)    fetchCombined();
    else if (result.request) addTransfer(result.request);
  };

  const handleRetract = async (requestId) => {
    try {
      await retractTransfer(requestId);
      setAlertModal({ variant: 'success', title: 'Visszavonva', message: 'Az áthelyezési kérelem visszavonva. A dokumentum újra szerkeszthető.' });
    } catch (err) {
      setAlertModal({ message: err.message });
    }
  };

  const handleDelete = (item) => {
    setConfirmModal({
      message: buildDeleteMessage(item),
      onConfirm: async () => {
        try {
          await onDeleteItem(item);
          // Optimistically remove from local combined state
          setCombined(prev => {
            if (!prev) return prev;
            const drop = (list) => (list || []).filter(x => x.id !== item.id);
            return {
              ...prev,
              personal: { ...prev.personal, [documentKey]: drop(prev.personal?.[documentKey]) },
              shared:   { ...prev.shared,   [documentKey]: drop(prev.shared?.[documentKey]) },
            };
          });
          setAlertModal({ variant: 'success', title: `${pageTitle.replace(/k$/, '')} törölve`, message: `„${item.title || item.name}" sikeresen törölve.` });
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      },
    });
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const personalAll  = combined?.personal?.[documentKey] || [];
  const sharedAll    = combined?.shared?.[documentKey]   || [];
  const collectives  = combined?.collectives             || [];

  const filteredPersonal = applyFilter(personalAll, search);
  const sharedByColl     = collectives.map(col => ({
    ...col,
    [documentKey]: applyFilter(sharedAll.filter(x => x.collective_id === col.id), search),
  }));

  const activeFilter = isFiltered || !!search;
  const isEmpty = filteredPersonal.length === 0 &&
    sharedByColl.every(c => (c[documentKey] || []).length === 0);

  const cardHandlers = { setTransferModal, handleDelete, outgoingTransfers, handleRetract, navPrefix };

  return (
    <div className="container page-body">

      {/* ── Mobile header ── */}
      <div className="list-page-mobile-header" style={{ marginBottom: 20 }}>
        <Link
          href={`${navPrefix}/dashboard`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 15, fontWeight: 600, color: '#475569', textDecoration: 'none', height: 44, marginBottom: 4 }}
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Kezdőlap
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '38px', marginBottom: 16 }}>
          {pageTitle}
        </h1>
        <div className="mobile-search-wrap">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder={mobileSearchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="page-header list-page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">{pageSubtitle}</p>
          </div>
          <Link href={`${navPrefix}${newHref}`} className="btn btn-primary btn-sm">
            <Plus size={15} /> Új {pageTitle.replace(/k$/, '').toLowerCase()}
          </Link>
        </div>
      </div>

      {/* ── Desktop filter bar (optional, e.g. status pills for quotes) ── */}
      {renderDesktopFilterBar && (
        <div className="hide-mobile" style={{ marginBottom: '1.25rem' }}>
          {renderDesktopFilterBar(search, setSearch)}
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <EmptyIcon size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} aria-hidden="true" />
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {activeFilter ? emptyTitleFiltered : emptyTitle}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
            {activeFilter ? emptyTextFiltered : emptyText}
          </p>
          {!activeFilter && (
            <Link href={`${navPrefix}${newHref}`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új {pageTitle.replace(/k$/, '').toLowerCase()}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Personal section */}
          <WorkspaceSectionHeader type="personal" count={filteredPersonal.length} />
          {filteredPersonal.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Nincs személyes {pageTitle.replace(/k$/, '').toLowerCase()}.
            </p>
          ) : (
            <>
              <div className="card-grid">
                {(expandPersonal ? filteredPersonal : filteredPersonal.slice(0, PREVIEW_COUNT))
                  .map(item => renderCard(item, cardHandlers))}
              </div>
              <ExpandButton
                total={filteredPersonal.length}
                showing={PREVIEW_COUNT}
                expanded={expandPersonal}
                onToggle={() => setExpandPersonal(v => !v)}
              />
            </>
          )}

          {/* Collective sections */}
          {sharedByColl.map(col => {
            const items = col[documentKey] || [];
            return (
              <div key={col.id} className="collective-inset-panel" style={{ marginTop: 24 }}>
                <WorkspaceSectionHeader type="collective" name={col.name} count={items.length} />
                {items.length === 0 ? (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Nincs megosztott {pageTitle.replace(/k$/, '').toLowerCase()} ebben a kollektívában.
                  </p>
                ) : (
                  <>
                    <div className="card-grid">
                      {(expandShared[col.id] ? items : items.slice(0, PREVIEW_COUNT))
                        .map(item => renderCard(item, cardHandlers))}
                    </div>
                    <ExpandButton
                      total={items.length}
                      showing={PREVIEW_COUNT}
                      expanded={!!expandShared[col.id]}
                      onToggle={() => setExpandShared(v => ({ ...v, [col.id]: !v[col.id] }))}
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Collective nudge */}
          {collectives.length === 0 && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.15rem' }}>Csapatban is dolgozol?</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  {nudgeText}{' '}
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
        title={deleteConfirmTitle}
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant}
        title={alertModal?.title}
        message={alertModal?.message}
      />
      <TransferToCollectiveModal
        isOpen={!!transferModal}
        onClose={() => setTransferModal(null)}
        documentType={documentType}
        documentId={transferModal?.documentId}
        documentTitle={transferModal?.documentTitle}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
