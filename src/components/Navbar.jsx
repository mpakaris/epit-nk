'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Building2, 
  FolderKanban, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  KeyRound,
  ShieldCheck,
  User,
  ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, isAdmin, isConfigured, logout, users, switchDemoUser } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  if (!currentUser && pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="container navbar-inner">
          {/* Brand */}
          <Link href={isAdmin ? '/admin' : '/projektek'} className="brand-logo">
            <div className="brand-icon">
              <Building2 size={18} />
            </div>
            <span>Epitünk</span>
            <span className="brand-badge">PRO</span>
          </Link>

          {/* Desktop Navigation links */}
          {currentUser && (
            <nav className="nav-links desktop-nav">
              {isAdmin ? (
                <>
                  <Link 
                    href="/admin" 
                    className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
                  >
                    <LayoutDashboard size={16} />
                    <span>Áttekintés</span>
                  </Link>
                  <Link 
                    href="/admin/projektek" 
                    className={`nav-item ${pathname.startsWith('/admin/projektek') ? 'active' : ''}`}
                  >
                    <FolderKanban size={16} />
                    <span>Projektek</span>
                  </Link>
                  <Link 
                    href="/admin/felhasznalok" 
                    className={`nav-item ${pathname === '/admin/felhasznalok' ? 'active' : ''}`}
                  >
                    <Users size={16} />
                    <span>Felhasználók</span>
                  </Link>
                  <Link 
                    href="/projektek" 
                    className={`nav-item ${pathname.startsWith('/projektek') ? 'active' : ''}`}
                  >
                    <User size={16} />
                    <span>Tagi nézet</span>
                  </Link>
                </>
              ) : (
                <Link 
                  href="/projektek" 
                  className={`nav-item ${pathname.startsWith('/projektek') ? 'active' : ''}`}
                >
                  <FolderKanban size={16} />
                  <span>Projektek</span>
                </Link>
              )}
            </nav>
          )}

          {/* User Profile Menu */}
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <div 
                className="user-badge" 
                style={{ cursor: 'pointer' }}
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                {isAdmin ? (
                  <ShieldCheck size={16} color="var(--warning)" />
                ) : (
                  <User size={16} color="var(--accent)" />
                )}
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentUser.display_name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                </span>
                <span className={`role-tag ${currentUser.role}`}>
                  {currentUser.role === 'admin' ? 'Admin' : 'Tag'}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </div>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '115%',
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '240px',
                    padding: '0.6rem',
                    zIndex: 100
                  }}
                >
                  <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Bejelentkezve
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {currentUser.email}
                    </div>
                  </div>

                  <Link
                    href="/change-password"
                    onClick={() => setShowUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.6rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <KeyRound size={15} />
                    <span>Jelszó módosítása</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.6rem',
                      color: 'var(--danger)',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      marginTop: '0.2rem'
                    }}
                  >
                    <LogOut size={15} />
                    <span>Kijelentkezés</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Bejelentkezés
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation for Fast Thumb Navigation (Hidden on upload screen to not overlap form) */}
      {currentUser && !pathname.includes('/feltoltes') && (
        <nav className="mobile-bottom-nav">
          {isAdmin ? (
            <>
              <Link 
                href="/admin" 
                className={`mobile-nav-link ${pathname === '/admin' ? 'active' : ''}`}
              >
                <LayoutDashboard size={20} />
                <span>Áttekintés</span>
              </Link>
              <Link 
                href="/admin/projektek" 
                className={`mobile-nav-link ${pathname.startsWith('/admin/projektek') ? 'active' : ''}`}
              >
                <FolderKanban size={20} />
                <span>Projektek</span>
              </Link>
              <Link 
                href="/admin/felhasznalok" 
                className={`mobile-nav-link ${pathname === '/admin/felhasznalok' ? 'active' : ''}`}
              >
                <Users size={20} />
                <span>Felhasználók</span>
              </Link>
              <Link 
                href="/projektek" 
                className={`mobile-nav-link ${pathname.startsWith('/projektek') ? 'active' : ''}`}
              >
                <User size={20} />
                <span>Tagi nézet</span>
              </Link>
            </>
          ) : (
            <Link 
              href="/projektek" 
              className={`mobile-nav-link ${pathname.startsWith('/projektek') ? 'active' : ''}`}
            >
              <FolderKanban size={22} />
              <span>Saját Projektek</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
