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
  UserCheck, Clock, ChevronRight, Mail, UsersRound,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import CalendarWidget from '@/components/CalendarWidget';
import WorkspaceBadge from '@/components/WorkspaceBadge';

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


  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            Dashboard
            <WorkspaceBadge />
          </h1>
        </div>
      </div>

      {/* Pending invitation nudge */}
      {pendingInvitations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
          border: '1px solid #c7d2fe',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        }}>
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
          <Link
            href={p('/kollektivak')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', flexShrink: 0 }}
          >
            <UsersRound size={13} /> Megtekintés
          </Link>
        </div>
      )}

      {/* Stat cards */}
      {!(isSuperAdmin && !impersonating) && (
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Összesített kiadás" value={formatHUF(allActiveInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0))} sub="Összes projekt forgalma" icon={Coins} href={p('/projektek')} />
          <StatCard label="Aktív projektek" value={projects.length} sub="Építkezések száma" icon={FolderKanban} href={p('/projektek')} />
          <StatCard label="Rögzített számlák" value={allActiveInvoices.length} sub="Bizonylatok száma" icon={Receipt} href={p('/projektek')} />
        </div>
      )}

      {/* Calendar */}
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
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Még nincs projekt.
          </div>
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
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Még nincs felmérés.</div>
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
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Még nincs ajánlat.</div>
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
    </div>
  );
}
