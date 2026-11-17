'use client';

/**
 * C3–C5 — Client detail with tabs (mobile pods view)
 * Rose header (#B8456B), 4 tabs: Quotes / Projects / Surveys / Messages
 * Portal block always shown. Bottom bar CTA shifts per tab.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';

const CLIENTS_BG = '#B8456B';
const CLIENTS_DEEP = '#2A0F1A';
const CLIENTS_TINT = '#F8E4EC';
const CLIENTS_INK = '#8A2B4C';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';
const ROW_SHADOW = 'inset 0 1px 0 #fff, 0 14px 22px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

function relativeTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Most';
  if (mins < 60) return `${mins} perce`;
  if (hours < 24) return `${hours} órája`;
  if (days < 7) return `${days} napja`;
  return new Date(isoStr).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 20, background: '#fff', boxShadow: CARD_SHADOW, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#5A5F68', letterSpacing: '0.03em' }}>{label}</span>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      <span style={{ fontSize: 12, color: '#5A5F68', fontWeight: 500 }}>{sub}</span>
    </div>
  );
}

function SheetRow({ icon: d, label, onClick, danger, sub }) {
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,.05),0 12px 22px -18px rgba(14,17,22,.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d={d} /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        {label}
        {sub && <div style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68', marginTop: 1 }}>{sub}</div>}
      </span>
    </button>
  );
}

// ── Quote status badge ────────────────────────────────────────────────────────
const QUOTE_STATUS = {
  draft:    { bg: '#F0F0F2', fg: '#2B3038' },
  sent:     { bg: '#EDE7FB', fg: '#4A2796' },
  accepted: { bg: '#E7F4EC', fg: '#14532D' },
  rejected: { bg: '#FDECEC', fg: '#B71C1C' },
};

// ── Threads (Messages tab) ────────────────────────────────────────────────────
function MessagesTab({ clientId, quotes, t, isDemoMode }) {
  const [threads, setThreads] = useState(null);
  const [selThread, setSelThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sendingNew, setSendingNew] = useState(false);
  const [toast, setToast] = useState(false);
  const [alertModal, setAlertModal] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      Promise.resolve().then(() => setThreads([]));
      return;
    }
    fetch(`/api/threads?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => setThreads([]));
  }, [clientId, isDemoMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selThread, threads?.length]);

  const flash = useCallback(() => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }, []);

  const handleSend = async () => {
    if (!draft.trim() || !selThread) return;
    setSending(true);
    try {
      const res = await fetch(`/api/threads/${selThread.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || t('newMsgErr')); }
      const { message: newMessage } = await res.json();
      setThreads(prev => (prev || []).map(th =>
        th.id === selThread.id ? { ...th, messages: [...(th.messages || []), newMessage] } : th
      ));
      setSelThread(prev => prev ? { ...prev, messages: [...(prev.messages || []), newMessage] } : prev);
      setDraft('');
      flash();
    } catch (e) {
      setAlertModal({ message: e.message });
    } finally {
      setSending(false);
    }
  };

  const handleNewThread = async () => {
    if (!newMsg.trim()) return;
    setSendingNew(true);
    try {
      const res = await fetch('/api/threads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, message: newMsg.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || t('newMsgErr')); }
      const { thread_id, message } = await res.json();
      const newThread = { id: thread_id, quote_id: null, messages: [message], unread_count: 0 };
      setThreads(prev => [newThread, ...(prev || [])]);
      setNewMsg(''); setShowNew(false);
      flash();
    } catch (e) {
      setAlertModal({ message: e.message });
    } finally {
      setSendingNew(false);
    }
  };

  if (threads === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${CLIENTS_BG}`, borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (selThread) {
    const quote = quotes.find(q => q.id === selThread.quote_id);
    const title = quote ? t('quoteThread', { title: quote.title }) : t('generalThread');
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSelThread(null)} style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: '#F1F1F3', color: 'var(--m-ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={t('backToClients')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {(selThread.messages || []).map((msg, i) => {
            const isYou = msg.sender_type === 'user';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', background: isYou ? CLIENTS_BG : '#fff', color: isYou ? '#fff' : 'var(--m-ink)', borderRadius: isYou ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {msg.body}
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.65, textAlign: isYou ? 'right' : 'left' }}>{relativeTime(msg.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} placeholder={t('replyPlaceholder')} aria-label={t('replyPlaceholder')} style={{ flex: 1, height: 48, borderRadius: 24, border: 0, background: '#F1F1F3', padding: '0 16px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={handleSend} disabled={sending || !draft.trim()} aria-label={t('sendReply')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: CLIENTS_BG, color: '#fff', cursor: draft.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M4 12l16-8-6 16-3-6z" /></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {threads.length === 0 && !showNew && (
        <p style={{ fontSize: 14, color: '#5A5F68', textAlign: 'center', padding: '12px 0' }}>{t('noConversations')}</p>
      )}
      {threads.map((th, i) => {
        const quote = quotes.find(q => q.id === th.quote_id);
        const title = quote ? t('quoteThread', { title: quote.title }) : t('generalThread');
        const last = th.messages?.slice(-1)[0];
        return (
          <button key={th.id} onClick={() => setSelThread(th)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 5h16v11H9l-5 4z" /></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              {last && <span style={{ display: 'block', fontSize: 13, color: '#5A5F68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.body}</span>}
            </span>
            {th.unread_count > 0 && (
              <span style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 5, background: CLIENTS_BG }} aria-hidden />
            )}
          </button>
        );
      })}
      {/* New message */}
      {showNew ? (
        <div style={{ padding: 12, borderRadius: 22, background: '#fff', boxShadow: ROW_SHADOW, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{t('newMessageTitle')}</span>
          <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={t('newMessagePlaceholder')} rows={3} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E0E0E0', borderRadius: 12, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowNew(false); setNewMsg(''); }} style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: '#F1F1F3', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
            <button onClick={handleNewThread} disabled={sendingNew || !newMsg.trim()} style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: CLIENTS_BG, color: '#fff', fontSize: 14, fontWeight: 700, cursor: newMsg.trim() ? 'pointer' : 'default' }}>
              {sendingNew ? t('sending') : t('sendReply')}
            </button>
          </div>
        </div>
      ) : (
        !threads.some(th => !th.quote_id) && (
          <button onClick={() => setShowNew(true)} style={{ height: 48, padding: '0 20px', border: 0, borderRadius: 24, background: '#F1F1F3', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
            + {t('newMessage')}
          </button>
        )
      )}
      {toast && (
        <div role="status" style={{ position: 'fixed', zIndex: 60, top: 18, left: 16, right: 16, padding: '14px 16px', borderRadius: 22, background: '#14532D', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
          {t('msgSentOk')}
        </div>
      )}
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}

export default function ClientDetailMobile({ clientId }) {
  const t = useTranslations('clients');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    clients = [], quotes = [], quoteEntries = [], projects = [], invoices = [], surveys = [],
    isDemoMode, userCurrency, currentUser, deleteClient,
    isAdmin,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [tab, setTab] = useState('q');
  const [mode, setMode] = useState(null); // 'menu' | 'del'
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const client = clients.find(c => c.id === clientId);
  const isMine = client && !client._shared_via?.length;

  if (!client) {
    return (
      <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>{t('clientNotFound')}</p>
        <button onClick={() => router.push(p('/ugyfelek'))} style={{ height: 52, padding: '0 24px', border: 0, borderRadius: 26, background: CLIENTS_BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {t('backToClients')}
        </button>
      </div>
    );
  }

  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(proj => proj.client_id === client.id || quoteProjectIds.has(proj.id));
  const clientSurveys = surveys.filter(s => s.client_id === client.id);

  const totalQuoteValue = clientQuotes.reduce((sum, q) => {
    return sum + quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  }, 0);
  const totalInvoices = clientProjects.reduce((sum, proj) => {
    return sum + invoices.filter(inv => inv.project_id === proj.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  }, 0);

  const portalUrl = client.email
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal?email=${encodeURIComponent(client.email)}`
    : null;

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      router.push(p('/ugyfelek'));
    } catch (err) {
      setAlertModal({ message: err.message || t('createError') });
      setMode(null);
    } finally {
      setDeleting(false);
    }
  };

  const TABS = [
    { id: 'q', label: `${t('detailTabQuotes')} (${clientQuotes.length})` },
    { id: 'p', label: `${t('detailTabProjects')} (${clientProjects.length})` },
    { id: 's', label: `${t('detailTabSurveys')} (${clientSurveys.length})` },
    { id: 'm', label: t('detailTabMessages') },
  ];

  const shareCount = client.client_collective_shares?.length || 0;

  return (
    <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', position: 'relative' }}>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div role="alert" style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 50, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: CLIENTS_BG, padding: '64px 16px 20px', borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => router.push(p('/ugyfelek'))} aria-label={t('backToClients')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
            {isMine ? t('personalWorkspace') : t('sharedLabel')}
          </span>
          {isMine && (
            <button onClick={() => setMode('menu')} aria-label={t('actionsLabel')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
            </button>
          )}
          {!isMine && <span style={{ width: 48 }} />}
        </div>
        <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', display: 'block', marginBottom: 4 }}>
          {t('detailsTitle')}
        </span>
        <h1 style={{ position: 'relative', margin: '0 0 4px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#fff' }}>
          {client.name}
        </h1>
        {client.company_name && (
          <p style={{ position: 'relative', margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{client.company_name}</p>
        )}
      </header>

      {/* ── Scrollable body ── */}
      <div style={{ padding: '16px 16px 220px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard label={t('detailTotalQuotes')} value={formatMoney(totalQuoteValue, userCurrency)} sub={t('detailQuotesCount', { count: clientQuotes.length })} />
          <StatCard label={t('detailInvoiced')} value={formatMoney(totalInvoices, userCurrency)} sub={t('detailProjectsCount', { count: clientProjects.length })} />
        </div>

        {/* Contact card */}
        <div style={{ borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: '8px 14px' }}>
          {client.phone && (
            <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, textDecoration: 'none' }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)' }}>{client.phone}</span>
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, textDecoration: 'none' }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18v12H3zM3 7l9 7 9-7" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
            </a>
          )}
          {client.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 11l8-7 8 7v9H4z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)' }}>{client.address}</span>
            </div>
          )}
          {!client.phone && !client.email && !client.address && (
            <div style={{ padding: '10px 0', fontSize: 14, color: '#5A5F68' }}>{t('detailNoContact')}</div>
          )}
          {/* Badges */}
          {(client.gdpr_consented_at || client.discount_percent > 0 || shareCount > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 0 8px' }}>
              {client.gdpr_consented_at && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#E7F4EC', color: '#14532D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
                  GDPR
                </span>
              )}
              {client.discount_percent > 0 && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'inline-flex', alignItems: 'center' }}>
                  {client.discount_percent}% {t('discountAbbr')}
                </span>
              )}
              {shareCount > 0 && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#EDE7FB', color: '#4A2796', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4" /></svg>
                  {t('collectivesCount', { count: shareCount })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.12)', padding: 4, borderRadius: 28 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} aria-pressed={tab === tb.id} style={{ flex: 1, minWidth: 0, height: 48, border: 0, borderRadius: 22, background: tab === tb.id ? '#fff' : 'transparent', color: tab === tb.id ? CLIENTS_INK : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Quotes tab */}
          {tab === 'q' && (clientQuotes.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noQuotesForClient')}</p>
          ) : clientQuotes.map(quote => {
            const qTotal = quoteEntries.filter(e => e.quote_id === quote.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            const st = QUOTE_STATUS[quote.status] || QUOTE_STATUS.draft;
            return (
              <button key={quote.id} onClick={() => router.push(p(`/ajanlatok/${quote.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.title}</b>
                  <span style={{ fontSize: 12, color: '#5A5F68' }}>{formatDate(quote.created_at)}</span>
                  <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 11, fontWeight: 700, alignSelf: 'flex-start', background: st.bg, color: st.fg, display: 'inline-flex', alignItems: 'center' }}>{quote.status}</span>
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--m-ink)', whiteSpace: 'nowrap' }}>{formatMoney(qTotal, userCurrency)}</span>
              </button>
            );
          }))}

          {/* Projects tab */}
          {tab === 'p' && (clientProjects.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noProjectsForClient')}</p>
          ) : clientProjects.map(proj => {
            const cost = invoices.filter(inv => inv.project_id === proj.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <button key={proj.id} onClick={() => router.push(p(`/projektek/${proj.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
                <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#E3E7EE', color: '#263248', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 7h6l2 2h10v11H3z" /></svg>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</b>
                  <span style={{ fontSize: 12, color: '#5A5F68' }}>{proj.description || proj.location || ''}</span>
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--m-ink)', whiteSpace: 'nowrap' }}>{formatMoney(cost, userCurrency)}</span>
              </button>
            );
          }))}

          {/* Surveys tab */}
          {tab === 's' && (clientSurveys.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noSurveysForClient')}</p>
          ) : clientSurveys.map(surv => (
            <button key={surv.id} onClick={() => router.push(p(`/felmeres/${surv.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
              <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#D9F2EE', color: '#0A5C53', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2" /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surv.title}</b>
                <span style={{ fontSize: 12, color: '#5A5F68' }}>{surv.location && `${surv.location} · `}{formatDate(surv.date)}</span>
              </span>
            </button>
          )))}

          {/* Messages tab */}
          {tab === 'm' && (
            <MessagesTab clientId={clientId} quotes={clientQuotes} t={t} isDemoMode={isDemoMode} />
          )}
        </div>

        {/* Portal card */}
        <div style={{ borderRadius: 26, background: CLIENTS_TINT, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: CLIENTS_INK }}>{t('clientPortalLabel')}</span>
          </div>
          {client.email ? (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: CLIENTS_INK, lineHeight: 1.4 }}>
                {t('clientPortalLoginInfo')} <strong>{client.email}</strong>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyPortalLink} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: CLIENTS_BG, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 9h11v11H9zM5 15V4h11" /></svg>
                  {copied ? t('copiedBtn') : t('copyPortalLink')}
                </button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: '#fff', color: CLIENTS_INK, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  {t('openPortalBtn')}
                </a>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10, background: '#FFF4E5', borderRadius: 14, padding: 12, color: '#6B3A00' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }} aria-hidden><path d="M12 8v5M12 16h.01M12 3l10 18H2z" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{t('noEmailForPortal')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: `linear-gradient(to top, ${CLIENTS_DEEP} 65%, transparent)`, padding: '24px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'm' ? (
          <button onClick={() => { /* MessagesTab handles new msg internally */ }} style={{ height: 60, border: 0, borderRadius: 30, background: CLIENTS_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            {t('newMessage')}
          </button>
        ) : (
          <button
            onClick={() => {
              if (tab === 'q') router.push(p(`/ajanlatok/uj?client_id=${clientId}`));
              else if (tab === 'p') router.push(p(`/projektek/uj?client_id=${clientId}`));
              else if (tab === 's') router.push(p('/felmeres/uj'));
            }}
            style={{ height: 60, border: 0, borderRadius: 30, background: '#fff', color: CLIENTS_INK, fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            {tab === 'q' ? t('newQuoteBtn') : tab === 'p' ? t('newProjectBtn') : t('newSurveyBtn')}
          </button>
        )}
      </div>

      {/* ── Scrim ── */}
      {mode && (
        <button onClick={() => setMode(null)} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', border: 0, cursor: 'default' }} />
      )}

      {/* ── Menu sheet ── */}
      {mode === 'menu' && (
        <div className="pod-sheet" role="dialog" aria-label={t('actionsLabel')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{client.name}</p>
          <SheetRow icon="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" label={t('editClient')} onClick={() => { setMode(null); router.push(p(`/ugyfelek/uj?edit=${clientId}`)); }} />
          <SheetRow icon="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6" label={t('previewBtn')} sub={t('clientPortalLabel')} onClick={() => { setMode(null); if (portalUrl) window.open(portalUrl, '_blank'); }} />
          <SheetRow icon="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" label={t('deleteTitle')} danger onClick={() => setMode('del')} />
        </div>
      )}

      {/* ── Delete confirm sheet ── */}
      {mode === 'del' && (
        <div className="pod-sheet" role="dialog" aria-label={t('deleteConfirmTitle')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</p>
          <p style={{ margin: '0 4px 8px', fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.45 }}>
            {t('deleteConfirmMessage', { name: client.name })}
          </p>
          <button onClick={handleDelete} disabled={deleting} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
            {deleting ? t('deleting') : t('deleteTitle')}
          </button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
            {t('cancel')}
          </button>
        </div>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
