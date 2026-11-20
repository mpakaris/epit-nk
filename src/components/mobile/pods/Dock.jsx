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
      id: 'surveys',
      href: p('/felmeres'),
      label: t('surveys'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg>,
    },
    // centre slot: placeholder width for the raised "+" button
    null,
    {
      id: 'quotes',
      href: p('/ajanlatok'),
      label: t('quotes'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4M9 12h6M9 16h4"/></svg>,
    },
    {
      id: 'projects',
      href: p('/projektek'),
      label: t('projects'),
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><path d="M13 17h8M17 13v8"/></svg>,
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
