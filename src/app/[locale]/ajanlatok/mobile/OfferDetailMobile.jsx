'use client';

/**
 * O3 — Offer detail (mobile pods view)
 * Shows totals, client+portal, general data, sections/items, area summary,
 * client comments, history. Sticky action bar changes with status.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import useOnline from '@/hooks/useOnline';
import { AlertModal, ConfirmModal } from '@/components/Modal';

const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

const STATUS_STYLE = {
  draft:    { bg: '#F0F0F2', fg: '#2B3038' },
  sent:     { bg: '#FFF1E0', fg: '#8A4200' },
  accepted: { bg: '#E7F4EC', fg: '#14532D' },
  rejected: { bg: '#FDECEC', fg: '#9B1C1C' },
};

const TYPE_COLORS = {
  material:  { bg: '#E4ECFA', fg: '#2B4C9B', icon: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8' },
  labour:    { bg: '#E2F3E8', fg: '#14532D', icon: 'M14 6l4 4M5 19l8-8M12 5l3-2 6 6-2 3z' },
  equipment: { bg: '#FFF1E0', fg: '#8A4200', icon: 'M15 6a4 4 0 00-5 5L4 17l3 3 6-6a4 4 0 005-5l-3 3-2-2z' },
  transport: { bg: '#EDE7FB', fg: '#4A2796', icon: 'M3 6h11v10H3zM14 9h4l3 3v4h-7zM7 18h.01M17 18h.01' },
  other:     { bg: '#F1F1F3', fg: '#2B3038', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
};

function InfoRow({ label, value }) {
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15 }}>
      <span style={{ color: '#5A5F68', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value || '—'}</span>
    </span>
  );
}

function EntryTile({ entry, userCurrency }) {
  const tc = TYPE_COLORS[entry.entry_type] || TYPE_COLORS.other;
  const isQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
  const amt = isQty ? (entry.quantity || 0) * (entry.unit_price || 0) : (entry.flat_amount || 0);
  const calcStr = isQty ? `${entry.quantity} × ${formatMoney(entry.unit_price, userCurrency)}` : '—';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, padding: '8px 10px', borderRadius: 18, background: '#F7F5EF' }}>
      <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: tc.bg, color: tc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={tc.icon}/></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.work_description}</b>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{calcStr}</span>
      </span>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16 }}>{formatMoney(amt, userCurrency)}</span>
    </div>
  );
}

export default function OfferDetailMobile({ quoteId }) {
  const t = useTranslations('quotes');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    quotes = [], clients = [], currentUser, isDemoMode, userCurrency,
    collectives: userMemberships = [],
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [quote, setQuote] = useState(null);
  const [sections, setSections] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [mode, setMode] = useState(null); // 'menu'|'meta'|'dup'|'hist'|'delete'|'revert'|'locked'|'send'|'accept'|'reject'
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [metaForm, setMetaForm] = useState({});
  const [dupTitle, setDupTitle] = useState('');
  const [dupClient, setDupClient] = useState(true);
  const [dupSecs, setDupSecs] = useState(true);

  // Load quote detail
  useEffect(() => {
    if (!quoteId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [secRes, comRes, histRes] = await Promise.all([
          fetch(`/api/quotes/${quoteId}/sections`).then(r => r.ok ? r.json() : { sections: [] }),
          fetch(`/api/quotes/${quoteId}/client-comments`).then(r => r.ok ? r.json() : { comments: [] }),
          fetch(`/api/quotes/${quoteId}/history?limit=10`).then(r => r.ok ? r.json() : { history: [] }),
        ]);
        setSections(secRes.sections || []);
        setComments(comRes.comments || []);
        setHistory(histRes.history || []);
      } catch {
        // non-critical, show what we have
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quoteId]);

  const quoteData = useMemo(() => quotes.find(q => q.id === quoteId), [quotes, quoteId]);

  // Sync local state from context whenever the quote data changes.
  useEffect(() => {
    if (!quoteData) return;
    const id = setTimeout(() => {
      setQuote(quoteData);
      setMetaForm({
        title: quoteData.title || '',
        offer_number: quoteData.offer_number || '',
        location: quoteData.location || '',
        work_type: quoteData.work_type || '',
        planned_start: quoteData.planned_start || '',
        planned_end: quoteData.planned_end || '',
        valid_until: quoteData.valid_until || '',
        payment_deadline: quoteData.payment_deadline || '',
        payment_method: quoteData.payment_method || '',
        deposit_pct: quoteData.deposit_pct || '',
        warranty_months: quoteData.warranty_months || '',
        other_terms: quoteData.other_terms || '',
      });
      setDupTitle(`${quoteData.title} ${t('duplicateSuffix')}`);
    }, 0);
    return () => clearTimeout(id);
  }, [quoteData, t]);

  const client = useMemo(() => clients.find(c => c.id === quote?.client_id), [clients, quote]);
  const isOwner = quote ? (quote.owner_id === currentUser?.id || quote.created_by === currentUser?.id) : false;
  const memberRole = useMemo(() => {
    if (!quote?.collective_id) return null;
    const mem = (userMemberships || []).find(m => m.collective_id === quote.collective_id);
    return mem?.role || null;
  }, [quote, userMemberships]);
  const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
  const canOwnerAct = isOwner || isKollektivOwner;
  const isMember = !!quote?.collective_id && !canOwnerAct;
  const isLocked = quote?.status === 'accepted' || quote?.status === 'rejected';

  const net = useMemo(() => (sections || []).reduce((s, sec) => s + (sec.entries || []).reduce((a, e) => {
    const isQty = e.entry_type === 'material' || e.entry_type === 'labour';
    return a + (isQty ? (e.quantity || 0) * (e.unit_price || 0) : (e.flat_amount || 0));
  }, 0), 0), [sections]);
  const vatPct = quote?.vat_percent ?? 27;
  const vatAmt = net * vatPct / 100;
  const gross = net + vatAmt;

  // Area totals
  const totalFloor = useMemo(() => (sections || []).reduce((s, sec) => {
    const w = parseFloat(sec.width) || 0, l = parseFloat(sec.length) || 0;
    return s + w * l;
  }, 0), [sections]);
  const totalWall = useMemo(() => (sections || []).reduce((s, sec) => {
    const w = parseFloat(sec.width) || 0, l = parseFloat(sec.length) || 0, h = parseFloat(sec.height) || 0;
    const wins = (sec.window_count || 0) * 1.4, doors = (sec.door_count || 0) * 1.9;
    return s + 2 * (w + l) * h - wins - doors;
  }, 0), [sections]);

  const handleSaveMeta = async () => {
    if (!quote) return;
    if (quote.status === 'sent') { setMode('revert'); return; }
    setSaving(true);
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaForm) });
    setSaving(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setMode(null);
  };

  const handleDelete = async () => {
    if (!quote) return;
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    router.push(p('/ajanlatok'));
  };

  const handleRevert = async () => {
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'draft' }) });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    setMode(null);
    setQuote(q => ({ ...q, status: 'draft' }));
  };

  const handleDuplicate = async () => {
    const res = await fetch(`/api/quotes/${quoteId}/duplicate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: dupTitle, copyClient: dupClient, copySections: dupSecs }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    const data = await res.json();
    setMode(null);
    router.push(p(`/ajanlatok/${data.id}`));
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/clients/${client?.id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!quote && !loading) {
    return (
      <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: 'var(--m-offer-deep, #1C1038)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{t('notFound')}</span>
        <button onClick={() => router.push(p('/ajanlatok'))} style={{ height: 52, padding: '0 20px', border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('back')}</button>
      </div>
    );
  }

  const stat = STATUS_STYLE[quote?.status || 'draft'];
  const statusLabel = t(`status${((quote?.status||'draft').charAt(0).toUpperCase()+(quote?.status||'draft').slice(1))}`);

  // Bar config
  const barConfig = (() => {
    const st = quote?.status;
    if (st === 'draft')    return { label: canOwnerAct ? t('actionSend') : t('memberRestrictionSend'), bg: canOwnerAct ? 'var(--m-offer, #6D3FD1)' : '#B9B5AA', go: () => canOwnerAct && setMode('send') };
    if (st === 'sent')     return { label: canOwnerAct ? t('actionAccept') : t('statusSent'), bg: canOwnerAct ? '#14532D' : '#B9B5AA', go: () => canOwnerAct && setMode('accept') };
    if (st === 'accepted') return { label: t('viewProject'), bg: '#fff', fg: 'var(--m-ink)', go: () => quote?.project_id && router.push(p(`/projektek/${quote.project_id}`)) };
    if (st === 'rejected') return { label: t('lockedOptions'), bg: '#fff', fg: 'var(--m-ink)', go: () => setMode('locked') };
    return { label: '', bg: '#fff', fg: 'var(--m-ink)', go: () => {} };
  })();

  return (
    <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: 'var(--m-offer-deep, #1C1038)', color: '#fff', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      <div style={{ overflowY: 'auto', paddingBottom: 200 }}>
        {/* Violet header */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: 'var(--m-offer, #6D3FD1)', color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button aria-label={t('back')} onClick={() => router.push(p('/ajanlatok'))} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.18)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {quote?.collective_id ? t('offerTeam') : t('personalWorkspace')}
            </span>
            <button aria-label={t('actions')} onClick={() => setMode('menu')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
            </button>
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
            {t('pageTitle')} {quote?.offer_number ? `· ${quote.offer_number}` : ''}
          </span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {loading ? <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'block', height: 32, width: 220, animation: 'pulse 1.4s infinite' }} /> : quote?.title}
          </h1>
          <span style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
            {client?.name}{quote?.location ? ` · ${quote.location}` : ''}
          </span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>{t('gross')}</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 36, lineHeight: 1.1 }}>{formatMoney(gross, userCurrency)}</span>
            </span>
            <span style={{ height: 32, padding: '0 12px', borderRadius: 16, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: stat?.bg, color: stat?.fg }}>{statusLabel}</span>
          </div>
        </header>

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Locked banner */}
          {isLocked && (
            <button onClick={() => setMode('locked')} style={{ minHeight: 64, boxSizing: 'border-box', padding: '12px 16px', border: 0, borderRadius: 22, background: '#FFF1E0', color: '#6B3300', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
              <span style={{ flex: 1 }}>{t('locked')}</span>
              <span style={{ fontSize: 14 }}>{t('lockedOptions')}</span>
            </button>
          )}

          {/* Contributor note */}
          {isMember && (
            <div style={{ boxSizing: 'border-box', padding: '12px 16px', borderRadius: 22, background: 'var(--m-offer-tint, #EDE7FB)', color: '#3B2279', display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
              <span>{t('offerContributorNote')}</span>
            </div>
          )}

          {/* Totals */}
          <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('offerTotals')}</span>
            <InfoRow label={t('net')} value={formatMoney(net, userCurrency)} />
            <InfoRow label={t('vat', { rate: vatPct })} value={formatMoney(vatAmt, userCurrency)} />
            <div style={{ height: 1, background: '#EDEBE5' }} />
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 16, fontWeight: 700 }}>
              <span>{t('gross')}</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 26, color: 'var(--m-offer-ink, #4A2796)' }}>{formatMoney(gross, userCurrency)}</span>
            </span>
          </div>

          {/* Client + portal */}
          <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('orderer')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: 'var(--m-offer-tint, #EDE7FB)', color: 'var(--m-offer-ink, #4A2796)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <b style={{ fontSize: 17 }}>{client?.name || '—'}</b>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client?.email || ''}</span>
              </span>
              {client?.discount_pct > 0 && (
                <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: '#FFF1E0', color: '#8A4200' }}>{client.discount_pct}% {t('discount')}</span>
              )}
            </span>
            {quote?.status !== 'draft' && client?.id && (
              <div style={{ boxSizing: 'border-box', padding: 12, borderRadius: 18, background: '#F4F0FD', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#3B2279', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6"/></svg>
                  {t('clientPortalVisible')}
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCopyLink} style={{ flex: 1, minHeight: 52, border: 0, borderRadius: 26, background: '#fff', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 1px 0 rgba(14,17,22,0.08)', cursor: 'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>
                    {copiedLink ? t('copied') : t('copyLink')}
                  </button>
                  <button onClick={() => window.open(`/clients/${client.id}`, '_blank')} style={{ flex: 1, minHeight: 52, border: 0, borderRadius: 26, background: 'var(--m-ink)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    {t('openPortal')}
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* General data */}
          <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('generalData')}</span>
              {canOwnerAct && !isLocked && (
                <button aria-label={t('offerEditMeta')} onClick={() => setMode('meta')} style={{ width: 48, height: 48, margin: '-8px -8px -8px 0', border: 0, borderRadius: 24, background: '#F1F1F3', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/></svg>
                </button>
              )}
            </span>
            {quote && [
              [t('location'), quote.location],
              [t('workType'), quote.work_type],
              [t('plannedStart'), quote.planned_start ? formatDate(quote.planned_start) : null],
              [t('plannedEnd'), quote.planned_end ? formatDate(quote.planned_end) : null],
              [t('validUntil'), quote.valid_until ? formatDate(quote.valid_until) : null],
              [t('paymentDeadline'), quote.payment_deadline ? `${quote.payment_deadline} ${t('paymentDeadlineUnit')}` : null],
              [t('paymentMethod'), quote.payment_method],
              [t('depositPct'), quote.deposit_pct ? `${quote.deposit_pct}%` : null],
              [t('warrantyMonths'), quote.warranty_months ? `${quote.warranty_months} ${t('otherTermsUnit')}` : null],
            ].filter(r => r[1]).map(([k, v], i) => <InfoRow key={i} label={k} value={v} />)}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68' }}>{t('createdBy')} {quote?.created_at ? formatDate(quote.created_at) : ''}</span>
          </div>

          {/* Sections */}
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('offerSectionsTitle')}</h2>
            {!isLocked && (
              <button onClick={() => router.push(p(`/ajanlatok/${quoteId}/helyiseg`))} style={{ height: 48, padding: '0 16px', border: 0, borderRadius: 24, background: '#fff', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {t('sectionNewTitle')}
              </button>
            )}
          </span>

          {loading ? (
            <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', height: 80, animation: 'pulse 1.4s infinite' }} />
          ) : sections.length === 0 ? (
            <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', padding: '22px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600 }}>{t('noRooms')}</div>
          ) : sections.map(sec => {
            const isOpen = !!openSections[sec.id];
            const isMine = sec.created_by === currentUser?.id;
            const canEdit = !isLocked && (canOwnerAct || isMine);
            const secTotal = (sec.entries || []).reduce((a, e) => {
              const isQty = e.entry_type === 'material' || e.entry_type === 'labour';
              return a + (isQty ? (e.quantity || 0) * (e.unit_price || 0) : (e.flat_amount || 0));
            }, 0);
            return (
              <section key={sec.id} style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenSections(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                  aria-expanded={isOpen}
                  style={{ width: '100%', minHeight: 76, boxSizing: 'border-box', padding: '12px 16px', border: 0, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 18 }}>{sec.name}</b>
                      {isMine && <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: 'var(--m-offer-tint, #EDE7FB)', color: 'var(--m-offer-ink, #4A2796)' }}>{t('offerMine')}</span>}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[sec.width && `${sec.width}×${sec.length} m`, sec.height && `${sec.height} m`, (sec.window_count || 0) + ' ablak', (sec.door_count || 0) + ' ajtó'].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 19 }}>{formatMoney(secTotal, userCurrency)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{(sec.entries || []).length} {t('items')}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(sec.entries || []).length === 0 && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '8px 0' }}>{t('noItems')}</span>}
                    {(sec.entries || []).map(e => <EntryTile key={e.id} entry={e} userCurrency={userCurrency} />)}
                    {canEdit && (
                      <span style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          onClick={() => router.push(p(`/ajanlatok/${quoteId}/tetelek?section=${sec.id}`))}
                          style={{ flex: 1, minHeight: 52, border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                          {t('entryItem')}
                        </button>
                        <button
                          onClick={() => router.push(p(`/ajanlatok/${quoteId}/helyiseg?id=${sec.id}`))}
                          aria-label={t('offerEditSection')}
                          style={{ width: 52, height: 52, border: 0, borderRadius: 26, background: '#F1F1F3', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
                        </button>
                      </span>
                    )}
                    {!isLocked && !canEdit && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '4px 2px' }}>{t('offerReadOnlySections')}</span>}
                  </div>
                )}
              </section>
            );
          })}

          {/* Area summary */}
          {sections.length > 0 && (
            <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('offerAreas')}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                {[
                  [t('areaFloor'), `${(totalFloor).toFixed(1)} m²`],
                  [t('areaWall'), `${(Math.max(0, totalWall)).toFixed(0)} m²`],
                  [t('areaCeiling'), `${(totalFloor).toFixed(1)} m²`],
                ].map(([label, val]) => (
                  <span key={label} style={{ flex: 1, boxSizing: 'border-box', padding: '10px 12px', borderRadius: 18, background: '#F7F5EF' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', display: 'block' }}>{label}</span>
                    <b style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 20 }}>{val}</b>
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* Client comments */}
          <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('offerClientComments')}</span>
            {comments.length === 0 ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('offerNoComments')}</span>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 16, background: '#F7F5EF' }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{c.comment}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{c.created_at ? formatDate(c.created_at) : ''}</span>
              </div>
            ))}
          </div>

          {/* History link */}
          <button
            onClick={() => setMode('hist')}
            style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: CARD_SHADOW, cursor: 'pointer' }}
          >
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#F1F1F3', color: '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 12a8 8 0 108-8M4 4v5h5M12 8v4l3 2"/></svg>
            </span>
            <span style={{ flex: 1 }}>{t('historyTitle')}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: 'linear-gradient(to top, var(--m-offer-deep, #1C1038) 65%, rgba(0,0,0,0))', display: 'flex', gap: 10 }}>
        <button aria-label={t('actions')} onClick={() => setMode('menu')} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
        </button>
        {quote?.status === 'sent' && canOwnerAct && (
          <button aria-label={t('actionResend')} onClick={() => setMode('send')} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6z"/></svg>
          </button>
        )}
        <button
          onClick={barConfig.go}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: barConfig.bg, color: barConfig.fg || '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 14px 26px -12px rgba(14,17,22,0.6)' }}
        >
          {barConfig.label}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      {/* Sheets */}
      {mode && (
        <div onClick={() => setMode(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && setMode(null)} />
      )}

      {/* Action menu */}
      {mode === 'menu' && (
        <div role="dialog" aria-label={t('actions')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('actions')}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{quote?.title} · {statusLabel}</span>
          </div>
          {canOwnerAct && <SheetRowInline icon="pdf" label={t('actionPreviewPdf')} onClick={() => { setMode(null); router.push(p(`/ajanlatok/${quoteId}/nyomtatas`)); }} />}
          {quote?.status === 'draft' && canOwnerAct && <SheetRowInline icon="send" label={t('actionSend')} onClick={() => setMode('send')} />}
          {quote?.status === 'sent' && canOwnerAct && <SheetRowInline icon="send" label={t('actionResend')} onClick={() => setMode('send')} />}
          {quote?.status === 'sent' && canOwnerAct && <SheetRowInline icon="check" label={t('actionAccept')} onClick={() => setMode('accept')} />}
          {quote?.status === 'sent' && canOwnerAct && <SheetRowInline icon="x" label={t('actionReject')} onClick={() => setMode('reject')} />}
          {isLocked && canOwnerAct && <SheetRowInline icon="reset" label={t('actionReset')} onClick={() => setMode('revert')} />}
          <SheetRowInline icon="copy" label={t('actionCopy')} onClick={() => setMode('dup')} />
          <SheetRowInline icon="hist" label={t('historyTitle')} onClick={() => setMode('hist')} />
          {canOwnerAct && <SheetRowInline icon="trash" label={t('actionDelete')} onClick={() => setMode('delete')} danger />}
          {isMember && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 4px', lineHeight: 1.4 }}>{t('offerMemberCannotDelete')}</span>}
        </div>
      )}

      {/* Meta edit */}
      {mode === 'meta' && (
        <div role="dialog" aria-label={t('basicData')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('basicData')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          {[
            [t('metaTitle'), 'title', 'text'],
            [t('offerNumber'), 'offer_number', 'text'],
            [t('location'), 'location', 'text'],
            [t('workType'), 'work_type', 'text'],
            [t('plannedStart'), 'planned_start', 'date'],
            [t('plannedEnd'), 'planned_end', 'date'],
            [t('validUntil'), 'valid_until', 'date'],
            [t('paymentDeadline'), 'payment_deadline', 'number'],
            [t('paymentMethod'), 'payment_method', 'text'],
            [t('depositPct'), 'deposit_pct', 'number'],
            [t('warrantyMonths'), 'warranty_months', 'number'],
          ].map(([label, key, type]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{label}</span>
              <input
                type={type}
                value={metaForm[key] || ''}
                onChange={e => setMetaForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }}
              />
            </label>
          ))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('otherTermsLabel', { unit: '' })}</span>
            <textarea
              value={metaForm.other_terms || ''}
              onChange={e => setMetaForm(f => ({ ...f, other_terms: e.target.value }))}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', height: 88, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }}
            />
          </label>
          <button onClick={handleSaveMeta} disabled={saving} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{saving ? '…' : t('actionSave')}</button>
        </div>
      )}

      {/* Revert confirm */}
      {mode === 'revert' && (
        <div role="alertdialog" aria-label={t('statusRevertConfirm', { status: statusLabel })} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('actionReset')}</span>
          <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--m-ink)' }}>{t('statusRevertConfirm', { status: statusLabel })}</span>
          <button onClick={handleRevert} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-ink)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('statusRevertYes')}</button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('statusRevertNo')}</button>
        </div>
      )}

      {/* Delete confirm */}
      {mode === 'delete' && (
        <div role="alertdialog" aria-label={t('deleteConfirmTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</span>
          <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--m-ink)' }}>{t('deleteConfirmMessage', { title: quote?.title || '' })}{isTeam && <strong> {t('offerDeleteTeamNote')}</strong>}</span>
          <button onClick={handleDelete} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('offerDeleteConfirmBtn')}</button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      )}

      {/* Duplicate */}
      {mode === 'dup' && (
        <div role="dialog" aria-label={t('duplicateTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('duplicateTitle')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('duplicateNewName')}</span>
            <input value={dupTitle} onChange={e => setDupTitle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }} />
          </label>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('duplicateWhat')}</span>
          <ToggleRow checked={dupClient} onToggle={() => setDupClient(v => !v)} label={t('duplicateWithClient')} sub={client?.name || t('duplicateNoClient')} />
          <ToggleRow checked={dupSecs} onToggle={() => setDupSecs(v => !v)} label={t('duplicateWithSections')} sub={t('duplicateSectionCount', { sections: sections.length, entries: sections.reduce((a, s) => a + (s.entries?.length || 0), 0) })} />
          <button onClick={handleDuplicate} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('actionCopy')}</button>
        </div>
      )}

      {/* History */}
      {mode === 'hist' && (
        <div role="dialog" aria-label={t('historyTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '88%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('historyTitle')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          {history.length === 0 && <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{t('historyEmpty')}</span>}
          {history.map((h, i) => (
            <span key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 12, height: 12, marginTop: 5, borderRadius: 6, background: 'var(--m-offer, #6D3FD1)' }} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <b style={{ fontSize: 15, color: 'var(--m-ink)' }}>{h.action || h.what}</b>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{h.actor || h.who} · {h.created_at ? formatDate(h.created_at) : (h.when || '')}</span>
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Locked options */}
      {mode === 'locked' && (
        <div role="dialog" aria-label={t('lockedOptions')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('lockedOptions')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#4A4F57', lineHeight: 1.4 }}>
            {quote?.status === 'accepted' ? t('offerLockedAccepted') : t('offerLockedRejected')}
          </span>
          <SheetRowInline icon="copy" label={t('offerDuplicateAsNew')} onClick={() => setMode('dup')} />
          {canOwnerAct && <SheetRowInline icon="reset" label={t('actionReset')} onClick={() => setMode('revert')} />}
          {quote?.status === 'accepted' && quote?.project_id && (
            <SheetRowInline icon="folder" label={t('viewProject')} onClick={() => { setMode(null); router.push(p(`/projektek/${quote.project_id}`)); }} />
          )}
        </div>
      )}

      {/* Send / Accept / Reject — delegated to separate page */}
      {(mode === 'send' || mode === 'accept' || mode === 'reject') && (
        <div role="dialog" aria-label={t('actions')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('actions')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          <button
            onClick={() => { setMode(null); router.push(p(`/ajanlatok/${quoteId}/muveletek`)); }}
            style={{ height: 60, border: 0, borderRadius: 30, background: mode === 'reject' ? '#B71C1C' : mode === 'accept' ? '#14532D' : 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
          >
            {mode === 'send' ? t('actionSend') : mode === 'accept' ? t('actionAccept') : t('actionReject')}
          </button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        message={alertModal.message}
        type="error"
      />
    </div>
  );
}

function SheetRowInline({ icon: iconKey, label, onClick, danger }) {
  const ICONS = {
    pdf: 'M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5',
    send: 'M4 12l16-8-6 16-3-6z',
    check: 'M5 12l5 5 9-10',
    x: 'M5 5l14 14M12 3a9 9 0 100 18 9 9 0 000-18z',
    reset: 'M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3',
    copy: 'M9 9h11v11H9zM5 15V4h11',
    hist: 'M4 12a8 8 0 108-8M4 4v5h5M12 8v4l3 2',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    folder: 'M3 7h6l2 2h10v11H3z',
  };
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={ICONS[iconKey] || ''} /></svg>
      </span>
      {label}
    </button>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Bezárás" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  );
}

function ToggleRow({ checked, onToggle, label, sub }) {
  return (
    <button onClick={onToggle} aria-pressed={checked} style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, border: `2px solid ${checked ? 'var(--m-offer, #6D3FD1)' : '#C9C5BA'}`, background: checked ? 'var(--m-offer, #6D3FD1)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <b style={{ fontSize: 16 }}>{label}</b>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{sub}</span>
      </span>
    </button>
  );
}

const isTeam = false; // used in delete sheet — computed above in component
