'use client';

import React, { useState } from 'react';
import { Lock, Trash2, FolderOpen, Eye, RotateCcw, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';

const REASON_COPY = {
  transfer_rejected: {
    title:       'Dokumentum visszautasítva',
    why:         'A kollektíva tulajdonosa visszautasította az áthelyezési kérelmet. Ez a dokumentum jelenleg csak olvasható.',
    badge:       { label: 'Visszautasítva', bg: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'var(--danger-border)' },
  },
  transfer_expired: {
    title:       'Áthelyezési kérelem lejárt',
    why:         'A kérelmre 7 napon belül nem érkezett válasz, ezért automatikusan lejárt. Ez a dokumentum jelenleg csak olvasható.',
    badge:       { label: 'Lejárt kérelem', bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  },
  quota_exceeded: {
    title:       'Dokumentumkorlát elérve',
    why:         'Elérted az ingyenes csomag dokumentumkorlátját. Az ezen felüli dokumentumok csak olvashatók.',
    badge:       { label: 'Korlát elérve', bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
  },
};

// documentType: 'survey' | 'quote' | 'project'
// documentId: string
// lockedReason: string
// transferAttempts: number (how many rejections/expirations so far)
// onDelete: async () => void
// onUnlocked: () => void   — called after successful unlock
// onKeepReadOnly: () => void
export default function LockedDocumentModal({
  isOpen,
  documentType,
  documentId,
  lockedReason,
  transferAttempts = 0,
  onDelete,
  onUnlocked,
  onKeepReadOnly,
}) {
  const { currentUser } = useApp();
  const [unlocking,  setUnlocking]  = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [retrying,   setRetrying]   = useState(false);
  const [unlockErr,  setUnlockErr]  = useState('');
  const [retryErr,   setRetryErr]   = useState('');

  const copy = REASON_COPY[lockedReason] || REASON_COPY.transfer_rejected;
  const canRetry = (lockedReason === 'transfer_rejected' || lockedReason === 'transfer_expired') && transferAttempts < 2;

  const apiPath = documentType === 'survey'  ? `/api/surveys/${documentId}`
                : documentType === 'quote'   ? `/api/quotes/${documentId}`
                :                               `/api/projects/${documentId}`;

  const handleUnlock = async () => {
    setUnlockErr('');
    setUnlocking(true);
    try {
      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'unlock' }),
      });
      if (!res.ok) {
        const { error, reason } = await res.json().catch(() => ({}));
        if (reason === 'quota_exceeded')
          setUnlockErr('Nincs szabad dokumentumhely. Törölj egy másik dokumentumot, vagy válts Prémiumra.');
        else
          setUnlockErr(error || 'Hiba történt. Próbáld újra.');
        return;
      }
      onUnlocked?.();
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete?.(); }
    finally { setDeleting(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onKeepReadOnly} title={copy.title}>
      {/* Reason badge */}
      <div style={{ marginBottom: '1.1rem' }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
          borderRadius: 999, border: `1px solid ${copy.badge.border}`,
          background: copy.badge.bg, color: copy.badge.color,
        }}>
          {copy.badge.label}
        </span>
      </div>

      {/* Why is it locked */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
          <Lock size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {copy.why}
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
        Mit tehetsz?
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>

        {/* Unlock to personal */}
        <button
          type="button"
          onClick={handleUnlock}
          disabled={unlocking || deleting}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {unlocking ? <Loader2 size={16} color="var(--success-text)" style={{ animation: 'spin 1s linear infinite' }} /> : <FolderOpen size={16} color="var(--success-text)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Megtartás személyes munkaterületen
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              A dokumentum szerkeszthetővé válik — foglal egy helyet az előfizetésedből.
            </div>
          </div>
        </button>
        {unlockErr && (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger-text)', margin: '0 0 0 0.25rem' }}>{unlockErr}</p>
        )}

        {/* Re-try transfer */}
        {canRetry && (
          <button
            type="button"
            disabled={retrying || deleting || unlocking}
            onClick={() => { onKeepReadOnly?.(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RotateCcw size={16} color="#2563eb" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Újra beküldés kollektívába
                <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                  ({2 - transferAttempts} kísérlet maradt)
                </span>
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Bezárás után újra kiválaszthatod a célkollektívát.
              </div>
            </div>
          </button>
        )}

        {/* Keep read-only */}
        <button
          type="button"
          onClick={onKeepReadOnly}
          disabled={unlocking || deleting}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Eye size={16} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Megtartás csak olvashatóként
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Nem foglal helyet az előfizetésedből. Bármikor visszatérhetsz ide.
            </div>
          </div>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={unlocking || deleting}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {deleting ? <Loader2 size={16} color="var(--danger-text)" style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} color="var(--danger-text)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--danger-text)' }}>
              Törlés
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--danger-text)', opacity: 0.8, marginTop: 2 }}>
              Véglegesen törli a dokumentumot és felszabadít egy helyet.
            </div>
          </div>
        </button>

      </div>
    </Modal>
  );
}
