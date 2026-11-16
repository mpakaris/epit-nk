'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { normalizeHU } from '@/lib/utils';
import { Ruler } from 'lucide-react';
import ItemCard from '@/components/mobile/ItemCard';
import DocumentListPage from '@/components/mobile/DocumentListPage';

function surveyStatus(s) {
  if (s.archived_at)           return 'inactive';
  if (s.status === 'done')     return 'done';
  if (s.status === 'reopened') return 'reopened';
  return 'active';
}

export default function SurveyListPage() {
  const t = useTranslations('surveys');
  const {
    currentUser, loading, dataReady,
    clients, deleteSurvey, isDemoMode,
    collectives: userMemberships,
  } = useApp();
  const navPrefix   = isDemoMode ? '/demo' : '';
  const hasCollectives = (userMemberships || []).length > 0;

  const { outgoingTransfers } = useTransferRequests({ dataReady, isDemoMode });

  const applyFilter = (list, search) => {
    const q = normalizeHU(search);
    if (!q) return list;
    return list.filter(s => {
      const client = clients.find(c => c.id === s.client_id);
      return (
        normalizeHU(s.title).includes(q) ||
        normalizeHU(client?.name).includes(q) ||
        normalizeHU(s.location).includes(q)
      );
    });
  };

  const renderCard = (survey, { setTransferModal, handleDelete, outgoingTransfers, handleRetract }) => {
    const client     = clients.find(c => c.id === survey.client_id);
    const isOwner    = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
    const canTransfer = isOwner && !survey.collective_id && hasCollectives && !isDemoMode;
    const pendingReq = outgoingTransfers.find(r => r.document_id === survey.id);
    return (
      <ItemCard
        key={survey.id}
        href={`${navPrefix}/felmeres/${survey.id}`}
        title={survey.title}
        clientName={client?.name}
        date={survey.date || survey.created_at}
        status={surveyStatus(survey)}
        photoUrls={survey._preview_urls || []}
        isShared={!!survey.collective_id}
        role={survey.collective_id ? (isOwner ? 'owner' : 'member') : undefined}
        onDelete={isOwner && !pendingReq ? () => handleDelete(survey) : undefined}
        onTransfer={canTransfer && !pendingReq ? () => setTransferModal({ documentId: survey.id, documentTitle: survey.title }) : undefined}
        isPendingTransfer={!!pendingReq}
        onRetractTransfer={pendingReq ? () => handleRetract(pendingReq.id) : undefined}
        lockedReason={survey.locked_reason || undefined}
      />
    );
  };

  const buildDeleteMessage = (survey) => {
    const photoCount = (survey._photo_count || 0) + (survey._layout_count || 0);
    const parts = [];
    if (photoCount)            parts.push(t('deleteConfirmPhotos', { count: photoCount }));
    if (survey._drawing_count) parts.push(t('deleteConfirmDrawings', { count: survey._drawing_count }));
    const extra = parts.length ? t('deleteConfirmExtra', { items: parts.join(', ') }) : '';
    return t('deleteConfirmMessage', { title: survey.title, extra });
  };

  const onDeleteItem = async (survey) => {
    await deleteSurvey(survey.id, survey);
  };

  const renderDesktopFilterBar = (search, setSearch) => (
    <input
      type="text"
      className="form-control"
      placeholder={t('searchPlaceholder')}
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{ maxWidth: 400 }}
    />
  );

  return (
    <DocumentListPage
      documentType="survey"
      documentKey="surveys"
      pageTitle={t('pageTitle')}
      pageSubtitle={t('pageSubtitle')}
      mobileSearchPlaceholder={t('mobileSearchPlaceholder')}
      newHref="/felmeres/uj"
      EmptyIcon={Ruler}
      emptyTitle={t('emptyTitle')}
      emptyTitleFiltered={t('emptyTitleFiltered')}
      emptyText={t('emptyText')}
      emptyTextFiltered={t('emptyTextFiltered')}
      deleteConfirmTitle={t('deleteConfirmTitle')}
      nudgeText={t('nudge')}
      applyFilter={applyFilter}
      renderCard={renderCard}
      buildDeleteMessage={buildDeleteMessage}
      onDeleteItem={onDeleteItem}
      renderDesktopFilterBar={renderDesktopFilterBar}
      accentColor="#2563eb"
      accentGradient="linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)"
    />
  );
}
