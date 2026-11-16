'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';

export default function Dock({ onCreatePress, activePodColor, activePodName, activeTab = 'home' }) {
  const t = useTranslations('mobilePods');
  const { isDemoMode } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const { plusBg, plusFg } = activePodColor || { plusBg: '#15181E', plusFg: '#FFFFFF' };

  const TAB = [
    {
      id: 'home',
      href: p('/dashboard'),
      label: t('home'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7M6 10v10h12V10"/></svg>,
    },
    {
      id: 'calendar',
      href: p('/naptar'),
      label: t('calendar'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
    },
    // centre slot: placeholder width for the raised "+" button
    null,
    {
      id: 'clients',
      href: p('/ugyfelek'),
      label: t('clients'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>,
    },
    {
      id: 'profile',
      href: p('/profil'),
      label: t('profile'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>,
    },
  ];

  return (
    <nav
      aria-label={t('mainNav')}
      style={{
        position: 'fixed', left: 16, right: 16,
        bottom: `calc(24px + env(safe-area-inset-bottom))`,
        zIndex: 20, height: 74,
        boxSizing: 'border-box', padding: '0 8px',
        borderRadius: 37,
        background: 'var(--m-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 20px 30px -16px rgba(14,17,22,0.6)',
      }}
    >
      {TAB.map((tab, idx) => {
        if (tab === null) {
          return <span key="gap" style={{ width: 76, flexShrink: 0 }} />;
        }
        const isCurrent = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isCurrent ? 'page' : undefined}
            style={{
              width: 68, height: 58,
              borderRadius: 29,
              background: isCurrent ? 'rgba(255,255,255,0.14)' : 'transparent',
              color: isCurrent ? '#FFFFFF' : '#C9CED6',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, fontSize: 12, fontWeight: isCurrent ? 700 : 600,
              textDecoration: 'none',
            }}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}

      {/* Raised "+" button */}
      <button
        onClick={onCreatePress}
        aria-label={`${t('createNew')}: ${activePodName || ''}`}
        style={{
          position: 'absolute', left: '50%', top: -24,
          width: 72, height: 72, marginLeft: -36,
          borderRadius: 36, border: '6px solid var(--m-canvas)',
          boxSizing: 'border-box',
          background: plusBg, color: plusFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .4s',
          cursor: 'pointer',
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </nav>
  );
}
