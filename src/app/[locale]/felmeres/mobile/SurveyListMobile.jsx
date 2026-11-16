'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { normalizeHU } from '@/lib/utils';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';

const STATUS_COLORS = {
  active:    { bg: '#E7F4EC', fg: '#14532D' },
  done:      { bg: '#E2E8F0', fg: '#0F172A' },
  reopened:  { bg: '#FFF1E0', fg: '#8A4200' },
  inactive:  { bg: '#EEEEEE', fg: '#555555' },
};

function surveyStatus(s) {
  if (s.archived_at)           return 'inactive';
  if (s.status === 'done')     return 'done';
  if (s.status === 'reopened') return 'reopened';
  return 'active';
}

const PHOTO_GRADS = [
  'linear-gradient(135deg,#D8C7B1,#B09A7F)',
  'linear-gradient(135deg,#C9CFDB,#9AA3B5)',
  'linear-gradient(135deg,#BFC8C4,#8FA19B)',
  'linear-gradient(135deg,#D3C8CF,#A593A0)',
];

function SurveyCard({ survey, client, isTeam, onMore }) {
  const t = useTranslations('mobilePods');
  const st = surveyStatus(survey);
  const sc = STATUS_COLORS[st] || STATUS_COLORS.active;
  const photos = (survey._preview_urls || []).length;
  const isPending = survey._pendingTransfer;
  const pendingTo = survey._pendingTo || '';

  return (
    <article style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: '#FFFFFF', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)', opacity: survey.archived_at ? 0.85 : 1 }}>
      {/* Photo strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, height: 72 }}>
        {[0, 1, 2].map(i => {
          const url = (survey._preview_urls || [])[i];
          return (
            <span key={i} style={{
              background: url ? `url(${url}) center/cover` : PHOTO_GRADS[(survey.id.charCodeAt(i % survey.id.length) + i) % PHOTO_GRADS.length],
            }} />
          );
        })}
        {isTeam && (
          <span style={{ position: 'absolute', left: 10, top: 10, height: 26, padding: '0 10px 0 8px', borderRadius: 13, background: '#fff', color: '#166534', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 6px rgba(14,17,22,0.25)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M4 20c0-3 2.7-5 5-5M20 20c0-3-2.7-5-5-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>
            Csapat
          </span>
        )}
        <span style={{ position: 'absolute', right: 10, bottom: 8, height: 24, padding: '0 9px', borderRadius: 12, background: 'rgba(14,17,22,0.78)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          {photos}
        </span>
      </div>

      {/* Card body */}
      <div style={{ boxSizing: 'border-box', padding: '14px 64px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 84 }}>
        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {survey.title}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client?.name ? `${client.name} · ` : ''}{new Date(survey.date || survey.created_at).toLocaleDateString('hu')}
          </span>
          <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: sc.bg, color: sc.fg, flexShrink: 0 }}>
            {t(`filter${st.charAt(0).toUpperCase() + st.slice(1)}`)}
          </span>
        </span>
        {isPending && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2A8C', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 7v5l3 2M3 12a9 9 0 1018 0 9 9 0 10-18 0"/></svg>
            {t('transferPending', { to: pendingTo })}
          </span>
        )}
      </div>

      {/* ⋯ button */}
      <button
        onClick={onMore}
        aria-label={`${t('openAction')}: ${survey.title}`}
        style={{ position: 'absolute', right: 6, top: 76, width: 48, height: 48, border: 0, borderRadius: 24, background: 'transparent', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
      </button>
    </article>
  );
}

function ActionSheet({ survey, isOwner, canTransfer, hasPending, onOpen, onTransfer, onRevoke, onDelete, onClose }) {
  const t = useTranslations('mobilePods');
  return (
    <div role="dialog" aria-label={t('openAction')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{survey?.title}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('surveys', { count: 1 })}</span>
      </div>

      <button onClick={onOpen} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
        <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#F1F1F3', color: '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
        {t('openAction')}
      </button>

      {canTransfer && (
        <button onClick={onTransfer} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#F1F1F3', color: '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M4 20c0-3 2.7-5 5-5M20 20c0-3-2.7-5-5-5"/></svg>
          </span>
          <span style={{ flex: 1 }}>{t('transferAction')}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      )}

      {hasPending && (
        <button onClick={onRevoke} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#F1F1F3', color: '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"/></svg>
          </span>
          {t('revokeAction')}
        </button>
      )}

      {isOwner ? (
        <button onClick={onDelete} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: '#B71C1C', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
          <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
          </span>
          {t('deleteAction')}
        </button>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 4px' }}>{t('deleteOwnerOnly')}</span>
      )}
    </div>
  );
}

