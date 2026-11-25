'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate, formatMoney } from '@/lib/constants';
import Modal from '@/components/Modal';
import UpgradeModal from '@/components/UpgradeModal';
import StatusBadge from '@/components/StatusBadge';
import { WorkspaceNotActivatedBanner, WorkspaceFrozenBanner } from '@/components/desktop/WorkspaceStatusBanners';
import TransferToCollectiveModal from '@/components/TransferToCollectiveModal';
import WorkspacePodStack from '@/components/desktop/WorkspacePodStack';
import { Search, Plus, Trash2, X, ArrowRightLeft, MoreHorizontal } from 'lucide-react';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

const GRID = '2.2fr 1.4fr 1.1fr 110px 90px 90px 40px';

function fullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function OfferListDesktop() {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const {
    quotes, clients, users,
    deleteQuote, isDemoMode, currentUser, userCurrency,
    contextSwitching, activeCollectiveId, collectives,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;
  const fmt = (n) => formatMoney(n, userCurrency);

  const activeColl = (collectives || []).find(c => c.collective_id === activeCollectiveId);

  const atCreateLimit = !activeCollectiveId && !isEffectivePremium(currentUser || {}) && (quotes || []).length >= 1;

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [selectedId, setSelectedId]   = useState(null);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transferOpen, setTransferOpen]   = useState(false);
  const [upgradeModal, setUpgradeModal]   = useState(null);

  const allQuotes = useMemo(() => quotes || [], [quotes]);

  const counts = useMemo(() => ({
    all:      allQuotes.length,
    draft:    allQuotes.filter(q => q.status === 'draft').length,
    sent:     allQuotes.filter(q => q.status === 'sent').length,
    accepted: allQuotes.filter(q => q.status === 'accepted').length,
    rejected: allQuotes.filter(q => q.status === 'rejected').length,
  }), [allQuotes]);

  const acceptanceRate = useMemo(() => {
    const decided = counts.accepted + counts.rejected;
    if (!decided) return '—';
    return `${Math.round(counts.accepted / decided * 100)}%`;
  }, [counts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allQuotes.filter(quote => {
      const client = (clients || []).find(c => c.id === quote.client_id);
      const matchQ = !q ||
        quote.title?.toLowerCase().includes(q) ||
        client?.name?.toLowerCase().includes(q) ||
        quote.location?.toLowerCase().includes(q);
      const matchF = filter === 'all' ? true : quote.status === filter;
      return matchQ && matchF;
    });
  }, [allQuotes, search, filter, clients]);

  const selectedQuote  = allQuotes.find(q => q.id === selectedId) || null;
  const selectedClient = selectedQuote
    ? (clients || []).find(c => c.id === selectedQuote.client_id)
    : null;
  const selectedCreator = selectedQuote
    ? (users || []).find(u => u.id === (selectedQuote.created_by || selectedQuote.owner_id))
    : null;

  const isOwner = (quote) =>
    quote.owner_id === currentUser?.id || quote.created_by === currentUser?.id;

  const canTransfer = selectedQuote
    && isOwner(selectedQuote)
    && !selectedQuote.collective_id
    && (collectives || []).some(c => c.collective_id)
    && !isDemoMode;

  const handleDelete = async () => {
    if (!selectedQuote) return;
    setDeleteLoading(true);
    try {
      await deleteQuote(selectedQuote.id);
      setSelectedId(null);
      setDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const FILTERS = [
    { key: 'all',      label: `${t('filterAll')} (${counts.all})` },
    { key: 'draft',    label: `${t('statusDraft')} (${counts.draft})` },
    { key: 'sent',     label: `${t('statusSent')} (${counts.sent})` },
    { key: 'accepted', label: `${t('statusAccepted')} (${counts.accepted})` },
    { key: 'rejected', label: `${t('statusRejected')} (${counts.rejected})` },
  ];

  const STATS = [
    { label: t('desktop.statOpen'),     value: counts.sent },
    { label: t('desktop.statAccepted'), value: counts.accepted },
    { label: t('desktop.statRate'),     value: acceptanceRate },
    { label: t('desktop.statDrafts'),   value: counts.draft },
  ];

  return (
    <div className="dk-page dk-mod-quotes">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('desktop.kicker')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ position: 'relative', display: 'block', width: 280 }}>
            <span style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
              <Search size={20} aria-hidden="true" />
            </span>
            <input
              type="search"
              className="dk-input"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 42, width: '100%', borderRadius: 23, height: 44 }}
            />
          </label>
          <button
            className="dk-btn dk-btn-w"
            onClick={() => atCreateLimit ? setUpgradeModal({ docType: 'quote' }) : router.push(p('/ajanlatok/uj'))}
          >
            <Plus size={20} aria-hidden="true" />
            {t('new')}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────────── */}
      <div className="dk-body" style={{ background: 'var(--dk-deep)', padding: '16px 32px 24px' }}>
        <WorkspacePodStack>
          {activeColl?.status === 'not_activated' && <WorkspaceNotActivatedBanner />}
          {activeColl?.status !== 'not_activated' && (
          <>
            {activeColl?.status === 'frozen' && <WorkspaceFrozenBanner isOwner={activeColl?.role === 'owner'} />}
            {/* Stats strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {STATS.map(stat => (
                <div
                  key={stat.label}
                  style={{ background: '#F4F5F8', borderRadius: 18, padding: '14px 18px' }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 28, color: '#0E1116', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter chips + count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    className="dk-chip"
                    onClick={() => setFilter(f.key)}
                    style={{
                      background: f.key === filter ? '#6D3FD1' : '#F1F1F3',
                      color: f.key === filter ? '#fff' : '#0E1116',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                {t('desktop.shown', { shown: filtered.length, total: allQuotes.length })}
              </span>
            </div>

            {/* Two-panel layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* Table card */}
              <section className="dk-card" style={{ flex: '1.7', minWidth: 0, paddingBottom: 6, overflow: 'hidden' }}>
                <div className="dk-th" style={{ gridTemplateColumns: GRID }}>
                  <span>{t('desktop.colTitle')}</span>
                  <span>{t('desktop.colClient')}</span>
                  <span style={{ textAlign: 'right' }}>{t('desktop.colAmount')}</span>
                  <span style={{ textAlign: 'center' }}>{t('desktop.colStatus')}</span>
                  <span>{t('desktop.colDate')}</span>
                  <span>{t('desktop.colCreator')}</span>
                  <span />
                </div>

                {filtered.map(quote => {
                  const client  = (clients || []).find(c => c.id === quote.client_id);
                  const creator = (users   || []).find(u => u.id === (quote.created_by || quote.owner_id));
                  const isSelected = quote.id === selectedId;
                  return (
                    <div
                      key={quote.id}
                      className="dk-tr"
                      onClick={() => router.push(p(`/ajanlatok/${quote.id}`))}
                      style={{ gridTemplateColumns: GRID, background: isSelected ? '#E9E0FF' : 'transparent', cursor: 'pointer' }}
                    >
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <b>{quote.title}</b>
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client?.name || '—'}
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                        {quote.gross_total ? fmt(quote.gross_total) : '—'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <StatusBadge status={quote.status} size="sm" />
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, color: '#5A5F68', fontWeight: 600 }}>
                        {fullDate(quote.updated_at || quote.created_at)}
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, color: '#5A5F68', fontWeight: 600 }}>
                        {creator?.display_name || '—'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : quote.id); }}
                          style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: '#4A2A9A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                          aria-label={t('moreActions')}
                        >
                          <MoreHorizontal size={16} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
                    {filter !== 'all' ? t('emptyTitleFiltered') : (search ? t('emptyTitleSearch') : t('emptyTitle'))}
                  </div>
                )}
              </section>

              {/* Side panel — only rendered when a quote is selected */}
              {selectedQuote && (
                <aside
                  className="dk-card"
                  style={{ flexShrink: 0, width: 400, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start' }}
                >
                  {/* Badge + close */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="dk-badge" style={{ background: '#E9E0FF', color: '#4A2A9A' }}>
                      {t('desktop.panelBadge')}
                    </span>
                    <button
                      onClick={() => setSelectedId(null)}
                      aria-label={t('desktop.closePanel')}
                      style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: '#F1F1F3', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 24, color: '#0E1116', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {selectedQuote.title}
                  </span>

                  <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                    {selectedClient
                      ? t('desktop.panelClientMeta', { client: selectedClient.name, date: formatDate(selectedQuote.updated_at || selectedQuote.created_at) })
                      : t('desktop.panelNoClient', { date: formatDate(selectedQuote.updated_at || selectedQuote.created_at) })}
                  </span>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={selectedQuote.status} size="md" />
                    {selectedCreator && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                        {selectedCreator.display_name}
                      </span>
                    )}
                  </div>

                  {/* Secondary actions */}
                  {(canTransfer || isOwner(selectedQuote)) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {canTransfer && (
                        <button
                          className="dk-btn dk-btn-l"
                          onClick={() => setTransferOpen(true)}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <ArrowRightLeft size={18} aria-hidden="true" />
                          {t('desktop.transferAction')}
                        </button>
                      )}
                      {isOwner(selectedQuote) && !selectedQuote?.is_seed && (
                        <button
                          className="dk-btn"
                          onClick={() => setDeleteOpen(true)}
                          style={{ flex: 1, justifyContent: 'center', background: '#FDECEC', color: '#B71C1C' }}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                          {t('desktop.deleteAction')}
                        </button>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </div>
          </>
        )}
        </WorkspacePodStack>
      </div>

      {/* Delete modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={deleteLoading ? undefined : () => setDeleteOpen(false)}
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} color="#B71C1C" aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116', letterSpacing: '-0.02em', marginBottom: 6 }}>
                {t('deleteConfirmTitle')}
              </div>
              <p style={{ fontSize: 14, color: '#5A5F68', lineHeight: 1.6, margin: 0 }}>
                {selectedQuote ? t('deleteConfirmMessage', { title: selectedQuote.title }) : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="dk-btn dk-btn-l"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {t('desktop.cancelAction')}
            </button>
            <button
              className="dk-btn"
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{ flex: 1, justifyContent: 'center', background: '#B71C1C', color: '#fff', opacity: deleteLoading ? 0.6 : 1 }}
            >
              <Trash2 size={16} aria-hidden="true" />
              {deleteLoading ? t('desktop.deletingAction') : t('desktop.deleteAction')}
            </button>
          </div>
        </div>
      </Modal>

      <TransferToCollectiveModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        documentType="quote"
        documentId={selectedQuote?.id}
        documentTitle={selectedQuote?.title}
        onSuccess={(data) => {
          if (data.moved) setSelectedId(null);
        }}
      />
      <UpgradeModal isOpen={!!upgradeModal} onClose={() => setUpgradeModal(null)} docType={upgradeModal?.docType} />
    </div>
  );
}
