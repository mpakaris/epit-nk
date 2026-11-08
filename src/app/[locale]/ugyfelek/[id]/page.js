'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { formatMoney, formatDate } from '@/lib/constants';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Percent,
  FolderKanban,
  FileText,
  Coins,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Send,
  Plus,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import StatusBadge from '@/components/StatusBadge';

function relativeTime(isoStr) {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Most';
  if (mins < 60) return `${mins} perce`;
  if (hours < 24) return `${hours} órája`;
  if (days < 7)  return `${days} napja`;
  return new Date(isoStr).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

function MessageBubble({ msg, isYou }) {
  return (
    <div style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
      <div style={{
        maxWidth: '80%',
        background: isYou ? 'var(--accent)' : 'var(--bg-subtle)',
        color: isYou ? '#fff' : 'var(--text-primary)',
        borderRadius: isYou ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding: '0.55rem 0.85rem',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.body}
        <div style={{ fontSize: '0.63rem', marginTop: '0.25rem', opacity: 0.65, textAlign: isYou ? 'right' : 'left' }}>
          {relativeTime(msg.created_at)}
          {isYou && !msg.read_at && <span style={{ marginLeft: '0.3rem' }}>✓</span>}
          {isYou && msg.read_at && <span style={{ marginLeft: '0.3rem' }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

function ThreadCard({ thread, quotes, t, onMessageSent }) {
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);
  const quote = quotes.find(q => q.id === thread.quote_id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages?.length]);

  // Mark thread as read on mount
  useEffect(() => {
    if (thread.unread_count > 0) {
      fetch(`/api/threads/${thread.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
  }, [thread.id, thread.unread_count]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true); setError('');
    try {
      const res = await fetch(`/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t('newMsgErr'));
      }
      const { message: newMsg } = await res.json();
      setReply('');
      onMessageSent(thread.id, newMsg);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const title = quote ? t('quoteThread', { title: quote.title }) : t('generalThread');

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
      {/* Thread header */}
      <div style={{ padding: '0.65rem 1rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MessageSquare size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        {thread.unread_count > 0 && (
          <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: '0.63rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
            {thread.unread_count}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ padding: '0.85rem 1rem', maxHeight: 300, overflowY: 'auto' }}>
        {(thread.messages || []).map(msg => (
          <MessageBubble key={msg.id} msg={msg} isYou={msg.sender_type === 'user'} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t('replyPlaceholder')}
          rows={1}
          style={{ flex: 1, minWidth: 0, border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.45rem 0.65rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', outline: 'none', maxHeight: 80, overflowY: 'auto', lineHeight: 1.5, background: 'var(--bg-base)' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !reply.trim()}
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0, padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Send size={13} /> {sending ? t('sending') : t('sendReply')}
        </button>
      </div>
      {error && <p style={{ padding: '0 1rem 0.5rem', fontSize: '0.78rem', color: 'var(--danger)', margin: 0 }}>{error}</p>}
    </div>
  );
}

function ClientMessages({ clientId, quotes, t }) {
  const [threads, setThreads]       = useState(null);
  const [showNew, setShowNew]       = useState(false);
  const [newMsg, setNewMsg]         = useState('');
  const [sendingNew, setSendingNew] = useState(false);
  const [newMsgErr, setNewMsgErr]   = useState('');

  useEffect(() => {
    fetch(`/api/threads?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => setThreads([]));
  }, [clientId]);

  const handleMessageSent = (threadId, newMessage) => {
    setThreads(prev => (prev || []).map(th =>
      th.id === threadId ? { ...th, messages: [...(th.messages || []), newMessage] } : th
    ));
  };

  const handleNewThread = async () => {
    if (!newMsg.trim()) return;
    setSendingNew(true); setNewMsgErr('');
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, message: newMsg.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t('newMsgErr'));
      }
      const { thread_id, message } = await res.json();
      const newThread = {
        id: thread_id,
        quote_id: null,
        messages: [message],
        unread_count: 0,
      };
      setThreads(prev => [newThread, ...(prev || [])]);
      setNewMsg('');
      setShowNew(false);
    } catch (e) {
      setNewMsgErr(e.message);
    } finally {
      setSendingNew(false);
    }
  };

  if (threads === null) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const hasGeneralThread = threads.some(t => !t.quote_id);

  return (
    <div>
      {/* New general message button */}
      {!hasGeneralThread && !showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}
        >
          <Plus size={14} /> {t('newMessage')}
        </button>
      )}

      {/* New general message composer */}
      {showNew && (
        <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {t('newMessageTitle')}
          </div>
          <textarea
            autoFocus
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder={t('newMessagePlaceholder')}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '0.65rem' }}
          />
          {newMsgErr && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: '0 0 0.5rem' }}>{newMsgErr}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowNew(false); setNewMsg(''); setNewMsgErr(''); }} className="btn btn-secondary btn-sm">
              Mégse
            </button>
            <button
              type="button"
              onClick={handleNewThread}
              disabled={sendingNew || !newMsg.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Send size={13} /> {sendingNew ? t('sending') : t('sendReply')}
            </button>
          </div>
        </div>
      )}

      {/* Threads */}
      {threads.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('noConversations')}
        </div>
      )}
      {threads.map(thread => (
        <ThreadCard
          key={thread.id}
          thread={thread}
          quotes={quotes}
          t={t}
          onMessageSent={handleMessageSent}
        />
      ))}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const activeThread = searchParams.get('thread');
  const { isAdmin, loading, dataReady, clients, quotes, quoteEntries, projects, invoices, isDemoMode, userCurrency } = useApp();
  const fmt = (n) => formatMoney(n, userCurrency);
  const t  = useTranslations('clients');
  const tc = useTranslations('common');
  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const [copied, setCopied] = useState(false);

  const portalUrl = client?.email
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal?email=${encodeURIComponent(client.email)}`
    : null;

  const copyPortalUrl = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || !dataReady) return <PageSpinner />;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>{t('accessDenied')}</h2>
        <AppLink href={`${navPrefix}/projektek`} className="btn btn-secondary mt-4">{tc('back')}</AppLink>
      </div>
    );
  }

  const client = clients.find(c => c.id === id);
  if (!client) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>{t('clientNotFound')}</h2>
        <AppLink href={`${navPrefix}/ugyfelek`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> {tc('back')}</AppLink>
      </div>
    );
  }

  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(p => p.client_id === client.id || quoteProjectIds.has(p.id));

  const totalQuoteValue = clientQuotes.reduce((sum, q) => {
    const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    return sum + qTotal;
  }, 0);

  const totalInvoiceValue = clientProjects.reduce((sum, p) => {
    return sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  }, 0);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <AppLink href={`${navPrefix}/ugyfelek`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> {t('backToClients')}
        </AppLink>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> {t('detailsTitle')}
          </div>
          <h1 className="page-title">{client.name}</h1>
          {client.notes && <p className="page-subtitle">{client.notes}</p>}
        </div>
      </div>

      {/* Client Info Card */}
      <div className="card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Phone size={16} color="var(--accent)" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Mail size={16} color="var(--accent)" />
              <a href={`mailto:${client.email}`} style={{ color: 'var(--accent)' }}>{client.email}</a>
            </div>
          )}
          {client.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <MapPin size={16} color="var(--accent)" />
              <span>{client.address}</span>
            </div>
          )}
          {client.discount_percent > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Percent size={16} color="var(--warning)" />
              <span style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{t('loyaltyDiscount', { percent: client.discount_percent })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Portal URLs */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent)' }}>
        {/* Unified client portal (email OTP login) */}
        <div style={{ marginBottom: client.email ? '0.85rem' : 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            {t('clientPortalLabel')}
          </div>
          {client.email ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                  {t('clientPortalLoginInfo')}{' '}
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{client.email}</strong>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {portalUrl}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button type="button" onClick={copyPortalUrl} className="btn btn-secondary btn-sm">
                  {copied ? <><Check size={13} /> {t('copiedBtn')}</> : <><Copy size={13} /> {t('copyBtn')}</>}
                </button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ExternalLink size={13} /> {t('openPortalBtn')}
                </a>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--warning-text)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
              {t('noEmailForPortal')}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">{t('quotesStatLabel')}</div>
          <div className="stat-value">{clientQuotes.length}</div>
          <div className="stat-sub">{t('totalQuoteValue', { amount: fmt(totalQuoteValue) })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('projectsStatLabel')}</div>
          <div className="stat-value">{clientProjects.length}</div>
          <div className="stat-sub">{t('totalExpenses', { amount: fmt(totalInvoiceValue) })}</div>
        </div>
      </div>

      {/* Messages */}
      {!isDemoMode && (
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <MessageSquare size={18} color="var(--accent)" /> {t('messagesSection')}
          </h2>
          <ClientMessages clientId={id} quotes={clientQuotes} t={t} />
        </div>
      )}

      {/* Quotes */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={18} color="var(--accent)" /> {t('quotesSection', { count: clientQuotes.length })}
        </h2>
      </div>

      {clientQuotes.length === 0 ? (
        <div className="card mb-6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('noQuotesForClient')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {clientQuotes.map(q => {
            const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            return (
              <div key={q.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {q.location && <span>{q.location} · </span>}
                    {formatDate(q.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{fmt(qTotal)}</span>
                  <StatusBadge status={q.status} />
                  <AppLink href={`${navPrefix}/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    {t('detailsBtn')}
                  </AppLink>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Projects */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FolderKanban size={18} color="var(--accent)" /> {t('projectsSection', { count: clientProjects.length })}
        </h2>
      </div>

      {clientProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('noProjectsForClient')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clientProjects.map(p => {
            const pCost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <div key={p.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Coins size={14} color="var(--accent)" /> {fmt(pCost)}
                  </span>
                  <AppLink href={`${navPrefix}/projektek/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    {t('detailsBtn')}
                  </AppLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
