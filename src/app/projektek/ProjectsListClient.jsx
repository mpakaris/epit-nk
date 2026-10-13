'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  FolderKanban, Users, TrendingUp, TrendingDown, CheckCircle2,
  Plus, AlertCircle, Coins, Receipt, ArrowUpRight, Hammer,
  BookOpen, Ruler, FileText, UserCheck, Clock, ChevronRight,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import CalendarWidget from '@/components/CalendarWidget';
import Modal from '@/components/Modal';
import EntitySelector from '@/components/EntitySelector';
import ClientSelect from '@/components/ClientSelect';

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

export default function ProjectsListClient({
  initialProjects,
  initialInvoices,
  initialLabourEntries,
  initialUsers,
  initialClients,
  initialQuotes,
  currentUser,
  isAdmin,
  isSuperAdmin,
  impersonating,
  effectiveEntityId,
}) {
  const router = useRouter();
  const { createClient: ctxCreateClient, invoices: ctxInvoices, users: ctxUsers, surveys, diaryEntriesByProject, effectiveMemberships } = useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [projClientId, setProjClientId] = useState('');
  const [projLinkedQuoteId, setProjLinkedQuoteId] = useState('');
  const [projEntityId, setProjEntityId] = useState(null); // entity selector override
  const [memberIds, setMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddr, setNewClientAddr] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const activeCreateEntityId = projEntityId || effectiveEntityId;

  // When impersonating, pre-select the impersonated user as "me", not the SA
  const effectiveCurrentUserId = impersonating?.id ?? currentUser?.id;

  const openCreate = () => {
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd('');
    setProjClientId(''); setProjLinkedQuoteId(''); setProjEntityId(null);
    setMemberIds(effectiveCurrentUserId ? [effectiveCurrentUserId] : []);
    setError('');
    setShowNewClient(false);
    setShowCreate(true);
  };

  const handleQuoteLink = (quoteId) => {
    setProjLinkedQuoteId(quoteId);
    if (!quoteId) return;
    const q = (initialQuotes || []).find(x => x.id === quoteId);
    if (!q) return;
    // Inherit entity from quote
    if (q.entity_id) setProjEntityId(q.entity_id);
    // Pre-seed members from quote's shared_with (always include current user)
    const seed = [...new Set([
      ...(effectiveCurrentUserId ? [effectiveCurrentUserId] : []),
      ...(q.shared_with || []),
    ])];
    setMemberIds(seed);
    // Also pre-fill client
    if (q.client_id && !projClientId) setProjClientId(q.client_id);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const c = await ctxCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddr.trim(), entityId: activeCreateEntityId });
      setProjClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddr('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!projClientId) { setError('Ügyfél megadása kötelező!'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projName, description: projDesc, memberIds, startDate: projStart || null, endDate: projEnd || null, clientId: projClientId || null, entityId: activeCreateEntityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a projekt létrehozásakor');
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (uid) => setMemberIds(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  const canCreate = currentUser && !(isSuperAdmin && !impersonating);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Activity feed: merge invoices + labour + diary entries
  const activeInvoices = initialInvoices.filter(i => !i.deleted_at);
  const activityItems = [
    ...activeInvoices.map(i => ({ ...i, _type: 'invoice', _date: i.created_at })),
    ...initialLabourEntries.map(i => ({ ...i, _type: 'labour', _date: i.date || i.created_at })),
    ...Object.values(diaryEntriesByProject || {}).flat().map(i => ({ ...i, _type: 'diary', _date: i.entry_date || i.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);

  // Projects split
  const myProjects = initialProjects.filter(p => p.created_by === currentUser?.id);
  const invitedProjects = initialProjects.filter(p => p.created_by !== currentUser?.id);

  // Surveys — use AppContext (entity-scoped, sorted by date desc)
  const recentSurveys = (surveys || []).slice(0, 5);

  // Quotes
  const recentQuotes = [...(initialQuotes || [])].slice(0, 5);

  // Admin stats
  const allActiveInvoices = (ctxInvoices || []).filter(i => !i.deleted_at);
  const recentlyDeleted = (ctxInvoices || [])
    .filter(i => i.deleted_at)
    .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    .slice(0, 3);

  // ── Project card renderer ─────────────────────────────────────────────────────
  const renderProjectCard = (project, showCreator = false) => {
    const projectMemberUsers = initialUsers.filter(u => (project.members || []).includes(u.id));
    const fin = calculateProjectFinancials(project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser?.id);
    const creator = showCreator ? initialUsers.find(u => u.id === project.created_by) : null;

    return (
      <div
        key={project.id}
        className="card card-interactive"
        onClick={() => router.push(`/projektek/${project.id}`)}
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>{project.name}</h3>
            {creator && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '0.15rem 0.5rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <UserCheck size={10} />{creator.display_name}
              </span>
            )}
          </div>

          {project.description && (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              {project.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            <Users size={13} color="var(--accent)" />
            <span>{fin.memberCount} résztvevő</span>
          </div>

          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Összköltség</div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }} className="text-mono">{formatHUF(fin.totalCost)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rád eső rész</div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="text-mono">{formatHUF(fin.equalShare)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Általad fizetve</div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent)' }} className="text-mono">{formatHUF(fin.ownPaid)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
          <div>
            {fin.balance > 0
              ? <span className="balance-pill positive"><TrendingUp size={12} /><span>+{formatHUF(fin.balance)} túlfizetés</span></span>
              : fin.balance < 0
                ? <span className="balance-pill negative"><TrendingDown size={12} /><span>{formatHUF(fin.balance)} tartozás</span></span>
                : <span className="balance-pill neutral"><CheckCircle2 size={12} /><span>Rendezett</span></span>
            }
          </div>
          <Link
            href={`/projektek/${project.id}/feltoltes`}
            className="btn btn-primary btn-sm"
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}
            onClick={e => e.stopPropagation()}
          >
            <Plus size={13} /> Hozzáadás
          </Link>
        </div>
      </div>
    );
  };

  const activeMembership = (effectiveMemberships || []).find(m => m.entity_id === effectiveEntityId);
  const isPersonalContext = activeMembership?.entity_type === 'personal';

  return (
    <div className="container">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {activeMembership
                ? isPersonalContext
                  ? 'Személyes munkaterület'
                  : `Kollektíva: ${activeMembership.entity_name}`
                : 'Projektek, egyenleg és áttekintés'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canCreate && (
              <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
                <Plus size={15} /> Új Projekt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Admin stat cards ────────────────────────────────────────────────── */}
      {isAdmin && !(isSuperAdmin && !impersonating) && (
        <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Összesített kiadás" value={formatHUF(allActiveInvoices.reduce((s, i) => s + Number(i.value_huf || 0), 0))} sub="Összes projekt forgalma" icon={Coins} href="/admin/projektek" />
          <StatCard label="Aktív projektek" value={initialProjects.length} sub="Építkezések száma" icon={FolderKanban} href="/admin/projektek" />
          <StatCard label="Felhasználók" value={(ctxUsers || []).filter(u => !u.deleted_at).length} sub="Aktív tagok" icon={Users} href="/admin/felhasznalok" />
          <StatCard label="Rögzített számlák" value={allActiveInvoices.length} sub="Bizonylatok száma" icon={Receipt} href="/admin/projektek" />
        </div>
      )}

      {/* ── Calendar ────────────────────────────────────────────────────────── */}
      {!(isSuperAdmin && !impersonating) && (
        <div style={{ marginBottom: '1.75rem' }}>
          <CalendarWidget
            projects={initialProjects}
            clients={initialClients || []}
            quotes={initialQuotes || []}
          />
        </div>
      )}

      {/* ── Section 1: Latest Activity ─────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <SectionHeader icon={Clock} title="Legújabb aktivitás" count={activityItems.length} />
        {activityItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Még nincs aktivitás.
          </div>
        ) : (
          <div className="card" style={{ padding: '0.35rem 0' }}>
            {activityItems.map((item, idx) => {
              const project = initialProjects.find(p => p.id === item.project_id);
              const isLast = idx === activityItems.length - 1;

              if (item._type === 'invoice') {
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={15} color="var(--accent)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || 'Számla bizonylat'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {item.uploader_name} &bull; {project?.name} &bull; {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', flexShrink: 0, color: 'var(--text-primary)' }}>
                      {formatHUF(item.value_huf)}
                    </div>
                  </div>
                );
              }

              if (item._type === 'labour') {
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hammer size={15} color="var(--success-text)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.labour_type}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {initialUsers.find(u => u.id === item.uploaded_by)?.display_name || item.uploader_name || '–'} &bull; {project?.name} &bull; {formatDate(item._date)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', flexShrink: 0, color: 'var(--success-text)' }}>
                      +{formatHUF(item.value_huf)}
                    </div>
                  </div>
                );
              }

              if (item._type === 'diary') {
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={15} color="var(--text-secondary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title || 'Napló bejegyzés'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {project?.name} &bull; {formatDate(item._date)}
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Projects ────────────────────────────────────────────── */}
      {initialProjects.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <SectionHeader icon={FolderKanban} title="Projektek" count={initialProjects.length} />

          {myProjects.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Általam létrehozva
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
                {myProjects.map(p => renderProjectCard(p, false))}
              </div>
            </div>
          )}

          {invitedProjects.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Meghívottként
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
                {invitedProjects.map(p => renderProjectCard(p, true))}
              </div>
            </div>
          )}

          {initialProjects.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <FolderKanban size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem' }}>Nincsenek elérhető projektek</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', fontSize: '0.875rem' }}>
                Még nem hoztak létre projektet, vagy nem adtak hozzá egyikhez sem.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3 & 4: Felmérések + Ajánlatok ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>

        {/* Felmérések */}
        <div className="card">
          <SectionHeader icon={Ruler} title="Legújabb felmérések" href="/felmeres" />
          {recentSurveys.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Még nincs felmérés.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recentSurveys.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/felmeres/${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < recentSurveys.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {s.location || '–'} &bull; {formatDate(s.date || s.created_at)}
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ajánlatok */}
        <div className="card">
          <SectionHeader icon={FileText} title="Legújabb ajánlatok" href="/ajanlatok" />
          {recentQuotes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Még nincs ajánlat.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recentQuotes.map((q, idx) => {
                const client = (initialClients || []).find(c => c.id === q.client_id);
                return (
                  <Link
                    key={q.id}
                    href={`/ajanlatok/${q.id}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: idx < recentQuotes.length - 1 ? '1px solid var(--border-subtle)' : 'none', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: QUOTE_STATUS_COLOR[q.status] || 'var(--text-muted)' }}>
                          {QUOTE_STATUS[q.status] || q.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {client?.name || '–'} &bull; {formatDate(q.created_at)}
                      </div>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create project modal ────────────────────────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Új projekt létrehozása">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <EntitySelector value={activeCreateEntityId} onChange={setProjEntityId} memberships={effectiveMemberships} />
          <div className="form-group">
            <label className="form-label" htmlFor="mp-name">Projekt neve *</label>
            <input id="mp-name" type="text" className="form-control" required autoFocus value={projName} onChange={e => setProjName(e.target.value)} placeholder="pl. Balatoni Nyaraló Felújítás" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-desc">Leírás</label>
            <textarea id="mp-desc" rows={2} className="form-control" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Rövid leírás…" />
          </div>

          {(initialQuotes || []).length > 0 && (
            <div className="form-group">
              <label className="form-label">Kapcsolódó ajánlat (opcionális)</label>
              <select
                className="form-control"
                value={projLinkedQuoteId}
                onChange={e => handleQuoteLink(e.target.value)}
              >
                <option value="">– Nincs kapcsolódó ajánlat –</option>
                {(initialQuotes || []).map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              {projLinkedQuoteId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                  ✓ Tagok előre töltve az ajánlat résztvevőiből
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Megrendelő *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <ClientSelect value={projClientId} onChange={e => setProjClientId(e.target.value)} clients={initialClients || []} style={{ flex: 1, borderColor: !projClientId ? 'var(--warning-border)' : undefined }} />
              <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => { setNewClientError(''); setShowNewClient(v => !v); }}>
                <Plus size={14} /> Új ügyfél
              </button>
            </div>
            {projClientId && (
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem' }}>
                ✓ {(initialClients || []).find(c => c.id === projClientId)?.name}
              </div>
            )}
          </div>

          {showNewClient && (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
              {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.55rem' }}>{newClientError}</div>}
              <form onSubmit={handleCreateClient}>
                <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Pl. Horváth Béla" autoFocus /></div>
                <div className="grid-2col">
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddr} onChange={e => setNewClientAddr(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creatingClient}>{creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid-2col">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-start">Kezdés</label>
              <input id="mp-start" type="date" className="form-control" value={projStart} onChange={e => setProjStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-end">Befejezés</label>
              <input id="mp-end" type="date" className="form-control" min={projStart || undefined} value={projEnd} onChange={e => setProjEnd(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
            <label className="form-label">Résztvevők</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
              {initialUsers.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 'var(--radius-sm)', cursor: u.id === currentUser?.id ? 'default' : 'pointer', fontSize: '0.825rem', minWidth: 0 }}>
                  <input type="checkbox" checked={memberIds.includes(u.id)} disabled={u.id === currentUser?.id} onChange={() => toggleMember(u.id)} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>{u.display_name}</span>
                  {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 'var(--radius-pill)', padding: '0.05rem 0.4rem', fontWeight: 700, flexShrink: 0 }}>én</span>}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Létrehozás...' : 'Projekt létrehozása'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
