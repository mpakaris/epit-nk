'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  FolderKanban, Users, TrendingUp, TrendingDown, CheckCircle2,
  Plus, Coins, Receipt, Hammer, BookOpen, Ruler, FileText,
  UserCheck, Clock, ChevronRight, Mail, UsersRound, ArrowUpRight,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import CalendarWidget from '@/components/CalendarWidget';
import WorkspaceBadge from '@/components/WorkspaceBadge';
import CompactRow from '@/components/mobile/CompactRow';
import WorkspaceSectionHeader from '@/components/mobile/WorkspaceSectionHeader';
import ItemCard from '@/components/mobile/ItemCard';
import useMobile from '@/hooks/useMobile';

const QUOTE_STATUS = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };
const QUOTE_STATUS_COLOR = { draft: 'var(--text-muted)', sent: 'var(--warning-text)', accepted: 'var(--success-text)', rejected: 'var(--danger-text)' };

function SectionHeader({ icon: Icon, title, href, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        {Icon && <Icon size={16} color="var(--accent)" />}
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
        {count != null && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: '0.1rem 0.45rem' }}>{count}</span>}
      </div>
      {href && (
        <Link href={href} style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          Összes <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MobileQuickCards({ cards, router }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {cards.map(({ key, icon: Icon, title, desc, href, color, bg }) => (
        <button
          key={key}
          onClick={() => router.push(href)}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 14px', borderRadius: 'var(--radius-xl)',
            background: bg, border: `1.5px solid ${color}28`,
            cursor: 'pointer', textAlign: 'left', width: '100%', minHeight: 72,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </button>
      ))}
    </div>
  );
}

export default function DashboardClient({
  initialProjects,
  initialInvoices,
  initialLabourEntries,
  initialUsers,
  initialClients,
  initialQuotes,
  initialSurveys,
  currentUser,
  isAdmin,
  isSuperAdmin,
  impersonating,
  effectiveEntityId,
}) {
  const router = useRouter();
  const isMobile = useMobile();
  const {
    projects: _ctxProjects,
    quotes: _ctxQuotes,
    invoices: _ctxInvoices,
    labourEntries: _ctxLabourEntries,
    clients: _ctxClients,
    users: _ctxUsers,
    surveys: _ctxSurveys,
    diaryEntriesByProject,
    dataReady,
    isDemoMode,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const projects      = dataReady ? _ctxProjects      : initialProjects;
  const quotes        = dataReady ? _ctxQuotes        : (initialQuotes || []);
  const invoices      = dataReady ? _ctxInvoices      : initialInvoices;
  const labourEntries = dataReady ? _ctxLabourEntries : initialLabourEntries;
  const clients       = dataReady ? _ctxClients       : (initialClients || []);
  const users         = dataReady ? _ctxUsers         : initialUsers;
  const surveys       = dataReady ? _ctxSurveys       : (initialSurveys || []);

  // Activity feed: merge invoices + labour + diary entries
  const activeInvoices = invoices.filter(i => !i.deleted_at);
  const activityItems = [
    ...activeInvoices.map(i => ({ ...i, _type: 'invoice', _date: i.created_at })),
    ...labourEntries.map(i => ({ ...i, _type: 'labour', _date: i.date || i.created_at })),
    ...Object.values(diaryEntriesByProject || {}).flat().map(i => ({ ...i, _type: 'diary', _date: i.entry_date || i.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);

  const recentProjects = [...projects].slice(0, 4);
  const recentSurveys  = [...surveys].slice(0, 5);
  const recentQuotes   = [...quotes].slice(0, 5);

  const allActiveInvoices = activeInvoices;

  const [pendingInvitations, setPendingInvitations] = useState([]);
  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/collectives/my-invitations')
      .then(r => r.ok ? r.json() : { invitations: [] })
      .then(d => setPendingInvitations(d.invitations || []))
      .catch(() => {});
  }, [isDemoMode]);

  const [pendingTransfers, setPendingTransfers] = useState([]);
  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/transfer-requests')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setPendingTransfers(d.requests || []))
      .catch(() => {});
  }, [isDemoMode]);

  const [combined, setCombined] = useState(null);
  useEffect(() => {
    if (!dataReady) return;
    fetch('/api/workspace/combined', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setCombined(d))
      .catch(() => {});
  }, [dataReady]);


  // ── Mobile home data ──
  const personalSurveys  = combined?.personal?.surveys  || [];
  const personalQuotes   = combined?.personal?.quotes   || [];
  const personalProjects = combined?.personal?.projects || [];
  const sharedSurveys    = combined?.shared?.surveys    || [];
  const sharedQuotes     = combined?.shared?.quotes     || [];
  const sharedProjects   = combined?.shared?.projects   || [];
  const collectiveMeta   = combined?.collectives        || [];

  const allItems = [
    ...personalSurveys.map(s => ({ ...s, _kind: 'felmeres', _date: s.updated_at || s.created_at })),
    ...personalQuotes.map(q  => ({ ...q, _kind: 'ajanlat',  _date: q.updated_at || q.created_at })),
    ...personalProjects.map(p => ({ ...p, _kind: 'projekt',  _date: p.updated_at || p.created_at })),
    ...sharedSurveys.map(s  => ({ ...s, _kind: 'felmeres', _date: s.updated_at || s.created_at })),
    ...sharedQuotes.map(q   => ({ ...q, _kind: 'ajanlat',  _date: q.updated_at || q.created_at })),
    ...sharedProjects.map(p => ({ ...p, _kind: 'projekt',  _date: p.updated_at || p.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date));

  const mostRecent = allItems[0];

  function recentItemCard(item) {
    if (!item) return null;
    const client = (clients || []).find(c => c.id === item.client_id);
    const href   = `${p('/' + (item._kind === 'felmeres' ? 'felmeres' : item._kind === 'ajanlat' ? 'ajanlatok' : 'projektek') + '/' + item.id)}`;
    const status = item._kind === 'felmeres'
      ? (item.status === 'done' ? 'done' : item.status === 'reopened' ? 'reopened' : 'active')
      : item._kind === 'ajanlat' ? (item.status || 'draft')
      : (item.done_at || item.closed_at ? 'kesz' : 'folyamatban');
    return (
      <ItemCard
        href={href}
        title={item.name || item.title}
        clientName={client?.name}
        date={item._date}
        status={status}
        type={item._kind}
        photoUrls={item._preview_urls || []}
        isShared={!!item.collective_id}
        stripHeight={90}
      />
    );
  }

  // Totals across all workspaces (personal + collective)
  const totalSurveys  = personalSurveys.length  + sharedSurveys.length;
  const totalQuotes   = personalQuotes.length   + sharedQuotes.length;
  const totalProjects = personalProjects.length + sharedProjects.length;

  // Empty only when combined data has loaded AND every workspace is empty
  const isEmptyUser = dataReady && combined !== null && totalSurveys === 0 && totalQuotes === 0 && totalProjects === 0;

  // Quick-start cards for document types not yet created in any workspace
  const ALL_QUICK_CARDS = [
    { key: 'felmeres', icon: Ruler,        title: 'Új felmérés', desc: 'Méretek, helyszín és fotók rögzítése helyszínen', href: p('/felmeres/uj'),   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { key: 'ajanlat',  icon: FileText,     title: 'Új ajánlat',  desc: 'Tételek, ár összeállítása, ügyfélnek küldöm',   href: p('/ajanlatok/uj'), color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { key: 'projekt',  icon: FolderKanban, title: 'Új projekt',  desc: 'Számlák, munkadíj és napló egy helyen',          href: p('/projektek/uj'), color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ];
  const quickCards = (dataReady && combined !== null) ? ALL_QUICK_CARDS.filter(c =>
    c.key === 'felmeres' ? totalSurveys  === 0 :
    c.key === 'ajanlat'  ? totalQuotes   === 0 :
                           totalProjects === 0
  ) : [];
  const showQuickStart = quickCards.length > 0;

  return (
    <div className="container page-body">

      {/* ── Pending invitation nudge (mobile + desktop) ── */}
      {pendingInvitations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
          border: '1px solid #c7d2fe',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginTop: 10,
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={17} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a' }}>
                {pendingInvitations.length === 1
                  ? `Meghívtak a(z) „${pendingInvitations[0].collective_name}" kollektívába`
                  : `${pendingInvitations.length} kollektíva meghívód van`}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#3730a3', marginTop: '0.1rem' }}>
                {pendingInvitations.length === 1
                  ? `Meghívó: ${pendingInvitations[0].inviter_name || 'Ismeretlen'}`
                  : pendingInvitations.map(i => i.collective_name).join(', ')}
              </div>
            </div>
            {!isMobile && (
              <Link href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0 }}>
                <UsersRound size={13} /> Megtekintés
              </Link>
            )}
          </div>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
              <Link href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                <UsersRound size={13} /> Megtekintés
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Pending transfer request nudge (collective owners only) ── */}
      {pendingTransfers.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginTop: pendingInvitations.length === 0 ? 10 : 0,
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowUpRight size={17} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#14532d' }}>
                {pendingTransfers.length === 1
                  ? `„${pendingTransfers[0].document_title}" áthelyezési kérelem vár döntésre`
                  : `${pendingTransfers.length} áthelyezési kérelem vár döntésre`}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#166534', marginTop: '0.1rem' }}>
                {pendingTransfers.length === 1
                  ? `Kérelmező: ${pendingTransfers[0].requester?.display_name || 'Ismeretlen'}`
                  : pendingTransfers.map(r => r.requester?.display_name || 'Ismeretlen').join(', ')}
              </div>
            </div>
            {!isMobile && (
              <Link href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', background: '#16a34a', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0 }}>
                <UsersRound size={13} /> Megtekintés
              </Link>
            )}
          </div>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem' }}>
              <Link href={p('/kollektivak')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', background: '#16a34a', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                <UsersRound size={13} /> Megtekintés
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ MOBILE HOME ══════════════════════ */}
      <div className="show-mobile">

        {/* ── All-empty welcome screen ── */}
        {isEmptyUser && (
          <div style={{ paddingTop: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                Hol tartasz most?
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Hozd létre az első dokumentumodat.
              </div>
            </div>
            <MobileQuickCards cards={quickCards} router={router} />
          </div>
        )}

        {/* Weekly calendar — shown always, even on empty state */}
        {!(isSuperAdmin && !impersonating) && (
          <div style={{ marginBottom: 24, marginTop: 24 }}>
            <CalendarWidget projects={projects} clients={clients || []} quotes={quotes || []} />
          </div>
        )}

        {/* Pipeline tiles + recent items */}
        {!isEmptyUser && <>
        {/* ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24, marginTop: 16 }}>
          {[
            { label: 'Felmérés', href: p('/felmeres'), personal: personalSurveys.length, shared: sharedSurveys.length },
            { label: 'Ajánlat',  href: p('/ajanlatok'), personal: personalQuotes.length,  shared: sharedQuotes.length  },
            { label: 'Projekt',  href: p('/projektek'), personal: personalProjects.length, shared: sharedProjects.length },
          ].map(tile => (
            <Link key={tile.label} href={tile.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: '14px 12px',
                boxShadow: 'var(--shadow-card)', minHeight: 140,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {tile.personal + tile.shared}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{tile.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{tile.personal}</span>
                    </div>
                    {tile.shared > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#15803d', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{tile.shared}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Most recently touched item */}
        {mostRecent && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>
              Folytasd
            </div>
            {recentItemCard(mostRecent)}
          </div>
        )}

        {/* Personal recent */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <WorkspaceSectionHeader type="personal" count={personalSurveys.length + personalQuotes.length + personalProjects.length} />
            <Link href={p('/osszes?workspace=personal')} style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', textDecoration: 'none', flexShrink: 0, marginLeft: 12, marginBottom: 12 }}>Mind</Link>
          </div>
          {[...personalSurveys, ...personalQuotes, ...personalProjects]
            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
            .slice(0, 2)
            .map(item => {
              const kind = personalSurveys.find(s => s.id === item.id) ? 'felmeres' : personalQuotes.find(q => q.id === item.id) ? 'ajanlat' : 'projekt';
              const client = (clients || []).find(c => c.id === item.client_id);
              return (
                <CompactRow
                  key={item.id}
                  href={p('/' + (kind === 'felmeres' ? 'felmeres' : kind === 'ajanlat' ? 'ajanlatok' : 'projektek') + '/' + item.id)}
                  title={item.name || item.title}
                  meta={client?.name}
                  type={kind}
                  isShared={false}
                />
              );
            })}
        </div>

        {/* Collectives — last survey, offer, project per collective */}
        {collectiveMeta.map(col => {
          const byDate = (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
          const colSurveys  = sharedSurveys.filter(s => s.collective_id === col.id).sort(byDate);
          const colQuotes   = sharedQuotes.filter(q => q.collective_id === col.id).sort(byDate);
          const colProjects = sharedProjects.filter(proj => proj.collective_id === col.id).sort(byDate);

          const lastSurvey  = colSurveys[0]  || null;
          const lastQuote   = colQuotes[0]   || null;
          const lastProject = colProjects[0] || null;

          if (!lastSurvey && !lastQuote && !lastProject) return null;

          const total = colSurveys.length + colQuotes.length + colProjects.length;

          return (
            <div key={col.id} className="collective-inset-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <WorkspaceSectionHeader type="collective" name={col.name} count={total} />
                <Link href={p(`/osszes?workspace=${col.id}`)} style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', textDecoration: 'none', flexShrink: 0, marginLeft: 12, marginBottom: 12 }}>Mind</Link>
              </div>
              {lastSurvey && (
                <CompactRow
                  key={lastSurvey.id}
                  href={p(`/felmeres/${lastSurvey.id}`)}
                  title={lastSurvey.title}
                  meta={(clients || []).find(c => c.id === lastSurvey.client_id)?.name}
                  type="felmeres"
                  isShared
                />
              )}
              {lastQuote && (
                <CompactRow
                  key={lastQuote.id}
                  href={p(`/ajanlatok/${lastQuote.id}`)}
                  title={lastQuote.title}
                  meta={(clients || []).find(c => c.id === lastQuote.client_id)?.name}
                  type="ajanlat"
                  isShared
                />
              )}
              {lastProject && (
                <CompactRow
                  key={lastProject.id}
                  href={p(`/projektek/${lastProject.id}`)}
                  title={lastProject.name}
                  meta={(clients || []).find(c => c.id === lastProject.client_id)?.name}
                  type="projekt"
                  isShared
                />
              )}
            </div>
          );
        })}
        {/* ── Quick-start cards for missing types (bottom, in order) ── */}
        {showQuickStart && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <MobileQuickCards cards={quickCards} router={router} />
          </div>
        )}
        </>}{/* end !isEmptyUser */}
      </div>
      {/* ══════════════════════ END MOBILE HOME ══════════════════════ */}

      {/* ══════════════════════ DESKTOP DASHBOARD (hidden on mobile) ══════════════════════ */}
      <div className="hide-mobile">
      <div className="page-header">
        <div className="page-header-row">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            Dashboard
            <WorkspaceBadge />
          </h1>
        </div>
      </div>

      {/* Stat cards */}
      {!(isSuperAdmin && !impersonating) && (
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Összesített kiadás" value={formatHUF(allActiveInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0))} sub="Összes projekt forgalma" icon={Coins} href={p('/projektek')} />
          <StatCard label="Aktív projektek" value={projects.length} sub="Építkezések száma" icon={FolderKanban} href={p('/projektek')} />
          <StatCard label="Rögzített számlák" value={allActiveInvoices.length} sub="Bizonylatok száma" icon={Receipt} href={p('/projektek')} />
        </div>
      )}

      {/* Calendar — always below stat cards */}
      {!(isSuperAdmin && !impersonating) && (
        <div style={{ marginBottom: '1.75rem' }}>
          <CalendarWidget projects={projects} clients={clients || []} quotes={quotes || []} />
        </div>
      )}


      {/* Latest activity */}
      <div style={{ marginBottom: '1.75rem' }}>
        <SectionHeader icon={Clock} title="Legújabb aktivitás" count={activityItems.length} />
        {activityItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Még nincs aktivitás.
          </div>
        ) : (
          <div className="card" style={{ padding: '0.35rem 0' }}>
            {activityItems.map((item, idx) => {
              const project = projects.find(p => p.id === item.project_id);
              const isLast = idx === activityItems.length - 1;

              if (item._type === 'invoice') return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Receipt size={15} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || 'Számla bizonylat'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.uploader_name} &bull; {project?.name} &bull; {formatDate(item.created_at)}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{formatHUF(item.value_huf)}</div>
                </div>
              );

              if (item._type === 'labour') return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Hammer size={15} color="var(--success-text)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.labour_type}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{users.find(u => u.id === item.uploaded_by)?.display_name || item.uploader_name || '–'} &bull; {project?.name} &bull; {formatDate(item._date)}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', flexShrink: 0, color: 'var(--success-text)' }}>+{formatHUF(item.value_huf)}</div>
                </div>
              );

              if (item._type === 'diary') return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={15} color="var(--text-secondary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || 'Napló bejegyzés'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{project?.name} &bull; {formatDate(item._date)}</div>
                  </div>
                </div>
              );

              return null;
            })}
          </div>
        )}
      </div>

      {/* Recent projects (preview, link to full list) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <SectionHeader icon={FolderKanban} title="Projektek" href={p('/projektek')} count={projects.length} />
        {recentProjects.length === 0 ? (
          <button onClick={() => router.push(p('/projektek/uj'))} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 16, padding: '28px 24px', width: '100%',
            borderRadius: 'var(--radius-lg)', background: '#ecfdf5',
            border: '1.5px solid #a7f3d0', cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderKanban size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Első projekt létrehozása</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Számlák, munkadíj és napló egy helyen</div>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
              Létrehozás <ChevronRight size={14} />
            </div>
          </button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '1rem' }}>
            {recentProjects.map(project => {
              const projectMemberUsers = users.filter(u => (project.members || []).includes(u.id));
              const fin = calculateProjectFinancials(project, invoices, labourEntries, projectMemberUsers, currentUser?.id);
              return (
                <div key={project.id} className="card card-interactive" onClick={() => router.push(p(`/projektek/${project.id}`))} style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.35rem' }}>{project.name}</div>
                  {project.description && <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{project.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span>{formatHUF(fin.totalCost + fin.totalLabourValue)} teljes költség</span>
                    <span>{fin.projectInvoices.length} db számla</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Surveys + Quotes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <SectionHeader icon={Ruler} title="Legújabb felmérések" href={p('/felmeres')} />
          {recentSurveys.length === 0 ? (
            <button onClick={() => router.push(p('/felmeres/uj'))} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ruler size={17} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Első felmérés létrehozása</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Helyszíni méretek és fotók rögzítése</div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentSurveys.map((s, idx) => (
                <Link key={s.id} href={p(`/felmeres/${s.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < recentSurveys.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.location || '–'} &bull; {formatDate(s.date || s.created_at)}</div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <SectionHeader icon={FileText} title="Legújabb ajánlatok" href={p('/ajanlatok')} />
          {recentQuotes.length === 0 ? (
            <button onClick={() => router.push(p('/ajanlatok/uj'))} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={17} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Első ajánlat létrehozása</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tételek, ár összeállítása, küldés</div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentQuotes.map((q, idx) => {
                const client = (clients || []).find(c => c.id === q.client_id);
                return (
                  <Link key={q.id} href={p(`/ajanlatok/${q.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < recentQuotes.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{q.title}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: QUOTE_STATUS_COLOR[q.status] || 'var(--text-muted)' }}>{QUOTE_STATUS[q.status] || q.status}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{client?.name || '–'} &bull; {formatDate(q.created_at)}</div>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>{/* end hide-mobile */}
    </div>
  );
}
