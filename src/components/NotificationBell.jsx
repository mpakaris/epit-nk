'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import useMobile from '@/hooks/useMobile';

const TYPE_ICON = {
  quote_accepted:    { icon: '✅', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  quote_rejected:    { icon: '❌', bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
  client_question:   { icon: '💬', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  client_message:    { icon: '📩', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  collective_message:{ icon: '👥', bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed' },
  collective_activity:{ icon: '🏗', bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
  direct_message:     { icon: '💬', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  member_joined:     { icon: '🤝', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
};

function relativeTime(isoStr, locale = 'hu') {
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

export default function NotificationBell({ collapsed = false, isDemoMode = false }) {
  const router   = useRouter();
  const t        = useTranslations('notifications');
  const locale   = useLocale();
  const isMobile = useMobile();
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  // Initial load + refresh on page focus
  useEffect(() => {
    if (isDemoMode) return;
    const doFetch = () =>
      fetch('/api/notifications')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          setUnreadCount(data.unreadCount ?? 0);
          setNotifications(data.notifications ?? []);
        })
        .catch(() => {});
    doFetch();
    window.addEventListener('focus', doFetch);
    return () => window.removeEventListener('focus', doFetch);
  }, [isDemoMode]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (ids) => {
    if (isDemoMode) return;
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.filter(id => notifications.find(n => n.id === id && !n.read_at)).length));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  };

  const markAllRead = async () => {
    if (isDemoMode) return;
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  };

  const handleNotifClick = async (notif) => {
    if (!notif.read_at) await markRead([notif.id]);
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const unreadNotifs = notifications.filter(n => !n.read_at);
  const readNotifs   = notifications.filter(n => !!n.read_at);

  return (
    <>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          if (!open && !isDemoMode) {
            fetch('/api/notifications')
              .then(r => r.ok ? r.json() : null)
              .then(data => { if (data) { setUnreadCount(data.unreadCount ?? 0); setNotifications(data.notifications ?? []); } })
              .catch(() => {});
          }
        }}
        title={t('title')}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '0.5rem',
          width: '100%',
          padding: collapsed ? '0.5rem' : '0.4rem 0.75rem',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: open ? 'var(--bg-subtle)' : 'none',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: 'inherit',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'none'; }}
      >
        <Bell size={collapsed ? 18 : 17} style={{ flexShrink: 0 }} />
        {!collapsed && <span>{t('title')}</span>}

        {/* Badge */}
        {unreadCount > 0 && (
          collapsed ? (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--bg-base)' }} />
          ) : (
            <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )
        )}
      </button>

      {/* Slide-in panel */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: isMobile ? 499 : 400 }}
          />
          <div
            ref={panelRef}
            style={isMobile ? {
              position: 'fixed',
              inset: 0,
              background: 'var(--bg-card)',
              zIndex: 500,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            } : {
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 'var(--sidebar-w)',
              width: 'min(380px, calc(100vw - var(--sidebar-w)))',
              background: 'var(--bg-card)',
              borderRight: '1px solid var(--border-subtle)',
              zIndex: 401,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
              overflowY: 'auto',
            }}
          >
            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: isMobile ? '0.9rem 1rem' : '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.2rem', borderRadius: 'var(--radius-sm)', marginRight: '0.1rem' }}
                >
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <Bell size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t('title')}</span>
              {unreadNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <CheckCheck size={13} /> {t('markAllRead')}
                </button>
              )}
              {!isMobile && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {notifications.length === 0 && (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <Bell size={28} style={{ color: 'var(--border-subtle)', marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{t('empty')}</p>
                </div>
              )}

              {/* Unread */}
              {unreadNotifs.length > 0 && (
                <div>
                  <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                    {t('unread', { count: unreadNotifs.length })}
                  </div>
                  {unreadNotifs.map(n => (
                    <NotifRow key={n.id} notif={n} onRead={() => markRead([n.id])} onClick={() => handleNotifClick(n)} t={t} locale={locale} />
                  ))}
                </div>
              )}

              {/* Read / history */}
              {readNotifs.length > 0 && (
                <div>
                  <div style={{ padding: '0.75rem 1rem 0.25rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', borderTop: unreadNotifs.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    {t('history')}
                  </div>
                  {readNotifs.map(n => (
                    <NotifRow key={n.id} notif={n} onRead={null} onClick={() => handleNotifClick(n)} t={t} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function NotifRow({ notif, onRead, onClick, t, locale }) {
  const cfg   = TYPE_ICON[notif.type] || TYPE_ICON.client_message;
  const isNew = !notif.read_at;

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.65rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: isNew ? 'var(--bg-subtle)' : 'transparent',
        cursor: notif.link ? 'pointer' : 'default',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!isNew) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
      onMouseLeave={e => { if (!isNew) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Icon */}
      <div style={{ width: 34, height: 34, borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, marginTop: '0.1rem' }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.835rem', fontWeight: isNew ? 700 : 600, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1 }}>
            {notif.title}
          </span>
          {isNew && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, marginTop: '0.3rem' }} />
          )}
        </div>
        {notif.body && (
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {notif.body}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{relativeTime(notif.created_at, locale)}</span>
          {notif.link && (
            <span style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <ExternalLink size={9} /> {t('open')}
            </span>
          )}
        </div>
      </div>

      {/* Mark read button */}
      {isNew && onRead && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRead(); }}
          title={t('markRead')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', padding: '0.15rem 0', flexShrink: 0, borderRadius: 'var(--radius-sm)', transition: 'color 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Check size={14} style={{ marginTop: '0.1rem' }} />
        </button>
      )}
    </div>
  );
}
