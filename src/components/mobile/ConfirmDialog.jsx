'use client';

import React, { useEffect } from 'react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, body, isShared }) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 300 }}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        style={{
          position: 'fixed', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(340px, calc(100vw - 32px))',
          background: '#fff', borderRadius: 20,
          padding: '24px 20px', zIndex: 301,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: '24px' }}>{title}</div>
        <div style={{ fontSize: 16, color: '#475569', lineHeight: '24px' }}>
          {body}
          {isShared && (
            <span style={{ display: 'block', marginTop: 8, fontWeight: 600, color: '#92400e' }}>
              Ez az egész csapat számára törlődik.
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => { onClose(); onConfirm(); }}
            style={{
              height: 56, borderRadius: 999,
              background: '#b91c1c', border: 'none', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Igen, törlés
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 56, borderRadius: 999,
              background: 'transparent', border: '1px solid #e2e8f0', color: '#0f172a',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Mégse
          </button>
        </div>
      </div>
    </>
  );
}
