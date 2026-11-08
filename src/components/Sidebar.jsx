'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { useApp } from '@/context/AppContext';
import {
  Building2, LayoutDashboard, FolderKanban, Users, BookUser,
  FileText, Calendar, User, LogOut, ShieldAlert,
  ChevronLeft, ChevronRight, Eye, X, Menu, ClipboardList, Ruler, Lightbulb,
  Globe, ImageIcon, UsersRound, CreditCard, Package, MessageSquare, Mail,
} from 'lucide-react';
import FloatingNav from './mobile/FloatingNav';
import NotificationBell from './NotificationBell';

// Build a reverse map of localized-first-segment → canonical-first-segment
// so we can highlight the correct nav item regardless of the user's locale.
// routing.pathnames may be undefined when locale-specific URL paths are not configured.
const reverseSlugMap = {};
for (const [canonical, localeMap] of Object.entries(routing.pathnames || {})) {
  if (typeof localeMap === 'string') continue;
  for (const [locale, localizedPath] of Object.entries(localeMap)) {
    if (locale === routing.defaultLocale) continue;
    const localizedSeg = localizedPath.split('/')[1];
    const canonicalSeg = canonical.split('/')[1];
    if (localizedSeg && !localizedSeg.startsWith('[') && canonicalSeg) {
      reverseSlugMap[localizedSeg] = canonicalSeg;
    }
  }
}

function toCanonicalPathname(pathname) {
  const parts = pathname.split('/');
  const firstSeg = parts[1];
  if (firstSeg && reverseSlugMap[firstSeg]) {
    parts[1] = reverseSlugMap[firstSeg];
    return parts.join('/');
  }
  return pathname;
}

function buildNavItems(isSuperAdmin, isAdmin, impersonating, websiteUnread = 0, prefix = '', invitationCount = 0, counts = {}, t, msgUnread = 0) {
  if (isSuperAdmin && !impersonating) {
    return [
      { key: 'sa-entitasok',  href: '/superadmin',              label: 'Entities',  icon: Building2,    exact: true },
      { key: 'sa-projektek',  href: '/superadmin/projektek',    label: 'Projects',  icon: FolderKanban },
      { key: 'sa-ajanlatok',  href: '/superadmin/ajanlatok',    label: 'Quotes',    icon: FileText },
      { key: 'sa-naplo',      href: '/superadmin/naplo',        label: 'Audit Log', icon: ClipboardList },
      { key: 'sa-keptar',     href: '/admin/keptar',            label: 'Image Lib', icon: ImageIcon },
    ];
  }
  const commonNav = [
    { href: prefix + '/dashboard',    label: t('nav.dashboard'),      icon: LayoutDashboard, exact: true },
    { divider: true, key: 'd-munka',  group: t('groups.work') },
    { href: prefix + '/felmeres',     label: t('nav.surveys'),        icon: Ruler,        count: counts.surveys  },
    { href: prefix + '/ajanlatok',    label: t('nav.quotes'),         icon: FileText,     count: counts.quotes   },
    { href: prefix + '/projektek',    label: t('nav.projects'),       icon: FolderKanban, count: counts.projects },
    { href: prefix + '/katalogus',    label: t('nav.catalogue'),      icon: Package },
    { divider: true, key: 'd-kapcs',  group: t('groups.contacts') },
    { href: prefix + '/ugyfelek',     label: t('nav.clients'),        icon: BookUser,  count: counts.clients },
    { href: prefix + '/uzenetek',     label: t('nav.messages'),       icon: MessageSquare, badge: msgUnread },
    { href: prefix + '/kollektivak',  label: t('nav.collectives'),    icon: UsersRound, count: counts.collectives, badge: invitationCount },
    { divider: true, key: 'd-egyeb',  group: t('groups.other') },
    { href: prefix + '/naptar',       label: t('nav.calendar'),       icon: Calendar },
    { href: prefix + '/otletek',      label: t('nav.ideas'),          icon: Lightbulb },
    { href: prefix + '/weboldalam',   label: t('nav.website'),        icon: Globe, badge: websiteUnread },
    { divider: true, key: 'd-profil' },
    { href: prefix + '/profil',              label: t('nav.myProfile'),      icon: User },
    { href: prefix + '/profil#elofizetes',   label: t('nav.subscription'),   icon: CreditCard,  sub: true },
    { href: prefix + '/profil#szamla',       label: t('nav.companyDetails'), icon: Building2,   sub: true },
  ];
  if (isAdmin) {
    return [
      ...commonNav,
      { href: '/admin/felhasznalok', label: t('nav.users'), icon: Users, exact: true },
    ];
  }
  return commonNav;
}

