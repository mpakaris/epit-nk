'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  FolderKanban, Users, TrendingUp, TrendingDown, CheckCircle2,
  Plus, AlertCircle, UserCheck, ChevronRight, Loader2, Search, X, FileText,
  User, Clock, PencilLine,
} from 'lucide-react';
import Modal from '@/components/Modal';
import EntitySelector from '@/components/EntitySelector';
import ClientSelect from '@/components/ClientSelect';
import WorkspaceBadge from '@/components/WorkspaceBadge';
import CollectiveBanner from '@/components/CollectiveBanner';

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
  const {
    createClient: ctxCreateClient,
    projects: _ctxProjects,
    quotes: _ctxQuotes,
    invoices: _ctxInvoices,
    labourEntries: _ctxLabourEntries,
    clients: _ctxClients,
    users: _ctxUsers,
    effectiveMemberships,
    activeCollectiveId,
    dataReady,
    refreshSupabaseData,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

  const projects      = dataReady ? _ctxProjects      : initialProjects;
  const quotes        = dataReady ? _ctxQuotes        : (initialQuotes || []);
  const invoices      = dataReady ? _ctxInvoices      : initialInvoices;
  const labourEntries = dataReady ? _ctxLabourEntries : initialLabourEntries;
  const clients       = dataReady ? _ctxClients       : (initialClients || []);
  const users         = dataReady ? _ctxUsers         : initialUsers;

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [projClientId, setProjClientId] = useState('');
  const [projLinkedQuoteId, setProjLinkedQuoteId] = useState('');
  const [projEntityId, setProjEntityId] = useState(null);
  const [memberIds, setMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [quoteSearch, setQuoteSearch] = useState('');
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddr, setNewClientAddr] = useState('');
  const [newClientGdpr, setNewClientGdpr] = useState(false);
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const activeCreateEntityId = projEntityId || effectiveEntityId;
  const effectiveCurrentUserId = impersonating?.id ?? currentUser?.id;

  const openCreate = () => {
    setProjName(''); setProjDesc(''); setProjStart(''); setProjEnd('');
    setProjClientId(''); setProjLinkedQuoteId(''); setProjEntityId(null);
    setMemberIds(effectiveCurrentUserId ? [effectiveCurrentUserId] : []);
    setQuoteSearch(''); setShowQuoteDropdown(false);
    setError('');
    setShowNewClient(false);
    setShowCreate(true);
  };

  const handleQuoteLink = (quoteId) => {
    setProjLinkedQuoteId(quoteId);
    if (!quoteId) return;
    const q = (quotes || []).find(x => x.id === quoteId);
    if (!q) return;
    if (q.collective_id) setProjEntityId(q.collective_id);
    const seed = [...new Set([
      ...(effectiveCurrentUserId ? [effectiveCurrentUserId] : []),
      ...(q.shared_with || []),
    ])];
    setMemberIds(seed);
    if (q.title       && !projName)     setProjName(q.title);
    if (q.description && !projDesc)     setProjDesc(q.description);
    if (q.start_date  && !projStart)    setProjStart(q.start_date);
    if (q.end_date    && !projEnd)      setProjEnd(q.end_date);
    if (q.client_id   && !projClientId) setProjClientId(q.client_id);
  };

  const clearQuote = () => {
    setProjLinkedQuoteId('');
    setQuoteSearch('');
    setProjName('');
    setProjDesc('');
    setProjStart('');
    setProjEnd('');
    setProjClientId('');
  };

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filteredQuotes = quoteSearch
    ? (quotes || []).filter(q => norm(q.title).includes(norm(quoteSearch)) || norm(q.location || '').includes(norm(quoteSearch)))
    : (quotes || []);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const c = await ctxCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddr.trim(), entityId: activeCreateEntityId, gdprConsent: newClientGdpr });
      setProjClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddr(''); setNewClientGdpr(false);
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
        body: JSON.stringify({ name: projName, description: projDesc, memberIds, startDate: projStart || null, endDate: projEnd || null, clientId: projClientId || null, collectiveId: activeCreateEntityId, quoteId: projLinkedQuoteId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a projekt létrehozásakor');
      await refreshSupabaseData();
      router.push(`${navPrefix}/projektek/${data.project.id}`);
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
  const myProjects = projects.filter(p => p.created_by === currentUser?.id);
  const invitedProjects = projects.filter(p => p.created_by !== currentUser?.id);

  const renderCard = (project, showCreator = false) => {
    const memberUsers = users.filter(u => (project.members || []).includes(u.id));
    const fin = calculateProjectFinancials(project, invoices, labourEntries, memberUsers, currentUser?.id);
    const creator = showCreator ? users.find(u => u.id === project.created_by) : null;

    const previews = project._preview_urls || [];

    return (
      <div
        key={project.id}
        className="card card-interactive"
        onClick={() => router.push(`${navPrefix}/projektek/${project.id}`)}
        style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', padding: 0, overflow: 'hidden' }}
      >
        {/* Photo strip */}
        {previews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(previews.length, 4)}, 1fr)`, height: 90, overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
            {previews.map((url, i) => (
              <div key={i} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', flex: 1 }}>
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
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>{project.description}</p>
            )}
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Összköltség</div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }} className="text-mono">{formatHUF(fin.totalCost)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Munkadíj</div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--success-text)' }} className="text-mono">{formatHUF(fin.totalLabourValue)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Számlák</div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)' }} className="text-mono">{fin.projectInvoices.length} db</div>
              </div>
            </div>
          </div>
          {/* Collective audit row */}
          {activeCollectiveId && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {creator && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <User size={11} /> {creator.display_name}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Clock size={11} /> {formatDate(project.created_at)}
              </span>
              {project.updated_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <PencilLine size={11} /> {project.updated_by_name ? `${project.updated_by_name} · ` : ''}{formatDate(project.updated_at)}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
            <div>
              {fin.balance > 0
                ? <span className="balance-pill positive"><TrendingUp size={12} /><span>+{formatHUF(fin.balance)}</span></span>
                : fin.balance < 0
                  ? <span className="balance-pill negative"><TrendingDown size={12} /><span>{formatHUF(fin.balance)}</span></span>
                  : <span className="balance-pill neutral"><CheckCircle2 size={12} /><span>Rendezett</span></span>
              }
            </div>
            <Link
              href={`${navPrefix}/projektek/${project.id}/feltoltes`}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', gap: '0.3rem' }}
              onClick={e => e.stopPropagation()}
            >
              <Plus size={13} /> Hozzáadás
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            Projektek
            <WorkspaceBadge />
          </h1>
          {canCreate && (
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új projekt
            </button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FolderKanban size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem' }}>Nincsenek projektek</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.25rem', fontSize: '0.875rem' }}>
            Még nem hoztál létre projektet.
          </p>
          {canCreate && (
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={15} /> Első projekt létrehozása
            </button>
          )}
        </div>
      ) : (
        <>
          {myProjects.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              {invitedProjects.length > 0 && (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Általam létrehozva
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
                {myProjects.map(p => renderCard(p, false))}
              </div>
            </div>
          )}
          {invitedProjects.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Meghívottként
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
                {invitedProjects.map(p => renderCard(p, true))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create project modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Új projekt létrehozása">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <CollectiveBanner />
          <EntitySelector value={activeCreateEntityId} onChange={setProjEntityId} memberships={effectiveMemberships} />
          <div className="form-group">
            <label className="form-label">Kapcsolódó ajánlat <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcionális)</span></label>
            {projLinkedQuoteId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
                <FileText size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent)' }}>{(quotes || []).find(q => q.id === projLinkedQuoteId)?.title}</div>
                </div>
                <button type="button" onClick={clearQuote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0.2rem', display: 'flex' }}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder={(quotes || []).length === 0 ? 'Jelenleg nincs ajánlat' : 'Keresés az ajánlatok között…'}
                  disabled={(quotes || []).length === 0}
                  value={quoteSearch}
                  onChange={e => { setQuoteSearch(e.target.value); setShowQuoteDropdown(true); }}
                  onFocus={() => setShowQuoteDropdown(true)}
                  onBlur={() => setTimeout(() => setShowQuoteDropdown(false), 150)}
                />
                {showQuoteDropdown && (quotes || []).length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', marginTop: '0.25rem' }}>
                    {filteredQuotes.length === 0 ? (
                      <div style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nincs találat</div>
                    ) : filteredQuotes.map(q => (
                      <button key={q.id} type="button"
                        onMouseDown={() => { handleQuoteLink(q.id); setQuoteSearch(''); setShowQuoteDropdown(false); }}
                        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.1rem', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{q.title}</span>
                        {q.location && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.location}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-name">Projekt neve *</label>
            <input id="mp-name" type="text" className="form-control" required autoFocus value={projName} onChange={e => setProjName(e.target.value)} placeholder="pl. Balatoni Nyaraló Felújítás" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mp-desc">Leírás</label>
            <textarea id="mp-desc" rows={2} className="form-control" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Rövid leírás…" />
          </div>
          <div className="form-group">
            <label className="form-label">Megrendelő *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <ClientSelect value={projClientId} onChange={e => setProjClientId(e.target.value)} clients={clients || []} style={{ flex: 1, borderColor: !projClientId ? 'var(--warning-border)' : undefined }} />
              <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => { setNewClientError(''); setShowNewClient(v => !v); }}>
                <Plus size={14} /> Új ügyfél
              </button>
            </div>
            {projClientId && <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem' }}>✓ {(clients || []).find(c => c.id === projClientId)?.name}</div>}
          </div>
          {showNewClient && (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
              {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.55rem' }}>{newClientError}</div>}
              <form onSubmit={handleCreateClient}>
                <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Pl. Horváth Béla" autoFocus /></div>
                <div className="grid-2col">
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail *</label><input type="email" className="form-control" required value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddr} onChange={e => setNewClientAddr(e.target.value)} /></div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: '#fff', border: `1px solid ${newClientGdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', marginBottom: '0.65rem' }}>
                  <input type="checkbox" checked={newClientGdpr} onChange={e => setNewClientGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Az ügyfél hozzájárult adatainak tárolásához. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={creatingClient || !newClientGdpr}>{creatingClient ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Ügyfél létrehozása'}</button>
                </div>
              </form>
            </div>
          )}
          <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-start">Kezdés</label>
              <input id="mp-start" type="date" className="form-control" value={projStart} onChange={e => setProjStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="mp-end">Befejezés</label>
              <input id="mp-end" type="date" className="form-control" min={projStart || undefined} value={projEnd} onChange={e => setProjEnd(e.target.value)} />
            </div>
          </div>
          {activeCreateEntityId && !activeCollectiveId && (
            <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
              <label className="form-label">Résztvevők</label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
                {users.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 'var(--radius-sm)', cursor: u.id === currentUser?.id ? 'default' : 'pointer', fontSize: '0.825rem' }}>
                    <input type="checkbox" checked={memberIds.includes(u.id)} disabled={u.id === currentUser?.id} onChange={() => toggleMember(u.id)} />
                    <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                    {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 'var(--radius-pill)', padding: '0.05rem 0.4rem', fontWeight: 700 }}>én</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Projekt létrehozása'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
