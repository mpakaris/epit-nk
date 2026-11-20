'use client';

/**
 * P1 — Project list (mobile pods view)
 * Slate-navy header (#263248), parchment body, pod-stack layout.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useTransferRequests } from '@/hooks/useTransferRequests';
import { normalizeHU } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/constants';
import { calculateProjectFinancials } from '@/lib/calculations';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { podColor } from '@/lib/podColor';
import useOnline from '@/hooks/useOnline';

import PageHeader from '@/components/mobile/pods/PageHeader';
import PodList from '@/components/mobile/pods/PodList';
import Dock from '@/components/mobile/pods/Dock';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';

// ─── Project status config ────────────────────────────────────────────────────
function projectStatusStyle(status, t) {
  const s = status || 'active';
  const map = {
    active:  { bg: '#E7F4EC', fg: '#14532D', bar: '#2E9E5B', label: t('statusActive') },
    paused:  { bg: '#FFF1E0', fg: '#8A4200', bar: '#FF8A2B', label: t('statusPaused') },
    closed:  { bg: '#E3E7EE', fg: '#263248', bar: '#8A94A8', label: t('statusClosed') },
    expired: { bg: '#FDECEC', fg: '#9B1C1C', bar: '#D64545', label: t('statusExpired') },
  };
  return map[s] || map.active;
}

const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';
const PROJ_BG = '#263248'; // --m-project

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ProjectSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', height: 108, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, client, spent, quoteTotal, hasPending, pendingToName, t, userCurrency, onOpen, onMore }) {
  const st = projectStatusStyle(project.status, t);
  const isClosed = project.status === 'closed' || project.status === 'expired';
  const progress = quoteTotal > 0 ? Math.min(1, spent / quoteTotal) : null;

  return (
    <article style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: '#FFFFFF', boxShadow: CARD_SHADOW, opacity: isClosed ? 0.88 : 1 }}>
      <div style={{ height: 6, background: st.bar }} />
      <button
        aria-label={`${t('openAction')}: ${project.name}`}
        onClick={onOpen}
        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 64px 12px 16px', border: 0, background: 'transparent', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 88, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {project.name}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {[client?.name, project.location].filter(Boolean).join(' · ')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('spent')}</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 22 }}>{formatMoney(spent, userCurrency)}</span>
          </span>
          <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: st.bg, color: st.fg, flexShrink: 0 }}>
            {st.label}
          </span>
        </span>
        {progress !== null && (
          <div style={{ height: 4, borderRadius: 2, background: '#E3E7EE', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ height: '100%', width: `${(progress * 100).toFixed(1)}%`, background: progress >= 1 ? '#D64545' : st.bar, borderRadius: 2 }} />
          </div>
        )}
        {hasPending && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2A8C', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-6z"/></svg>
            {t('pendingTransfer', { to: pendingToName || '' })}
          </span>
        )}
        {isClosed && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#9B1C1C', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
            {t('readOnly')}
          </span>
        )}
      </button>
      <button
        onClick={e => { e.stopPropagation(); onMore(); }}
        aria-label={t('moreActions')}
        style={{ position: 'absolute', right: 6, top: 20, width: 48, height: 48, border: 0, borderRadius: 24, background: 'transparent', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
      </button>
    </article>
  );
}

// ─── Sheet row ────────────────────────────────────────────────────────────────
function SheetRow({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}
    >
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Action sheet ─────────────────────────────────────────────────────────────
function ActionSheet({ project, canTransfer, hasPending, canDelete, onOpen, onTransfer, onRevoke, onDelete, onClose, t }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && onClose()} />
      <div role="dialog" aria-label={t('openAction')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{project?.name}</span>
        </div>
        <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>} label={t('openAction')} onClick={onOpen} />
        {canTransfer && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>} label={t('transferToCollective')} onClick={onTransfer} />}
        {hasPending && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"/></svg>} label={t('retractTransfer')} onClick={onRevoke} />}
        {canDelete && <SheetRow icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>} label={t('deleteProject')} onClick={onDelete} danger />}
        {!canDelete && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', padding: '0 4px', lineHeight: 1.4 }}>{t('contributorCannotDelete')}</span>}
      </div>
    </>
  );
}

// ─── Delete confirm sheet ─────────────────────────────────────────────────────
function DeleteSheet({ project, isTeam, onConfirm, onClose, t }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && onClose()} />
      <div role="alertdialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</span>
        <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: 'var(--m-ink)' }}>
          {t('deleteConfirmMessage')}
          {isTeam && <strong> {t('deleteTeamWarning')}</strong>}
        </span>
        <button onClick={onConfirm} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('deleteProject')}</button>
        <button onClick={onClose} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('cancel')}</button>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProjectsListMobile() {
  const t     = useTranslations('projects');
  const tPods = useTranslations('mobilePods');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    projects = [], invoices = [], labourEntries = [], clients = [],
    currentUser, loading, dataReady, deleteProject, isDemoMode,
    collectives: userMemberships = [], userCurrency, quotes = [],
    activeCollectiveId, setActiveContext,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [activePodId, setActivePodId] = useState('personal');
  const [podSwitching, setPodSwitching] = useState(false);

  // Always open on personal on mount; if context was collective, reset it silently
  useEffect(() => {
    if (activeCollectiveId !== null && !isDemoMode) {
      setPodSwitching(true);
      setActiveContext(null).catch(() => {}).finally(() => setPodSwitching(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleActivate = useCallback(async (id) => {
    if (id === activePodId || podSwitching) return;
    setActivePodId(id);
    setPodSwitching(true);
    try { await setActiveContext(id === 'personal' ? null : id); } catch { /* non-fatal */ }
    finally { setPodSwitching(false); }
  }, [activePodId, podSwitching, setActiveContext]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterState, setFilterState] = useState('all');
  const [search, setSearch] = useState('');

  const { outgoingTransfers, retractTransfer } = useTransferRequests({ dataReady, isDemoMode });

  const liveProjects = useMemo(() => (projects || []).filter(proj => !proj.deleted_at), [projects]);

  const hasCollectives = (userMemberships || []).length > 0;
  const isPremium = isEffectivePremium(currentUser);
  const personalCount = useMemo(() => liveProjects.filter(pr => !pr.collective_id).length, [liveProjects]);
  const atBasicLimit = !isPremium && personalCount >= 1;

  // Workspace-grouped pods — only the active pod has real data loaded; others show null count
  const workspaces = useMemo(() => [
    {
      id: 'personal', isPersonal: true,
      name: tPods('personal'), sub: tPods('personalSub'),
      projects: liveProjects.filter(pr => !pr.collective_id),
      count: activePodId === 'personal' ? liveProjects.filter(pr => !pr.collective_id).length : null,
      canCreate: !atBasicLimit,
    },
    ...(userMemberships || []).map(col => ({
      id: col.collective_id,
      isPersonal: false,
      name: col.name,
      sub: `${tPods('collective')} · ${col.role === 'owner' ? tPods('roleOwner') : col.role === 'admin' ? tPods('roleAdmin') : tPods('roleContributor')}`,
      projects: liveProjects.filter(pr => pr.collective_id === col.collective_id),
      count: activePodId === col.collective_id ? liveProjects.filter(pr => pr.collective_id === col.collective_id).length : null,
      canCreate: col.role === 'owner' || col.role === 'admin',
    })),
  ], [liveProjects, userMemberships, atBasicLimit, tPods, activePodId]);

  const getMemberRole = useCallback((project) => {
    if (!project?.collective_id) return null;
    const mem = (userMemberships || []).find(m => m.collective_id === project.collective_id);
    return mem?.role || null;
  }, [userMemberships]);

  const getSpent = useCallback((project) => {
    const projInvoices = invoices.filter(inv => inv.project_id === project.id && !inv.deleted_at);
    const projLabour = labourEntries.filter(le => le.project_id === project.id && !le.deleted_at);
    return projInvoices.reduce((s, inv) => s + Number(inv.value_huf || 0), 0)
      + projLabour.reduce((s, le) => s + Number(le.value_huf || 0), 0);
  }, [invoices, labourEntries]);

  const getQuoteTotal = useCallback((project) => {
    if (!project.quote_id) return 0;
    const q = quotes.find(q => q.id === project.quote_id);
    if (!q) return 0;
    return (q.total_net || 0) * (1 + (q.vat_percent ?? 27) / 100);
  }, [quotes]);

  const openMore = useCallback((project) => {
    const pending = outgoingTransfers.find(r => r.document_id === project.id);
    setSelectedProject({ ...project, _pendingReq: pending, _hasPending: !!pending });
    setActiveSheet('action');
  }, [outgoingTransfers]);

  const handleOpen = useCallback(() => {
    if (!selectedProject) return;
    setActiveSheet(null);
    router.push(p(`/projektek/${selectedProject.id}`));
  }, [selectedProject, router, p]);

  const handleTransfer = useCallback(() => {
    setActiveSheet(null);
    router.push(p(`/projektek/${selectedProject?.id}`));
  }, [selectedProject, router, p]);

  const handleRevoke = useCallback(async () => {
    if (!selectedProject?._pendingReq) return;
    setActiveSheet(null);
    await retractTransfer(selectedProject._pendingReq.id);
  }, [selectedProject, retractTransfer]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedProject) return;
    setActiveSheet(null);
    await deleteProject(selectedProject.id);
  }, [selectedProject, deleteProject]);

  const FILTERS = ['all', 'open', 'closed'];
  const filterLabels = { all: t('filterAll'), open: t('filterOpen'), closed: t('filterClosed') };

  const memberRole = selectedProject ? getMemberRole(selectedProject) : null;
  const isOwner = selectedProject ? (selectedProject.owner_id === currentUser?.id || selectedProject.created_by === currentUser?.id) : false;
  const isKollektivOwner = memberRole === 'owner' || memberRole === 'admin';
  const canDelete = isOwner || isKollektivOwner;
  const canTransfer = isOwner && !selectedProject?.collective_id && hasCollectives && !isDemoMode && !selectedProject?._hasPending;
  const isTeam = !!selectedProject?.collective_id;

  const isLoading = loading || !dataReady;

  return (
    <div className="pod-screen m-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas, #EDEBE5)', color: 'var(--m-ink, #0E1116)', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)', overflowX: 'hidden' }}>
      <PageHeader
        onMenu={() => setActiveSheet('menu')}
        onMessages={() => setActiveSheet('messages')}
        onNotifications={() => setActiveSheet('notif')}
      />

      {/* paddingTop 108px clears the 100px PageHeader */}
      <div style={{ padding: '108px 16px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {!isOnline && (
          <div style={{ padding: '10px 16px', borderRadius: 20, background: '#B71C1C', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
            {t('offlineBanner')}
          </div>
        )}

        <PodList
          workspaces={workspaces}
          activeId={activePodId}
          onActivate={handleActivate}
          loadingId={podSwitching ? activePodId : null}
          moduleLabel={t('pageTitle')}
          onBack={() => router.push(p('/dashboard'))}
          renderBody={(ws) => {
            const q = normalizeHU(search);
            const wsFiltered = (ws.projects || []).filter(proj => {
              const matchFilter = filterState === 'all'
                ? true
                : filterState === 'open'
                  ? (!proj.status || proj.status === 'active' || proj.status === 'paused')
                  : (proj.status === 'closed' || proj.status === 'expired');
              const client = clients.find(c => c.id === proj.client_id);
              const matchSearch = !q || normalizeHU(proj.name || '').includes(q) || normalizeHU(client?.name || '').includes(q);
              return matchFilter && matchSearch;
            });
            return (
              <>
                {/* Basic limit banner inside personal pod */}
                {ws.isPersonal && atBasicLimit && (
                  <div style={{ padding: '12px 14px', borderRadius: 20, background: '#FFF1E0', color: '#6B3300', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                    {t('basicLimitReached')} — <button onClick={() => router.push(p('/elofizetes'))} style={{ background: 'none', border: 0, padding: 0, color: '#E65C00', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>{t('upgradeToCreate')}</button>
                  </div>
                )}

                {/* Search */}
                <label style={{ position: 'relative', display: 'block' }}>
                  <span style={{ position: 'absolute', left: 18, top: '50%', marginTop: -10, color: '#5A5F68', display: 'flex' }} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 11a7 7 0 1014 0 7 7 0 10-14 0M20 20l-4-4"/></svg>
                  </span>
                  <input type="search" aria-label={t('searchPlaceholder')} placeholder={t('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 28, background: '#fff', paddingLeft: 48, paddingRight: 16, fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 }}
                  />
                </label>

                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {FILTERS.map(f => {
                    const on = filterState === f;
                    return (
                      <button key={f} onClick={() => setFilterState(f)} aria-pressed={on}
                        style={{ height: 44, padding: '0 16px', border: 0, borderRadius: 26, fontSize: 15, fontWeight: 700, background: on ? '#fff' : 'rgba(255,255,255,0.14)', color: on ? 'var(--m-ink)' : '#fff', flexShrink: 0, cursor: 'pointer' }}>
                        {filterLabels[f]}
                      </button>
                    );
                  })}
                </div>

                {/* Body */}
                {isLoading ? <ProjectSkeleton /> : wsFiltered.length === 0 ? (
                  <div style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', padding: 22, textAlign: 'center' }}>
                    <b style={{ fontSize: 17, color: '#fff' }}>{search || filterState !== 'all' ? t('noProjectsSearch') : t('noProjectsEmpty')}</b>
                    {!search && filterState === 'all' && (
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{t('noProjectsEmptyCreate')}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {wsFiltered.map(project => {
                      const client  = clients.find(c => c.id === project.client_id);
                      const pending = outgoingTransfers.find(r => r.document_id === project.id);
                      return (
                        <ProjectCard key={project.id} project={project} client={client} spent={getSpent(project)} quoteTotal={getQuoteTotal(project)} hasPending={!!pending} pendingToName={pending?.collective_name || ''} t={t} userCurrency={userCurrency} onOpen={() => router.push(p(`/projektek/${project.id}`))} onMore={() => openMore(project)} />
                      );
                    })}
                  </div>
                )}
              </>
            );
          }}
        />
      </div>

      <Dock
        activeTab="projects"
        onCreatePress={() => router.push(p('/projektek/uj'))}
        activePodColor={{ plusBg: '#263248', plusFg: '#FFFFFF' }}
      />

      {/* Sheets */}
      {activeSheet === 'action' && selectedProject && (
        <ActionSheet
          project={selectedProject}
          canTransfer={canTransfer}
          hasPending={selectedProject._hasPending}
          canDelete={canDelete}
          onOpen={handleOpen}
          onTransfer={handleTransfer}
          onRevoke={handleRevoke}
          onDelete={() => setActiveSheet('delete')}
          onClose={() => setActiveSheet(null)}
          t={t}
        />
      )}
      {activeSheet === 'delete' && selectedProject && (
        <DeleteSheet
          project={selectedProject}
          isTeam={isTeam}
          onConfirm={handleDeleteConfirm}
          onClose={() => setActiveSheet('action')}
          t={t}
        />
      )}
      {activeSheet === 'notif'    && <NotifSheet    onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'messages' && <MessagesSheet onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'menu'     && <MenuSheet     onClose={() => setActiveSheet(null)} />}
    </div>
  );
}
