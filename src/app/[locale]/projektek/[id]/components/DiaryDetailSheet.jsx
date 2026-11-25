'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Home, Eye, Lock, Edit3, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/constants';
import EntryMediaGrid from './EntryMediaGrid';
import Modal from '@/components/Modal';

export default function DiaryDetailSheet({ entry, author, room, canManage, onClose, onDelete, onTogglePublic, editHref }) {
  const t = useTranslations('projectDetail');

  if (!entry) return null;

  const entryDateStr = entry.entry_date
    ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const visibilityToggle = canManage ? (
    <button
      type="button"
      onClick={onTogglePublic}
      style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 999, border: `1px solid ${entry.is_public ? 'var(--success-border)' : 'var(--border-subtle)'}`, background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
    >
      {entry.is_public ? <><Eye size={10} /> {t('publicBadge')}</> : <><Lock size={10} /> {t('privateBadge')}</>}
    </button>
  ) : (
    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 999, border: `1px solid ${entry.is_public ? 'var(--success-border)' : 'var(--border-subtle)'}`, background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {entry.is_public ? <><Eye size={10} /> {t('publicBadge')}</> : <><Lock size={10} /> {t('privateBadge')}</>}
    </span>
  );

  return (
    <Modal isOpen={true} onClose={onClose} title={entry.title} headerRight={visibilityToggle}>
      {/* Meta pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {entryDateStr && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Calendar size={10} />{entryDateStr}
          </span>
        )}
        {entry.work_type && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {entry.work_type}
          </span>
        )}
        {room && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Home size={10} />{room.name}
          </span>
        )}
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
          {(author?.display_name || '?').charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{author?.display_name || t('unknownAuthor')}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {formatDate(entry.entry_date || entry.created_at)}</span>
      </div>

      {entry.body && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.75rem', whiteSpace: 'pre-wrap' }}>{entry.body}</p>
      )}

      {entry.internal_note && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
            <Lock size={10} /> {t('diaryInternalNote')}
          </div>
          {entry.internal_note}
        </div>
      )}

      {entry.client_note && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.2rem' }}>
            <Eye size={10} /> {t('diaryClientNote')}
          </div>
          {entry.client_note}
        </div>
      )}

      <EntryMediaGrid photos={entry.photos} />

      {canManage && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(); }}>
            <Trash2 size={13} /> {t('deleteLabel')}
          </button>
          <Link href={editHref} className="btn btn-primary btn-sm" onClick={onClose}>
            <Edit3 size={13} /> {t('editLabel')}
          </Link>
        </div>
      )}
    </Modal>
  );
}