function TransferSheet({ survey, collectives, onSend, onClose }) {
  const t = useTranslations('mobilePods');
  const [selected, setSelected] = useState(null);
  const { colors: c } = { colors: PERSONAL_COLOR };

  return (
    <div role="dialog" aria-label={t('transferTitle')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1 }}>{t('transferTitle')}</span>
        <button onClick={onClose} aria-label={t('close')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#4A4F57', lineHeight: 1.4 }}>
        {t('transferInfo', { title: survey?.title || '' })}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(collectives || []).map((col, i) => {
          const color = podColor(col.collective_id || col.id);
          const isOn = selected === (col.collective_id || col.id);
          return (
            <button key={col.collective_id || col.id} onClick={() => setSelected(col.collective_id || col.id)} aria-pressed={isOn}
              style={{ width: '100%', minHeight: 72, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: isOn ? `0 0 0 3px ${color.bg}, 0 1px 0 rgba(14,17,22,0.05)` : '0 1px 0 rgba(14,17,22,0.05)', cursor: 'pointer' }}>
              <span style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 7, background: color.bg }} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span>{col.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{col.role === 'owner' ? 'Tulajdonos' : 'Tag'} · {col.member_count || 0} tag</span>
              </span>
              <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 14, border: `2px solid ${isOn ? color.bg : '#C9C5BA'}`, background: isOn ? color.bg : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isOn && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
              </span>
            </button>
          );
        })}
      </div>
      <button onClick={() => selected && onSend(selected)} style={{ height: 60, border: 0, borderRadius: 30, background: selected ? 'var(--m-ink)' : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: selected ? 'pointer' : 'default' }}>
        {t('sendRequest')}
      </button>
    </div>
  );
}

function DeleteSheet({ survey, isTeam, onConfirm, onClose }) {
  const t = useTranslations('surveys');
  const tM = useTranslations('mobilePods');
  const photoCount = (survey?._preview_urls || []).length;
  return (
    <div role="alertdialog" aria-label={t('deleteConfirmTitle')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700 }}>{t('deleteConfirmTitle')}</span>
      <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45 }}>
        {t('deleteConfirmMessage', { title: survey?.title || '' })}
        {photoCount > 0 && ` ${t('deleteConfirmPhotos', { count: photoCount })}`}
        {isTeam && <b> {t('deleteConfirmExtra')}</b>}
      </span>
      <button onClick={onConfirm} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
        {t('deleteConfirmTitle')}
      </button>
      <button onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
        Mégse
      </button>
    </div>
  );
}

