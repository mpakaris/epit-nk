'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

function ModalBase({ isOpen, onClose, children, style, persistent }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const savedScrollY = useRef(0);
  const didLock = useRef(false);

  useLayoutEffect(() => {
    if (isOpen) {
      savedScrollY.current = window.scrollY;
      didLock.current = true;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${savedScrollY.current}px`;
    } else if (didLock.current) {
      didLock.current = false;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, savedScrollY.current);
    }
    return () => {
      if (didLock.current) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, savedScrollY.current);
        didLock.current = false;
      }
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

export default function Modal({ isOpen, onClose, title, children, maxWidth, maxHeight, persistent, headerRight, hideClose }) {
  const style = (maxWidth || maxHeight) ? { ...(maxWidth && { maxWidth }), ...(maxHeight && { maxHeight }) } : undefined;
  return (
    <ModalBase isOpen={isOpen} onClose={onClose} style={style} persistent={persistent}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {headerRight}
          {!hideClose && (
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
      {children}
    </ModalBase>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel, confirmStyle }) {
  const t = useTranslations('common');
  const effectiveTitle = title ?? t('confirm');
  const effectiveConfirmLabel = confirmLabel ?? t('delete');
  const effectiveCancelLabel = cancelLabel ?? t('cancel');
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
            {effectiveTitle}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
          {effectiveCancelLabel}
        </button>
        <button
          className="btn btn-sm"
          style={btnStyle}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> {effectiveConfirmLabel}…</>
            : effectiveConfirmLabel}
        </button>
      </div>
    </ModalBase>
  );
}

export function AlertModal({ isOpen, onClose, title, message, variant = 'error', action }) {
  const t = useTranslations('common');
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || action) return; // don't auto-dismiss if there's an action button
    const timer = setTimeout(() => onCloseRef.current(), 5000);
    return () => clearTimeout(timer);
  }, [isOpen, action]);

  const isSuccess = variant === 'success';
  const isWarning = variant === 'warning';
  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : AlertCircle;
  const iconColor = isSuccess ? 'var(--success-text)' : isWarning ? 'var(--warning-text)' : 'var(--danger-text)';
  const iconBg   = isSuccess ? 'var(--success-bg)'   : isWarning ? 'var(--warning-bg)'   : 'var(--danger-bg)';
  const defaultTitle = isSuccess ? t('success') : isWarning ? t('warning') : t('error');

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
          {t('ok')}
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
