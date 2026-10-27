'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ClipboardList, FileText, Plus, Folder, Contact, X,
  Ruler, FolderKanban, BookUser,
} from 'lucide-react';
import BottomSheet from './BottomSheet';

const HIDDEN_PREFIXES = [
  '/feltoltes', '/clients/', '/szakemberek/',
  '/invitations/', '/impressum', '/adatkezeles', '/aszf', '/about',
  '/naplo/', '/portal',
];

const NAV_ITEMS = [
  { key: 'felmeres', label: 'Felmérés', icon: ClipboardList, path: '/felmeres' },
  { key: 'ajanlatok', label: 'Ajánlat',  icon: FileText,      path: '/ajanlatok' },
  null, // center + placeholder
  { key: 'projektek', label: 'Projekt',  icon: Folder,        path: '/projektek' },
  { key: 'ugyfelek',  label: 'Ügyfél',   icon: Contact,       path: '/ugyfelek' },
];

const CREATE_ACTIONS = [
  { label: 'Új felmérés', path: '/felmeres/uj', icon: ClipboardList },
  { label: 'Új ajánlat',  path: '/ajanlatok/uj', icon: FileText },
  { label: 'Új projekt',  path: '/projektek/uj', icon: FolderKanban },
  { label: 'Új ügyfél',   path: '/ugyfelek/uj',  icon: BookUser },
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
  const navPrefix = isDemoMode ? '/demo' : '';

  const [createOpen, setCreateOpen] = useState(false);

  const hidden =
    !currentUser ||
    (isSuperAdmin && !impersonating) ||
    HIDDEN_PREFIXES.some(p => pathname.startsWith(p));

  if (hidden) return null;

  const activeKey = getActiveKey(pathname);

  const handlePlus = () => {
    const activeItem = NAV_ITEMS.find(i => i?.key === activeKey);
    if (activeItem) {
      const action = CREATE_ACTIONS.find(a => a.path.startsWith(activeItem.path));
      if (action) {
        router.push(navPrefix + action.path);
        return;
      }
    }
    setCreateOpen(true);
  };

  return (
    <>
      <nav className="floating-nav" aria-label="Fő navigáció">
        {NAV_ITEMS.map((item, idx) => {
          if (!item) {
            return (
              <div key="plus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="floating-nav-plus"
                  onClick={handlePlus}
                  aria-label="Új elem létrehozása"
                >
                  <Plus size={26} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            );
          }
          const isActive = item.key === activeKey;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={navPrefix + item.path}
              className={`floating-nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="floating-nav-icon">
                <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Create type selector bottom sheet */}
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
            aria-label="Új elem létrehozása"
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
              Mit hozzon létre?
            </div>
            {CREATE_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => { setCreateOpen(false); router.push(navPrefix + action.path); }}
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
