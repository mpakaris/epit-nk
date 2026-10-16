'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ConfirmModal } from '@/components/Modal';
import { Lightbulb, Plus, Trash2, X, Send, Loader2 } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

export default function IdeasPage() {
  const { currentUser, loading, effectiveEntityId } = useApp();

  const [ideas, setIdeas] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ideaText, setIdeaText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  const loadIdeas = useCallback(async (entityId) => {
    setFetching(true);
    try {
      const url = entityId ? `/api/ideas?entity_id=${entityId}` : '/api/ideas';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) setIdeas(json.ideas || []);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && currentUser) loadIdeas(effectiveEntityId);
  }, [loading, currentUser, effectiveEntityId, loadIdeas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ideaText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaText, entityId: effectiveEntityId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Error'); return; }
      setIdeas(prev => [json.idea, ...prev]);
      setIdeaText('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (idea) => {
    setConfirmModal({
      message: 'Törlöd ezt az ötletet?',
      onConfirm: async () => {
        const res = await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' });
        if (res.ok) setIdeas(prev => prev.filter(i => i.id !== idea.id));
      },
    });
  };

  if (loading || fetching) return <PageSpinner />;

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Lightbulb size={22} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Ötletek</h1>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(v => !v); setIdeaText(''); setError(''); }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Mégsem' : 'Új ötlet'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            autoFocus
            value={ideaText}
            onChange={e => setIdeaText(e.target.value)}
            placeholder="Írd le az ötletedet..."
            rows={4}
            style={{ width: '100%', resize: 'vertical', padding: '0.6rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !ideaText.trim()}>
              <Send size={14} />
              {submitting ? <><Loader2 size={13} className="animate-spin" />Beküld</> : 'Beküld'}
            </button>
          </div>
        </form>
      )}

      {ideas.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
          <Lightbulb size={40} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
          <p style={{ margin: 0 }}>Még nincs ötlet. Légy az első!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ideas.map(item => (
            <IdeaCard key={item.id} item={item} currentUser={currentUser} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmModal}
        message={confirmModal?.message}
        onConfirm={confirmModal?.onConfirm}
        onClose={() => setConfirmModal(null)}
      />
    </div>
  );
}

function IdeaCard({ item, currentUser, onDelete }) {
  const canDelete = currentUser && (
    item.author_id === currentUser.id ||
    ['admin', 'superadmin'].includes(currentUser.role)
  );

  const date = new Date(item.created_at).toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.idea}</p>
        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>{item.author_name}</span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          title="Törlés"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
