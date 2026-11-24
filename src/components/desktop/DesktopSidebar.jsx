'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import {
  LayoutDashboard, Ruler, FileText, FolderKanban, BookUser,
  MessageSquare, Calendar, Package, Globe,
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
  katalogus:  '#2A2F3A',
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
  const {
    currentUser,
    collectives,
    activeCollectiveId,
    setActiveContext,
    projects,
    quotes,
    surveys,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const moduleKey = getModuleKey(pathname.replace('/demo/', '/').replace('/demo', ''));
  const activeColor = MODULE_ACTIVE_COLOR[moduleKey] || '#2A2F3A';

  const totalDocs = (projects?.length || 0) + (quotes?.length || 0) + (surveys?.length || 0);

  const tier = currentUser?.subscription_tier || 'basic';
  const tierLabel = t(`tierLabels.${tier}`, { defaultValue: tier });
  const displayName = currentUser?.display_name || currentUser?.email || '';
  const initials = getInitials(displayName);

  function switchWorkspace(collectiveId) {
    setActiveContext(collectiveId);
  }

  const docNavItems = [
    { key: 'felmeres',  href: `${navPrefix}/felmeres`,  icon: Ruler,         label: t('nav.surveys')  },
    { key: 'ajanlatok', href: `${navPrefix}/ajanlatok`, icon: FileText,      label: t('nav.quotes')   },
    { key: 'projektek', href: `${navPrefix}/projektek`, icon: FolderKanban,  label: t('nav.projects') },
    { key: 'ugyfelek',  href: `${navPrefix}/ugyfelek`,  icon: BookUser,      label: t('nav.clients')  },
  ];

  const workNavItems = [
    // { key: 'uzenetek',   href: `${navPrefix}/uzenetek`,   icon: MessageSquare, label: t('nav.messages')    },
    { key: 'naptar',     href: `${navPrefix}/naptar`,     icon: Calendar,      label: t('nav.calendar')    },
    { key: 'katalogus',  href: `${navPrefix}/katalogus`,  icon: Package,       label: t('nav.catalogue')   },
    { key: 'weboldalam', href: `${navPrefix}/weboldalam`, icon: Globe,         label: t('nav.website')     },
    { key: 'kollektivak',  href: `${navPrefix}/kollektivak`,  icon: UsersRound,  label: t('nav.collectives')  },
    { key: 'elofizetes',   href: `${navPrefix}/elofizetes`,   icon: CreditCard,  label: t('nav.subscription') },
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

      {/* Workspace pods */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="dk-sl">{t('workspaces')}</span>

        {/* Personal pod */}
        <button
          className="dk-pod"
          onClick={() => switchWorkspace(null)}
          style={{
            background: PERSONAL_COLOR.bg,
            boxShadow: !activeCollectiveId ? 'inset 0 0 0 2px #fff' : 'none',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 5, background: PERSONAL_COLOR.deep, flexShrink: 0 }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('personal')}
          </span>
          {!activeCollectiveId && (
            <span className="dk-badge" style={{ background: '#fff', color: '#0E1116', height: 22, padding: '0 8px', fontSize: 11 }}>
              {totalDocs}
            </span>
          )}
        </button>

        {/* Collective pods */}
        {(collectives || []).map(col => {
          const colors = podColor(col.collective_id);
          const isActive = activeCollectiveId === col.collective_id;
          return (
            <button
              key={col.collective_id}
              className="dk-pod"
              onClick={() => switchWorkspace(col.collective_id)}
              style={{
                background: colors.deep,
                boxShadow: isActive ? 'inset 0 0 0 2px #fff' : 'none',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 5, background: colors.bg, flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {col.name}
              </span>
              {isActive && (
                <span className="dk-badge" style={{ background: '#fff', color: '#0E1116', height: 22, padding: '0 8px', fontSize: 11 }}>
                  {totalDocs}
                </span>
              )}
            </button>
          );
        })}
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
        href={`${navPrefix}/profil`}
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
