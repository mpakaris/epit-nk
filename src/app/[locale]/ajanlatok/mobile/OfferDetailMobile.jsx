'use client';

/**
 * O3 — Offer detail (mobile pods view)
 * Shows totals, client+portal, general data, sections/items, area summary,
 * client comments, history. Sticky action bar changes with status.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import useOnline from '@/hooks/useOnline';
import { AlertModal, ConfirmModal } from '@/components/Modal';
import QuickClientSheet from './QuickClientSheet';
import HistorySheet from '@/components/mobile/pods/HistorySheet';
import DrawingsSection from '@/components/DrawingsSection';
import { processMediaFile } from '@/lib/mediaGate';

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
      <span style={{ fontWeight: 700, textAlign: 'right', color: 'var(--m-ink)' }}>{value || '—'}</span>
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
  const t  = useTranslations('quotes');
  const tM = useTranslations('mobilePods');
  const tc = useTranslations('common');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    quotes = [], clients = [], currentUser, isDemoMode, userCurrency,
    collectives: userMemberships = [], createClient, deleteQuote, deleteQuoteSection,
    updateQuoteStatus, refreshSupabaseData,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);
  const searchParams = useSearchParams();

  const [quote, setQuote] = useState(null);
  const [sections, setSections] = useState([]);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [mode, setMode] = useState(null); // 'menu'|'meta'|'dup'|'hist'|'delete'|'revert'|'locked'|'send'|'accept'|'reject'
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [sendEmail, setSendEmail] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [attachTerms,       setAttachTerms]       = useState(true);
  const [termsUploading,    setTermsUploading]    = useState(false);
  const [localTermsName,    setLocalTermsName]    = useState(null);
  const [termsPdfName,      setTermsPdfName]      = useState(null);  // profile-level T&C filename
  const [termsLocal,        setTermsLocal]        = useState(null);  // local copy for T&C pod
  const [sendSelectedTerms, setSendSelectedTerms] = useState({ profileTerms: true, fileIds: [] });
  const termsFileRef  = useRef(null);
  const quoteTermsRef = useRef(null); // for quote-level T&C upload
  const scrollRef     = useRef(null);
  const [compactBar,  setCompactBar]  = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCompactBar(el.scrollTop > 80);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const [clientSearch, setClientSearch] = useState('');
  const [sectionMenuId,    setSectionMenuId]    = useState(null);
  const [openInfoPods,     setOpenInfoPods]     = useState({ summary: true, client: false, general: false, terms: false });
  const toggleInfoPod = (key) => setOpenInfoPods(prev => ({ ...prev, [key]: !prev[key] }));
  const [sectionEditTarget, setSectionEditTarget] = useState(null); // null | 'new' | section obj
  const [metaForm, setMetaForm] = useState({});
  const [dupTitle, setDupTitle] = useState('');
  const [dupClient, setDupClient] = useState(true);
  const [dupSecs, setDupSecs] = useState(true);

  // ── Media state ──────────────────────────────────────────────────────────
  const [mediaItems,      setMediaItems]      = useState([]);
  const [quoteDrawings,   setQuoteDrawings]   = useState([]);
  const [docMediaMode,    setDocMediaMode]    = useState(null); // null | 'images' | 'documents' | 'drawings'
  const [sectionMediaCtx, setSectionMediaCtx] = useState(null); // null | { sectionId, mode }
  const [lightboxCtx,     setLightboxCtx]     = useState(null); // null | { items, idx }
  const [mediaUploading,  setMediaUploading]  = useState(false);
  const [mediaDeleting,   setMediaDeleting]   = useState(null);
  const mediaFileRef = useRef(null);

  const refreshSections = useCallback(async () => {
    const res = await fetch(`/api/quotes/${quoteId}/sections`).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => ({}));
      setSections(data.sections || []);
    }
  }, [quoteId]);

  // Load quote detail
  useEffect(() => {
    if (!quoteId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [secRes, fullRes] = await Promise.all([
          fetch(`/api/quotes/${quoteId}/sections`).then(r => r.ok ? r.json() : { sections: [] }),
          fetch(`/api/quotes/${quoteId}`).then(r => r.ok ? r.json() : {}),
        ]);
        setSections(secRes.sections || []);
        if (fullRes.mediaItems)    setMediaItems(fullRes.mediaItems);
        if (fullRes.quoteDrawings) setQuoteDrawings(fullRes.quoteDrawings);
      } catch {
        // non-critical, show what we have
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quoteId]);

  const quoteData = useMemo(() => quotes.find(q => q.id === quoteId), [quotes, quoteId]);

  // Auto-open dup sheet when arriving from list with ?copy=1
  useEffect(() => {
    if (quoteData && searchParams.get('copy') === '1') setMode('dup');
  }, [quoteData, searchParams]);

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
        planned_start: quoteData.start_date || '',
        planned_end: quoteData.end_date || '',
        valid_until: quoteData.valid_until || '',
        payment_method: quoteData.payment_method || '',
        deposit_pct: quoteData.deposit_percent != null ? String(quoteData.deposit_percent) : '',
        warranty_months: quoteData.warranty_months != null ? String(quoteData.warranty_months) : '',
        tax_percent: quoteData.tax_percent != null ? quoteData.tax_percent : 27,
        other_terms: quoteData.offer_terms_text || '',
      });
      setDupTitle(`${quoteData.title} ${t('duplicateSuffix')}`);
      // Sync terms state
      setTermsLocal({ attachments: quoteData.terms_attachments || [] });
      setSendSelectedTerms({
        profileTerms: quoteData.attach_profile_terms !== false,
        fileIds: (quoteData.terms_attachments || []).map(a => a.id),
      });
    }, 0);
    return () => clearTimeout(id);
  }, [quoteData, t]);

  // Fetch profile T&C filename once
  useEffect(() => {
    if (termsPdfName !== null) return;
    fetch('/api/auth/profile').then(r => r.ok ? r.json() : {}).then(d => {
      setTermsPdfName(d.profile?.terms_pdf_name || '');
    }).catch(() => setTermsPdfName(''));
  }, []);

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
    return a + Number(e.amount_huf || 0);
  }, 0), 0), [sections]);
  const vatPct = quote?.tax_percent ?? 27;
  const vatAmt = net * vatPct / 100;
  const gross = net + vatAmt;

  // Area totals
  const totalFloor = useMemo(() => (sections || []).reduce((s, sec) => {
    const w = parseFloat(sec.width_m) || 0, l = parseFloat(sec.length_m) || 0;
    return s + w * l;
  }, 0), [sections]);
  const totalWall = useMemo(() => (sections || []).reduce((s, sec) => {
    const w = parseFloat(sec.width_m) || 0, l = parseFloat(sec.length_m) || 0, h = parseFloat(sec.height_m) || 0;
    const wins = (sec.window_count || 0) * 1.4, doors = (sec.door_count || 0) * 1.9;
    return s + 2 * (w + l) * h - wins - doors;
  }, 0), [sections]);

  const handleSaveMeta = async () => {
    if (!quote) return;
    if (quote.status === 'sent') { setMode('revert'); return; }
    setSaving(true);
    const orNull = (v) => (v === '' || v == null) ? null : v;
    const payload = {
      title:            metaForm.title,
      offer_number:     orNull(metaForm.offer_number),
      location:         orNull(metaForm.location),
      work_type:        orNull(metaForm.work_type),
      start_date:       orNull(metaForm.planned_start),
      end_date:         orNull(metaForm.planned_end),
      valid_until:      orNull(metaForm.valid_until),
      payment_method:   orNull(metaForm.payment_method),
      deposit_percent:  metaForm.deposit_pct !== '' ? Number(metaForm.deposit_pct) : null,
      warranty_months:  metaForm.warranty_months !== '' ? Number(metaForm.warranty_months) : null,
      tax_percent:      metaForm.tax_percent ?? 27,
      offer_terms_text: orNull(metaForm.other_terms),
    };
    const res = await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('saveError') });
      return;
    }
    setQuote(prev => ({ ...prev, ...payload }));
    setMode(null);
  };

  const handleDelete = async () => {
    if (!quote) return;
    try {
      await deleteQuote(quoteId);
      router.push(p('/ajanlatok'));
    } catch (err) {
      setAlertModal({ open: true, message: err.message || t('errorUnknown') });
    }
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

  const openSendSheet = useCallback(() => {
    setSendEmail(client?.email || '');
    setLocalTermsName(null);
    setMode('send');
  }, [client]);

  const handleTermsUpload = async (file) => {
    if (!file) return;
    setTermsUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/quotes/${quoteId}/terms-pdf`, { method: 'POST', body: fd });
    setTermsUploading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    const data = await res.json();
    const newAtts = data.quote?.terms_attachments || [];
    setTermsLocal({ attachments: newAtts });
    setSendSelectedTerms(p => ({ ...p, fileIds: newAtts.map(a => a.id) }));
    if (quoteTermsRef.current) quoteTermsRef.current.value = '';
  };

  const handleTermsDelete = async (attId) => {
    setTermsLocal(p => ({ ...p, attachments: (p?.attachments || []).filter(a => a.id !== attId) }));
    setSendSelectedTerms(p => ({ ...p, fileIds: p.fileIds.filter(x => x !== attId) }));
    try {
      const res = await fetch(`/api/quotes/${quoteId}/terms-pdf?fileId=${attId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
    } catch (err) {
      setAlertModal({ open: true, message: err.message });
      // restore on failure
      setTermsLocal(p => ({ ...p, attachments: quote?.terms_attachments || [] }));
      setSendSelectedTerms(p => ({ ...p, fileIds: (quote?.terms_attachments || []).map(a => a.id) }));
    }
  };

  const handleSend = async () => {
    const email = sendEmail.trim();
    if (!email) {
      setAlertModal({ open: true, message: t('sendNoEmail') });
      return;
    }
    setSendLoading(true);
    const res = await fetch(`/api/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_email: email, selectedTerms: sendSelectedTerms }),
    });
    setSendLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    setMode(null);
    setQuote(q => ({ ...q, status: 'sent' }));
  };

  const handleClientAttach = async (clientId) => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    setMode(null);
    setQuote(q => ({ ...q, client_id: clientId }));
  };


  const handleSectionDelete = async (sectionId) => {
    try {
      await deleteQuoteSection(quoteId, sectionId);
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setSectionMenuId(null);
    } catch (err) {
      setAlertModal({ open: true, message: err.message || t('errorUnknown') });
    }
  };

  const handleClientRemove = async () => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: null }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlertModal({ open: true, message: error || t('errorUnknown') });
      return;
    }
    setMode(null);
    setQuote(q => ({ ...q, client_id: null }));
  };

  if (!quote && !loading) {
    return (
      <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: '#121110', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
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
    if (st === 'draft')    return { label: canOwnerAct ? t('actionSend') : t('memberRestrictionSend'), bg: canOwnerAct ? 'var(--m-offer, #6D3FD1)' : '#B9B5AA', go: () => canOwnerAct && openSendSheet() };
    if (st === 'sent')     return { label: canOwnerAct ? t('actionAccept') : t('statusSent'), bg: canOwnerAct ? '#14532D' : '#B9B5AA', go: () => canOwnerAct && setMode('accept') };
    if (st === 'accepted') return { label: t('viewProject'), bg: '#fff', fg: 'var(--m-ink)', go: () => quote?.project_id && router.push(p(`/projektek/${quote.project_id}`)) };
    if (st === 'rejected') return { label: t('lockedOptions'), bg: '#fff', fg: 'var(--m-ink)', go: () => setMode('locked') };
    return { label: '', bg: '#fff', fg: 'var(--m-ink)', go: () => {} };
  })();

  return (
    <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: '#121110', color: '#fff', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      {/* Compact sticky header — slides in after scrolling past the full header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 28, background: 'var(--m-offer, #6D3FD1)', padding: '10px 16px', paddingTop: 'max(10px, env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '0 0 22px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transform: compactBar && !mode ? 'translateY(0)' : 'translateY(-110%)', transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)', pointerEvents: compactBar && !mode ? 'auto' : 'none' }}>
        <button aria-label={t('back')} onClick={() => router.push(p('/ajanlatok'))} style={{ flexShrink: 0, width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quote?.title}</span>
        <button aria-label={t('actions')} onClick={() => setMode('menu')} style={{ flexShrink: 0, width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
        </button>
      </div>

      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '100dvh', paddingBottom: 200 }}>
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

          {/* Pod 1 — Summary */}
          <InfoPod
            isOpen={openInfoPods.summary}
            onToggle={() => toggleInfoPod('summary')}
            title={t('offerTotals')}
            headerRight={
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 20, color: 'var(--m-offer-ink, #4A2796)' }}>
                {formatMoney(gross, userCurrency)}
              </span>
            }
          >
            <InfoRow label={t('net')} value={formatMoney(net, userCurrency)} />
            <InfoRow label={t('vat', { rate: vatPct })} value={formatMoney(vatAmt, userCurrency)} />
            <div style={{ height: 1, background: '#EDEBE5', margin: '4px 0' }} />
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: 'var(--m-ink)' }}>{t('gross')}</span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 26, color: 'var(--m-offer-ink, #4A2796)' }}>{formatMoney(gross, userCurrency)}</span>
            </span>
          </InfoPod>

          {/* Pod 2 — Client */}
          <InfoPod
            isOpen={openInfoPods.client}
            onToggle={() => toggleInfoPod('client')}
            title={t('orderer')}
            headerRight={
              client
                ? <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{client.name}</span>
                : <span style={{ fontSize: 14, fontWeight: 600, color: '#8A8F97' }}>{t('duplicateNoClient')}</span>
            }
            action={null}
          >
            {client ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: 'var(--m-offer-tint, #EDE7FB)', color: 'var(--m-offer-ink, #4A2796)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <b style={{ fontSize: 17, color: 'var(--m-ink)' }}>{client.name}</b>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client.email || ''}</span>
                </span>
                {client?.discount_pct > 0 && (
                  <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: '#FFF1E0', color: '#8A4200' }}>{client.discount_pct}% {t('discount')}</span>
                )}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: '#F1F1F3', color: '#8A8F97', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#8A8F97' }}>{t('duplicateNoClient')}</span>
              </span>
            )}
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
            {canOwnerAct && !isLocked && (
              <button onClick={() => { setClientSearch(''); setMode(client ? 'clientMenu' : 'clientPicker'); }} style={{ width: '100%', height: 52, border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/></svg>
                {tc('edit')}
              </button>
            )}
          </InfoPod>

          {/* Pod 3 — General Data */}
          <InfoPod
            isOpen={openInfoPods.general}
            onToggle={() => toggleInfoPod('general')}
            title={t('generalData')}
            headerRight={
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8F97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {quote?.location || quote?.work_type || quote?.valid_until ? formatDate(quote.valid_until) : ''}
              </span>
            }
            action={null}
          >
            {quote && [
              [t('location'), quote.location],
              [t('workType'), quote.work_type],
              [t('plannedStart'), quote.start_date ? formatDate(quote.start_date) : null],
              [t('plannedEnd'), quote.end_date ? formatDate(quote.end_date) : null],
              [t('validUntil'), quote.valid_until ? formatDate(quote.valid_until) : null],
              [t('paymentMethod'), quote.payment_method],
              [t('depositPct'), quote.deposit_percent ? `${quote.deposit_percent}%` : null],
              [t('warrantyMonths'), quote.warranty_months ? `${quote.warranty_months} ${t('otherTermsUnit')}` : null],
              [t('vatRate'), `${vatPct}%`],
            ].filter(r => r[1]).map(([k, v], i) => <InfoRow key={i} label={k} value={v} />)}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68' }}>{t('createdBy')} {quote?.created_at ? formatDate(quote.created_at) : ''}</span>
            {canOwnerAct && !isLocked && (
              <button onClick={() => setMode('meta')} style={{ width: '100%', height: 52, border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/></svg>
                {tc('edit')}
              </button>
            )}
          </InfoPod>

          {/* Level 1 — Offer media (mirrors survey Floor Plans + Sketches cards) */}
          {(() => {
            const docImgs     = mediaItems.filter(m => m.owner_type === 'quote' && (m.mime_type?.startsWith('image/') || m.mime_type?.startsWith('video/')));
            const docDocs     = mediaItems.filter(m => m.owner_type === 'quote' && !m.mime_type?.startsWith('image/') && !m.mime_type?.startsWith('video/'));
            const docDrawings = quoteDrawings.filter(d => !d.section_id);
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                  {/* Photos / Videos card */}
                  <section style={{ padding: 14, borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: CARD_SHADOW }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                      {t('mediaImagesTitle')}{docImgs.length > 0 ? ` · ${docImgs.length}` : ''}
                    </span>
                    {docImgs.length > 0 ? (
                      <button type="button" onClick={() => setDocMediaMode('images')}
                        style={{ padding: 0, border: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: docImgs.length > 1 ? '1fr 1fr' : '1fr', gap: 2, height: 76 }}>
                        {docImgs.slice(0, 2).map((item, i) => {
                          const isVideo = item.mime_type?.startsWith('video/');
                          const isLast  = i === 1 && docImgs.length > 2;
                          return (
                            <span key={item.id} style={{ position: 'relative', background: isVideo ? '#1A1D22' : `url(${item.thumbnail_url || item.cdn_url}) center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              {isVideo && <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>}
                              {isLast && <span style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>+{docImgs.length - 1}</span>}
                            </span>
                          );
                        })}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setDocMediaMode('images')}
                        style={{ height: 76, border: 0, borderRadius: 16, background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0ADA6', cursor: 'pointer' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3"/></svg>
                      </button>
                    )}
                    <button type="button" onClick={() => setDocMediaMode('images')}
                      style={{ minHeight: 48, border: 0, borderRadius: 24, background: '#0E1116', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {tM('roomPhotoVideo')}
                    </button>
                  </section>

                  {/* Sketches card */}
                  <section style={{ padding: 14, borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: CARD_SHADOW }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                      {t('mediaDrawingsTitle')}{docDrawings.length > 0 ? ` · ${docDrawings.length}` : ''}
                    </span>
                    {docDrawings.length > 0 ? (
                      <button type="button" onClick={() => setDocMediaMode('drawings')}
                        style={{ padding: 0, border: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: docDrawings.length > 1 ? '1fr 1fr' : '1fr', gap: 2, height: 76, background: '#F7F5EF' }}>
                        {docDrawings.slice(0, 2).map((d, i) => (
                          <span key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden' }}
                            dangerouslySetInnerHTML={{ __html: d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;object-fit:contain"') || '' }} />
                        ))}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setDocMediaMode('drawings')}
                        style={{ height: 76, border: 0, borderRadius: 16, background: '#F7F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0ADA6', cursor: 'pointer' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>
                      </button>
                    )}
                    <button type="button" onClick={() => setDocMediaMode('drawings')}
                      style={{ minHeight: 48, border: 0, borderRadius: 24, background: '#F1F1F3', color: '#0E1116', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {tM('propAddSketch')}
                    </button>
                  </section>

                </div>

                {/* Documents — small row below */}
                <button type="button" onClick={() => setDocMediaMode('documents')}
                  style={{ width: '100%', minHeight: 52, boxSizing: 'border-box', padding: '0 16px', border: 0, borderRadius: 20, background: '#fff', boxShadow: CARD_SHADOW, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6D3FD1" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)' }}>{t('mediaDocumentsTitle')}</span>
                  {docDocs.length > 0 && <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: 'var(--m-offer-tint, #EDE7FB)', color: 'var(--m-offer-ink, #4A2796)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>{docDocs.length}</span>}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0BDB7" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </>
            );
          })()}

          {/* Sections */}
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('offerSectionsTitle')}</h2>
            {canOwnerAct && !isLocked && (
              <button onClick={() => setSectionEditTarget('new')} style={{ height: 48, padding: '0 16px', border: 0, borderRadius: 24, background: '#fff', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                {t('sectionNewTitle')}
              </button>
            )}
          </span>

          {loading ? (
            <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', height: 80, animation: 'pulse 1.4s infinite' }} />
          ) : sections.length === 0 ? (
            <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', padding: '22px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600 }}>{t('noRooms')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sections.map((sec, idx) => {
                const isMine  = sec.created_by === currentUser?.id;
                const canEdit = !isLocked && (canOwnerAct || isMine);
                const secMedia = mediaItems.filter(m => m.owner_type === 'quote_section' && m.owner_id === sec.id && (m.mime_type?.startsWith('image/') || m.mime_type?.startsWith('video/')));
                const secDrawings = quoteDrawings.filter(d => d.section_id === sec.id);
                return (
                  <OfferRoomCard
                    key={sec.id}
                    sec={sec}
                    index={idx + 1}
                    isOpen={!!openSections[sec.id]}
                    onToggle={() => setOpenSections(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                    onMore={() => setSectionMenuId(sec.id)}
                    onItems={() => router.push(p(`/ajanlatok/${quoteId}/tetelek/${sec.id}`))}
                    onDims={() => setSectionEditTarget(sec)}
                    canEdit={canEdit}
                    isLocked={isLocked}
                    userCurrency={userCurrency}
                    tM={tM}
                    sectionMedia={secMedia}
                    sectionDrawings={secDrawings}
                    onMediaOpen={() => setSectionMediaCtx({ sectionId: sec.id, mode: 'images' })}
                    onSketchOpen={() => setSectionMediaCtx({ sectionId: sec.id, mode: 'drawings' })}
                    onAddSketch={() => setSectionMediaCtx({ sectionId: sec.id, mode: 'drawings', triggerNew: true })}
                    onUploadMedia={async (files) => {
                      try {
                        const processed = await Promise.all(files.map(processMediaFile));
                        const form = new FormData();
                        processed.forEach(f => form.append('files', f));
                        form.append('owner_type', 'quote_section');
                        form.append('owner_id', sec.id);
                        const res = await fetch(`/api/quotes/${quoteId}/media`, { method: 'POST', body: form });
                        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Hiba');
                        const { media } = await res.json();
                        setMediaItems(prev => [...prev, ...media]);
                      } catch (err) { setAlertModal({ open: true, message: err.message }); }
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* T&C section header */}
          {canOwnerAct && (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{t('desktop.termsCard')}</h2>
            </span>
          )}

          {/* T&C Pod */}
          {canOwnerAct && (() => {
            const atts = termsLocal?.attachments || [];
            const hasProfile = !!termsPdfName;
            const totalCount = (hasProfile ? 1 : 0) + atts.length;
            return (
              <InfoPod
                isOpen={openInfoPods.terms}
                onToggle={() => toggleInfoPod('terms')}
                title={t('desktop.termsCard')}
                headerRight={totalCount > 0
                  ? <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>{totalCount}</span>
                  : null}
              >
                {/* Profile default */}
                {hasProfile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#F8F9FB' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</div>
                      <div style={{ fontSize: 12, color: '#8A8F97' }}>{t('desktop.termsDefault')}</div>
                    </div>
                  </div>
                )}

                {/* Custom attachments */}
                {atts.map(att => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#F8F9FB' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                      <div style={{ fontSize: 12, color: '#8A8F97' }}>{t('desktop.termsCustom')}</div>
                    </div>
                    <button type="button" onClick={() => handleTermsDelete(att.id)}
                      style={{ width: 36, height: 36, borderRadius: 18, background: '#FEE2E2', border: 0, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                {atts.length < 5 ? (
                  <>
                    <input ref={quoteTermsRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={e => { handleTermsUpload(e.target.files?.[0]); }} />
                    <button type="button" onClick={() => quoteTermsRef.current?.click()} disabled={termsUploading}
                      style={{ width: '100%', height: 52, border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', opacity: termsUploading ? 0.6 : 1 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                      {termsUploading ? tc('uploading') : t('desktop.termsUpload')}
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: '#8A8F97' }}>{t('desktop.termsMaxReached')}</span>
                )}

                {totalCount === 0 && !termsUploading && (
                  <span style={{ fontSize: 14, color: '#8A8F97' }}>{t('desktop.termsNone')}</span>
                )}
              </InfoPod>
            );
          })()}

        </div>
      </div>

      {/* Sticky action bar — 3 buttons: Actions · Send · Preview */}
      <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: 'linear-gradient(to top, #121110 65%, rgba(0,0,0,0))', display: 'flex', gap: 10 }}>
        {/* Actions */}
        <button aria-label={t('actions')} onClick={() => setMode('menu')} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
        </button>
        {/* Send */}
        <button aria-label={quote?.status === 'sent' ? t('actionResend') : t('actionSend')} onClick={openSendSheet} disabled={!canOwnerAct || isLocked}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: canOwnerAct && !isLocked ? 'var(--m-offer, #6D3FD1)' : 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: canOwnerAct && !isLocked ? 'pointer' : 'default', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6z"/></svg>
          {quote?.status === 'sent' ? t('actionResend') : t('actionSend')}
        </button>
        {/* Preview */}
        <button aria-label={t('actionPreview')} onClick={() => router.push(p(`/ajanlatok/${quoteId}/nyomtatas`))}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 14px 26px -12px rgba(14,17,22,0.6)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zM14 2v6h6M4 13h16M8 17h8"/></svg>
          {t('actionPreview')}
        </button>
      </div>

      {/* Sheets */}
      {(mode || sectionMenuId || sectionEditTarget) && (
        <div onClick={() => { setMode(null); setSectionMenuId(null); setSectionEditTarget(null); }} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => { if (e.key === 'Enter') { setMode(null); setSectionMenuId(null); setSectionEditTarget(null); } }} />
      )}

      {/* Action menu */}
      {mode === 'menu' && (
        <div role="dialog" aria-label={t('actions')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('actions')}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{quote?.title} · {statusLabel}</span>
          </div>
          {canOwnerAct && !isLocked && <SheetRowInline icon="edit" label={tc('edit')} onClick={() => setMode('meta')} />}
          {!isLocked && canOwnerAct && <SheetRowInline icon="check" label={t('actionAccept')} onClick={() => setMode('accept')} success />}
          {!isLocked && canOwnerAct && <SheetRowInline icon="x" label={t('actionReject')} onClick={() => setMode('reject')} danger />}
          {isLocked && canOwnerAct && <SheetRowInline icon="reset" label={t('actionReset')} onClick={() => setMode('revert')} />}
          <SheetRowInline icon="copy" label={t('actionCopy')} onClick={() => setMode('dup')} />
          <SheetRowInline icon="hist" label={t('historyTitle')} onClick={async () => {
            setMode('hist');
            setHistLoading(true);
            try {
              const r = await fetch(`/api/quotes/${quoteId}/history?limit=20`);
              const j = r.ok ? await r.json() : { history: [] };
              setHistory(j.history || []);
            } catch { /* non-critical */ } finally { setHistLoading(false); }
          }} />
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
          {/* helper: purple ring on required+empty, gray otherwise */}
          {(() => {
            const sh = (key, req = false) => ({
              boxShadow: req && !(metaForm[key] || '').trim()
                ? '0 4px 20px -4px rgba(109,63,209,0.55)'
                : '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)',
            });
            const inp = { width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', outline: 0 };
            const lbl = { display: 'flex', flexDirection: 'column', gap: 6 };
            const lbTxt = { fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' };
            const METHODS = [
              { key: 'cash',     label: t('paymentMethodCash') },
              { key: 'transfer', label: t('paymentMethodTransfer') },
              { key: 'card',     label: t('paymentMethodCard') },
            ];
            return (
              <>
                <label style={lbl}>
                  <span style={lbTxt}>{t('metaTitle')}</span>
                  <input type="text" value={metaForm.title || ''} onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))} style={{ ...inp, ...sh('title', true) }} />
                </label>
                <label style={lbl}>
                  <span style={lbTxt}>{t('offerNumber')}</span>
                  <input type="text" value={metaForm.offer_number || ''} onChange={e => setMetaForm(f => ({ ...f, offer_number: e.target.value }))} style={{ ...inp, ...sh('offer_number') }} />
                </label>
                <label style={lbl}>
                  <span style={lbTxt}>{t('location')}</span>
                  <input type="text" value={metaForm.location || ''} onChange={e => setMetaForm(f => ({ ...f, location: e.target.value }))} style={{ ...inp, ...sh('location') }} />
                </label>
                <label style={lbl}>
                  <span style={lbTxt}>{t('workType')}</span>
                  <input type="text" value={metaForm.work_type || ''} onChange={e => setMetaForm(f => ({ ...f, work_type: e.target.value }))} style={{ ...inp, ...sh('work_type') }} />
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ ...lbl, flex: 1 }}>
                    <span style={lbTxt}>{t('plannedStart')}</span>
                    <input type="date" value={metaForm.planned_start || ''} onChange={e => setMetaForm(f => ({ ...f, planned_start: e.target.value }))} style={{ ...inp, ...sh('planned_start'), padding: '0 10px' }} />
                  </label>
                  <label style={{ ...lbl, flex: 1 }}>
                    <span style={lbTxt}>{t('plannedEnd')}</span>
                    <input type="date" value={metaForm.planned_end || ''} onChange={e => setMetaForm(f => ({ ...f, planned_end: e.target.value }))} style={{ ...inp, ...sh('planned_end'), padding: '0 10px' }} />
                  </label>
                </div>
                <label style={lbl}>
                  <span style={lbTxt}>{t('validUntil')} *</span>
                  <input type="date" value={metaForm.valid_until || ''} onChange={e => setMetaForm(f => ({ ...f, valid_until: e.target.value }))} style={{ ...inp, ...sh('valid_until', true), padding: '0 10px' }} />
                </label>
                <div style={lbl}>
                  <span style={lbTxt}>{t('paymentMethod')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {METHODS.map(({ key, label }) => {
                      const sel = metaForm.payment_method === key;
                      return (
                        <button key={key} onClick={() => setMetaForm(f => ({ ...f, payment_method: f.payment_method === key ? '' : key }))}
                          style={{ flex: 1, height: 52, border: 0, borderRadius: 18, background: sel ? 'var(--m-offer, #6D3FD1)' : '#fff', color: sel ? '#fff' : 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: sel ? 'none' : '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ ...lbl, flex: 1 }}>
                    <span style={lbTxt}>{t('depositPct')}</span>
                    <input type="number" value={metaForm.deposit_pct || ''} onChange={e => setMetaForm(f => ({ ...f, deposit_pct: e.target.value }))} style={{ ...inp, ...sh('deposit_pct') }} />
                  </label>
                  <label style={{ ...lbl, flex: 1 }}>
                    <span style={lbTxt}>{t('warrantyMonths')}</span>
                    <input type="number" value={metaForm.warranty_months || ''} onChange={e => setMetaForm(f => ({ ...f, warranty_months: e.target.value }))} style={{ ...inp, ...sh('warranty_months') }} />
                  </label>
                </div>
                <div style={lbl}>
                  <span style={lbTxt}>{t('vatRate')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[27, 18, 5, 0].map(v => {
                      const on = Number(metaForm.tax_percent ?? 27) === v;
                      return (
                        <button key={v} type="button" onClick={() => setMetaForm(f => ({ ...f, tax_percent: v }))} aria-pressed={on}
                          style={{ height: 52, padding: '0 14px', border: 0, borderRadius: 18, background: on ? 'var(--m-offer, #6D3FD1)' : '#fff', color: on ? '#fff' : 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: on ? 'none' : '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', flexShrink: 0 }}>
                          {v}%
                        </button>
                      );
                    })}
                    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      <input
                        type="number" min="0" max="100"
                        value={metaForm.tax_percent ?? 27}
                        onChange={e => setMetaForm(f => ({ ...f, tax_percent: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        style={{ ...inp, width: '100%', boxSizing: 'border-box', paddingRight: 28 }}
                      />
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: 'var(--m-ink)', pointerEvents: 'none' }}>%</span>
                    </div>
                  </div>
                </div>
                <label style={lbl}>
                  <span style={lbTxt}>{t('otherTermsLabel', { unit: '' })}</span>
                  <textarea value={metaForm.other_terms || ''} onChange={e => setMetaForm(f => ({ ...f, other_terms: e.target.value }))} rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', height: 88, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', outline: 0, ...sh('other_terms') }}
                  />
                </label>
              </>
            );
          })()}
          {(() => {
            const canSave = !saving && (metaForm.title || '').trim() && (metaForm.valid_until || '').trim();
            return (
              <div style={{ paddingTop: 8, paddingBottom: 4 }}>
                <button onClick={handleSaveMeta} disabled={!canSave} style={{ display: 'block', width: '100%', height: 60, border: 0, borderRadius: 30, background: canSave ? 'var(--m-offer, #6D3FD1)' : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
                  {saving ? '…' : t('actionSave')}
                </button>
              </div>
            );
          })()}
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
        <HistorySheet
          title={t('historyTitle')}
          history={history}
          loading={histLoading}
          emptyText={t('historyEmpty')}
          onClose={() => setMode(null)}
          accentColor="var(--m-offer, #6D3FD1)"
          userCurrency={userCurrency}
          actionLabels={{
            'quote.created':        t('histActionCreated'),
            'quote.edited':         t('histActionEdited'),
            'quote.deleted':        t('histActionDeleted'),
            'quote.sent':           t('histActionSent'),
            'quote.accepted':       t('histActionAccepted'),
            'quote.status_changed': t('histActionStatusChanged'),
            'quote.portal_shown':   t('histActionPortalShown'),
            'quote.portal_hidden':  t('histActionPortalHidden'),
            'quote.pdf_downloaded': t('histActionPdfDownloaded'),
            'section.added':        t('histActionSectionAdded'),
            'section.deleted':      t('histActionSectionDeleted'),
            'entry.added':          t('histActionEntryAdded'),
            'entry.edited':         t('histActionEntryEdited'),
            'entry.deleted':        t('histActionEntryDeleted'),
          }}
          getDetailRows={(details) => {
            const ENTRY_TYPES = { material: t('entryTypeMaterial'), labour: t('entryTypeLabour'), equipment: t('entryTypeEquipment'), transport: t('entryTypeTransport'), other: t('entryTypeOther') };
            const STATUSES    = { draft: t('statusDraft'), sent: t('statusSent'), accepted: t('statusAccepted'), rejected: t('statusRejected') };
            const FIELDS      = { title: t('histFieldTitle'), location: t('histFieldLocation'), work_type: t('histFieldWorkType'), description: t('histFieldDescription'), start_date: t('histFieldStartDate'), end_date: t('histFieldEndDate'), client_id: t('histFieldClient'), tax_percent: t('histFieldTax'), offer_number: t('histFieldOfferNumber'), valid_until: t('histFieldValidUntil'), offer_terms_text: t('histFieldTerms'), payment_deadline_days: t('histFieldPaymentDays'), payment_method: t('histFieldPaymentMethod'), deposit_percent: t('histFieldDeposit'), warranty_months: t('histFieldWarranty') };
            const translated  = details.changed_fields?.map(f => FIELDS[f] || f);
            return [
              details.to               && { label: t('histDetailTo'),         value: details.to },
              details.name             && { label: t('histDetailSection'),     value: details.name },
              details.entry_count != null && { label: t('histDetailEntryCount'), value: String(details.entry_count) },
              details.work_description && { label: t('histDetailItem'),        value: details.work_description },
              details.entry_type       && { label: t('histDetailType'),        value: ENTRY_TYPES[details.entry_type] || details.entry_type },
              details.amount_huf       && { label: t('histDetailAmount'),      value: formatMoney(details.amount_huf, userCurrency) },
              details.status           && { label: t('histDetailStatus'),      value: STATUSES[details.status] || details.status },
              translated?.length       && { label: t('histDetailChanged'),     value: translated.join(', ') },
              details.error            && { label: t('histDetailError'),       value: details.error },
            ].filter(Boolean);
          }}
        />
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

      {/* Send email sheet */}
      {mode === 'send' && (
        <div role="dialog" aria-label={t('sendTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('sendTitle')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          {client && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
              {client.name}
            </span>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('sendEmailLabel')}</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={sendEmail}
              onChange={e => setSendEmail(e.target.value)}
              placeholder="pl. ugyfel@email.hu"
              style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
            />
          </label>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 2px' }}>
            {client?.email
              ? t('sendClientEmailPrefilled')
              : client
                ? t('sendNoEmail')
                : t('sendNoClientHint')}
          </span>
          {/* T&C selection — toggle per attached file */}
          {(termsPdfName || (termsLocal?.attachments || []).length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('desktop.termsCard')}</span>

              {termsPdfName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: '#F8F9FB' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</span>
                  <button type="button" onClick={() => setSendSelectedTerms(p => ({ ...p, profileTerms: !p.profileTerms }))}
                    style={{ width: 44, height: 26, borderRadius: 13, border: 0, cursor: 'pointer', flexShrink: 0, position: 'relative', background: sendSelectedTerms.profileTerms ? '#2563EB' : '#D5D2C8', transition: 'background .15s' }}>
                    <div style={{ position: 'absolute', top: 3, left: sendSelectedTerms.profileTerms ? 20 : 4, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
                  </button>
                </div>
              )}

              {(termsLocal?.attachments || []).map(att => (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: '#F8F9FB' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  <button type="button" onClick={() => setSendSelectedTerms(p => ({ ...p, fileIds: p.fileIds.includes(att.id) ? p.fileIds.filter(x => x !== att.id) : [...p.fileIds, att.id] }))}
                    style={{ width: 44, height: 26, borderRadius: 13, border: 0, cursor: 'pointer', flexShrink: 0, position: 'relative', background: sendSelectedTerms.fileIds.includes(att.id) ? '#2563EB' : '#D5D2C8', transition: 'background .15s' }}>
                    <div style={{ position: 'absolute', top: 3, left: sendSelectedTerms.fileIds.includes(att.id) ? 20 : 4, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .15s' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleSend}
            disabled={sendLoading || !sendEmail.trim()}
            style={{ height: 60, border: 0, borderRadius: 30, background: sendLoading || !sendEmail.trim() ? '#B9B5AA' : 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: sendLoading || !sendEmail.trim() ? 'default' : 'pointer' }}
          >
            {sendLoading ? t('sendInProgress') : t('actionSend')}
          </button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      )}

      {/* Accept / Reject — simple status change */}
      {(mode === 'accept' || mode === 'reject') && (() => {
        const isAccept = mode === 'accept';
        const handleChange = async () => {
          const newStatus = isAccept ? 'accepted' : 'rejected';
          try {
            await updateQuoteStatus(quoteId, newStatus);
            setQuote(q => ({ ...q, status: newStatus }));
            setMode(null);
          } catch (err) {
            setAlertModal({ open: true, message: err.message });
            setMode(null);
          }
        };
        return (
          <div role="dialog" aria-label={isAccept ? t('actionAccept') : t('actionReject')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>
                {isAccept ? t('actionAccept') : t('actionReject')}
              </span>
              <CloseBtn onClick={() => setMode(null)} />
            </div>
            <button onClick={handleChange}
              style={{ height: 60, border: 0, borderRadius: 30, background: isAccept ? '#16A34A' : '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {isAccept ? t('actionAccept') : t('actionReject')}
            </button>
            <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tc('cancel')}</button>
          </div>
        );
      })()}

      {/* Client menu (edit / change / remove) */}
      {mode === 'clientMenu' && client && (
        <div role="dialog" aria-label={t('clientMenuTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{client.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('orderer')}</span>
            </span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          <SheetRowInline icon="swap" label={t('clientChangeAction')} onClick={() => { setClientSearch(''); setMode('clientPicker'); }} />
          <SheetRowInline icon="trash" label={t('clientRemoveAction')} onClick={() => { setMode(null); handleClientRemove(); }} danger />
        </div>
      )}

      {/* Client picker */}
      {mode === 'clientPicker' && (
        <div role="dialog" aria-label={t('clientPickerTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '88%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('clientPickerTitle')}</span>
            <CloseBtn onClick={() => setMode(null)} />
          </div>
          <label style={{ position: 'relative', display: 'block' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', marginTop: -10, color: '#5A5F68', display: 'flex' }} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
            </span>
            <input
              type="search"
              autoFocus
              placeholder={t('clientPickerSearch')}
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', height: 52, border: 0, borderRadius: 26, background: '#fff', paddingLeft: 46, paddingRight: 16, fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
            />
          </label>
          {(() => {
            const q = clientSearch.toLowerCase().trim();
            const filtered = (clients || []).filter(c => !c.deleted_at && (!q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)));
            if ((clients || []).filter(c => !c.deleted_at).length === 0) {
              return <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '8px 4px' }}>{t('clientPickerNoClients')}</span>;
            }
            if (filtered.length === 0) {
              return <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '8px 4px' }}>{t('clientPickerEmpty')}</span>;
            }
            return filtered.map(c => (
              <button
                key={c.id}
                onClick={() => handleClientAttach(c.id)}
                style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: c.id === quote?.client_id ? 'var(--m-offer-tint, #EDE7FB)' : '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}
              >
                <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: c.id === quote?.client_id ? 'var(--m-offer, #6D3FD1)' : '#F1F1F3', color: c.id === quote?.client_id ? '#fff' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <b style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</b>
                  {c.email && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>}
                </span>
              </button>
            ));
          })()}
          <button
            onClick={() => setMode('clientQuickCreate')}
            style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: '2px dashed #D5D2C8', borderRadius: 22, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
          >
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            {t('clientNewAction')}
          </button>
        </div>
      )}

      {/* Quick client create */}
      {mode === 'clientQuickCreate' && (
        <QuickClientSheet
          createClient={createClient}
          onCreated={async (client) => { await handleClientAttach(client.id); }}
          onBack={() => { setClientSearch(''); setMode('clientPicker'); }}
          onClose={() => setMode(null)}
        />
      )}

      {/* Section create / edit sheet */}
      {sectionEditTarget && (
        <div role="dialog" aria-label={sectionEditTarget === 'new' ? t('sectionNewTitle') : t('offerEditSection')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <SectionEditSheet
            isNew={sectionEditTarget === 'new'}
            initial={sectionEditTarget !== 'new' ? sectionEditTarget : null}
            quoteId={quoteId}
            onSave={async () => { await refreshSections(); setSectionEditTarget(null); }}
            onClose={() => setSectionEditTarget(null)}
            t={t}
          />
        </div>
      )}

      {/* Section context menu */}
      {sectionMenuId && (() => {
        const menuSec = sections.find(s => s.id === sectionMenuId);
        if (!menuSec) return null;
        const isSectionMine   = menuSec.created_by === currentUser?.id;
        const canEditSection  = !isLocked && (canOwnerAct || isSectionMine);
        const entryCount      = (menuSec.entries || []).length;
        return (
          <div role="dialog" aria-label={menuSec.name} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{menuSec.name}</span>
            <SheetRowInline icon="plus" label={tM('roomAddItem')} onClick={() => { setSectionMenuId(null); router.push(p(`/ajanlatok/${quoteId}/tetelek/${sectionMenuId}?mode=add`)); }} />
            {canEditSection && <SheetRowInline icon="edit" label={tc('edit')} onClick={() => { setSectionMenuId(null); setSectionEditTarget(menuSec); }} />}
            {canEditSection && <SheetRowInline icon="trash" label={tc('delete')} onClick={() => handleSectionDelete(sectionMenuId)} danger />}
            <div style={{ height: 1, background: '#EDEBE5', margin: '4px 0' }} />
            <SheetRowInline icon="filetext" label={t('mediaDocumentsTitle')} onClick={() => { setSectionMenuId(null); setSectionMediaCtx({ sectionId: sectionMenuId, mode: 'documents' }); }} />
          </div>
        );
      })()}

      {/* ── Media / Drawings bottom drawer (Level 1 + Level 2) ──────────────── */}
      {(docMediaMode || sectionMediaCtx) && (() => {
        const mode     = docMediaMode || sectionMediaCtx?.mode;
        const isDoc    = mode === 'documents';
        const isDraw   = mode === 'drawings';
        const ownType  = sectionMediaCtx ? 'quote_section' : 'quote';
        const ownId    = sectionMediaCtx ? sectionMediaCtx.sectionId : quoteId;
        const sectionId = sectionMediaCtx?.sectionId ?? null;
        const closeSheet = () => { setDocMediaMode(null); setSectionMediaCtx(null); };

        const sheetItems = isDraw ? [] : mediaItems.filter(m => {
          if (m.owner_type !== ownType || m.owner_id !== ownId) return false;
          return isDoc ? (!m.mime_type?.startsWith('image/') && !m.mime_type?.startsWith('video/'))
                       : (m.mime_type?.startsWith('image/') || m.mime_type?.startsWith('video/'));
        });
        const viewable = sheetItems.filter(m => m.mime_type?.startsWith('image/') || m.mime_type?.startsWith('video/'));
        const drawings   = isDraw ? quoteDrawings.filter(d => sectionId ? d.section_id === sectionId : !d.section_id) : [];
        const triggerNew = isDraw && sectionMediaCtx?.triggerNew ? 1 : 0;

        const handleUpload = async (e) => {
          const raw = Array.from(e.target.files || []);
          e.target.value = '';
          if (!raw.length) return;
          setMediaUploading(true);
          try {
            const processed = isDoc ? raw : await Promise.all(raw.map(processMediaFile));
            const form = new FormData();
            processed.forEach(f => form.append('files', f));
            form.append('owner_type', ownType);
            form.append('owner_id',   ownId);
            const res = await fetch(`/api/quotes/${quoteId}/media`, { method: 'POST', body: form });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Hiba');
            const { media } = await res.json();
            setMediaItems(prev => [...prev, ...media]);
          } catch (err) { setAlertModal({ open: true, message: err.message }); }
          finally { setMediaUploading(false); }
        };

        const handleDelete = async (item) => {
          setMediaDeleting(item.id);
          try {
            const res = await fetch(`/api/quotes/${quoteId}/media/${item.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Hiba');
            setMediaItems(prev => prev.filter(m => m.id !== item.id));
            if (lightboxCtx) setLightboxCtx(null);
          } catch (err) { setAlertModal({ open: true, message: err.message }); }
          finally { setMediaDeleting(null); }
        };

        const sheetTitle = isDoc ? t('mediaDocumentsTitle') : isDraw ? t('mediaDrawingsTitle') : t('mediaImagesTitle');

        return (
          <>
            {/* Backdrop */}
            <div onClick={closeSheet} style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.45)', zIndex: 49 }} aria-hidden="true" />
            {/* Drawer */}
            <div role="dialog" aria-label={sheetTitle} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '82%', boxSizing: 'border-box', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {/* Handle */}
              <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#CFCBC0', margin: '12px auto 0' }} />
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', flexShrink: 0 }}>
                <span style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--m-ink)' }}>{sheetTitle}</span>
                <button onClick={closeSheet} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: '0 14px 8px', boxSizing: 'border-box' }}>
                {isDraw ? (
                  <DrawingsSection
                    drawings={drawings}
                    canEdit={canOwnerAct && !isLocked}
                    triggerCount={triggerNew}
                    onSave={async (svg) => {
                      const res = await fetch(`/api/quotes/${quoteId}/drawings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ svg_data: svg, section_id: sectionId }) });
                      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Hiba');
                      const { drawing } = await res.json();
                      setQuoteDrawings(prev => [...prev, drawing]);
                    }}
                    onDelete={async (drawingId) => {
                      await fetch(`/api/quotes/${quoteId}/drawings/${drawingId}`, { method: 'DELETE' });
                      setQuoteDrawings(prev => prev.filter(d => d.id !== drawingId));
                    }}
                  />
                ) : isDoc ? (
                  <>
                    {sheetItems.length === 0 && <div style={{ padding: '24px 0', textAlign: 'center', color: '#8A8F97', fontSize: 15, fontWeight: 600 }}>{t('mediaNoDocuments')}</div>}
                    {sheetItems.map(item => (
                      <a key={item.id} href={item.cdn_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 18, background: '#fff', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.3)', marginBottom: 8, textDecoration: 'none', color: 'var(--m-ink)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6D3FD1" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.r2_key?.split('/').pop() || 'Dokumentum'}</span>
                        <button onClick={e => { e.preventDefault(); handleDelete(item); }} disabled={mediaDeleting === item.id}
                          style={{ width: 32, height: 32, borderRadius: 16, background: '#FEE2E2', border: 0, color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
                        </button>
                      </a>
                    ))}
                  </>
                ) : (
                  <>
                    {sheetItems.length === 0 && <div style={{ padding: '24px 0', textAlign: 'center', color: '#8A8F97', fontSize: 15, fontWeight: 600 }}>{t('mediaNoImages')}</div>}
                    {sheetItems.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                        {sheetItems.map((item) => {
                          const vIdx = viewable.indexOf(item);
                          const isVideo = item.mime_type?.startsWith('video/');
                          return (
                            <div key={item.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#F4F3F0', aspectRatio: '1' }}>
                              <button type="button" onClick={() => setLightboxCtx({ items: viewable, idx: vIdx })}
                                style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
                                {isVideo
                                  ? <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>▶</div>
                                  : <img src={item.thumbnail_url || item.cdn_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                              </button>
                              <button onClick={() => handleDelete(item)} disabled={mediaDeleting === item.id}
                                style={{ position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: 13, background: 'rgba(183,28,28,.85)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Upload button (not for drawings) */}
              {!isDraw && (
                <div style={{ padding: '8px 14px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
                  <input ref={mediaFileRef} type="file" accept={isDoc ? 'application/pdf,.pdf' : 'image/*,video/*'} multiple onChange={handleUpload} style={{ display: 'none' }} />
                  <button onClick={() => mediaFileRef.current?.click()} disabled={mediaUploading}
                    style={{ width: '100%', height: 56, border: 0, borderRadius: 28, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', opacity: mediaUploading ? 0.6 : 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    {mediaUploading ? tc('uploading') : (isDoc ? t('mediaUploadDoc') : t('mediaUploadImage'))}
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightboxCtx && (() => {
        const { items, idx } = lightboxCtx;
        const item = items[idx];
        const isVideo = item?.mime_type?.startsWith('video/');
        return (
          <div onClick={() => setLightboxCtx(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setLightboxCtx(null)}
              style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {items.length > 1 && (
              <div style={{ position: 'absolute', top: 'calc(24px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>{idx + 1} / {items.length}</div>
            )}
            {items.length > 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxCtx(c => ({ ...c, idx: (c.idx - 1 + items.length) % items.length })); }}
                style={{ position: 'absolute', left: 8, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {isVideo
              ? <video src={item.cdn_url} controls autoPlay onClick={e => e.stopPropagation()}
                  style={{ maxWidth: 'calc(100vw - 100px)', maxHeight: 'calc(100dvh - 120px)', borderRadius: 12, background: '#000' }} />
              : <img src={item.cdn_url} alt="" onClick={e => e.stopPropagation()}
                  style={{ maxWidth: 'calc(100vw - 100px)', maxHeight: 'calc(100dvh - 120px)', objectFit: 'contain', borderRadius: 12 }} />}
            {items.length > 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxCtx(c => ({ ...c, idx: (c.idx + 1) % items.length })); }}
                style={{ position: 'absolute', right: 8, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
          </div>
        );
      })()}

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        message={alertModal.message}
        type="error"
      />
    </div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label }) {
  return (
    <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: '#F0F0F2', color: '#2B3038' }}>
      {label}
    </span>
  );
}

// ─── InfoPod ──────────────────────────────────────────────────────────────────
function InfoPod({ isOpen, onToggle, title, headerRight, action, children }) {
  const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';
  return (
    <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
      <div style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68', flexShrink: 0 }}>{title}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>{headerRight}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {action}
      </div>
      {isOpen && (
        <div style={{ borderTop: '1px solid #EDEBE5', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── SectionEditSheet ─────────────────────────────────────────────────────────
function SectionEditSheet({ isNew, initial, quoteId, onSave, onClose, t }) {
  const [name,    setName]    = useState(() => initial?.name         || '');
  const [widthM,  setWidthM]  = useState(() => initial?.width_m  != null ? String(initial.width_m)  : '');
  const [lengthM, setLengthM] = useState(() => initial?.length_m != null ? String(initial.length_m) : '');
  const [heightM, setHeightM] = useState(() => initial?.height_m != null ? String(initial.height_m) : '');
  const [windows, setWindows] = useState(() => initial?.window_count != null ? String(initial.window_count) : '0');
  const [doors,   setDoors]   = useState(() => initial?.door_count   != null ? String(initial.door_count)   : '0');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const canSave = !saving && name.trim();

  const FLD = { width: '100%', boxSizing: 'border-box', height: 52, border: 0, borderRadius: 18, background: '#fff', padding: '0 14px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.4)', outline: 0 };
  const LBL = { fontSize: 13, fontWeight: 700, color: 'var(--m-ink)', display: 'block', marginBottom: 4 };

  const handleSave = async () => {
    if (!name.trim()) { setErr(t('sectionNameRequired')); return; }
    setSaving(true);
    setErr('');
    const payload = {
      name: name.trim(),
      width_m:      widthM  !== '' ? Number(widthM)  : null,
      length_m:     lengthM !== '' ? Number(lengthM) : null,
      height_m:     heightM !== '' ? Number(heightM) : null,
      window_count: parseInt(windows) || 0,
      door_count:   parseInt(doors)   || 0,
    };
    try {
      const url = isNew
        ? `/api/quotes/${quoteId}/sections`
        : `/api/quotes/${quoteId}/sections/${initial.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || t('sectionSaveError'));
        setSaving(false);
        return;
      }
      await onSave();
    } catch {
      setErr(t('sectionSaveError'));
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>
          {isNew ? t('sectionNewTitle') : t('offerEditSection')}
        </span>
        <button onClick={onClose} aria-label={t('close')} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      {err && <span style={{ fontSize: 13, fontWeight: 700, color: '#B71C1C', padding: '0 2px' }}>{err}</span>}
      <label style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={LBL}>{t('sectionNameLabel')}</span>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('sectionNamePh')} style={FLD} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={LBL}>{t('sectionWidthLabel')}</span>
          <input type="number" inputMode="decimal" min="0" value={widthM} onChange={e => setWidthM(e.target.value)} placeholder="0" style={FLD} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={LBL}>{t('sectionLengthLabel')}</span>
          <input type="number" inputMode="decimal" min="0" value={lengthM} onChange={e => setLengthM(e.target.value)} placeholder="0" style={FLD} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={LBL}>{t('sectionHeightLabel')}</span>
          <input type="number" inputMode="decimal" min="0" value={heightM} onChange={e => setHeightM(e.target.value)} placeholder="0" style={FLD} />
        </label>
        <div />
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={LBL}>{t('sectionWindowsLabel')}</span>
          <input type="number" inputMode="numeric" min="0" value={windows} onChange={e => setWindows(e.target.value)} placeholder="0" style={FLD} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={LBL}>{t('sectionDoorsLabel')}</span>
          <input type="number" inputMode="numeric" min="0" value={doors} onChange={e => setDoors(e.target.value)} placeholder="0" style={FLD} />
        </label>
      </div>
      <div style={{ paddingTop: 4 }}>
        <button onClick={handleSave} disabled={!canSave} style={{ display: 'block', width: '100%', height: 60, border: 0, borderRadius: 30, background: canSave ? 'var(--m-offer, #6D3FD1)' : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
          {saving ? '…' : t('actionSave')}
        </button>
      </div>
    </>
  );
}

// ─── OfferRoomCard ────────────────────────────────────────────────────────────
function OfferRoomCard({ sec, index, isOpen, onToggle, onMore, onItems, onDims, canEdit, isLocked, userCurrency, tM,
  sectionMedia = [], sectionDrawings = [], onMediaOpen, onSketchOpen, onAddSketch, onUploadMedia }) {
  const tSD = useTranslations('surveyDetail');
  const photoInputRef = useRef(null);

  const entryCount = (sec.entries || []).length;
  const secTotal   = (sec.entries || []).reduce((a, e) => a + Number(e.amount_huf || 0), 0);

  const w = parseFloat(sec.width_m)  || 0;
  const l = parseFloat(sec.length_m) || 0;
  const h = parseFloat(sec.height_m) || 0;
  const dimsLabel = w && l ? `${w}×${l} m${h ? ` · ${h} m` : ''}` : null;

  const floor     = w && l ? w * l : 0;
  const wallGross = (w && l && h) ? 2 * (w + l) * h : 0;
  const wins      = (sec.window_count || 0) * 1.5;
  const doors     = (sec.door_count   || 0) * 2.0;
  const wallNet   = Math.max(0, wallGross - wins - doors);
  const hasArea   = floor > 0 || wallGross > 0;

  const f = (n) => String(Number(n).toFixed(1)).replace('.', ',');

  const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

  return (
    <article style={{ borderRadius: 26, background: '#fff', overflow: 'hidden', boxShadow: CARD_SHADOW }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          style={{ flex: 1, minWidth: 0, minHeight: 84, boxSizing: 'border-box', padding: '12px 8px 12px 16px', border: 0, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 17, background: 'var(--m-offer, #6D3FD1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {index}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: 'var(--m-ink)', lineHeight: 1.25 }}>{sec.name}</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, fontWeight: 700, color: '#4A4F57', letterSpacing: '-0.01em' }}>
              {formatMoney(secTotal, userCurrency)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onMore}
          aria-label="Szekció menü"
          style={{ flexShrink: 0, width: 48, height: 48, marginRight: 8, border: 0, borderRadius: 24, background: 'transparent', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(sec.window_count > 0 || sec.door_count > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sec.window_count > 0 && <Chip label={tM('roomWinBadge', { count: sec.window_count })} />}
              {sec.door_count   > 0 && <Chip label={tM('roomDoorBadge', { count: sec.door_count })} />}
            </div>
          )}
          {/* Media row — Photos | Sketches (mirrors survey RoomCard) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

            {/* Photos col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5A5F68' }}>
                {tM('roomMediaPhotos')}{sectionMedia.length > 0 ? ` · ${sectionMedia.length}` : ''}
              </span>
              <button type="button" onClick={onMediaOpen}
                style={{ height: 76, borderRadius: 14, border: 0, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: sectionMedia.length > 1 ? '1fr 1fr' : '1fr', gap: 2, background: '#F0EDE6' }}>
                {sectionMedia.length > 0 ? sectionMedia.slice(0, 2).map((item, i) => {
                  const isVideo = item.mime_type?.startsWith('video/');
                  const isLast  = i === 1 && sectionMedia.length > 2;
                  return (
                    <span key={item.id} style={{ position: 'relative', background: isVideo ? '#1A1D22' : `url(${item.thumbnail_url || item.cdn_url}) center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      {isVideo && <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>}
                      {isLast && <span style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>+{sectionMedia.length - 1}</span>}
                    </span>
                  );
                }) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#B0ADA6' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3"/></svg>
                  </span>
                )}
              </button>
              {canEdit && (
                <button type="button" onClick={() => photoInputRef.current?.click()}
                  style={{ height: 34, border: '1.5px dashed #C9C5BA', borderRadius: 10, background: 'transparent', color: '#5A5F68', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  {tM('roomPhotoVideo')}
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple capture="environment" style={{ display: 'none' }}
                onChange={e => { const raw = Array.from(e.target.files || []); e.target.value = ''; if (raw.length && onUploadMedia) onUploadMedia(raw); }} />
            </div>

            {/* Sketches col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5A5F68' }}>
                {tM('roomMediaSketches')}{sectionDrawings.length > 0 ? ` · ${sectionDrawings.length}` : ''}
              </span>
              <button type="button" onClick={onSketchOpen}
                style={{ height: 76, borderRadius: 14, border: 0, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: sectionDrawings.length > 1 ? '1fr 1fr' : '1fr', gap: 2, background: '#F7F5EF' }}>
                {sectionDrawings.length > 0 ? sectionDrawings.slice(0, 2).map((d, i) => {
                  const isLast = i === 1 && sectionDrawings.length > 2;
                  return (
                    <span key={d.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', overflow: 'hidden' }}>
                      <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        dangerouslySetInnerHTML={{ __html: d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;object-fit:contain;pointer-events:none"') || '' }} />
                      {isLast && <span style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>+{sectionDrawings.length - 1}</span>}
                    </span>
                  );
                }) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#B0ADA6' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 19l7-7-3-3-7 7v3h3zM16 5l3 3"/></svg>
                  </span>
                )}
              </button>
              {canEdit && (
                <button type="button" onClick={onAddSketch}
                  style={{ height: 34, border: '1.5px dashed #C9C5BA', borderRadius: 10, background: 'transparent', color: '#5A5F68', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  {tM('propAddSketch')}
                </button>
              )}
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onClick={onItems} style={{ minHeight: 52, border: 0, borderRadius: 26, background: 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {tM('roomItemsBtn', { count: entryCount })}
            </button>
            <button type="button" onClick={onDims} style={{ minHeight: 52, border: 0, borderRadius: 26, background: '#F1F1F3', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {tM('roomDimsBtn')}
            </button>
          </div>
          {hasArea && (
            <div style={{ padding: '10px 12px', borderRadius: 18, background: '#F7F6F2', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 4 }}>{tSD('areaSummaryHeader')}</span>
              {floor > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, padding: '4px 0', borderTop: '1px solid #ECEAE4', color: 'var(--m-ink)' }}>
                  <span>{tSD('areaSummaryFloor')}</span><b>{f(floor)} m²</b>
                </div>
              )}
              {wallGross > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, padding: '4px 0', borderTop: '1px solid #ECEAE4', color: 'var(--m-ink)' }}>
                  <span>{tSD('areaSummaryWallGross')}</span><b>{f(wallGross)} m²</b>
                </div>
              )}
              {(sec.window_count > 0 || sec.door_count > 0) && wallGross > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, padding: '4px 0', borderTop: '1px solid #ECEAE4', color: '#9B1C1C' }}>
                  <span>{tSD('areaSummaryDeductions', { windowCount: sec.window_count || 0, doorCount: sec.door_count || 0 })}</span>
                  <b>−{f(wins + doors)} m²</b>
                </div>
              )}
              {wallNet > 0 && (sec.window_count > 0 || sec.door_count > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, padding: '4px 0', borderTop: '1px solid #ECEAE4', color: 'var(--m-ink)' }}>
                  <span>{tSD('areaSummaryWallNet')}</span><b>{f(wallNet)} m²</b>
                </div>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9690', marginTop: 2 }}>{tSD('areaSummaryFootnote')}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function SheetRowInline({ icon: iconKey, label, onClick, danger, success }) {
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
    edit: 'M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3',
    swap: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4',
    list: 'M4 6h16M4 12h16M4 18h8',
    dims: 'M3 7h18M6 7V4M18 7V4M3 17h18M6 17v3M18 17v3',
    plus: 'M12 5v14M5 12h14',
    camera:   'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8',
    penline:  'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
    filetext: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  };
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : success ? '#14532D' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : success ? '#D1FAE5' : '#F1F1F3', color: danger ? '#B71C1C' : success ? '#14532D' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