function isActive(item, pathname) {
  const hrefPath = item.href.split('#')[0]; // strip anchor for matching
  if (item.exact) return pathname === hrefPath;
  return pathname === hrefPath || pathname.startsWith(hrefPath + '/');
}

export default function Sidebar() {
  const rawPathname = usePathname();
  const router = useRouter();
  const t = useTranslations('sidebar');
  const tc = useTranslations('common');
  const { currentUser, isSuperAdmin, isAdmin, impersonating, stopImpersonation, logout, collectives, effectiveCollectives, isDemoMode, surveys, quotes, projects, clients } = useApp();
  const effectiveUser = impersonating || currentUser;
  const currentLocale = useLocale();
  const handleSALocale = (lang) => {
    document.cookie = `NEXT_LOCALE=${lang};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  };
  const navPrefix = isDemoMode ? '/demo' : '';
  // For non-demo: map the localized browser URL back to the canonical internal path
  // so active-state checks work regardless of locale (e.g. /angebote → /ajanlatok).
  const pathname = isDemoMode ? rawPathname : toCanonicalPathname(rawPathname);
  // In demo mode use plain next/link (no NextIntlClientProvider); outside demo use locale-aware Link.
  const AppLink = isDemoMode ? Link : LocaleLink;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [websiteUnread, setWebsiteUnread] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const [totalCounts, setTotalCounts] = useState(null);
  const [msgUnread, setMsgUnread] = useState(0);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('sb_collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);

  // Fetch unread leads count for the Weboldalam badge (non-superadmin only)
  useEffect(() => {
    if (isSuperAdmin || impersonating) return;
    fetch('/api/website/leads/unread')
      .then(r => r.json())
      .then(d => setWebsiteUnread(d.count || 0))
      .catch(() => {});
  }, [isSuperAdmin, impersonating, pathname]);

  // Fetch pending invitation count for the Kollektívák badge
  useEffect(() => {
    if (!currentUser || isSuperAdmin || impersonating || isDemoMode) return;
    fetch('/api/collectives/my-invitations')
      .then(r => r.ok ? r.json() : { invitations: [] })
      .then(d => setInvitationCount((d.invitations || []).length))
      .catch(() => {});
  }, [currentUser, isSuperAdmin, impersonating, isDemoMode, pathname]);

  // Fetch cross-workspace aggregate counts (personal + all collectives)
  useEffect(() => {
    if (!currentUser || (isSuperAdmin && !impersonating) || isDemoMode) return;
    fetch('/api/counts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTotalCounts(d); })
      .catch(() => {});
  }, [currentUser, isSuperAdmin, impersonating, isDemoMode]);

  // Fetch unread client message count for the Üzenetek badge
  useEffect(() => {
    if (!currentUser || isSuperAdmin || impersonating || isDemoMode) return;
    fetch('/api/messages/unread-count')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setMsgUnread(d.count || 0))
      .catch(() => {});
  }, [currentUser, isSuperAdmin, impersonating, isDemoMode, pathname]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '60px' : '240px');
    localStorage.setItem('sb_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Hide header on scroll down, reveal on scroll up
  useEffect(() => {
    const THRESHOLD = 6;
    const onScroll = () => {
      if (mobileOpen) return;
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) < THRESHOLD) return;
      setHeaderVisible(y < lastScrollY.current || y < 60);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mobileOpen]);

  // Freeze background scroll when drawer is open (iOS-safe)
  const savedScrollYSidebar = useRef(0);
  const didLockSidebar = useRef(false);
  useEffect(() => {
    if (mobileOpen) {
      savedScrollYSidebar.current = window.scrollY;
      didLockSidebar.current = true;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${savedScrollYSidebar.current}px`;
    } else if (didLockSidebar.current) {
      didLockSidebar.current = false;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, savedScrollYSidebar.current);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevent = (e) => {
      if (!e.target.closest('.drawer')) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent, { passive: false });
  }, [mobileOpen]);


  if (!currentUser && pathname === '/login') return null;
  if (!currentUser) return null;
  if (pathname.startsWith('/naplo/') || pathname.startsWith('/szakemberek/') || pathname.startsWith('/demo/szakemberek/') || pathname.startsWith('/invitations/') || pathname.startsWith('/impressum') || pathname.startsWith('/adatkezeles') || pathname.startsWith('/aszf') || pathname.startsWith('/about')) return null;

  const counts = (!isSuperAdmin || impersonating) ? {
    surveys:     totalCounts ? totalCounts.surveys  : (surveys  || []).filter(s => s.status !== 'done').length,
    quotes:      totalCounts ? totalCounts.quotes   : (quotes   || []).filter(q => !q.deleted_at).length,
    projects:    totalCounts ? totalCounts.projects : (projects || []).filter(p => !p.closed_at).length,
    clients:     totalCounts ? totalCounts.clients  : (clients  || []).length,
    collectives: (effectiveCollectives || []).length,
  } : {};

  const navItems = buildNavItems(isSuperAdmin, isAdmin, impersonating, websiteUnread, navPrefix, invitationCount, counts, t, msgUnread);
  const homeHref = isSuperAdmin && !impersonating ? '/superadmin' : (navPrefix + '/dashboard');

  const initials = (effectiveUser?.display_name || '?')
    .split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="app-sidebar" style={{ width: collapsed ? '60px' : '240px' }}>
        {/* Brand + collapse toggle */}
        <div className="sidebar-header">
          <AppLink href={homeHref} className="sidebar-brand" style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto', transition: 'opacity 0.15s ease', textDecoration: 'none', gap: 0 }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.01em', color: 'var(--primary)', lineHeight: 1 }}>OKOS</span><span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.01em', color: '#f97316', lineHeight: 1 }}>SZAKI.hu</span>
          </AppLink>
          {collapsed && (
            <AppLink href={homeHref} style={{ margin: '0 auto', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: '0.75rem', color: '#f97316', lineHeight: 1 }}>OS</span>
            </AppLink>
          )}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? t('expand') : t('collapse')}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* God mode section */}
        {impersonating && (
          <div className="sidebar-god-mode">
            <Eye size={13} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {impersonating.display_name}
                </span>
                <button type="button" className="sidebar-god-exit" onClick={stopImpersonation}>
                  <X size={11} /> Exit
                </button>
              </>
            )}
          </div>
        )}

        {/* SA language toggle — cookie-only, no DB write */}
        {isSuperAdmin && !collapsed && (
          <div style={{ display: 'flex', gap: '0.25rem', padding: '0.3rem 0.6rem' }}>
            {['hu', 'en', 'de'].map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleSALocale(lang)}
                style={{
                  background: currentLocale === lang ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: currentLocale === lang ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.45rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item =>
            item.divider ? (
              <div key={item.key} className="sidebar-divider">
                {item.group && !collapsed && <span className="sidebar-group-label">{item.group}</span>}
              </div>
            ) : item.sub ? (
              <AppLink
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item, pathname) ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                style={{ paddingLeft: collapsed ? undefined : '2rem', fontSize: '0.8rem' }}
              >
                {collapsed ? (
                  <item.icon size={15} className="link-icon" />
                ) : (
                  <>
                    <span style={{ color: 'var(--text-muted)', marginRight: '0.35rem', fontSize: '0.7rem', lineHeight: 1, flexShrink: 0 }}>└</span>
                    <item.icon size={14} className="link-icon" style={{ flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </>
                )}
              </AppLink>
            ) : (
              <AppLink
                key={item.key || item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item, pathname) ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                style={{ position: 'relative' }}
              >
                <item.icon size={18} className="link-icon" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.count > 0 && !item.badge && (
                  <span style={{ marginLeft: 'auto', background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {item.count}
                  </span>
                )}
                {item.badge > 0 && (
                  collapsed ? (
                    <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', border: '1.5px solid var(--bg-base)' }} />
                  ) : (
                    <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      {item.badge}
                    </span>
                  )
                )}
              </AppLink>
            )
          )}
        </nav>


        {/* Notification bell */}
        {!isSuperAdmin && !impersonating && !isDemoMode && (
          <div style={{ padding: '0 0.5rem 0.1rem' }}>
            <NotificationBell collapsed={collapsed} isDemoMode={isDemoMode} />
          </div>
        )}

        {/* User section — avatar + name links to /profil, logout icon stays */}
        <div className="sidebar-user" style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AppLink
            href={`${navPrefix}/profil`}
            style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.6rem',
              textDecoration: 'none', borderRadius: 'var(--radius-md)',
              padding: collapsed ? '0.35rem' : '0.4rem 0.5rem',
              transition: 'background 0.15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={collapsed ? effectiveUser.display_name : ''}
          >
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {effectiveUser.display_name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {effectiveUser.role === 'superadmin' ? 'Superadmin' : effectiveUser.role === 'admin' ? 'Admin' : null}
                  {(!isSuperAdmin || impersonating) && (() => {
                    const isOnTrial = effectiveUser.subscription_tier === 'trial'
                      && effectiveUser.trial_ends_at
                      && new Date(effectiveUser.trial_ends_at) > new Date();
                    const isPremium = effectiveUser.is_subscription_premium;
                    const styles = isPremium
                      ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }
                      : isOnTrial
                      ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }
                      : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' };
                    const label = isPremium ? t('tiers.premium') : isOnTrial ? t('tiers.trial') : t('tiers.basic');
                    return (
                      <span style={{ fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', ...styles }}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </AppLink>
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              title={t('logout')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header" style={{ transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)', transition: 'transform 0.25s ease' }}>
        <AppLink href={homeHref} style={{ flexShrink: 0, textDecoration: 'none', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.01em', color: 'var(--primary)' }}>OKOS</span><span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.01em', color: '#f97316' }}>SZAKI.hu</span>
        </AppLink>

        {impersonating && <Eye size={15} style={{ flexShrink: 0, color: '#7c3aed' }} />}

        {!isSuperAdmin && !isDemoMode && (
          <AppLink
            href={`${navPrefix}/uzenetek`}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0, color: 'var(--text-secondary)', textDecoration: 'none' }}
            aria-label={t('nav.messages')}
          >
            <Mail size={20} />
            {msgUnread > 0 && (
              <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#f97316', border: '1.5px solid var(--bg-base)' }} />
            )}
          </AppLink>
        )}

        <button type="button" className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label={t('menu')} style={{ flexShrink: 0 }}>
          <Menu size={20} />
        </button>
      </header>

      {/* ===== MOBILE BOTTOM SHEET DRAWER ===== */}
      {mobileOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />
          <div className="drawer">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem 0' }}>
              <div className="drawer-handle" style={{ margin: 0 }} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                aria-label={tc('close')}
              >
                <X size={16} />
              </button>
            </div>

            {impersonating && (
              <div className="drawer-god-mode">
                <Eye size={15} />
                <span style={{ flex: 1 }}>God Mode: {impersonating.display_name}</span>
                <button
                  type="button"
                  onClick={() => { stopImpersonation(); setMobileOpen(false); }}
                  style={{ background: '#7c3aed20', border: '1px solid #7c3aed40', color: '#7c3aed', borderRadius: 'var(--radius-pill)', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <X size={11} /> {t('exitGodMode')}
                </button>
              </div>
            )}

            {/* SA language toggle in mobile drawer — cookie-only, no DB write */}
            {isSuperAdmin && (
              <div style={{ display: 'flex', gap: '0.25rem', padding: '0.3rem 1rem 0.1rem' }}>
                {['hu', 'en', 'de'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleSALocale(lang)}
                    style={{
                      background: currentLocale === lang ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: currentLocale === lang ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            <nav className="drawer-nav">
              {navItems.map(item =>
                item.divider ? (
                  <div key={item.key} className="drawer-divider">
                    {item.group && <span className="sidebar-group-label">{item.group}</span>}
                  </div>
                ) : item.sub ? (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    className={`drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1, flexShrink: 0, marginRight: '-0.25rem' }}>└</span>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </AppLink>
                ) : (
                  <AppLink
                    key={item.key || item.href}
                    href={item.href}
                    className={`drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                    {item.count > 0 && !item.badge && (
                      <span style={{ marginLeft: 'auto', background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                        {item.count}
                      </span>
                    )}
                    {item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {item.badge}
                      </span>
                    )}
                  </AppLink>
                )
              )}
            </nav>

            {/* Notification bell in mobile drawer */}
            {!isSuperAdmin && !impersonating && !isDemoMode && (
              <div style={{ padding: '0 0.75rem 0.5rem' }}>
                <NotificationBell collapsed={false} isDemoMode={isDemoMode} />
              </div>
            )}

            <div className="drawer-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{effectiveUser.display_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {effectiveUser.role === 'superadmin' ? 'Superadmin' : effectiveUser.role === 'admin' ? 'Admin' : t('member')}
                  {(!isSuperAdmin || impersonating) && (
                    <span style={{ marginLeft: '0.4rem', fontWeight: 700, ...(effectiveUser.is_subscription_premium ? { color: '#854d0e' } : {}) }}>
                      · {effectiveUser.is_subscription_premium ? t('tiers.premium') : (effectiveUser.subscription_tier === 'trial' && effectiveUser.trial_ends_at && new Date(effectiveUser.trial_ends_at) > new Date()) ? t('tiers.trial') : t('tiers.basic')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <AppLink href={`${navPrefix}/profil`} className="btn btn-secondary btn-sm" onClick={() => setMobileOpen(false)} style={{ padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                  <User size={14} /> {t('profile')}
                </AppLink>
                <button type="button" onClick={logout} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }} title={t('logout')}>
                  <LogOut size={14} />
                </button>
              </div>
            </div>

          </div>
        </>
      )}

      {/* ===== FLOATING BOTTOM NAV (mobile) ===== */}
      <FloatingNav />
    </>
  );
}
