'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link as LocaleLink, usePathname, useRouter } from '@/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Ruler, Euro, Plus, Folder, Contact,
  FolderKanban, BookUser, LayoutGrid,
} from 'lucide-react';

const HIDDEN_PREFIXES = [
  '/feltoltes', '/szakemberek/',
  '/invitations/', '/impressum', '/adatkezeles', '/aszf', '/about',
  '/naplo/', '/portal',
];

function getActiveKey(pathname) {
  if (pathname.startsWith('/felmeres'))  return 'felmeres';
  if (pathname.startsWith('/ajanlatok')) return 'ajanlatok';
  if (pathname.startsWith('/projektek')) return 'projektek';
  if (pathname.startsWith('/ugyfelek'))  return 'ugyfelek';
  return null;
}

export default function FloatingNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { currentUser, isSuperAdmin, impersonating, isDemoMode } = useApp();
  const t        = useTranslations('mobile.floatingNav');
  const navPrefix = isDemoMode ? '/demo' : '';

  const AppLink = isDemoMode ? Link : LocaleLink;

  const NAV_ITEMS = [
    { key: 'felmeres', label: t('navSurveys'),  icon: Ruler,   path: '/felmeres' },
    { key: 'ajanlatok', label: t('navQuotes'),   icon: Euro,    path: '/ajanlatok' },
    null, // center + placeholder
    { key: 'projektek', label: t('navProjects'), icon: Folder,  path: '/projektek' },
    { key: 'ugyfelek',  label: t('navClients'),  icon: Contact, path: '/ugyfelek' },
  ];

  const CREATE_ACTIONS = [
    { label: t('newSurvey'),  path: '/felmeres/uj',  icon: Ruler },
    { label: t('newQuote'),   path: '/ajanlatok/uj', icon: Euro },
    { label: t('newProject'), path: '/projektek/uj', icon: FolderKanban },
    { label: t('newClient'),  path: '/ugyfelek/uj',  icon: BookUser },
  ];

  const [expanded, setExpanded]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const hidden =
    !currentUser ||
    (isSuperAdmin && !impersonating) ||
    HIDDEN_PREFIXES.some(p => pathname.startsWith(p));

  useEffect(() => {
    const onScroll = () => setExpanded(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!expanded) return;
    const onOutside = (e) => {
      if (!e.target.closest('.floating-nav')) setExpanded(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [expanded]);

  if (hidden) return null;

  const activeKey  = getActiveKey(pathname);
  const activeItem = NAV_ITEMS.find(i => i?.key === activeKey);
  const ToggleIcon = activeItem ? activeItem.icon : LayoutGrid;

  const handlePlus = () => {
    if (activeItem) {
      const action = CREATE_ACTIONS.find(a => a.path.startsWith(activeItem.path));
      if (action) {
        if (isDemoMode) {
          router.push(navPrefix + action.path);
        } else {
          router.push(action.path);
        }
        return;
      }
    }
    setCreateOpen(true);
  };

  return (
    <>
      <nav
        className={`floating-nav${expanded ? ' nav-expanded' : ''}`}
        aria-label={t('ariaMainNav')}
      >
        <button
          type="button"
          className="floating-nav-toggle"
          onClick={() => setExpanded(true)}
          aria-label={t('ariaOpenNav')}
        >
          <ToggleIcon size={20} strokeWidth={1.75} />
        </button>

        <div className="floating-nav-inner">
          {NAV_ITEMS.map((item, idx) => {
            if (!item) {
              return (
                <div key="plus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="floating-nav-plus"
                    onClick={handlePlus}
                    aria-label={t('ariaNewItem')}
                  >
                    <Plus size={24} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              );
            }
            const isActive = item.key === activeKey;
            const Icon = item.icon;
            return (
              <AppLink
                key={item.key}
                href={isDemoMode ? navPrefix + item.path : item.path}
                className={`floating-nav-item${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setExpanded(false)}
              >
                <span className="floating-nav-icon">
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>{item.label}</span>
              </AppLink>
            );
          })}
        </div>
      </nav>

      {createOpen && (
        <>
          <div
            onClick={() => setCreateOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('ariaNewItem')}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              zIndex: 201,
              padding: '16px 0 calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '0 20px 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
              {t('createTitle')}
            </div>
            {CREATE_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    if (isDemoMode) {
                      router.push(navPrefix + action.path);
                    } else {
                      router.push(action.path);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    width: '100%', minHeight: 56, padding: '0 20px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 17, fontWeight: 600, color: '#0f172a', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} strokeWidth={1.75} color="#475569" aria-hidden="true" />
                  </div>
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
