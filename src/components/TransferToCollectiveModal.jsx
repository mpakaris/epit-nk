'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';
import useMobile from '@/hooks/useMobile';

const DOC_ROUTE = { project: '/projektek', quote: '/ajanlatok', survey: '/felmeres' };

// ─── Shared content across mobile + desktop ───────────────────────────────────
function TransferContent({ step, selected, available, loading, error, isMobile, movedDirectly, documentType, documentId, documentTitle, navPrefix, t, onClose, onSelect, onConfirm, onBack }) {
  const docTypeKey = `docType${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`;
  const docTypeStr = t(docTypeKey);

  if (step === 'pick') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: isMobile ? 15 : '0.875rem', color: isMobile ? '#5A5F68' : 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {t('pickSubtitle', { title: documentTitle, docType: docTypeStr })}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {available.map(coll => (
            <button
              key={coll.collective_id}
              type="button"
              onClick={() => onSelect(coll)}
              style={isMobile ? {
                width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px',
                border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                fontSize: 16, fontWeight: 700,
                boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)',
                cursor: 'pointer',
              } : {
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s', width: '100%',
              }}
            >
              <span style={isMobile ? {
                flexShrink: 0, width: 44, height: 44, borderRadius: 15,
                background: '#F0EDFB', color: '#4A2796',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              } : {
                width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={isMobile ? 22 : 16} height={isMobile ? 22 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : '0.9rem', color: isMobile ? 'var(--m-ink)' : 'var(--text-primary)' }}>{coll.name}</div>
                <div style={{ fontSize: isMobile ? 13 : '0.72rem', color: isMobile ? '#5A5F68' : 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>
                  {coll.role === 'owner' || coll.role === 'admin' ? t('roleOwner') : t('roleContributor')}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isMobile ? '#5A5F68' : 'var(--text-muted)'} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'confirm' && selected) {
    const isContributor = selected.role === 'contributor';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={isMobile ? {
          padding: '14px 16px', borderRadius: 20, background: '#FFF1E0',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        } : {
          display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '0.5rem',
        }}>
          <div style={isMobile ? {
            flexShrink: 0, width: 44, height: 44, borderRadius: 22,
            background: '#FFE0B0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          } : {
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={isMobile ? 22 : 20} height={isMobile ? 22 : 20} viewBox="0 0 24 24" fill="none" stroke={isMobile ? '#8A4200' : 'var(--warning-text)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p style={{ fontSize: isMobile ? 15 : '0.875rem', color: isMobile ? '#5A3A00' : 'var(--text-secondary)', lineHeight: 1.6, margin: 0, flex: 1 }}>
            {isContributor
              ? t('confirmContributorMsg', { title: documentTitle, docType: docTypeStr, collectiveName: selected.name })
              : t('confirmOwnerMsg', { title: documentTitle, docType: docTypeStr, collectiveName: selected.name })
            }
            {' '}<strong>{t('irreversible')}</strong>
          </p>
        </div>

        {isContributor && (
          <div style={isMobile ? {
            padding: '10px 14px', borderRadius: 18, background: '#FFF8E0',
            color: '#7A3A00', fontSize: 13, fontWeight: 600, lineHeight: 1.4,
          } : {
            fontSize: '0.8rem', color: 'var(--warning-text)', padding: '0.5rem 0.65rem',
            background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', lineHeight: 1.5,
          }}>
            {t('pendingLocked')}
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)', padding: isMobile ? '10px 14px' : '0.65rem',
            borderRadius: isMobile ? 18 : 'var(--radius-md)',
            fontSize: isMobile ? 13 : '0.825rem', fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              style={{ height: 60, border: 0, borderRadius: 30, background: loading ? '#B9B5AA' : '#6D3FD1', color: '#fff', fontSize: 17, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="animate-spin">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  {t('loading')}
                </>
              ) : isContributor ? t('sendRequest') : t('confirmBtn')}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
            >
              {available.length > 1 ? t('back') : t('cancel')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onBack} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {available.length > 1 ? t('back') : t('cancel')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {loading ? t('loading') : isContributor ? t('sendRequest') : t('confirmBtn')}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'success' && selected) {
    return (
      <div style={{ textAlign: 'center', padding: isMobile ? '8px 0 4px' : '0.5rem 0' }}>
        <div style={{
          width: isMobile ? 64 : 56, height: isMobile ? 64 : 56,
          borderRadius: isMobile ? 32 : '50%',
          background: '#E7F4EC', border: '1px solid #2E9E5B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: `0 auto ${isMobile ? 16 : 12}px`,
        }}>
          <svg width={isMobile ? 32 : 28} height={isMobile ? 32 : 28} viewBox="0 0 24 24" fill="none" stroke="#2E9E5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <p style={{ fontSize: isMobile ? 15 : '0.875rem', color: isMobile ? '#3A3A3A' : 'var(--text-secondary)', lineHeight: 1.6, marginBottom: isMobile ? 20 : '1.25rem' }}>
          {movedDirectly
            ? t('successMovedMsg', { title: documentTitle, collectiveName: selected.name })
            : t('successRequestMsg', { collectiveName: selected.name })
          }
        </p>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movedDirectly && (
              <a
                href={`${navPrefix}${DOC_ROUTE[documentType]}/${documentId}`}
                style={{ height: 60, borderRadius: 30, background: '#6D3FD1', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                {t('view')}
              </a>
            )}
            <button type="button" onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('close')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>{t('close')}</button>
            {movedDirectly && (
              <a
                href={`${navPrefix}${DOC_ROUTE[documentType]}/${documentId}`}
                className="btn btn-primary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {t('view')}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TransferToCollectiveModal({ isOpen, onClose, documentType, documentId, documentTitle, onSuccess }) {
  const t = useTranslations('transferModal');
  const { collectives: userMemberships, isDemoMode } = useApp();
  const isMobile = useMobile();
  const navPrefix = isDemoMode ? '/demo' : '';

  const available = (userMemberships || []).filter(m => m.collective_id);

  const [step, setStep]                   = useState('pick');
  const [selected, setSelected]           = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [movedDirectly, setMovedDirectly] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setLoading(false);
    setMovedDirectly(false);
    if (available.length === 1) {
      setSelected(available[0]);
      setStep('confirm');
    } else {
      setSelected(null);
      setStep('pick');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (coll) => { setSelected(coll); setStep('confirm'); };
  const handleBack   = () => available.length > 1 ? setStep('pick') : onClose();

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: documentType, document_id: documentId, collective_id: selected.collective_id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('errorGeneral')); return; }
      setMovedDirectly(data.moved === true);
      setStep('success');
      onSuccess?.(data);
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = step === 'pick'
    ? t('stepPickTitle')
    : step === 'confirm'
      ? t('stepConfirmTitle')
      : movedDirectly ? t('stepSuccessMovedTitle') : t('stepSuccessRequestTitle');

  const sharedProps = { step, selected, available, loading, error, isMobile, movedDirectly, documentType, documentId, documentTitle, navPrefix, t, onClose, onSelect: handleSelect, onConfirm: handleConfirm, onBack: handleBack };

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <>
        <div
          onClick={loading ? undefined : onClose}
          role="button"
          tabIndex={0}
          aria-label={t('close')}
          onKeyDown={e => e.key === 'Enter' && !loading && onClose()}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)', border: 0 }}
        />
        <div role="dialog" aria-label={stepTitle} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{stepTitle}</span>
          <TransferContent {...sharedProps} />
        </div>
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title={stepTitle}>
      <TransferContent {...sharedProps} />
    </Modal>
  );
}
