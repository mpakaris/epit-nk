'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Building2, LayoutDashboard, FolderKanban, Users, BookUser,
  FileText, Calendar, User, LogOut, KeyRound, ShieldAlert,
  ChevronLeft, ChevronRight, Eye, X, Menu
} from 'lucide-react';

function buildNavItems(isSuperAdmin, isAdmin, impersonating) {
  if (isSuperAdmin && !impersonating) {
    return [
      { key: 'sa-entitasok',    href: '/superadmin',         label: 'Entitások',    icon: Building2,    exact: true },
      { key: 'sa-felhasznalok', href: '/admin/felhasznalok', label: 'Felhasználók', icon: Users,        exact: true },
      { key: 'sa-projektek',    href: '/admin/projektek',    label: 'Projektek',    icon: FolderKanban },
      { key: 'sa-ajanlatok',    href: '/ajanlatok',          label: 'Ajánlatok',    icon: FileText },
      { divider: true, key: 'dsa' },
      { key: 'sa-godmode',      href: '/superadmin',         label: 'God Mode',     icon: Eye,          exact: true },
    ];
  }
  if (isAdmin) {
    return [
      { href: '/admin',              label: 'Áttekintés',   icon: LayoutDashboard, exact: true },
      { href: '/admin/projektek',    label: 'Projektek',    icon: FolderKanban },
      { href: '/admin/felhasznalok', label: 'Felhasználók', icon: Users, exact: true },
      { href: '/admin/ugyfelek',     label: 'Ügyfelek',     icon: BookUser },
      { divider: true, key: 'd1' },
      { href: '/ajanlatok',          label: 'Ajánlatok',    icon: FileText },
      { href: '/naptar',             label: 'Naptár',       icon: Calendar },
      { divider: true, key: 'd2' },
      { href: '/projektek',          label: 'Tagi nézet',   icon: User }
    ];
  }
  return [
    { href: '/projektek', label: 'Projektek', icon: FolderKanban },
    { href: '/ajanlatok', label: 'Ajánlatok', icon: FileText },
    { href: '/naptar',    label: 'Naptár',    icon: Calendar }
  ];
}

function isActive(item, pathname) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, isSuperAdmin, isAdmin, impersonating, stopImpersonation, logout } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sb_collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '60px' : '240px');
    localStorage.setItem('sb_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  if (!currentUser && pathname === '/login') return null;
  if (!currentUser) return null;

  const navItems = buildNavItems(isSuperAdmin, isAdmin, impersonating);
  const homeHref = isSuperAdmin && !impersonating ? '/superadmin' : isAdmin ? '/admin' : '/projektek';

  const UserActions = ({ showLabel = false }) => (
    <div style={{ display: 'flex', gap: '0.35rem' }}>
      <Link
        href="/change-password"
        className="btn btn-secondary btn-sm"
        style={{ padding: '0.3rem 0.5rem' }}
        title="Jelszó módosítása"
      >
        <KeyRound size={14} />
        {showLabel && <span>Jelszó</span>}
      </Link>
      <button
        type="button"
        onClick={logout}
        className="btn btn-danger btn-sm"
        style={{ padding: '0.3rem 0.5rem' }}
        title="Kijelentkezés"
      >
        <LogOut size={14} />
        {showLabel && <span>Kilépés</span>}
      </button>
    </div>
  );

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
              <div key={item.key} className="sidebar-divider" />
            ) : (
              <Link
                key={item.key || item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item, pathname) ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <item.icon size={18} className="link-icon" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          )}
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{currentUser.display_name}</span>
              <span className="sidebar-user-role">
                {currentUser.role === 'superadmin' ? 'Superadmin' : currentUser.role === 'admin' ? 'Admin' : 'Tag'}
              </span>
            </div>
          )}
          <div className="sidebar-user-actions">
            <UserActions />
          </div>
        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <header className="mobile-header">
        <Link href={homeHref} className="sidebar-brand">
          <div className="sidebar-brand-icon"><Building2 size={16} /></div>
          <span>Epitünk</span>
        </Link>

        {impersonating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
            <Eye size={13} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {impersonating.display_name}
            </span>
          </div>
        )}

        <button type="button" className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Menü">
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
                  <div key={item.key} className="drawer-divider" />
                ) : (
                  <Link
                    key={item.key || item.href}
                    href={item.href}
                    className={`drawer-link ${isActive(item, pathname) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </nav>

            <div className="drawer-user">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{currentUser.display_name}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {currentUser.role === 'superadmin' ? 'Superadmin' : currentUser.role === 'admin' ? 'Admin' : 'Tag'}
                </div>
              </div>
              <UserActions showLabel />
            </div>
          </div>
        </>
      )}
    </>
  );
}
