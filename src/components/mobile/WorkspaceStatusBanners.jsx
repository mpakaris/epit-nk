'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import useMobile from '@/hooks/useMobile';

const LOCK_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

export function MobileWorkspaceNotActivatedBanner() {
  const t = useTranslations('collectives');
  const { activeCollectiveId } = useApp();
  const isMobile = useMobile();
  return (
    <div style={{
      borderRadius: 20, padding: '14px 16px',
      background: '#FFF4CD',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: 12, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309' }}>
          {LOCK_SVG}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#B45309' }}>{t('notActivatedBannerTitle')}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginTop: 2 }}>{t('activateSubtitle')}</div>
        </div>
        {!isMobile && (
          <Link
            href={activeCollectiveId ? `/elofizetes?activate=${activeCollectiveId}` : '/elofizetes'}
            style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: '#B45309', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
          >
            {t('notActivatedBannerBtn')}
          </Link>
        )}
      </div>
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Link
            href={activeCollectiveId ? `/elofizetes?activate=${activeCollectiveId}` : '/elofizetes'}
            style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: '#B45309', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            {t('notActivatedBannerBtn')}
          </Link>
        </div>
      )}
    </div>
  );
}

export function MobileWorkspaceFrozenBanner({ isOwner }) {
  const t = useTranslations('collectives');
  const isMobile = useMobile();
  return (
    <div style={{
      borderRadius: 20, padding: '14px 16px',
      background: '#FDECEC',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: 12, marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B71C1C' }}>
          {LOCK_SVG}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#B71C1C' }}>{t('frozenBannerTitle')}</div>
        </div>
        {!isMobile && isOwner && (
          <Link href="/elofizetes" style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: '#B71C1C', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            {t('frozenBannerBtn')}
          </Link>
        )}
      </div>
      {isMobile && isOwner && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Link href="/elofizetes" style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: '#B71C1C', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {t('frozenBannerBtn')}
          </Link>
        </div>
      )}
    </div>
  );
}
