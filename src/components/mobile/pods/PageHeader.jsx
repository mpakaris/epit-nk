'use client';

import { useTranslations } from 'next-intl';

export default function PageHeader({ onMessages, onNotifications, onMenu, msgCount = 0, notifCount = 0 }) {
  const t = useTranslations('mobilePods');

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 0, zIndex: 15,
      height: 100, boxSizing: 'border-box', padding: '50px 16px 0 20px',
      background: 'var(--m-canvas)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    }}>
      <span style={{
        paddingTop: 6,
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
      }}>
        okosszaki<span style={{ color: '#2F5BFF' }}>.</span>
      </span>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onMessages}
          aria-label={t('messages') + (msgCount > 0 ? `, ${msgCount} ${t('unread')}` : '')}
          style={{ position: 'relative', width: 46, height: 46, borderRadius: 23, border: 0, background: 'var(--m-card)', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h16v11H9l-5 4z"/>
          </svg>
          {msgCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: 'var(--m-ink)', color: '#fff', border: '2px solid var(--m-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {msgCount}
            </span>
          )}
        </button>

        <button
          onClick={onNotifications}
          aria-label={t('notifications') + (notifCount > 0 ? `, ${notifCount} ${t('unread')}` : '')}
          style={{ position: 'relative', width: 46, height: 46, borderRadius: 23, border: 0, background: 'var(--m-card)', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/>
          </svg>
          {notifCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: 'var(--m-ink)', color: '#fff', border: '2px solid var(--m-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {notifCount}
            </span>
          )}
        </button>

        <button
          onClick={onMenu}
          aria-label={t('menu')}
          style={{ width: 46, height: 46, borderRadius: 23, border: 0, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
