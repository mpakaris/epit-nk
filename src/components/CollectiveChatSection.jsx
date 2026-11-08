'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';

// Reusable collective chat widget.
// Props:
//   collectiveId  — required UUID
//   projectId?    — optional UUID (project-specific thread)
//   quoteId?      — optional UUID (quote-specific thread)
//   title?        — section heading override
export default function CollectiveChatSection({ collectiveId, projectId, quoteId, title }) {
  const { currentUser } = useApp();
  const t = useTranslations('messages');

  const [messages, setMessages]   = useState([]);
  const [threadId, setThreadId]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [draft, setDraft]         = useState('');
  const [error, setError]         = useState('');
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  function buildUrl() {
    let url = `/api/threads?collective_id=${collectiveId}`;
    if (projectId) url += `&project_id=${projectId}`;
    if (quoteId)   url += `&quote_id=${quoteId}`;
    return url;
  }

  // Initial load
  useEffect(() => {
    fetch(buildUrl())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setThreadId(data.thread?.id || null);
        setMessages(data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectiveId, projectId, quoteId]);

  // Poll every 30s for new messages (US-MSG-020)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetch(buildUrl())
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          setThreadId(data.thread?.id || null);
          setMessages(data.messages || []);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(pollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectiveId, projectId, quoteId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    const text = draft.trim();
    setDraft('');

    try {
      let res, data;
      if (threadId) {
        res = await fetch(`/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
      } else {
        const payload = { type: 'collective', collective_id: collectiveId, message: text };
        if (projectId) payload.project_id = projectId;
        if (quoteId)   payload.quote_id   = quoteId;
        res = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t('sendError')); setDraft(text); return; }

      if (!threadId && data.thread_id) setThreadId(data.thread_id);
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (e) {
      setError(e.message || t('sendError'));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const displayTitle = title || (projectId || quoteId ? t('teamDiscussionTitle') : t('teamChatTitle'));

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={14} color="#7c3aed" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{displayTitle}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Privacy note */}
        <div style={{ padding: '0.55rem 1rem', background: '#f5f3ff', borderBottom: '1px solid #ede9fe', fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>
          {t('teamChatSubtitle')}
        </div>

        {/* Messages list */}
        <div style={{ minHeight: 100, maxHeight: 320, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
              <Loader2 size={18} className="animate-spin" color="var(--text-muted)" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              {t('teamChatEmpty')}
            </div>
          )}

          {!loading && messages.map(msg => {
            const isMe = msg.sender_user_id === currentUser?.id;
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%',
                  background: isMe ? '#eff6ff' : 'var(--bg-subtle)',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.835rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {!isMe && (
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.15rem' }}>
                      {msg.sender_name || 'Ismeretlen'}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-primary)' }}>{msg.body}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>
                    {new Date(msg.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {new Date(msg.created_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sendPlaceholder')}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              outline: 'none',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {sending
              ? <Loader2 size={13} className="animate-spin" />
              : <Send size={13} />
            }
            {sending ? t('sending') : t('sendBtn')}
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.4rem 1rem', background: 'var(--danger-bg)', borderTop: '1px solid var(--danger-border)', fontSize: '0.775rem', color: 'var(--danger-text)', fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
