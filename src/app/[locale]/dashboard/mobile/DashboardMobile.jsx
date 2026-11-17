'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import useOnline from '@/hooks/useOnline';

import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';
import WeekCalendar from '@/components/mobile/pods/WeekCalendar';
import PodStack from '@/components/mobile/pods/PodStack';
import { CreateSheet, NotifSheet, MessagesSheet, MenuSheet, DaySheet } from '@/components/mobile/pods/Sheets';

// ─── Shared card shadow for white cards on dark body ──────────────────────────
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

// ─── Compact "Folytasd" row card ──────────────────────────────────────────────
function ContinueCard({ title, meta, type, badge, onClick }) {
  const TYPE_COLOR = {
    survey: 'var(--m-survey)',
    quote:  'var(--m-offer)',
    project:'var(--m-project)',
  };
  const accent = TYPE_COLOR[type] || 'var(--m-ink)';
  return (
    <button
      onClick={onClick}
      style={{
        padding: 0, border: 0, textAlign: 'left', cursor: 'pointer', width: '100%',
        borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW,
        display: 'flex', alignItems: 'stretch', overflow: 'hidden',
      }}
      aria-label={title}
    >
      <span style={{ flexShrink: 0, width: 8, background: accent }} />
      <span style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <b style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</b>
          {meta && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{meta}</span>}
        </span>
        {badge && (
          <span style={{
            flexShrink: 0, padding: '0 8px', height: 22, borderRadius: 'var(--radius-pill)',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em',
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--m-neutral-bg)', color: 'var(--m-neutral-text)',
          }}>
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Compact stat card ────────────────────────────────────────────────────────
function StatMini({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: '10px 12px',
      borderRadius: 18,
      background: '#fff',
      boxShadow: CARD_SHADOW,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--m-ink-2)' }}>{sub}</span>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────
function ActivityRow({ icon: Icon, iconBg, iconColor, title, meta, amount, isLast }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--m-line)' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</b>
        {meta && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{meta}</span>}
      </span>
      {amount != null && (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--m-ink)', flexShrink: 0 }}>{amount}</span>
      )}
    </span>
  );
}

// ─── Section header row (title + "Összes →" button) ──────────────────────────
function SectionHeader({ icon, title, onViewAll, tAll }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 20, fontWeight: 700, color: 'var(--m-ink)' }}>
        {icon}
        {title}
      </span>
      <button
        onClick={onViewAll}
        style={{ minHeight: 44, padding: '0 6px', border: 0, background: 'transparent', color: 'var(--m-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        {tAll} →
      </button>
    </span>
  );
}

// ─── Latest list row (compact white card) ────────────────────────────────────
function LatestRow({ title, meta, accent, badge, badgeBg, badgeColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 0, border: 0, textAlign: 'left', cursor: 'pointer', width: '100%',
        borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW,
        display: 'flex', alignItems: 'stretch', overflow: 'hidden',
      }}
    >
      <span style={{ flexShrink: 0, width: 8, background: accent }} />
      <span style={{ flex: 1, minWidth: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <b style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</b>
          {meta && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{meta}</span>}
        </span>
        {badge && (
          <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: badgeBg || 'var(--m-neutral-bg)', color: badgeColor || 'var(--m-neutral-text)', flexShrink: 0 }}>
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Empty state: big coloured create tiles ────────────────────────────────────
function EmptyCreateTile({ color, icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 0, borderRadius: 26, background: color, color: '#fff',
        padding: 14, textAlign: 'left', display: 'flex', alignItems: 'center',
        gap: 14, minHeight: 76, width: '100%', cursor: 'pointer',
      }}
    >
      <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <b style={{ fontSize: 18 }}>{title}</b>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{desc}</span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
    </button>
  );
}

// ─── Empty "createFirst" row (white card, inviting to create) ─────────────────
function CreateFirstRow({ iconBg, iconColor, icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '10px 14px',
        border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 16, fontWeight: 700, cursor: 'pointer',
        boxShadow: CARD_SHADOW,
      }}
    >
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <b>{title}</b>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{desc}</span>
      </span>
    </button>
  );
}

