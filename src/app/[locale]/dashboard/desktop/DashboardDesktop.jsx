'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import Modal from '@/components/Modal';
import {
  Bell, Plus, X,
  Ruler, FileText, FolderKanban,
  Receipt, Hammer, BookOpen,
  TrendingUp, UsersRound,
  ChevronRight, ArrowRightLeft,
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const QUOTE_STATUS_BADGE = {
  accepted: { background: '#E7F4EC', color: '#14532D' },
  sent:     { background: '#EDE7FB', color: '#4A2796' },
  draft:    { background: '#F0F0F2', color: '#2B3038' },
  rejected: { background: '#FEE2E2', color: '#991B1B' },
};

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function StatCard({ label, value, sub }) {
  return (
    <div className="dk-card" style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="dk-m">{label}</span>
      <span className="dk-n" style={{ fontSize: 30 }}>{value}</span>
      <span className="dk-m" style={{ fontSize: 12 }}>{sub}</span>
    </div>
  );
}

function BannerCard({ icon: Icon, iconBg, title, meta, btnLabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="dk-card"
      style={{
        flex: 1, minWidth: 0, border: 0, padding: '12px 14px',
        background: '#FFF4E5', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span className="dk-ic" style={{ background: iconBg, color: '#fff' }}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <b style={{ fontSize: 15 }}>{title}</b>
        <span className="dk-m">{meta}</span>
      </span>
      <span className="dk-btn dk-btn-dark" style={{ height: 38, fontSize: 14, flexShrink: 0 }}>
        {btnLabel}
      </span>
    </button>
  );
}

function QuickCreateCard({ icon: Icon, title, desc, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="dk-card"
      style={{
        flex: 1, border: 0, padding: 16,
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        boxShadow: 'none', cursor: 'pointer',
      }}
    >
      <span style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={28} aria-hidden="true" />
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <b style={{ fontSize: 19 }}>{title}</b>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{desc}</span>
      </span>
      <ChevronRight size={22} aria-hidden="true" />
    </button>
  );
}

function PreviewSection({ title, titleColor, icon: Icon, viewAllHref, rows }) {
  return (
    <section className="dk-card" style={{ flex: 1, minWidth: 0, padding: '6px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700, color: titleColor }}>
          <Icon size={19} aria-hidden="true" />
          {title}
        </span>
        <Link href={viewAllHref} style={{ border: 0, background: 'transparent', fontSize: 13, fontWeight: 700, color: '#5A5F68', whiteSpace: 'nowrap', textDecoration: 'none' }}>
          Összes →
        </Link>
      </div>
      {rows.map((row, idx) => (
        <button
          key={idx}
          className="dk-sr"
          onClick={row.onClick}
          style={{ minHeight: 62, borderTop: '1px solid #EDEBE5', padding: '0 14px 0 0', gap: 12 }}
        >
          <span style={{ flexShrink: 0, width: 6, alignSelf: 'stretch', background: titleColor, borderRadius: 3, margin: '8px 0 8px 10px' }} />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</b>
            <span className="dk-m">{row.meta}</span>
          </span>
          {row.badge && (
            <span className="dk-badge" style={row.badgeStyle}>{row.badge}</span>
          )}
        </button>
      ))}
    </section>
  );
}

function ActivitySection({ items, t }) {
  if (!items.length) return null;

  function iconFor(type) {
    if (type === 'invoice') return <Receipt size={20} aria-hidden="true" />;
    if (type === 'labour')  return <Hammer   size={20} aria-hidden="true" />;
    return <BookOpen size={20} aria-hidden="true" />;
  }

  return (
    <section className="dk-card" style={{ padding: '6px 0 4px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 8px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700 }}>
        <TrendingUp size={20} aria-hidden="true" />
        {t('latestActivity')}
      </span>
      {items.slice(0, 4).map((item, idx) => (
        <span key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: '1px solid #EDEBE5' }}>
          <span className="dk-ic" style={{ background: '#E3E7EE', color: '#263248' }}>
            {iconFor(item._type)}
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <b style={{ fontSize: 15 }}>
              {item._type === 'invoice' ? (item.description || t('invoiceFallback'))
               : item._type === 'labour' ? (item.labour_type || t('labourFallback'))
               : (item.title || t('diaryFallback'))}
            </b>
            <span className="dk-m">
              {item._type === 'invoice' ? `${formatMoney(item.value_huf, 'HUF')} · ${item._projectName || ''}` : item._projectName || ''}
            </span>
          </span>
          <span className="dk-m">{formatDate(item._date)}</span>
        </span>
      ))}
    </section>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function DashboardDesktop({
  initialProjects,
  initialInvoices,
  initialLabourEntries,
  initialUsers,
  initialClients,
  initialQuotes,
  initialSurveys,
  currentUser: initialUser,
  isAdmin,
  isSuperAdmin,
  impersonating,
}) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const {
    projects: _ctxProjects,
    quotes:   _ctxQuotes,
    invoices: _ctxInvoices,
    labourEntries: _ctxLabourEntries,
    clients:  _ctxClients,
    surveys:  _ctxSurveys,
    diaryEntriesByProject,
    dataReady,
    contextSwitching,
    isDemoMode,
    userCurrency,
    activeCollectiveId,
    collectives,
    currentUser: ctxUser,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;

  const projects      = dataReady ? _ctxProjects      : (initialProjects || []);
  const quotes        = dataReady ? _ctxQuotes        : (initialQuotes   || []);
  const invoices      = dataReady ? _ctxInvoices      : (initialInvoices || []);
  const labourEntries = dataReady ? _ctxLabourEntries : (initialLabourEntries || []);
  const clients       = dataReady ? _ctxClients       : (initialClients  || []);
  const surveys       = dataReady ? _ctxSurveys       : (initialSurveys  || []);
  const user = ctxUser || initialUser;
  const fmt = (n) => formatMoney(n, userCurrency);

  /* workspace label + colors */
  const activeColl = (collectives || []).find(c => c.collective_id === activeCollectiveId);
  const workspaceLabel = activeColl
    ? t('collectiveWorkspace', { name: activeColl.name })
    : t('personalWorkspace');

  /* Override --dk-c (header) and --dk-deep (body bg) with the active workspace colour.
     podColor().deep  = the dark pod-button background used in the sidebar.
     PERSONAL_COLOR.bg = same (#15181E) — matches the existing dashboard default,
     so personal workspace requires no override. */
  const wsStyle = activeCollectiveId
    ? (() => {
        const c = podColor(activeCollectiveId);
        return { '--dk-c': c.deep, '--dk-deep': c.deep };
      })()
    : {};

  /* activity feed */
  const activeInvoices = invoices.filter(i => !i.deleted_at);
  const activityItems = [
    ...activeInvoices.map(i => ({ ...i, _type: 'invoice', _date: i.created_at, _projectName: projects.find(pr => pr.id === i.project_id)?.name || '' })),
    ...labourEntries.map(i => ({ ...i, _type: 'labour',  _date: i.date || i.created_at, _projectName: projects.find(pr => pr.id === i.project_id)?.name || '' })),
    ...Object.values(diaryEntriesByProject || {}).flat().map(i => ({ ...i, _type: 'diary', _date: i.entry_date || i.created_at, _projectName: projects.find(pr => pr.id === i.project_id)?.name || '' })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date));

  /* stats */
  const totalCost = activeInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0);

  /* banners */
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [pendingTransfers,   setPendingTransfers]   = useState([]);

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

  /* new document modal */
  const [newDocOpen, setNewDocOpen] = useState(false);

  /* preview rows */
  const recentProjects = projects.slice(0, 3);
  const recentSurveys  = surveys.slice(0, 3);
  const recentQuotes   = quotes.slice(0, 3);

  const projectRows = recentProjects.map(proj => ({
    title: proj.name,
    meta:  `${(clients || []).find(c => c.id === proj.client_id)?.name || ''} · ${activeInvoices.filter(i => i.project_id === proj.id).length} db számla`,
    onClick: () => router.push(p(`/projektek/${proj.id}`)),
  }));

  const surveyRows = recentSurveys.map(s => ({
    title: s.title,
    meta:  `${(clients || []).find(c => c.id === s.client_id)?.name || ''} · ${formatDate(s.date || s.created_at)}`,
    onClick: () => router.push(p(`/felmeres/${s.id}`)),
  }));

  const QUOTE_STATUS_LABEL = {
    draft:    t('quoteStatus.draft'),
    sent:     t('quoteStatus.sent'),
    accepted: t('quoteStatus.accepted'),
    rejected: t('quoteStatus.rejected'),
  };

  const quoteRows = recentQuotes.map(q => ({
    title: q.title,
    meta:  fmt(q.total_huf || 0),
    onClick: () => router.push(p(`/ajanlatok/${q.id}`)),
    badge: QUOTE_STATUS_LABEL[q.status] || q.status,
    badgeStyle: QUOTE_STATUS_BADGE[q.status] || QUOTE_STATUS_BADGE.draft,
  }));

  return (
    <div className="dk-page dk-mod-dashboard" style={wsStyle}>
      {/* ── Module header ─────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('homeKicker')} · {workspaceLabel}</span>
          <h1 className="dk-h1">{t('greeting', { name: user?.display_name?.split(' ')[0] || '' })}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="dk-btn dk-btn-g"
            style={{ width: 44, padding: 0, justifyContent: 'center' }}
            aria-label={t('notifications')}
          >
            <Bell size={20} aria-hidden="true" />
          </button>
          <button
            className="dk-btn dk-btn-w"
            onClick={() => setNewDocOpen(true)}
          >
            <Plus size={20} aria-hidden="true" />
            {t('newDocument')}
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="dk-body">

        {/* Spinner shown only during workspace switches — sidebar and header stay visible */}
        {contextSwitching && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div className="dk-ws-spinner" />
          </div>
        )}

        {!contextSwitching && <>

        {/* Banners */}
        {(pendingInvitations.length > 0 || pendingTransfers.length > 0) && (
          <div style={{ display: 'flex', gap: 14 }}>
            {pendingInvitations.length > 0 && (
              <BannerCard
                icon={UsersRound}
                iconBg="#FF8A2B"
                title={pendingInvitations.length === 1
                  ? t('invitedSingle', { name: pendingInvitations[0].collective_name })
                  : t('invitedMultiple', { count: pendingInvitations.length })}
                meta={pendingInvitations.length === 1
                  ? t('invitedBy', { name: pendingInvitations[0].inviter_name || t('unknown') })
                  : pendingInvitations.map(i => i.collective_name).join(', ')}
                btnLabel={t('view')}
                onClick={() => router.push(p('/kollektivak'))}
              />
            )}
            {pendingTransfers.length > 0 && (
              <BannerCard
                icon={ArrowRightLeft}
                iconBg="#FF8A2B"
                title={pendingTransfers.length === 1
                  ? t('transferSingle', { title: pendingTransfers[0].document_title })
                  : t('transferMultiple', { count: pendingTransfers.length })}
                meta={pendingTransfers.length === 1
                  ? t('requestedBy', { name: pendingTransfers[0].requester?.display_name || t('unknown') })
                  : pendingTransfers.map(r => r.requester?.display_name || t('unknown')).join(', ')}
                btnLabel={t('view')}
                onClick={() => router.push(p('/kollektivak'))}
              />
            )}
          </div>
        )}

        {/* Quick-create cards */}
        <div style={{ display: 'flex', gap: 14 }}>
          <QuickCreateCard
            icon={Ruler}
            title={t('quickCards.newSurvey')}
            desc={t('quickCards.newSurveyDesc')}
            bg="#0A7F72"
            onClick={() => router.push(p('/felmeres/uj'))}
          />
          <QuickCreateCard
            icon={FileText}
            title={t('quickCards.newQuote')}
            desc={t('quickCards.newQuoteDesc')}
            bg="#6D3FD1"
            onClick={() => router.push(p('/ajanlatok/uj'))}
          />
          <QuickCreateCard
            icon={FolderKanban}
            title={t('quickCards.newProject')}
            desc={t('quickCards.newProjectDesc')}
            bg="#263248"
            onClick={() => router.push(p('/projektek/uj'))}
          />
        </div>

        {/* Stats strip */}
        {!(isSuperAdmin && !impersonating) && (
          <div style={{ display: 'flex', gap: 14 }}>
            <StatCard label={t('statTotalCost')}      value={fmt(totalCost)}         sub={t('statTotalCostSub')} />
            <StatCard label={t('statActiveProjects')} value={projects.length}        sub={t('statActiveProjectsSub')} />
            <StatCard label={t('statInvoices')}       value={activeInvoices.length}  sub={t('statInvoicesSub')} />
          </div>
        )}

        {/* Bottom: 3-col preview grid */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <PreviewSection
            title={t('projectsSection')}
            titleColor="#263248"
            icon={FolderKanban}
            viewAllHref={p('/projektek')}
            rows={projectRows}
          />
          <PreviewSection
            title={t('surveysSection')}
            titleColor="#0A7F72"
            icon={Ruler}
            viewAllHref={p('/felmeres')}
            rows={surveyRows}
          />
          <PreviewSection
            title={t('quotesSection')}
            titleColor="#6D3FD1"
            icon={FileText}
            viewAllHref={p('/ajanlatok')}
            rows={quoteRows}
          />
        </div>

        {/* Activity feed */}
        <ActivitySection items={activityItems} t={t} />

        </>}

      </div>

      {/* ── New document modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={newDocOpen}
        onClose={() => setNewDocOpen(false)}
        title={t('newDocument')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { setNewDocOpen(false); router.push(p('/felmeres/uj')); }}
            style={{ minHeight: 68, border: 0, borderRadius: 22, background: '#0A7F72', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', textAlign: 'left', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Ruler size={26} aria-hidden="true" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span>{t('quickCards.newSurvey')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{t('quickCards.newSurveyDesc')}</span>
            </span>
          </button>
          <button
            onClick={() => { setNewDocOpen(false); router.push(p('/ajanlatok/uj')); }}
            style={{ minHeight: 68, border: 0, borderRadius: 22, background: '#6D3FD1', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', textAlign: 'left', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <FileText size={26} aria-hidden="true" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span>{t('quickCards.newQuote')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{t('quickCards.newQuoteDesc')}</span>
            </span>
          </button>
          <button
            onClick={() => { setNewDocOpen(false); router.push(p('/projektek/uj')); }}
            style={{ minHeight: 68, border: 0, borderRadius: 22, background: '#263248', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', textAlign: 'left', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <FolderKanban size={26} aria-hidden="true" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span>{t('quickCards.newProject')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{t('quickCards.newProjectDesc')}</span>
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
