'use client';

/**
 * O1 — Offer list (mobile pods view)
 * Sand body (#EDEBE5), violet accent (#6D3FD1), pod-stack layout.
 * Individual pod section cards carry the dark violet body — not the page wrapper.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { normalizeHU } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { podColor } from '@/lib/podColor';
import useOnline from '@/hooks/useOnline';

import PageHeader from '@/components/mobile/pods/PageHeader';
import PodList from '@/components/mobile/pods/PodList';
import Dock from '@/components/mobile/pods/Dock';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';
import { MobileWorkspaceNotActivatedBanner, MobileWorkspaceFrozenBanner } from '@/components/mobile/WorkspaceStatusBanners';
import TransferToCollectiveModal from '@/components/TransferToCollectiveModal';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  draft:    { bg: '#F0F0F2', fg: '#2B3038', bar: '#C9CED6' },
  sent:     { bg: '#FFF1E0', fg: '#8A4200', bar: '#FF8A2B' },
  accepted: { bg: '#E7F4EC', fg: '#14532D', bar: '#2E9E5B' },
  rejected: { bg: '#FDECEC', fg: '#9B1C1C', bar: '#D64545' },
};

const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OfferSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ borderRadius: 26, background: 'rgba(109,63,209,0.08)', height: 100, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

// ─── Offer card ───────────────────────────────────────────────────────────────
function OfferCard({ quote, totalNet, client, t, userCurrency, onOpen, onMore }) {
  const st = STATUS_STYLE[quote.status] || STATUS_STYLE.draft;
  const isLocked = quote.status === 'accepted' || quote.status === 'rejected';
  const statusLabel = t(`status${(quote.status || 'draft').charAt(0).toUpperCase() + (quote.status || 'draft').slice(1)}`);
  const gross = formatMoney(totalNet * (1 + (quote.tax_percent || 27) / 100), userCurrency);
  const dateStr = quote.created_at ? formatDate(quote.created_at) : '';

  return (
    <article style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: '#FFFFFF', boxShadow: CARD_SHADOW, opacity: isLocked ? 0.88 : 1 }}>
      {/* Status bar */}
      <div style={{ height: 6, background: st.bar }} />
      {/* Card body */}
      <button
        aria-label={`${t('openAction')}: ${quote.title}`}
        onClick={onOpen}
        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 64px 12px 16px', border: 0, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 84, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
          {quote.is_read_only && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.8 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
          {quote.title}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {client?.name ? `${client.name} · ` : ''}{dateStr}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 25 }}>{gross}</span>
          <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: st.bg, color: st.fg, flexShrink: 0 }}>
            {statusLabel}
          </span>
        </span>
        {quote.status === 'sent' && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4A2796', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6"/></svg>
            {t('clientPortalVisible')}
          </span>
        )}
        {isLocked && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#9B1C1C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
            {t('offerLocked')}
          </span>
        )}
        {quote._pendingTransfer && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2A8C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6z"/></svg>
            {t('offerTransferPending')}
          </span>
        )}
        {quote.status === 'accepted' && quote.project_id && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#14532D', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M3 7h6l2 2h10v11H3z"/></svg>
            {t('offerProjectCreated')}
          </span>
        )}
      </button>
      {/* ⋯ button */}
      <button
        onClick={onMore}
        aria-label={`${t('moreActions')}: ${quote.title}`}
        style={{ position: 'absolute', right: 6, top: 20, width: 48, height: 48, border: 0, borderRadius: 24, background: 'transparent', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
      </button>
    </article>
  );
}

