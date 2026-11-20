'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

function SheetHandle() {
  return <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#CFCBC0' }} />;
}

function SheetRow({ icon, label, suffix, href, onClick, danger }) {
  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {suffix && <span style={{ fontSize: 14, fontWeight: 700, color: '#5A5F68' }}>{suffix}</span>}
      {!suffix && href && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      )}
    </div>
  );
  const style = { minHeight: 56, border: 0, borderRadius: 20, background: '#FFFFFF', color: danger ? '#B71C1C' : 'var(--m-ink)', padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 600, textAlign: 'left', width: '100%', cursor: 'pointer', textDecoration: 'none' };

  if (href) return <Link href={href} style={style}>{content}</Link>;
  return <button onClick={onClick} style={style}>{content}</button>;
}

export function CreateSheet({ activePod, onClose }) {
  const t = useTranslations('mobilePods');
  const { isDemoMode } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;
  const { bg, fg } = activePod?.colors || { bg: '#15181E', fg: '#FFFFFF' };

  return (
    <div role="dialog" aria-label={t('newElement')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `12px 20px calc(36px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SheetHandle />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700 }}>{t('createIn')}</span>
        {activePod && (
          <span style={{ height: 36, padding: '0 16px', boxSizing: 'border-box', borderRadius: 18, background: bg, color: fg, display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 700 }}>{activePod.name}</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {[
          { key: 'survey',  href: p('/felmeres/uj'),   label: t('newSurvey'),  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg> },
          { key: 'quote',   href: p('/ajanlatok/uj'), label: t('newQuote'),   icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/></svg> },
          { key: 'diary',   href: null,                label: t('newDiary'),   icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v16H6zM9 8h6M9 12h6"/></svg> },
          { key: 'invoice', href: null,                label: t('snapInvoice'),icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg> },
        ].map(({ key, href, label, icon }) => (
          <Link
            key={key}
            href={href || '#'}
            onClick={href ? onClose : (e) => { e.preventDefault(); onClose?.(); }}
            style={{ minHeight: 96, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}
          >
            <span style={{ width: 44, height: 44, borderRadius: 22, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const TYPE_DOT = {
  quote_accepted:     '#15803d',
  quote_rejected:     '#b91c1c',
  client_question:    '#1d4ed8',
  client_message:     '#1d4ed8',
  collective_message: '#7c3aed',
  collective_activity:'#c2410c',
  direct_message:     '#1d4ed8',
  member_joined:      '#15803d',
  info:               '#1d4ed8',
  success:            '#15803d',
  warning:            '#d97706',
  announcement:       '#7c3aed',
  system:             '#475569',
};

function relativeTimeNotif(isoStr, locale = 'hu') {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const rtf   = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (mins < 1)   return rtf.format(0, 'minute');
  if (mins < 60)  return rtf.format(-mins, 'minute');
  if (hours < 24) return rtf.format(-hours, 'hour');
  if (days < 7)   return rtf.format(-days, 'day');
  return new Date(isoStr).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function NotifSheet({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  const t        = useTranslations('mobilePods');
  const locale   = useLocale();
  const router   = useRouter();
  const [expandedId, setExpandedId] = React.useState(null);

  const hasUnread = notifications.some(n => !n.read_at);

  const handleTap = (n) => {
    if (expandedId === n.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(n.id);
    if (!n.read_at) onMarkRead?.(n.id);
  };

  const handleOpen = (link) => {
    onClose?.();
    router.push(link);
  };

  return (
    <div role="dialog" aria-label={t('notifications')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '78%', boxSizing: 'border-box', overflowY: 'auto', padding: `12px 20px calc(32px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetHandle />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700 }}>{t('notifications')}</span>
        {hasUnread && (
          <button onClick={onMarkAllRead} style={{ minHeight: 44, padding: '0 14px', border: 0, borderRadius: 22, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t('markAllRead')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#5A5F68', fontSize: 14 }}>{t('noNotifications')}</div>
        )}
        {notifications.map(n => {
          const isUnread   = !n.read_at;
          const isExpanded = expandedId === n.id;
          const dot        = TYPE_DOT[n.type] || '#5A5F68';

          return (
            <div key={n.id} style={{ borderRadius: 22, overflow: 'hidden', background: isUnread && !isExpanded ? '#FFFFFF' : '#F5F5F5' }}>
              {/* Collapsed row — tap to expand */}
              <button
                onClick={() => handleTap(n)}
                style={{ width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '12px 14px', border: 0, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <span style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 5, background: dot }} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: isUnread ? 700 : 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: '#8A8F97' }}>{relativeTimeNotif(n.created_at, locale)}</span>
                </span>
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isUnread && !isExpanded && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--m-ink)' }} />}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none', color: '#8A8F97' }} aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {n.body ? (
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#2B3038', whiteSpace: 'pre-wrap' }}>{n.body}</p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 14, color: '#8A8F97', fontStyle: 'italic' }}>{t('noBody')}</p>
                  )}
                  {n.link && (
                    <button
                      onClick={() => handleOpen(n.link)}
                      style={{ alignSelf: 'flex-start', minHeight: 38, padding: '0 16px', border: 0, borderRadius: 19, background: 'var(--m-ink)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('open')} →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MessagesSheet({ threads, loading = false, onClose }) {
  const t = useTranslations('mobilePods');
  return (
    <div role="dialog" aria-label={t('messages')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '78%', boxSizing: 'border-box', overflowY: 'auto', padding: `12px 20px calc(32px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetHandle />
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700 }}>{t('messages')}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid var(--m-ink)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#5A5F68', fontSize: 14 }}>{t('noMessages')}</div>
        )}
        {!loading && threads.map((thread, idx) => (
          <button key={idx} style={{ width: '100%', minHeight: 76, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#FFFFFF', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <span style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 23, background: thread.avatarBg || '#0E1116', color: thread.avatarFg || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{thread.initials}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{thread.name}</span>
              <span style={{ fontSize: 14, color: '#5A5F68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.preview}</span>
            </span>
            <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#5A5F68' }}>{thread.time}</span>
              {thread.unread > 0 && (
                <span style={{ minWidth: 22, height: 22, padding: '0 6px', boxSizing: 'border-box', borderRadius: 11, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{thread.unread}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MenuSheet({ profile, subscriptionLabel, onLogout, onClose }) {
  const t = useTranslations('mobilePods');
  const { isDemoMode } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const initials = (profile?.display_name || profile?.email || 'TE').slice(0, 2).toUpperCase();

  const menuItems = [
    { label: t('myProfile'),   href: p('/profil'),      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg> },
    { label: t('myWebsite'),   href: p('/weboldalam'),  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg> },
    { label: t('subscription'), href: p('/elofizetes'), icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>, badge: subscriptionLabel },
  ];

  return (
    <div role="dialog" aria-label={t('menu')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '84%', boxSizing: 'border-box', overflowY: 'auto', padding: `12px 20px calc(32px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetHandle />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 4px 8px' }}>
        <span style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials}</span>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700 }}>{t('myAccount')}</span>
          <span style={{ fontSize: 13, color: '#5A5F68' }}>{profile?.display_name || profile?.email}</span>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {menuItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            style={{ minHeight: 56, border: 0, borderRadius: 20, background: '#FFFFFF', color: 'var(--m-ink)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 14, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && <span style={{ padding: '3px 10px', borderRadius: 12, background: '#FFE3CC', color: '#7A3300', fontSize: 13, fontWeight: 700 }}>{item.badge}</span>}
            {item.suffix && <span style={{ fontSize: 14, fontWeight: 700, color: '#5A5F68' }}>{item.suffix}</span>}
            {!item.badge && !item.suffix && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>}
          </Link>
        ))}
      </div>
      <button
        onClick={onLogout}
        style={{ minHeight: 56, border: '2px solid var(--m-ink)', borderRadius: 28, background: 'transparent', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/></svg>
        {t('logout')}
      </button>
    </div>
  );
}

export function DaySheet({ events, dayTitle, onClose }) {
  const t = useTranslations('mobilePods');
  return (
    <div role="dialog" aria-label={t('dailyEvents')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '78%', boxSizing: 'border-box', overflowY: 'auto', padding: `12px 20px calc(32px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SheetHandle />
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700 }}>{dayTitle}</span>
      {events.length === 0 && (
        <span style={{ fontSize: 15, color: '#5A5F68' }}>{t('noEventsDay')}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((e, idx) => (
          <div key={idx} style={{ minHeight: 68, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ flexShrink: 0, width: 52, fontSize: 15, fontWeight: 700 }}>{e.time}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{e.title}</span>
              <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px 0 8px', borderRadius: 12, background: e.tint, fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: e.dot }} />
                {e.name}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
