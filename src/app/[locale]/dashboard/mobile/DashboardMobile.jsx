'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';
import WeekCalendar from '@/components/mobile/pods/WeekCalendar';
import PodStack from '@/components/mobile/pods/PodStack';
import { CreateSheet, NotifSheet, MessagesSheet, MenuSheet, DaySheet } from '@/components/mobile/pods/Sheets';

export default function DashboardMobile({ currentUser }) {
  const t = useTranslations('mobilePods');
  const router = useRouter();
  const {
    projects, quotes, surveys, clients, collectives,
    activeCollectiveId, setActiveContext,
    isDemoMode, userCurrency,
    dataReady,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;
  const fmt = (n) => formatMoney(n, userCurrency);

  const [sheet, setSheet] = useState(null); // 'create' | 'notifications' | 'messages' | 'menu' | 'day'
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
      name: t('personal'),
      sub: t('personalSub'),
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
        sub: `${t('collective')} · ${memberRole === 'owner' ? t('roleOwner') : memberRole === 'admin' ? t('roleAdmin') : t('roleContributor')}`,
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
    return [{ date: proj.deadline, title: proj.name, dot: '#2F5BFF', name: t('personal'), time: '' }];
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

  if (!dataReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--m-canvas)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 60, 70].map((w, i) => (
            <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 8, background: 'rgba(14,17,22,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas)', overflowX: 'hidden' }}>
      {/* Fixed top header */}
      <PageHeader
        onMessages={() => setSheet('messages')}
        onNotifications={() => setSheet('notifications')}
        onMenu={() => setSheet('menu')}
        msgCount={0}
        notifCount={pendingInvitations.length + pendingTransfers.length}
      />

      {/* Scrollable body: starts below header (108px), ends above dock (190px) */}
      <div style={{ paddingTop: 108, paddingBottom: 190, display: 'flex', flexDirection: 'column', gap: 14, padding: '108px 16px 190px' }}>

        {/* Invitation / transfer banners */}
        {pendingInvitations.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #E3EBFF, #EDE7FB)', border: '1px solid #c7d2fe', borderRadius: 20, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 20, background: '#2F5BFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v13H4zM4 4l8 9 8-9"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e3a8a' }}>
                  {pendingInvitations.length === 1
                    ? t('invitedSingle', { name: pendingInvitations[0].collective_name })
                    : t('invitedMultiple', { count: pendingInvitations.length })}
                </div>
                <div style={{ fontSize: 12, color: '#3730a3', marginTop: 2 }}>
                  {pendingInvitations.length === 1 ? t('invitedBy', { name: pendingInvitations[0].inviter_name || t('unknown') }) : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <a href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#2F5BFF', color: '#fff', borderRadius: 20, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>{t('view')}</a>
            </div>
          </div>
        )}

        {pendingTransfers.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #E7F4EC, #D9F2EE)', border: '1px solid #bbf7d0', borderRadius: 20, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 20, background: '#14532d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#14532d' }}>
                  {pendingTransfers.length === 1
                    ? t('transferSingle', { title: pendingTransfers[0].document_title })
                    : t('transferMultiple', { count: pendingTransfers.length })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <a href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#14532d', color: '#fff', borderRadius: 20, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>{t('view')}</a>
            </div>
          </div>
        )}

        {/* Weekly calendar */}
        <WeekCalendar events={calendarEvents} onDayPress={openDay} />

        {/* Pod stack */}
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
          aria-label={t('close')}
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
          subscriptionLabel={currentUser?.subscription_tier === 'trial' ? t('trial') : currentUser?.subscription_tier === 'premium' ? t('premium') : t('basic')}
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
    </div>
  );
}