export default function SurveyListMobile() {
  const t = useTranslations('mobilePods');
  const router = useRouter();
  const {
    surveys, clients, collectives,
    deleteSurvey, isDemoMode, currentUser, dataReady,
  } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [activePodId, setActivePodId] = useState('personal');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState(null); // 'menu' | 'notifications' | 'messages'
  const [actionSurvey, setActionSurvey] = useState(null); // { survey, mode: 'action'|'transfer'|'delete' }

  const { outgoingTransfers } = useTransferRequests({ dataReady, isDemoMode });

  const workspaces = useMemo(() => {
    const ws = [
      { id: 'personal', isPersonal: true, name: t('personal'), sub: t('personalSub'), surveys: surveys.filter(s => !s.collective_id) },
      ...(collectives || []).map(col => ({
        id: col.collective_id,
        isPersonal: false,
        name: col.name,
        sub: `${t('collective')} · ${col.role === 'owner' ? t('roleOwner') : col.role === 'admin' ? t('roleAdmin') : t('roleContributor')}`,
        surveys: surveys.filter(s => s.collective_id === col.collective_id),
        canCreate: col.role === 'owner' || col.role === 'admin',
      })),
    ];
    return ws;
  }, [surveys, collectives, t]);

  const activeWs = workspaces.find(w => w.id === activePodId) || workspaces[0];
  const activeColors = activeWs?.isPersonal ? PERSONAL_COLOR : podColor(activeWs?.id || '');

  const filteredSurveys = useMemo(() => {
    const q = normalizeHU(search);
    return (activeWs?.surveys || []).filter(s => {
      const client = clients.find(c => c.id === s.client_id);
      const matchesQ = !q || normalizeHU(s.title).includes(q) || normalizeHU(client?.name || '').includes(q) || normalizeHU(s.location || '').includes(q);
      const st = surveyStatus(s);
      const matchesF = filter === 'all' || st === filter;
      return matchesQ && matchesF;
    });
  }, [activeWs, search, filter, clients]);

  const FILTERS = [
    { key: 'all',      label: t('filterAll') },
    { key: 'active',   label: t('filterActive') },
    { key: 'done',     label: t('filterClosed') },
    { key: 'reopened', label: t('filterReopened') },
    { key: 'inactive', label: t('filterInactive') },
  ];

  const handleDelete = useCallback(async () => {
    if (!actionSurvey?.survey) return;
    try {
      await deleteSurvey(actionSurvey.survey.id);
      setActionSurvey(null);
    } catch (e) {
      setActionSurvey(null);
    }
  }, [actionSurvey, deleteSurvey]);

  const handleSendTransfer = useCallback(async (collectiveId) => {
    if (!actionSurvey?.survey) return;
    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: actionSurvey.survey.id, document_type: 'survey', target_collective_id: collectiveId }),
      });
      if (!res.ok) throw new Error();
    } catch (e) {}
    setActionSurvey(null);
  }, [actionSurvey]);

  const anySheet = sheet || actionSurvey;

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas)' }}>
      {/* Top bar */}
      <PageHeader
        onMessages={() => setSheet('messages')}
        onNotifications={() => setSheet('notifications')}
        onMenu={() => setSheet('menu')}
      />

      {/* Scroll body */}
      <div style={{ paddingTop: 72, paddingBottom: 170, display: 'flex', flexDirection: 'column', gap: 10, padding: '72px 16px 170px' }}>
        {workspaces.map(ws => {
          const isActive = ws.id === activePodId;
          const colors = ws.isPersonal ? PERSONAL_COLOR : podColor(ws.id);
          const { bg, deep, fg, soft, glass, glow } = colors;
          const memberInitials = (ws.members || []).slice(0, 3).map(m => (m.display_name || m.email || '?').slice(0, 2).toUpperCase());

          return (
            <section
              key={ws.id}
              style={{ flexShrink: 0, borderRadius: 28, overflow: 'hidden', background: deep, color: '#fff', boxShadow: '0 24px 40px -24px rgba(14,17,22,0.5)' }}
            >
              {/* Strip */}
              <div style={{ position: 'relative', height: 64, overflow: 'hidden', background: bg, color: fg }}>
                <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -130, width: 280, height: 280, borderRadius: 140, background: glow, pointerEvents: 'none' }} />
                <button
                  onClick={() => !isActive && setActivePodId(ws.id)}
                  aria-label={`${ws.name} ${t('open')}`}
                  aria-pressed={isActive}
                  style={{ position: 'relative', width: '100%', height: 64, boxSizing: 'border-box', padding: '0 16px 0 14px', border: 0, background: 'transparent', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: isActive ? 'default' : 'pointer' }}
                >
                  <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 21, background: glass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ws.isPersonal
                      ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
                      : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>
                    }
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: soft }}>{ws.sub}</span>
                  </span>
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    {memberInitials.map((ini, idx) => (
                      <span key={idx} style={{ width: 30, height: 30, marginLeft: -9, borderRadius: 15, background: '#fff', color: 'var(--m-ink)', border: `2px solid ${bg}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{ini}</span>
                    ))}
                    <span style={{ marginLeft: 8, minWidth: 26, height: 26, padding: '0 8px', boxSizing: 'border-box', borderRadius: 13, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {ws.surveys.length}
                    </span>
                  </span>
                </button>
              </div>

              {/* Expanded body */}
              {isActive && (
                <div style={{ boxSizing: 'border-box', padding: '18px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Top bar: back (goes to dashboard), title, create button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <button onClick={() => router.push(p('/dashboard'))} style={{ height: 48, padding: '0 18px 0 12px', border: 0, borderRadius: 24, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 16px 26px -14px rgba(0,0,0,0.7)', cursor: 'pointer' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
                      {ws.name}
                    </button>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700 }}>{t('surveys')}</span>
                    {ws.canCreate !== false && (
                      <button onClick={() => router.push(p('/felmeres/uj'))} aria-label={t('newSurvey')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <label style={{ position: 'relative', display: 'block' }}>
                    <span style={{ position: 'absolute', left: 18, top: '50%', marginTop: -10, color: '#5A5F68', display: 'flex' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                    </span>
                    <input
                      type="search"
                      aria-label={t('personal')}
                      placeholder="Keresés cím, ügyfél, helyszín alapján…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 28, background: '#fff', paddingLeft: 48, paddingRight: 16, fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }}
                    />
                  </label>

                  {/* Filter chips */}
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                    {FILTERS.map(f => {
                      const isOn = f.key === filter;
                      return (
                        <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={isOn}
                          style={{ height: 44, padding: '0 16px', border: 0, borderRadius: 26, fontSize: 15, fontWeight: 700, background: isOn ? '#fff' : 'rgba(255,255,255,0.14)', color: isOn ? 'var(--m-ink)' : '#fff', flexShrink: 0, cursor: 'pointer' }}>
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Empty state */}
                  {filteredSurveys.length === 0 && (
                    <div style={{ boxSizing: 'border-box', borderRadius: 26, background: '#fff', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)', padding: 22, textAlign: 'center' }}>
                      <b style={{ fontSize: 17 }}>Nincs találat</b>
                      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>Próbáljon más keresési feltételt.</div>
                    </div>
                  )}

                  {/* Survey cards */}
                  {filteredSurveys.map(survey => {
                    const client = clients.find(c => c.id === survey.client_id);
                    const isOwner = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
                    const pendingReq = (outgoingTransfers || []).find(r => r.document_id === survey.id);
                    const surveyWithMeta = {
                      ...survey,
                      _pendingTransfer: !!pendingReq,
                      _pendingTo: pendingReq?.target_collective_name || '',
                    };
                    return (
                      <SurveyCard
                        key={survey.id}
                        survey={surveyWithMeta}
                        client={client}
                        isTeam={!ws.isPersonal}
                        onMore={() => setActionSurvey({ survey: surveyWithMeta, isOwner, canTransfer: ws.isPersonal && isOwner && !pendingReq && (collectives || []).length > 0 && !isDemoMode, hasPending: !!pendingReq, mode: 'action' })}
                      />
                    );
                  })}

                  {/* Personal nudge */}
                  {ws.isPersonal && (
                    <div style={{ boxSizing: 'border-box', padding: '12px 14px', borderRadius: 20, border: '2px dashed rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.86)', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                      Hozz létre egy kollektívát és oszd meg a felméréseidet.
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bottom scrim */}
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, height: 130, background: 'linear-gradient(to top, var(--m-canvas) 55%, rgba(237,235,229,0))', pointerEvents: 'none' }} />

      {/* Dock */}
      <Dock
        onCreatePress={() => router.push(p('/felmeres/uj'))}
        activePodColor={activeColors}
        activePodName={activeWs?.name}
        activeTab="surveys"
      />

      {/* Scrim */}
      {anySheet && (
        <button onClick={() => { setSheet(null); setActionSurvey(null); }} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
      )}

      {/* Top-level sheets */}
      {sheet === 'notifications' && <NotifSheet notifications={[]} onClose={() => setSheet(null)} />}
      {sheet === 'messages' && <MessagesSheet threads={[]} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && <MenuSheet profile={currentUser} onLogout={() => router.push('/auth/logout')} onClose={() => setSheet(null)} />}

      {/* Survey action sheets */}
      {actionSurvey?.mode === 'action' && (
        <ActionSheet
          survey={actionSurvey.survey}
          isOwner={actionSurvey.isOwner}
          canTransfer={actionSurvey.canTransfer}
          hasPending={actionSurvey.hasPending}
          onOpen={() => { router.push(p(`/felmeres/${actionSurvey.survey.id}`)); setActionSurvey(null); }}
          onTransfer={() => setActionSurvey(a => ({ ...a, mode: 'transfer' }))}
          onRevoke={() => { /* revoke logic */ setActionSurvey(null); }}
          onDelete={() => setActionSurvey(a => ({ ...a, mode: 'delete' }))}
          onClose={() => setActionSurvey(null)}
        />
      )}
      {actionSurvey?.mode === 'transfer' && (
        <TransferSheet
          survey={actionSurvey.survey}
          collectives={collectives}
          onSend={handleSendTransfer}
          onClose={() => setActionSurvey(null)}
        />
      )}
      {actionSurvey?.mode === 'delete' && (
        <DeleteSheet
          survey={actionSurvey.survey}
          isTeam={!actionSurvey.survey?.collective_id === false}
          onConfirm={handleDelete}
          onClose={() => setActionSurvey(null)}
        />
      )}
    </div>
  );
}