// ─── Invitation / transfer bottom sheet ───────────────────────────────────────
function InvSheet({ invitations, onGoCollectives, onClose, t }) {
  return (
    <div className="pod-sheet" role="dialog" aria-label={t('invListTitle')} style={{
      position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0,
      boxSizing: 'border-box', padding: '10px 16px 18px',
      borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)',
      display: 'flex', flexDirection: 'column', gap: 12,
      maxHeight: '90%', overflowY: 'auto',
    }}>
      <span style={{ alignSelf: 'center', flexShrink: 0, width: 44, height: 5, borderRadius: 3, background: 'var(--m-grab)' }} />
      <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('invListTitle')}</span>
      {invitations.map((inv, i) => (
        <span key={i} style={{ width: '100%', minHeight: 72, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 22, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(14,17,22,.05),0 12px 22px -18px rgba(14,17,22,.35)' }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: 'var(--m-ws-cobalt)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <b>{inv.collective_name}</b>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{t('invitedBy', { name: inv.inviter_name || t('unknown') })}</span>
          </span>
        </span>
      ))}
      <button onClick={onGoCollectives} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-ink)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('openCollectivesBtn')}</button>
      <button onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-sheet-btn)', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('closeBtn')}</button>
    </div>
  );
}

function TransferSheet({ transfers, onGoCollectives, onClose, t }) {
  return (
    <div className="pod-sheet" role="dialog" aria-label={t('trListTitle')} style={{
      position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0,
      boxSizing: 'border-box', padding: '10px 16px 18px',
      borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)',
      display: 'flex', flexDirection: 'column', gap: 12,
      maxHeight: '90%', overflowY: 'auto',
    }}>
      <span style={{ alignSelf: 'center', flexShrink: 0, width: 44, height: 5, borderRadius: 3, background: 'var(--m-grab)' }} />
      <span style={{ fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('trListTitle')}</span>
      {transfers.map((tr, i) => (
        <span key={i} style={{ width: '100%', minHeight: 72, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 22, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(14,17,22,.05),0 12px 22px -18px rgba(14,17,22,.35)' }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: 'var(--m-warn-bg)', color: 'var(--m-warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <b>{tr.document_title}</b>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>{t('requestedBy', { name: tr.requester?.display_name || t('unknown') })}</span>
          </span>
        </span>
      ))}
      <button onClick={onGoCollectives} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-ink)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('trDecision')}</button>
      <button onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: 'var(--m-sheet-btn)', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('closeBtn')}</button>
    </div>
  );
}

// ─── Quote status badge config ────────────────────────────────────────────────
const QUOTE_BADGE = {
  draft:    { bg: 'var(--m-neutral-bg)', color: 'var(--m-neutral-text)' },
  sent:     { bg: 'var(--m-warn-bg)',    color: 'var(--m-warn)' },
  accepted: { bg: 'var(--m-ok-bg)',      color: 'var(--m-ok)' },
  rejected: { bg: 'var(--m-danger-bg)', color: 'var(--m-danger)' },
};

// ─── SVG icons (inline, no dependency) ───────────────────────────────────────
const IcoReceipt = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/></svg>
);
const IcoDiary = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/></svg>
);
const IcoHammer = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3l8.5-8.5M17.5 7L20 9.5M9 7l5 5M2.5 11.5L7 7M14.5 2.5L19 7"/></svg>
);
const IcoRuler = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2"/></svg>
);
const IcoDoc = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5"/></svg>
);
const IcoFolder = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h6l2 2h10v11H3z"/></svg>
);
const IcoPlus = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
);
const IcoActivity = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
);