// ─── Action sheet ──────────────────────────────────────────────────────────────
function ActionSheet({ quote, isOwner, canTransfer, hasPending, onOpen, onPdf, onCopy, onTransfer, onRevoke, onDelete, onClose, t }) {
  const noDelete = !isOwner;
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)', border: 0 }}
        role="button"
        aria-label={t('close')}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClose()}
      />
      <div role="dialog" aria-label={t('moreActions')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{quote?.title}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('pageTitle')} · {t(`status${(quote?.status||'draft').charAt(0).toUpperCase()+(quote?.status||'draft').slice(1)}`)}</span>
        </div>

        <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>} label={t('openAction')} onClick={onOpen} />
        {isOwner && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5"/></svg>} label={t('actionPreviewPdf')} onClick={onPdf} />}
        <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 9h11v11H9zM5 15V4h11"/></svg>} label={t('actionCopy')} onClick={onCopy} />
        {canTransfer && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>} label={t('offerTransfer')} onClick={onTransfer} />}
        {hasPending && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"/></svg>} label={t('offerRevokeTransfer')} onClick={onRevoke} />}
        {isOwner && !quote?.is_seed && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>} label={t('actionDelete')} onClick={onDelete} danger />}
        {noDelete && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 4px', lineHeight: 1.4 }}>{t('offerMemberCannotDelete')}</span>}
      </div>
    </>
  );
}

