'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

function ModalBase({ isOpen, onClose, children, style, persistent }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const savedScrollY = useRef(0);

  useEffect(() => {
    if (isOpen) {
      savedScrollY.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${savedScrollY.current}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, savedScrollY.current);
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
    <div className="modal-overlay">
      <div className="modal-dialog" style={style} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function Modal({ isOpen, onClose, title, children, maxWidth, maxHeight, persistent }) {
  const style = (maxWidth || maxHeight) ? { ...(maxWidth && { maxWidth }), ...(maxHeight && { maxHeight }) } : undefined;
  return (
    <ModalBase isOpen={isOpen} onClose={onClose} style={style} persistent={persistent}>
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

export function ConfirmModal({ isOpen, onClose, onConfirm, title = 'Megerősítés', message, confirmLabel = 'Törlés', cancelLabel = 'Mégse', confirmStyle }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isOpen) setLoading(false); }, [isOpen]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const btnStyle = { background: 'var(--danger)', color: '#fff', minWidth: 80, ...confirmStyle };

  return (
    <ModalBase isOpen={isOpen} onClose={loading ? undefined : onClose} style={{ maxWidth: '420px' }}>
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
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          className="btn btn-sm"
          style={btnStyle}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {confirmLabel}…</>
            : confirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}

export function AlertModal({ isOpen, onClose, title, message, variant = 'error', action }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || action) return; // don't auto-dismiss if there's an action button
    const t = setTimeout(() => onCloseRef.current(), 5000);
    return () => clearTimeout(t);
  }, [isOpen, action]);

  const isSuccess = variant === 'success';
  const isWarning = variant === 'warning';
  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : AlertCircle;
  const iconColor = isSuccess ? 'var(--success-text)' : isWarning ? 'var(--warning-text)' : 'var(--danger-text)';
  const iconBg   = isSuccess ? 'var(--success-bg)'   : isWarning ? 'var(--warning-bg)'   : 'var(--danger-bg)';
  const defaultTitle = isSuccess ? 'Sikeres művelet' : isWarning ? 'Figyelem' : 'Hiba történt';

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          OK
        </button>
        {action && (
          action.onClick
            ? <button className="btn btn-primary btn-sm" onClick={action.onClick}>{action.label}</button>
            : <a href={action.href} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{action.label}</a>
        )}
      </div>
    </ModalBase>
  );
}
