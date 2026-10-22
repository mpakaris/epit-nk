'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Building2, LayoutDashboard, FolderKanban, Users, BookUser,
  FileText, Calendar, User, LogOut, ShieldAlert,
  ChevronLeft, ChevronRight, Eye, X, Menu, ClipboardList, Ruler, Lightbulb,
  ChevronDown, Globe, ImageIcon, UsersRound, CreditCard, Package,
} from 'lucide-react';

function buildNavItems(isSuperAdmin, isAdmin, impersonating, websiteUnread = 0, prefix = '', invitationCount = 0) {
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
    { href: prefix + '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, exact: true },
    { divider: true, key: 'd-munka',  group: 'Munka' },
    { href: prefix + '/felmeres',     label: 'Felmérések',   icon: Ruler },
    { href: prefix + '/ajanlatok',    label: 'Ajánlatok',    icon: FileText },
    { href: prefix + '/projektek',    label: 'Projektek',    icon: FolderKanban },
    { href: prefix + '/katalogus',    label: 'Árkatalógus',  icon: Package },
    { divider: true, key: 'd-kapcs',  group: 'Kapcsolatok' },
    { href: prefix + '/ugyfelek',     label: 'Ügyfelek',     icon: BookUser },
    { href: prefix + '/kollektivak',  label: 'Kollektívák',  icon: UsersRound, badge: invitationCount },
    { divider: true, key: 'd-egyeb',  group: 'Egyéb' },
    { href: prefix + '/naptar',       label: 'Naptár',       icon: Calendar },
    { href: prefix + '/otletek',      label: 'Ötletek',      icon: Lightbulb },
    { href: prefix + '/weboldalam',   label: 'Weboldalom',   icon: Globe, badge: websiteUnread },
    { divider: true, key: 'd-profil' },
    { href: prefix + '/profil',              label: 'Profilom',      icon: User },
    { href: prefix + '/profil#elofizetes',   label: 'Előfizetés',    icon: CreditCard,  sub: true },
    { href: prefix + '/profil#szamla',       label: 'Céges adatok',  icon: Building2,   sub: true },
  ];
  if (isAdmin) {
    return [
      ...commonNav,
      { href: '/admin/felhasznalok', label: 'Felhasználók', icon: Users, exact: true },
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
  const pathname = usePathname();
  const { currentUser, isSuperAdmin, isAdmin, impersonating, stopImpersonation, logout, collectives, effectiveCollectives, setActiveContext, switchImpersonatingContext, activeCollectiveId, allMemberships, entities, isDemoMode } = useApp();
  const effectiveUser = impersonating || currentUser;
  const navPrefix = isDemoMode ? '/demo' : '';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [websiteUnread, setWebsiteUnread] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const [showWsTooltip, setShowWsTooltip] = useState(false);
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
    if (isSuperAdmin || impersonating || isDemoMode) return;
    fetch('/api/collectives/my-invitations')
      .then(r => r.ok ? r.json() : { invitations: [] })
      .then(d => setInvitationCount((d.invitations || []).length))
      .catch(() => {});
  }, [isSuperAdmin, impersonating, isDemoMode, pathname]);

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
  useEffect(() => {
    if (mobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const top = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) window.scrollTo(0, -parseInt(top, 10));
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

  // Build context switcher list — personal workspace always first, then collectives
  const activeMemberships = [
    {
      collective_id: null,
      name: impersonating ? `${impersonating.display_name} – Személyes` : 'Személyes',
      role: 'owner',
    },
    ...(effectiveCollectives || []),
  ];

  const showContextSwitcher = activeMemberships.length > 1 && (impersonating || !isSuperAdmin);

  useEffect(() => {
    if (!showContextSwitcher) return;
    // Establish 7-day window from first appearance
    let first = localStorage.getItem('ws_tooltip_first');
    if (!first) { first = Date.now().toString(); localStorage.setItem('ws_tooltip_first', first); }
    const daysElapsed = (Date.now() - Number(first)) / 86400000;
    if (daysElapsed > 7) return;
    // Show every login session unless dismissed this session
    if (!sessionStorage.getItem('ws_tooltip_dismissed')) setShowWsTooltip(true);
  }, [showContextSwitcher]);

  const dismissWsTooltip = () => {
    sessionStorage.setItem('ws_tooltip_dismissed', '1');
    setShowWsTooltip(false);
  };

  const handleContextChange = (value) => {
    const collectiveId = value === '' ? null : value;
    if (impersonating) switchImpersonatingContext(collectiveId);
    else setActiveContext(collectiveId);
  };

  const ContextSwitcher = () => {
    if (!showContextSwitcher) return null;
    return (
      <div className="ctx-switcher">
        <select
          className="ctx-switcher-select"
          value={activeCollectiveId || ''}
          onChange={e => handleContextChange(e.target.value)}
          title="Kontextus váltás"
        >
          {activeMemberships.map(m => (
            <option key={m.collective_id || 'personal'} value={m.collective_id || ''}>
              {m.name}{m.role === 'admin' ? ' (admin)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="ctx-switcher-icon" />
      </div>
    );
  };

  if (!currentUser && pathname === '/login') return null;
  if (!currentUser) return null;
  if (pathname.startsWith('/naplo/') || pathname.startsWith('/clients/') || pathname.startsWith('/szakemberek/') || pathname.startsWith('/demo/szakemberek/') || pathname.startsWith('/invitations/') || pathname.endsWith('/nyomtatas') || pathname.startsWith('/impressum') || pathname.startsWith('/adatkezeles') || pathname.startsWith('/aszf') || pathname.startsWith('/about')) return null;

  const navItems = buildNavItems(isSuperAdmin, isAdmin, impersonating, websiteUnread, navPrefix, invitationCount);
  const homeHref = isSuperAdmin && !impersonating ? '/superadmin' : isAdmin ? '/admin' : (navPrefix + '/projektek');

  const initials = (effectiveUser?.display_name || '?')
    .split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="app-sidebar" style={{ width: collapsed ? '60px' : '240px' }}>
        {/* Brand + collapse toggle */}
        <div className="sidebar-header">
          <Link href={homeHref} className="sidebar-brand" style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}>
            <div className="sidebar-brand-icon"><Building2 size={16} /></div>
            <span>Epitünk</span>
          </Link>
          {collapsed && (
            <Link href={homeHref} className="sidebar-brand-icon" style={{ margin: '0 auto' }}>
              <Building2 size={16} />
            </Link>
          )}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Kibontás' : 'Összecsukás'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Context switcher */}
        {!collapsed && (
          <div style={{ position: 'relative' }}>
            <ContextSwitcher />
            {showWsTooltip && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', left: '0.75rem', right: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', fontSize: '0.78rem', lineHeight: 1.4, zIndex: 100, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                <div style={{ position: 'absolute', top: -6, left: 20, width: 12, height: 12, background: '#6366f1', transform: 'rotate(45deg)', borderRadius: 2 }} />
                <div style={{ fontWeight: 800, marginBottom: '0.3rem', fontSize: '0.82rem' }}>💡 Munkaterület váltó</div>
                Váltsd a munkaterületet az összes adatod megtekintéséhez!
                <button onClick={dismissWsTooltip} style={{ display: 'block', marginTop: '0.55rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  Értettem ✓
                </button>
              </div>
            )}
          </div>
        )}

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

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(item =>
            item.divider ? (
              <div key={item.key} className="sidebar-divider">
                {item.group && !collapsed && <span className="sidebar-group-label">{item.group}</span>}
              </div>
            ) : item.sub ? (
              <Link
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
              </Link>
            ) : (
              <Link
                key={item.key || item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item, pathname) ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                style={{ position: 'relative' }}
              >
                <item.icon size={18} className="link-icon" />
                {!collapsed && <span>{item.label}</span>}
                {item.badge > 0 && (
                  collapsed ? (
                    <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', border: '1.5px solid var(--bg-base)' }} />
                  ) : (
                    <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      {item.badge}
                    </span>
                  )
                )}
              </Link>
            )
          )}
        </nav>

        {/* User section — avatar + name links to /profil, logout icon stays */}
        <div className="sidebar-user" style={{ padding: '0.6rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link
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
                    const label = isPremium ? '⭐ Prémium' : isOnTrial ? '🎁 Próba' : 'Bázis';
                    return (
                      <span style={{ fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', ...styles }}>
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Kijelentkezés"
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
        <Link href={homeHref} className="sidebar-brand-icon" style={{ flexShrink: 0 }}>
          <Building2 size={18} />
        </Link>

        {showContextSwitcher && (
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <ContextSwitcher />
            {showWsTooltip && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', fontSize: '0.78rem', lineHeight: 1.4, zIndex: 200, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                <div style={{ position: 'absolute', top: -6, left: 16, width: 12, height: 12, background: '#6366f1', transform: 'rotate(45deg)', borderRadius: 2 }} />
                <div style={{ fontWeight: 800, marginBottom: '0.3rem', fontSize: '0.82rem' }}>💡 Munkaterület váltó</div>
                Váltsd a munkaterületet az összes adatod megtekintéséhez!
                <button onClick={dismissWsTooltip} style={{ display: 'block', marginTop: '0.55rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  Értettem ✓
                </button>
              </div>
            )}
          </div>
        )}

        {impersonating && <Eye size={15} style={{ flexShrink: 0, color: '#7c3aed' }} />}

        <button type="button" className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Menü" style={{ flexShrink: 0 }}>
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
                aria-label="Bezárás"
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
                  <X size={11} /> Kilépés
                </button>
              </div>
            )}

            <nav className="drawer-nav">
              {navItems.map(item =>
                item.divider ? (
                  <div key={item.key} className="drawer-divider">
                    {item.group && <span className="sidebar-group-label">{item.group}</span>}
                  </div>
                ) : item.sub ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1, flexShrink: 0, marginRight: '-0.25rem' }}>└</span>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    key={item.key || item.href}
                    href={item.href}
                    className={`drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              )}
            </nav>

            <div className="drawer-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{effectiveUser.display_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {effectiveUser.role === 'superadmin' ? 'Superadmin' : effectiveUser.role === 'admin' ? 'Admin' : 'Tag'}
                  {(!isSuperAdmin || impersonating) && (
                    <span style={{ marginLeft: '0.4rem', fontWeight: 700, ...(effectiveUser.is_subscription_premium ? { color: '#854d0e' } : {}) }}>
                      · {effectiveUser.is_subscription_premium ? '⭐ Prémium' : 'Bázis'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <Link href={`${navPrefix}/profil`} className="btn btn-secondary btn-sm" onClick={() => setMobileOpen(false)} style={{ padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                  <User size={14} /> Profil
                </Link>
                <button type="button" onClick={logout} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.5rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }} title="Kijelentkezés">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