function SheetRow({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}
    >
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Delete confirm sheet ─────────────────────────────────────────────────────
function DeleteSheet({ quote, isTeam, onConfirm, onClose, t }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && onClose()} />
      <div role="alertdialog" aria-label={t('deleteConfirmTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</span>
        <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--m-ink)' }}>
          {t('deleteConfirmMessage', { title: quote?.title || '' })}
          {isTeam && <strong> {t('offerDeleteTeamNote')}</strong>}
        </span>
        <button onClick={onConfirm} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('offerDeleteConfirmBtn')}</button>
        <button onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OfferListMobile() {
  const t     = useTranslations('quotes');
  const tPods = useTranslations('mobilePods');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    quotes = [], quoteEntries = [], clients = [], currentUser, loading, dataReady,
    deleteQuote, isDemoMode, collectives: userMemberships = [],
    userCurrency, activeCollectiveId, refreshSupabaseData, setActiveContext,
  } = useApp();
  const activeColl = (userMemberships || []).find(c => c.collective_id === activeCollectiveId);
  const atCreateLimit = !activeCollectiveId && !isEffectivePremium(currentUser || {}) && (quotes || []).filter(q => !q.collective_id && !q.deleted_at).length >= 1;

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [activePodId, setActivePodId] = useState('personal');
  const [podSwitching, setPodSwitching] = useState(false);

  // Always open on personal on mount; if context was collective, reset it silently
  useEffect(() => {
    if (activeCollectiveId !== null && !isDemoMode) {
      setPodSwitching(true);
      setActiveContext(null).catch(() => {}).finally(() => setPodSwitching(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActivate = useCallback(async (id) => {
    if (id === activePodId || podSwitching) return;
    setActivePodId(id);
    setPodSwitching(true);
    try { await setActiveContext(id === 'personal' ? null : id); } catch { /* non-fatal */ }
    finally { setPodSwitching(false); }
  }, [activePodId, podSwitching, setActiveContext]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { outgoingTransfers, retractTransfer } = useTransferRequests({ dataReady, isDemoMode });

  const liveQuotes = useMemo(() => (quotes || []).filter(q => !q.deleted_at), [quotes]);

  const quoteTotals = useMemo(() => {
    const map = {};
    for (const e of quoteEntries) {
      if (!map[e.quote_id]) map[e.quote_id] = 0;
      map[e.quote_id] += e.amount_huf || 0;
    }
    return map;
  }, [quoteEntries]);

  // Workspace-grouped pods — only the active pod has real data loaded; others show null count
  const workspaces = useMemo(() => [
    {
      id: 'personal', isPersonal: true,
      name: tPods('personal'), sub: tPods('personalSub'),
      quotes: liveQuotes.filter(q => !q.collective_id),
      count: activePodId === 'personal' ? liveQuotes.filter(q => !q.collective_id).length : null,
      canCreate: true,
    },
    ...(userMemberships || []).map(col => ({
      id: col.collective_id,
      isPersonal: false,
      name: col.name,
      sub: `${tPods('collective')} · ${col.role === 'owner' ? tPods('roleOwner') : col.role === 'admin' ? tPods('roleAdmin') : tPods('roleContributor')}`,
      quotes: liveQuotes.filter(q => q.collective_id === col.collective_id),
      count: activePodId === col.collective_id ? liveQuotes.filter(q => q.collective_id === col.collective_id).length : null,
      canCreate: col.role === 'owner' || col.role === 'admin',
    })),
  ], [liveQuotes, userMemberships, tPods, activePodId]);

  const hasCollectives = (userMemberships || []).length > 0;

  const openMore = useCallback((quote) => {
    const pending = outgoingTransfers.find(r => r.document_id === quote.id);
    setSelectedQuote({ ...quote, _pendingTransfer: !!pending, _pendingReq: pending });
    setActiveSheet('action');
  }, [outgoingTransfers]);

  const handleOpen         = useCallback(() => { if (!selectedQuote) return; setActiveSheet(null); router.push(p(`/ajanlatok/${selectedQuote.id}`)); }, [selectedQuote, router, p]);
  const handlePdf          = useCallback(() => { if (!selectedQuote) return; setActiveSheet(null); router.push(p(`/ajanlatok/${selectedQuote.id}/nyomtatas`)); }, [selectedQuote, router, p]);
  const handleCopy         = useCallback(() => { if (!selectedQuote) return; setActiveSheet(null); router.push(p(`/ajanlatok/${selectedQuote.id}?copy=1`)); }, [selectedQuote, router, p]);
  const handleTransfer     = useCallback(() => { if (!selectedQuote) return; setActiveSheet(null); setTransferModal({ documentId: selectedQuote.id, documentTitle: selectedQuote.title }); }, [selectedQuote]);
  const handleRevoke       = useCallback(async () => { if (!selectedQuote?._pendingReq) return; setActiveSheet(null); await retractTransfer(selectedQuote._pendingReq.id); }, [selectedQuote, retractTransfer]);
  const handleDeleteConfirm = useCallback(async () => { if (!selectedQuote) return; setActiveSheet(null); await deleteQuote(selectedQuote.id); }, [selectedQuote, deleteQuote]);

  const FILTERS      = ['all', 'draft', 'sent', 'accepted', 'rejected'];
  const filterLabels = { all: t('filterAll'), draft: t('statusDraft'), sent: t('statusSent'), accepted: t('statusAccepted'), rejected: t('statusRejected') };

  const isOwner    = selectedQuote ? (selectedQuote.owner_id === currentUser?.id || selectedQuote.created_by === currentUser?.id) : false;
  const canTransfer = isOwner && !selectedQuote?.collective_id && hasCollectives && !isDemoMode;
  const isTeam     = !!selectedQuote?.collective_id;
  const isLoading  = loading || !dataReady;

  return (
    <div className="pod-screen m-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas, #EDEBE5)', color: 'var(--m-ink, #0E1116)', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)', overflowX: 'hidden' }}>
      <PageHeader
        onMenu={() => setActiveSheet('menu')}
        onMessages={() => setActiveSheet('messages')}
        onNotifications={() => setActiveSheet('notif')}
      />

      {/* Scrollable content — paddingTop 108px clears the 100px PageHeader */}
      <div style={{ padding: '108px 16px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {activeColl?.status === 'not_activated' && <MobileWorkspaceNotActivatedBanner />}
        {activeColl?.status === 'frozen' && <MobileWorkspaceFrozenBanner isOwner={activeColl?.role === 'owner'} />}

        {!isOnline && (
          <div style={{ padding: '10px 16px', borderRadius: 20, background: '#B71C1C', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
            {t('offlineBanner')}
          </div>
        )}

        <PodList
          workspaces={workspaces}
          activeId={activePodId}
          onActivate={handleActivate}
          loadingId={podSwitching ? activePodId : null}
          moduleLabel={t('pageTitle')}
          onBack={() => router.push(p('/dashboard'))}
          renderBody={(ws) => {
            const q = normalizeHU(search);
            const wsFiltered = (ws.quotes || []).filter(quote => {
              const client = clients.find(c => c.id === quote.client_id);
              return (statusFilter === 'all' || quote.status === statusFilter)
                && (!q || normalizeHU(quote.title).includes(q) || normalizeHU(client?.name || '').includes(q));
            });
            return (
              <>
                {/* Search */}
                <label style={{ position: 'relative', display: 'block' }}>
                  <span style={{ position: 'absolute', left: 18, top: '50%', marginTop: -10, color: '#5A5F68', display: 'flex' }} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                  </span>
                  <input type="search" aria-label={t('searchPlaceholder')} placeholder={t('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 28, background: '#fff', paddingLeft: 48, paddingRight: 16, fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
                  />
                </label>

                {/* Status filter chips */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {FILTERS.map(f => {
                    const on = statusFilter === f;
                    return (
                      <button key={f} onClick={() => setStatusFilter(f)} aria-pressed={on}
                        style={{ height: 44, padding: '0 16px', border: 0, borderRadius: 26, fontSize: 15, fontWeight: 700, background: on ? '#fff' : 'rgba(255,255,255,0.14)', color: on ? 'var(--m-ink)' : '#fff', flexShrink: 0, cursor: 'pointer' }}>
                        {filterLabels[f]}
                      </button>
                    );
                  })}
                </div>

                {/* Body */}
                {isLoading ? <OfferSkeleton /> : wsFiltered.length === 0 ? (
                  <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', padding: 22, textAlign: 'center' }}>
                    <b style={{ fontSize: 17, color: '#fff' }}>{statusFilter !== 'all' || search ? t('emptyTitleSearch') : t('emptyTitle')}</b>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{statusFilter !== 'all' || search ? t('emptyTextSearch') : t('emptyText')}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {wsFiltered.map(quote => {
                      const client  = clients.find(c => c.id === quote.client_id);
                      const pending = outgoingTransfers.find(r => r.document_id === quote.id);
                      return <OfferCard key={quote.id} quote={{ ...quote, _pendingTransfer: !!pending }} totalNet={quoteTotals[quote.id] || 0} client={client} t={t} userCurrency={userCurrency} onOpen={() => router.push(p(`/ajanlatok/${quote.id}`))} onMore={() => openMore({ ...quote, _pendingTransfer: !!pending, _pendingReq: pending })} />;
                    })}
                  </div>
                )}

                {/* Collective nudge for personal pod */}
                {ws.isPersonal && !hasCollectives && !isLoading && (
                  <div style={{ padding: '12px 14px', borderRadius: 20, border: '2px dashed rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.86)', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                    {t('nudge')}
                  </div>
                )}
              </>
            );
          }}
        />
      </div>

      {/* Dock */}
      <Dock
        activeTab="quotes"
        onCreatePress={() => atCreateLimit ? router.push(p('/elofizetes')) : router.push(p('/ajanlatok/uj'))}
        activePodColor={{ plusBg: '#6D3FD1', plusFg: '#FFFFFF' }}
        onMessages={() => setActiveSheet('messages')}
        onNotifications={() => setActiveSheet('notif')}
      />

      {/* Sheets */}
      {activeSheet === 'action' && selectedQuote && (
        <ActionSheet
          quote={selectedQuote}
          isOwner={isOwner}
          canTransfer={canTransfer}
          hasPending={!!selectedQuote._pendingReq}
          onOpen={handleOpen}
          onPdf={handlePdf}
          onCopy={handleCopy}
          onTransfer={handleTransfer}
          onRevoke={handleRevoke}
          onDelete={() => setActiveSheet('delete')}
          onClose={() => setActiveSheet(null)}
          t={t}
        />
      )}
      {activeSheet === 'delete' && selectedQuote && (
        <DeleteSheet
          quote={selectedQuote}
          isTeam={isTeam}
          onConfirm={handleDeleteConfirm}
          onClose={() => setActiveSheet('action')}
          t={t}
        />
      )}
      {activeSheet === 'notif'    && <NotifSheet    onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'messages' && <MessagesSheet onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'menu'     && <MenuSheet     onClose={() => setActiveSheet(null)} />}

      <TransferToCollectiveModal
        isOpen={!!transferModal}
        onClose={() => setTransferModal(null)}
        documentType="quote"
        documentId={transferModal?.documentId}
        documentTitle={transferModal?.documentTitle}
        onSuccess={() => { setTransferModal(null); refreshSupabaseData(); }}
      />
    </div>
  );
}
