'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMobile } from '@/hooks/useMobile';
import { useApp } from '@/context/AppContext';

const LOCK_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export default function ReadOnlyBanner() {
  const t = useTranslations('common');
  const { isDemoMode } = useApp();
  const isMobile = useMobile();

  const href = `${isDemoMode ? '/demo' : ''}/elofizetes`;

  return (
    <div style={{
      borderRadius: 20,
      padding: '14px 16px',
      background: '#FFF7E6',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: 12,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E' }}>
          {LOCK_ICON}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>{t('readOnlyBannerTitle')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#78350F', marginTop: 2, lineHeight: 1.4 }}>{t('readOnlyBannerMsg')}</div>
        </div>
        {!isMobile && (
          <Link href={href} style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: '#92400E', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {t('readOnlyBannerBtn')}
          </Link>
        )}
      </div>
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Link href={href} style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: '#92400E', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {t('readOnlyBannerBtn')}
          </Link>
        </div>
      )}
    </div>
  );
}