// ─── Main component ────────────────────────────────────────────────────────────
export default function DashboardMobile({ currentUser }) {
  const tPods = useTranslations('mobilePods');
  const tDash = useTranslations('dashboard');
  const router = useRouter();
  const {
    projects, quotes, surveys, clients, collectives,
    activeCollectiveId, setActiveContext,
    isDemoMode, userCurrency,
    loading, dataReady,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;
  const fmt = (n) => formatMoney(n, userCurrency);

  const [sheet, setSheet] = useState(null); // 'create' | 'notifications' | 'messages' | 'menu' | 'day' | 'inv' | 'tr'
  const [dayData, setDayData] = useState({ date: null, events: [] });

  // Active pod = current active context. Personal = null.
  const [activePodId, setActivePodId] = useState(activeCollectiveId || 'personal');

  // Pending banners
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);

  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/collectives/my-invitations')
      .then(r => r.ok ? r.json() : { invitations: [] })
      .then(d => setPendingInvitations(d.invitations || []))
      .catch(() => {});
    fetch('/api/transfer-requests')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setPendingTransfers(d.requests || []))
      .catch(() => {});
  }, [isDemoMode]);

  // Switch active workspace when pod is tapped
  const handleActivate = useCallback((id) => {
    setActivePodId(id);
    setActiveContext(id === 'personal' ? null : id);
  }, [setActiveContext]);

  // Build workspace list for PodStack
  const workspaces = [
    {
      id: 'personal',
      isPersonal: true,
      name: tPods('personal'),
      sub: tPods('personalSub'),
      surveys:  surveys.filter(s => !s.collective_id),
      quotes:   quotes.filter(q => !q.collective_id),
      projects: projects.filter(proj => !proj.collective_id),
      clients,
      members: [],
      canCreate: true,
    },
    ...(collectives || []).map(col => {
      const memberRole = col.role;
      return {
        id: col.collective_id,
        isPersonal: false,
        name: col.name,
        sub: `${tPods('collective')} · ${memberRole === 'owner' ? tPods('roleOwner') : memberRole === 'admin' ? tPods('roleAdmin') : tPods('roleContributor')}`,
        surveys:  surveys.filter(s => s.collective_id === col.collective_id),
        quotes:   quotes.filter(q => q.collective_id === col.collective_id),
        projects: projects.filter(proj => proj.collective_id === col.collective_id),
        clients,
        members: col.members || [],
        canCreate: memberRole === 'owner' || memberRole === 'admin',
      };
    }),
  ];

  const activePod = workspaces.find(w => w.id === activePodId) || workspaces[0];
  const activeColors = activePod?.isPersonal ? PERSONAL_COLOR : podColor(activePod?.id || '');

  // Build calendar events from projects (deadlines etc.)
  const calendarEvents = (projects || []).flatMap(proj => {
    if (!proj.deadline) return [];
    return [{ date: proj.deadline, title: proj.name, dot: 'var(--m-ws-cobalt)', name: tPods('personal'), time: '' }];
  });

  const openDay = (date, events) => {
    setDayData({ date, events });
    setSheet('day');
  };

  const handleCreateIn = (wsId, cat) => {
    const routes = { survey: '/felmeres/uj', quote: '/ajanlatok/uj', project: '/projektek/uj' };
    if (cat && routes[cat]) {
      setSheet(null);
      router.push(p(routes[cat]));
    } else {
      setSheet('create');
    }
  };

  const online = useOnline();


  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading || !dataReady) {
    return (
      <div className="pod-screen" style={{ padding: '108px 16px 0', minHeight: '100dvh', background: 'var(--m-canvas)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 0].map((_, i) => (
          <div key={i} style={{ borderRadius: 28, overflow: 'hidden' }}>
            <div style={{ height: 72, background: 'rgba(14,17,22,0.1)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            {i === 0 && (
              <div style={{ background: 'rgba(14,17,22,0.06)', padding: '16px' }}>
                {[160, 100, 100].map((h, j) => (
                  <div key={j} style={{ height: h, borderRadius: 22, background: 'rgba(14,17,22,0.08)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${j * 100}ms`, marginBottom: 12 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="pod-screen" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas)', overflowX: 'hidden' }}>
      {/* Fixed top header */}
      <PageHeader
        onMessages={() => setSheet('messages')}
        onNotifications={() => setSheet('notifications')}
        onMenu={() => setSheet('menu')}
        msgCount={0}
        notifCount={pendingInvitations.length + pendingTransfers.length}
      />

      {/* Scrollable body: starts below header (108px), ends above dock (190px) */}
      <div style={{ padding: '108px 16px 190px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Offline banner */}
        {!online && (
          <div style={{ padding: '12px 16px', borderRadius: 20, background: 'var(--m-warn-bg)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--m-warn)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
            </svg>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--m-warn)' }}>{tPods('offlineMsg')}</span>
            <button type="button" onClick={() => window.location.reload()} style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: 'var(--m-warn)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {tPods('offlineRetry')}
            </button>
          </div>
        )}

        {/* Invitation banner (orange card → opens sheet) */}
        {pendingInvitations.length > 0 && (
          <button
            onClick={() => setSheet('inv')}
            style={{
              padding: '12px 14px', border: 0, textAlign: 'left', cursor: 'pointer', width: '100%',
              borderRadius: 26, background: 'var(--m-ws-orange-tint)', color: 'var(--m-ink)',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: CARD_SHADOW,
            }}
          >
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: 'var(--m-ws-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
              <b style={{ fontSize: 15 }}>
                {pendingInvitations.length === 1
                  ? tDash('invitedSingle', { name: pendingInvitations[0].collective_name })
                  : tDash('invitedMultiple', { count: pendingInvitations.length })}
              </b>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>
                {pendingInvitations.length === 1 ? tDash('invitedBy', { name: pendingInvitations[0].inviter_name || tDash('unknown') }) : ''}
              </span>
            </span>
            <span style={{ flexShrink: 0, height: 40, padding: '0 14px', borderRadius: 20, background: 'var(--m-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{tDash('view')}</span>
          </button>
        )}

        {/* Transfer banner (orange card → opens sheet) */}
        {pendingTransfers.length > 0 && (
          <button
            onClick={() => setSheet('tr')}
            style={{
              padding: '12px 14px', border: 0, textAlign: 'left', cursor: 'pointer', width: '100%',
              borderRadius: 26, background: 'var(--m-ws-orange-tint)', color: 'var(--m-ink)',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: CARD_SHADOW,
            }}
          >
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: 'var(--m-ws-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
              <b style={{ fontSize: 15 }}>
                {pendingTransfers.length === 1
                  ? tDash('transferSingle', { title: pendingTransfers[0].document_title })
                  : tDash('transferMultiple', { count: pendingTransfers.length })}
              </b>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-ink-2)' }}>
                {pendingTransfers.length === 1 ? tDash('requestedBy', { name: pendingTransfers[0].requester?.display_name || tDash('unknown') }) : ''}
              </span>
            </span>
            <span style={{ flexShrink: 0, height: 40, padding: '0 14px', borderRadius: 20, background: 'var(--m-ink)', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center' }}>{tDash('view')}</span>
          </button>
        )}

        {/* Weekly calendar */}
        <WeekCalendar events={calendarEvents} onDayPress={openDay} />

        {/* Pod stack (always shown at bottom) */}
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--m-ink-2)', marginTop: 8 }}>
          {tPods('workspacesTitle')}
        </span>
        <PodStack
          workspaces={workspaces}
          activeId={activePodId}
          onActivate={handleActivate}
          onCreateIn={handleCreateIn}
          userCurrency={userCurrency}
        />
      </div>

      {/* Bottom scrim */}
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, height: 150, background: 'linear-gradient(to bottom, rgba(237,235,229,0) 0%, var(--m-canvas) 62%)', pointerEvents: 'none' }} />

      {/* Floating dock */}
      <Dock
        onCreatePress={() => setSheet('create')}
        activePodColor={activeColors}
        activePodName={activePod?.name}
        activeTab="home"
      />

      {/* Sheet scrim */}
      {sheet && (
        <button
          onClick={() => setSheet(null)}
          aria-label={tPods('close')}
          style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.55)', cursor: 'pointer' }}
        />
      )}

      {/* Sheets */}
      {sheet === 'create' && (
        <CreateSheet
          activePod={{ name: activePod?.name, colors: activeColors }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'notifications' && (
        <NotifSheet notifications={[]} onClose={() => setSheet(null)} />
      )}
      {sheet === 'messages' && (
        <MessagesSheet threads={[]} onClose={() => setSheet(null)} />
      )}
      {sheet === 'menu' && (
        <MenuSheet
          profile={currentUser}
          locale={currentUser?.locale}
          currency={userCurrency}
          subscriptionLabel={currentUser?.subscription_tier === 'trial' ? tPods('trial') : currentUser?.subscription_tier === 'premium' ? tPods('premium') : tPods('basic')}
          onLogout={() => { setSheet(null); router.push('/auth/logout'); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'day' && (
        <DaySheet
          events={dayData.events}
          dayTitle={dayData.date?.toLocaleDateString('hu', { weekday: 'long', day: 'numeric', month: 'long' }) || ''}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'inv' && (
        <InvSheet
          invitations={pendingInvitations}
          onGoCollectives={() => { setSheet(null); router.push(p('/kollektivak')); }}
          onClose={() => setSheet(null)}
          t={tDash}
        />
      )}
      {sheet === 'tr' && (
        <TransferSheet
          transfers={pendingTransfers}
          onGoCollectives={() => { setSheet(null); router.push(p('/kollektivak')); }}
          onClose={() => setSheet(null)}
          t={tDash}
        />
      )}
    </div>
  );
}
