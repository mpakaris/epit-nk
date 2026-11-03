'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { normalizeHU } from '@/lib/utils';
import { QUOTE_STATUSES } from '@/lib/constants';
import { FileText } from 'lucide-react';
import ItemCard from '@/components/mobile/ItemCard';
import DocumentListPage from '@/components/mobile/DocumentListPage';

export default function QuotesListPage() {
  const t = useTranslations('quotes');
  const {
    currentUser, loading, dataReady,
    clients, surveys, deleteQuote, isDemoMode,
    collectives: userMemberships,
  } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';
  const hasCollectives = (userMemberships || []).length > 0;

  const [statusFilter, setStatusFilter] = useState('all');
  const { outgoingTransfers } = useTransferRequests({ dataReady, isDemoMode });

  const applyFilter = (list, search) => {
    const q = normalizeHU(search);
    let result = statusFilter === 'all' ? list : list.filter(x => x.status === statusFilter);
    if (!q) return result;
    return result.filter(x => {
      const client = clients.find(c => c.id === x.client_id);
      return normalizeHU(x.title).includes(q) || normalizeHU(client?.name).includes(q);
    });
  };

  const renderCard = (quote, { setTransferModal, handleDelete, outgoingTransfers, handleRetract }) => {
    const client     = clients.find(c => c.id === quote.client_id);
    const survey     = quote.survey_id ? surveys.find(s => s.id === quote.survey_id) : null;
    const isOwner    = quote.owner_id === currentUser?.id || quote.created_by === currentUser?.id;
    const canTransfer = isOwner && !quote.collective_id && hasCollectives && !isDemoMode;
    const pendingReq = outgoingTransfers.find(r => r.document_id === quote.id);
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
        role={quote.collective_id ? (isOwner ? 'owner' : 'member') : undefined}
        onDelete={isOwner && !pendingReq ? () => handleDelete(quote) : undefined}
        onTransfer={canTransfer && !pendingReq ? () => setTransferModal({ documentId: quote.id, documentTitle: quote.title }) : undefined}
        isPendingTransfer={!!pendingReq}
        onRetractTransfer={pendingReq ? () => handleRetract(pendingReq.id) : undefined}
        lockedReason={quote.locked_reason || undefined}
      />
    );
  };

  const buildDeleteMessage = (q) => t('deleteConfirmMessage', { title: q.title });

  const onDeleteItem = async (q) => {
    await deleteQuote(q.id);
  };

  const STATUS_LABELS = {
    all:      t('filterAll'),
    draft:    t('statusDraft'),
    sent:     t('statusSent'),
    accepted: t('statusAccepted'),
    rejected: t('statusRejected'),
  };

  const renderDesktopFilterBar = (search, setSearch) => (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {[{ id: 'all' }, ...QUOTE_STATUSES].map(s => (
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
          {STATUS_LABELS[s.id] || s.id}
        </button>
      ))}
    </div>
  );

  return (
    <DocumentListPage
      documentType="quote"
      documentKey="quotes"
      pageTitle={t('pageTitle')}
      pageSubtitle={t('pageSubtitle')}
      mobileSearchPlaceholder={t('searchPlaceholder')}
      newHref="/ajanlatok/uj"
      EmptyIcon={FileText}
      emptyTitle={t('emptyTitle')}
      emptyTitleFiltered={statusFilter !== 'all' ? t('emptyTitleFiltered') : t('emptyTitleSearch')}
      emptyText={t('emptyText')}
      emptyTextFiltered={statusFilter !== 'all' ? t('emptyTextFiltered') : t('emptyTextSearch')}
      deleteConfirmTitle={t('deleteConfirmTitle')}
      nudgeText={t('nudge')}
      applyFilter={applyFilter}
      renderCard={renderCard}
      buildDeleteMessage={buildDeleteMessage}
      onDeleteItem={onDeleteItem}
      renderDesktopFilterBar={renderDesktopFilterBar}
      isFiltered={statusFilter !== 'all'}
      accentColor="#7c3aed"
      accentGradient="linear-gradient(135deg, #a78bfa 0%, #4c1d95 100%)"
    />
  );
}
