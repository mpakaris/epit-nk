'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard, Ruler, FileText, FolderKanban, BookUser,
  Calendar, LayoutTemplate, Globe,
  UsersRound, ChevronRight, CreditCard,
} from 'lucide-react';

/* Per-module nav active background colour */
const MODULE_ACTIVE_COLOR = {
  dashboard:  '#2A2F3A',
  felmeres:   '#0A7F72',
  ajanlatok:  '#6D3FD1',
  projektek:  '#3A4963',
  ugyfelek:   '#B8456B',
  profil:     '#44413B',
  elofizetes: '#B45309',
  kollektivak:'#1E1A4E',
  naptar:     '#2A2F3A',
  sablonok:   '#7C5C2D',
  weboldalam: '#1A3A5C',
};

function getModuleKey(pathname) {
  const seg = pathname.split('/')[1] || 'dashboard';
  return seg;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function NavLink({ href, icon: Icon, label, active, activeColor }) {
  return (
    <Link
      href={href}
      className={`dk-nv${active ? ' dk-nv-active' : ''}`}
      style={active ? { background: activeColor } : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      {label}
    </Link>
  );
}

export default function DesktopSidebar() {
  const t = useTranslations('sidebar');
  const pathname = usePathname();
  const { currentUser, isDemoMode } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const moduleKey = getModuleKey(pathname.replace('/demo/', '/').replace('/demo', ''));
  const activeColor = MODULE_ACTIVE_COLOR[moduleKey] || '#2A2F3A';

  const tier = currentUser?.subscription_tier || 'basic';
  const tierLabel = t(`tierLabels.${tier}`, { defaultValue: tier });
  const displayName = currentUser?.display_name || currentUser?.email || '';
  const initials = getInitials(displayName);

  const docNavItems = [
    { key: 'felmeres',  href: `${navPrefix}/felmeres`,  icon: Ruler,         label: t('nav.surveys')  },
    { key: 'ajanlatok', href: `${navPrefix}/ajanlatok`, icon: FileText,      label: t('nav.quotes')   },
    { key: 'projektek', href: `${navPrefix}/projektek`, icon: FolderKanban,  label: t('nav.projects') },
    ...(!isDemoMode ? [{ key: 'ugyfelek', href: `${navPrefix}/ugyfelek`, icon: BookUser, label: t('nav.clients') }] : []),
  ];

  const workNavItems = [
    ...(!isDemoMode ? [
      { key: 'naptar',     href: `${navPrefix}/naptar`,     icon: Calendar,       label: t('nav.calendar')     },
      { key: 'sablonok',   href: `${navPrefix}/sablonok`,   icon: LayoutTemplate, label: t('nav.templates')    },
      { key: 'weboldalam', href: `${navPrefix}/weboldalam`, icon: Globe,          label: t('nav.website')      },
    ] : []),
    { key: 'kollektivak', href: `${navPrefix}/kollektivak`, icon: UsersRound, label: t('nav.collectives') },
    ...(!isDemoMode ? [
      { key: 'elofizetes', href: `${navPrefix}/elofizetes`, icon: CreditCard, label: t('nav.subscription') },
    ] : []),
  ];

  function isNavActive(key) {
    const seg = pathname.replace('/demo/', '/').replace('/demo', '').split('/')[1] || '';
    return seg === key;
  }

  return (
    <aside className="dk-sd">
      {/* Logo */}
      <div className="dk-logo">
        okosszaki<span style={{ color: '#6F93FF' }}>.</span>
      </div>

      {/* Navigation */}
      <nav className="dk-nav">
        <NavLink
          href={`${navPrefix}/dashboard`}
          icon={LayoutDashboard}
          label={t('nav.dashboard')}
          active={isNavActive('dashboard') || pathname === `${navPrefix}/` || pathname === navPrefix}
          activeColor={activeColor}
        />

        <span className="dk-sl" style={{ marginTop: 4 }}>{t('groups.documents')}</span>

        {docNavItems.map(item => (
          <NavLink
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isNavActive(item.key)}
            activeColor={activeColor}
          />
        ))}

        <span className="dk-sl" style={{ marginTop: 8 }}>{t('groups.work')}</span>

        {workNavItems.map(item => (
          <NavLink
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isNavActive(item.key)}
            activeColor={activeColor}
          />
        ))}
      </nav>

      {/* User card */}
      <Link
        href={isDemoMode ? `${navPrefix}/dashboard` : `${navPrefix}/profil`}
        className="dk-pod"
        style={{ background: 'rgba(0,0,0,0.07)', color: '#0E1116', gap: 12, textDecoration: 'none', flexShrink: 0 }}
      >
        <span style={{
          width: 38, height: 38, borderRadius: 19,
          background: '#0E1116', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {initials}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0E1116' }}>
            {displayName}
          </span>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
            {t('nav.myProfile')} · {tierLabel}
          </span>
        </span>
        <ChevronRight size={18} color="#6B7280" aria-hidden="true" />
      </Link>
    </aside>
  );
}
