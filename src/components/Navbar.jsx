'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  Building2, FolderKanban, Users, LayoutDashboard, LogOut,
  KeyRound, ShieldCheck, User, ChevronDown, FileText,
  Calendar, BookUser, ShieldAlert, Eye, X
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, realUser, impersonating, isSuperAdmin, isAdmin, logout, stopImpersonation } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  if (!currentUser && pathname === '/login') return null;

  return (
    <>
      {/* God Mode Banner */}
      {impersonating && (
        <div style={{
          background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
          color: '#fff',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.825rem',
          fontWeight: 700,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={15} />
            <span>God Mode — Átvett nézet:</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)' }}>
              {impersonating.display_name}
              <span style={{ marginLeft: '0.35rem', opacity: 0.75 }}>
                ({impersonating.role === 'admin' ? 'Admin' : 'Tag'})
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={stopImpersonation}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem'
            }}
          >
            <X size={13} /> God Mode kilépés
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="navbar">
        <div className="container navbar-inner">
          {/* Brand */}
          <Link
            href={isSuperAdmin && !impersonating ? '/superadmin' : isAdmin ? '/admin' : '/projektek'}
            className="brand-logo"
          >
            <div className="brand-icon"><Building2 size={18} /></div>
            <span>Epitünk</span>
            <span className="brand-badge">PRO</span>
          </Link>

          {/* Desktop nav */}
          {currentUser && (
            <nav className="nav-links desktop-nav">
              {isSuperAdmin && !impersonating ? (
                <Link href="/superadmin" className={`nav-item ${pathname.startsWith('/superadmin') ? 'active' : ''}`}>
                  <ShieldAlert size={16} /><span>Entitások</span>
                </Link>
              ) : isAdmin ? (
                <>
                  <Link href="/admin" className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}>
                    <LayoutDashboard size={16} /><span>Áttekintés</span>
                  </Link>
                  <Link href="/admin/projektek" className={`nav-item ${pathname.startsWith('/admin/projektek') ? 'active' : ''}`}>
                    <FolderKanban size={16} /><span>Projektek</span>
                  </Link>
                  <Link href="/admin/felhasznalok" className={`nav-item ${pathname === '/admin/felhasznalok' ? 'active' : ''}`}>
                    <Users size={16} /><span>Felhasználók</span>
                  </Link>
                  <Link href="/ugyfelek" className={`nav-item ${pathname.startsWith('/ugyfelek') ? 'active' : ''}`}>
                    <BookUser size={16} /><span>Ügyfelek</span>
                  </Link>
                  <Link href="/ajanlatok" className={`nav-item ${pathname.startsWith('/ajanlatok') ? 'active' : ''}`}>
                    <FileText size={16} /><span>Ajánlatok</span>
                  </Link>
                  <Link href="/naptar" className={`nav-item ${pathname.startsWith('/naptar') ? 'active' : ''}`}>
                    <Calendar size={16} /><span>Naptár</span>
                  </Link>
                  <Link href="/projektek" className={`nav-item ${pathname.startsWith('/projektek') ? 'active' : ''}`}>
                    <User size={16} /><span>Tagi nézet</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/projektek" className={`nav-item ${pathname.startsWith('/projektek') ? 'active' : ''}`}>
                    <FolderKanban size={16} /><span>Projektek</span>
                  </Link>
                  <Link href="/ajanlatok" className={`nav-item ${pathname.startsWith('/ajanlatok') ? 'active' : ''}`}>
                    <FileText size={16} /><span>Ajánlatok</span>
                  </Link>
                  <Link href="/naptar" className={`nav-item ${pathname.startsWith('/naptar') ? 'active' : ''}`}>
                    <Calendar size={16} /><span>Naptár</span>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User menu */}
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <div className="user-badge" style={{ cursor: 'pointer' }} onClick={() => setShowUserDropdown(!showUserDropdown)}>
                {isSuperAdmin
                  ? <ShieldAlert size={16} color="#7c3aed" />
                  : isAdmin
                    ? <ShieldCheck size={16} color="var(--warning)" />
                    : <User size={16} color="var(--accent)" />
                }
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentUser.display_name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                </span>
                <span className={`role-tag ${currentUser.role === 'superadmin' ? 'admin' : currentUser.role}`}>
                  {currentUser.role === 'superadmin' ? 'Super' : currentUser.role === 'admin' ? 'Admin' : 'Tag'}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </div>

              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '115%', right: 0, background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', minWidth: '220px', padding: '0.6rem', zIndex: 100 }}>
                  <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bejelentkezve</div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{realUser?.email || currentUser.email}</div>
                  </div>

                  <Link
                    href="/change-password"
                    onClick={() => setShowUserDropdown(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <KeyRound size={15} /><span>Jelszó módosítása</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => { setShowUserDropdown(false); logout(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', color: 'var(--danger)', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '0.2rem' }}
                  >
                    <LogOut size={15} /><span>Kijelentkezés</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">Bejelentkezés</Link>
          )}
        </div>
      </header>

      {/* Mobile bottom nav — hidden on upload and superadmin-only pages */}
      {currentUser && !pathname.includes('/feltoltes') && !(isSuperAdmin && !impersonating) && (
        <nav className="mobile-bottom-nav">
          {isAdmin ? (
            <>
              <Link href="/admin" className={`mobile-nav-link ${pathname === '/admin' ? 'active' : ''}`}><LayoutDashboard size={20} /><span>Áttekintés</span></Link>
              <Link href="/admin/projektek" className={`mobile-nav-link ${pathname.startsWith('/admin/projektek') ? 'active' : ''}`}><FolderKanban size={20} /><span>Projektek</span></Link>
              <Link href="/ajanlatok" className={`mobile-nav-link ${pathname.startsWith('/ajanlatok') ? 'active' : ''}`}><FileText size={20} /><span>Ajánlatok</span></Link>
              <Link href="/naptar" className={`mobile-nav-link ${pathname.startsWith('/naptar') ? 'active' : ''}`}><Calendar size={20} /><span>Naptár</span></Link>
              <Link href="/ugyfelek" className={`mobile-nav-link ${pathname.startsWith('/ugyfelek') || pathname === '/admin/felhasznalok' ? 'active' : ''}`}><Users size={20} /><span>Kezelés</span></Link>
            </>
          ) : (
            <>
              <Link href="/projektek" className={`mobile-nav-link ${pathname.startsWith('/projektek') ? 'active' : ''}`}><FolderKanban size={22} /><span>Projektek</span></Link>
              <Link href="/ajanlatok" className={`mobile-nav-link ${pathname.startsWith('/ajanlatok') ? 'active' : ''}`}><FileText size={22} /><span>Ajánlatok</span></Link>
              <Link href="/naptar" className={`mobile-nav-link ${pathname.startsWith('/naptar') ? 'active' : ''}`}><Calendar size={22} /><span>Naptár</span></Link>
            </>
          )}
        </nav>
      )}
    </>
  );
}
