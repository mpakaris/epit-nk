'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCheck, RotateCcw, Loader2 } from 'lucide-react';

const ACTION_META = {
  accepted: { label: 'Elfogadva',            color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
  rejected: { label: 'Elutasítva',           color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: '❌' },
  question: { label: 'Kérdés / Módosítás',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '💬' },
};

export default function ClientComments({ quoteId }) {
  const [comments, setComments]   = useState(null); // null = loading
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}/client-comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [quoteId]);

  const toggleResolve = async (commentId) => {
    setResolving(commentId);
    try {
      const res  = await fetch(`/api/quotes/${quoteId}/client-comments/${commentId}`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) setComments(prev => prev.map(c => c.id === commentId ? data.comment : c));
    } finally {
      setResolving(null);
    }
  };

  if (comments === null) return null; // silent load
  if (comments.length === 0) return null;

  const open     = comments.filter(c => !c.resolved_at);
  const resolved = comments.filter(c =>  c.resolved_at);

  return (
    <div className="card mb-4" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <MessageSquare size={15} color="var(--accent)" />
        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Ügyfél visszajelzések</span>
        {open.length > 0 && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-pill)', padding: '0.1rem 0.5rem' }}>
            {open.length} nyitott
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {comments.map(c => {
          const m          = ACTION_META[c.action] || ACTION_META.question;
          const isResolved = !!c.resolved_at;
          return (
            <div key={c.id} style={{
              border: `1px solid ${isResolved ? 'var(--border-subtle)' : m.border}`,
              borderRadius: 'var(--radius-md)',
              background: isResolved ? 'var(--bg-subtle)' : m.bg,
              padding: '0.75rem 1rem',
              opacity: isResolved ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: m.color }}>{m.icon} {m.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.client_name || c.client_email}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(c.created_at).toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleResolve(c.id)}
                  disabled={resolving === c.id}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
                >
                  {resolving === c.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : isResolved
                      ? <><RotateCcw size={11} /> Újranyit</>
                      : <><CheckCheck size={11} /> Megoldva</>
                  }
                </button>
              </div>
              {c.comment && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {c.comment}
                </p>
              )}
              {isResolved && c.resolved_at && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCheck size={11} /> Megoldva: {new Date(c.resolved_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
