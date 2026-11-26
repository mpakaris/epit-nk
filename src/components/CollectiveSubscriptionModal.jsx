'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { Lock } from 'lucide-react';

/**
 * Shown when a user attempts a write in a frozen collective.
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 *   isOwner  boolean — owner sees a CTA to /elofizetes; contributors see info only
 */
export default function CollectiveSubscriptionModal({ isOpen, onClose, isOwner }) {
  const t = useTranslations('collectiveModal');
  const { isDemoMode } = useApp();
  const href = `${isDemoMode ? '/demo' : ''}/elofizetes`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="420px">
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>

        <div style={{ width: 60, height: 60, borderRadius: 20, background: 'rgba(183,28,28,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Lock size={26} color="#B71C1C" aria-hidden="true" />
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#0E1116', letterSpacing: '-0.02em', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          {t('title')}
        </h2>

        <p style={{ margin: '0 0 24px', fontSize: 15, color: '#5A5F68', lineHeight: 1.6, fontWeight: 500 }}>
          {isOwner ? t('bodyOwner') : t('bodyContributor')}
        </p>

        {isOwner && (
          <Link
            href={href}
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, background: '#B71C1C', color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none', marginBottom: 10 }}
          >
            {t('cta')}
          </Link>
        )}

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
