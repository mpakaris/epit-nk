'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { Sparkles, Lock } from 'lucide-react';

/**
 * Shown when a Basic user hits a document creation limit OR tries to edit a
 * read-only (write-locked) document.
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 *   mode     'create' (default) | 'readOnly'
 *   docType  'survey' | 'quote' | 'project'  (used in create mode only)
 */
export default function UpgradeModal({ isOpen, onClose, mode = 'create', docType }) {
  const t = useTranslations('upgrade');
  const { isDemoMode } = useApp();
  const href = `${isDemoMode ? '/demo' : ''}/elofizetes`;

  const isReadOnly = mode === 'readOnly';
  const docLabel = t(`docTypes.${docType || 'document'}`);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="420px">
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>

        {/* Icon */}
        <div style={{ width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, #1F2A3C, #3A4963)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={26} color="#fff" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#0E1116', letterSpacing: '-0.02em', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          {isReadOnly ? t('readOnlyTitle') : t('title')}
        </h2>

        {/* Body */}
        <p style={{ margin: '0 0 24px', fontSize: 15, color: '#5A5F68', lineHeight: 1.6, fontWeight: 500 }}>
          {isReadOnly ? t('readOnlyBody') : t('body', { docType: docLabel })}
        </p>

        {/* Premium features */}
        <div style={{ background: '#EDEBE5', borderRadius: 16, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={15} color="#1F2A3C" aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2A3C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t('premiumLabel')}
            </span>
          </div>
          {[t('bullet1'), t('bullet2'), t('bullet3')].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#1F2A3C', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#3A3F4A', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={href}
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, background: '#1F2A3C', color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none', marginBottom: 10 }}
        >
          <Sparkles size={17} aria-hidden="true" />
          {t('cta')}
        </Link>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', height: 44, border: '1.5px solid #D5D2C8', borderRadius: 22, background: 'transparent', color: '#6B7080', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('dismiss')}
        </button>
      </div>
    </Modal>
  );
}
