'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

function ModalBase({ isOpen, onClose, children, style }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const top = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) window.scrollTo(0, -parseInt(top, 10));
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  // iOS: block touchmove on the overlay so the background can't scroll.
  // Must use passive:false to be able to call preventDefault.
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e) => {
      if (!e.target.closest('.modal-dialog')) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent, { passive: false });
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && isOpen) onCloseRef.current(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]); // onClose intentionally omitted — stable via ref

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={style} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function Modal({ isOpen, onClose, title, children }) {
  return (
    <ModalBase isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </ModalBase>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Megerősítés', message, confirmLabel = 'Törlés', cancelLabel = 'Mégse' }) {
  return (
    <ModalBase isOpen={isOpen} onClose={onClose} style={{ maxWidth: '420px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={20} color="var(--danger-text)" />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--danger)', color: '#fff' }}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}

export function AlertModal({ isOpen, onClose, title, message, variant = 'error' }) {
  const isSuccess = variant === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;
  const iconColor = isSuccess ? 'var(--success-text)' : 'var(--danger-text)';
  const iconBg = isSuccess ? 'var(--success-bg)' : 'var(--danger-bg)';
  const defaultTitle = isSuccess ? 'Sikeres művelet' : 'Hiba történt';

  return (
    <ModalBase isOpen={isOpen} onClose={onClose} style={{ maxWidth: '420px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={iconColor} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {title || defaultTitle}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          OK
        </button>
      </div>
    </ModalBase>
  );
}
