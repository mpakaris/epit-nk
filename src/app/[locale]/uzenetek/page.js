'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send, Plus } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import CollectiveChatSection from '@/components/CollectiveChatSection';
import Modal from '@/components/Modal';
import { useLocale } from 'next-intl';

function relativeTime(isoStr, locale = 'hu') {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const rtf   = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (mins < 1)  return rtf.format(0, 'minute');
  if (mins < 60) return rtf.format(-mins, 'minute');
  if (hours < 24) return rtf.format(-hours, 'hour');
  if (days < 7)  return rtf.format(-days, 'day');
  return new Date(isoStr).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function MessageBubble({ msg, isYou, locale }) {
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
          {relativeTime(msg.created_at, locale)}
        </div>
      </div>
    </div>
  );
}

function ThreadModal({ thread, onClose, onMessageSent, tcl, locale }) {
  const [messages, setMessages] = useState(null);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);
  const textareaRef             = useRef(null);

  useEffect(() => {
    if (!thread) return;
    setMessages(null);
    setReply('');
    setError('');

    if (thread.unread_count > 0) {
      fetch(`/api/threads/${thread.id}/read`, { method: 'PATCH' })
        .then(() => window.dispatchEvent(new CustomEvent('epitek:msg-read')))
        .catch(() => {});
    }

    fetch(`/api/threads?thread_id=${thread.id}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setMessages(d.messages || []))
      .catch(() => setMessages([]));
  }, [thread?.id]);

  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    }
  }, [messages?.length]);

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || tcl('newMsgErr'));
      }
      const { message: newMsg } = await res.json();
      setMessages(prev => [...(prev || []), newMsg]);
      setReply('');
      onMessageSent?.(thread.id);
      textareaRef.current?.focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const title = thread?.type === 'direct'
    ? (thread.other_name || '—')
    : thread?.quote_title
      ? tcl('quoteThread', { title: thread.quote_title })
      : (thread?.client_name || tcl('generalThread'));

  return (
    <Modal isOpen={!!thread} onClose={onClose} title={title} maxWidth="520px">
      {/* Messages area */}
      <div style={{ height: 280, overflowY: 'auto', marginBottom: '0.75rem', paddingRight: '0.25rem' }}>
        {messages === null && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {messages?.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {tcl('noConversations')}
          </div>
        )}
        {messages?.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isYou={thread?.type === 'direct' ? msg.sender_user_id === thread._myId : msg.sender_type === 'user'} locale={locale} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={tcl('replyPlaceholder')}
          rows={2}
          style={{
            flex: 1,
            minWidth: 0,
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.65rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            maxHeight: 80,
            overflowY: 'auto',
            lineHeight: 1.5,
            background: 'var(--bg-base)',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !reply.trim()}
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Send size={13} />
          {sending ? tcl('sending') : tcl('sendReply')}
        </button>
      </div>
      {error && <p style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--danger)', margin: '0.4rem 0 0' }}>{error}</p>}
    </Modal>
  );
}

export default function UzenetekPage() {
  const { loading, dataReady, isDemoMode, activeCollectiveId, collectives, clients, currentUser } = useApp();
  const t      = useTranslations('messages');
  const tcl    = useTranslations('clients');
  const tc     = useTranslations('common');
  const locale = useLocale();

  const hasCollective = !!activeCollectiveId;
  const [tab, setTab] = useState('clients');

  const [threads, setThreads]       = useState([]);
  const [threadsLoading, setLoading] = useState(!isDemoMode);
  const [openThread, setOpenThread]  = useState(null);

  // Compose new message state
  const [showCompose, setShowCompose]           = useState(false);
  const [composeRecipient, setComposeRecipient] = useState(''); // "client:id" or "user:id"
  const [composeMsg, setComposeMsg]             = useState('');
  const [composeSending, setComposeSending]     = useState(false);
  const [composeError, setComposeError]         = useState('');
  const [teamMembers, setTeamMembers]           = useState([]);

  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/threads?all=1')
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  const handleOpenThread = (thread) => {
    setOpenThread({ ...thread, _myId: currentUser?.id });
    // Optimistically clear unread on the list
    if (thread.unread_count > 0) {
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread_count: 0 } : t));
    }
  };

  const handleMessageSent = () => {
    fetch('/api/threads?all=1')
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => {});
  };

  // Load team members once when compose modal opens
  useEffect(() => {
    if (!showCompose || isDemoMode) return;
    fetch('/api/users/collective-members')
      .then(r => r.ok ? r.json() : { members: [] })
      .then(d => setTeamMembers(d.members || []))
      .catch(() => {});
  }, [showCompose, isDemoMode]);

  const handleCompose = async () => {
    if (!composeRecipient || !composeMsg.trim() || composeSending) return;
    setComposeSending(true);
    setComposeError('');
    try {
      const [kind, id] = composeRecipient.split(':');
      const payload = kind === 'user'
        ? { type: 'direct',  recipient_user_id: id, message: composeMsg.trim() }
        : {                  client_id: id,         message: composeMsg.trim() };

      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || tcl('newMsgErr'));
      }
      setShowCompose(false);
      setComposeRecipient('');
      setComposeMsg('');
      handleMessageSent();
    } catch (e) {
      setComposeError(e.message);
    } finally {
      setComposeSending(false);
    }
  };

  if (loading || !dataReady) return <PageSpinner />;

  const collectiveName = collectives?.find(c => c.collective_id === activeCollectiveId)?.name || '';

  return (
    <div className="container">
      <div className="page-header" style={{ padding: '1rem 0 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <MessageSquare size={15} /> {t('pageTitle')}
          </div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="page-subtitle">{t('pageSubtitle')}</p>
        </div>
        {!isDemoMode && (
          <button
            type="button"
            onClick={() => { setShowCompose(true); setComposeError(''); setComposeRecipient(''); setComposeMsg(''); }}
            aria-label={tcl('newMessage')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Tab bar — only shown in collective context */}
      {hasCollective && (
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border-subtle)', marginBottom: '1.25rem', gap: '0.25rem' }}>
          {[
            { id: 'clients', label: t('tabClients') },
            { id: 'team',    label: t('tabTeam') },
          ].map(tabItem => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              style={{
                padding: '0.6rem 1.1rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'inherit',
                border: 'none',
                cursor: 'pointer',
                background: 'none',
                color: tab === tabItem.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${tab === tabItem.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -2,
                transition: 'color 0.15s',
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      )}

      {/* Clients tab */}
      {tab === 'clients' && (
        <>
          {threadsLoading && <PageSpinner />}

          {!threadsLoading && threads.length === 0 && (
            <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <MessageSquare size={36} style={{ color: 'var(--border-subtle)', display: 'block', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{t('emptyTitle')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{t('emptyText')}</p>
            </div>
          )}

          {!threadsLoading && threads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {threads.map(thread => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => handleOpenThread(thread)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderLeft: thread.unread_count > 0 ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'box-shadow 0.12s',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: thread.unread_count > 0 ? 'var(--accent)' : 'var(--bg-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MessageSquare size={16} style={{ color: thread.unread_count > 0 ? '#fff' : 'var(--text-muted)' }} />
                    </div>

                    {/* Content — each piece on its own line */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: name + unread badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {thread.type === 'direct' ? thread.other_name : thread.client_name || '—'}
                        </span>
                        {thread.unread_count > 0 && (
                          <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                            {thread.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Row 2: quote tag */}
                      {thread.quote_title && (
                        <div style={{ marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 99, padding: '0.1rem 0.5rem', border: '1px solid var(--border-subtle)' }}>
                            {thread.quote_title}
                          </span>
                        </div>
                      )}

                      {/* Row 3: last message preview */}
                      {thread.last_message && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                          {thread.last_message.sender_type === 'user' ? '→ ' : ''}{thread.last_message.body}
                        </div>
                      )}

                      {/* Row 4: timestamp */}
                      {thread.last_message && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {relativeTime(thread.last_message.created_at, locale)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Team tab — collective chat */}
      {tab === 'team' && hasCollective && (
        <CollectiveChatSection
          collectiveId={activeCollectiveId}
          title={`${t('teamChatTitle')}${collectiveName ? ` — ${collectiveName}` : ''}`}
        />
      )}

      {/* Compose new message modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title={tcl('newMessageTitle')} maxWidth="440px">
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            {t('clientLabel')}
          </label>
          <select
            value={composeRecipient}
            onChange={e => setComposeRecipient(e.target.value)}
            className="form-control"
            style={{ width: '100%' }}
          >
            <option value="">{tcl('selectPlaceholder')}</option>
            {(clients || []).filter(c => !c.deleted_at).length > 0 && (
              <optgroup label={t('tabClients')}>
                {(clients || []).filter(c => !c.deleted_at).map(c => (
                  <option key={c.id} value={`client:${c.id}`}>{c.name}</option>
                ))}
              </optgroup>
            )}
            {teamMembers.length > 0 && (
              <optgroup label={t('teamMembersSection')}>
                {teamMembers.map(m => (
                  <option key={m.id} value={`user:${m.id}`}>{m.display_name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div style={{ marginBottom: '0.85rem' }}>
          <textarea
            autoFocus
            value={composeMsg}
            onChange={e => setComposeMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCompose(); } }}
            placeholder={tcl('newMessagePlaceholder')}
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: 'var(--bg-base)' }}
          />
        </div>
        {composeError && <p style={{ fontSize: '0.78rem', color: 'var(--danger)', margin: '0 0 0.65rem' }}>{composeError}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setShowCompose(false)} className="btn btn-secondary btn-sm">{tc('cancel')}</button>
          <button
            type="button"
            onClick={handleCompose}
            disabled={composeSending || !composeRecipient || !composeMsg.trim()}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Send size={13} /> {composeSending ? tcl('sending') : tcl('sendReply')}
          </button>
        </div>
      </Modal>

      {/* Thread conversation modal */}
      <ThreadModal
        thread={openThread}
        onClose={() => setOpenThread(null)}
        onMessageSent={handleMessageSent}
        tcl={tcl}
        locale={locale}
      />
    </div>
  );
}
