'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  FolderKanban, Users, TrendingUp, TrendingDown, CheckCircle2,
  Plus, AlertCircle, Loader2, Search, X, FileText,
  User, Clock, PencilLine, ChevronDown, ChevronUp, ChevronLeft,
} from 'lucide-react';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import TransferToCollectiveModal from '@/components/TransferToCollectiveModal';
import ClientSelect from '@/components/ClientSelect';
import CollectiveSelector from '@/components/CollectiveSelector';
import ItemCard from '@/components/mobile/ItemCard';
import WorkspaceSectionHeader from '@/components/mobile/WorkspaceSectionHeader';
import ExpandButton from '@/components/mobile/ExpandButton';

const PREVIEW_COUNT = 3;

export default function ProjectsListClient({
  personalProjects,
  sharedProjects,
  collectives,
  initialInvoices,
  initialLabourEntries,
  initialUsers,
  initialClients,
  initialQuotes,
  currentUser,
  isAdmin,
  isSuperAdmin,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    createClient: ctxCreateClient,
    deleteProject,
    quotes: _ctxQuotes,
    invoices: _ctxInvoices,
    labourEntries: _ctxLabourEntries,
    clients: _ctxClients,
    users: _ctxUsers,
    activeCollectiveId,
    dataReady,
    refreshSupabaseData,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

  const quotes        = dataReady ? _ctxQuotes        : (initialQuotes || []);
  const invoices      = dataReady ? _ctxInvoices      : initialInvoices;
  const labourEntries = dataReady ? _ctxLabourEntries : initialLabourEntries;
  const clients       = dataReady ? _ctxClients       : (initialClients || []);
  const users         = dataReady ? _ctxUsers         : initialUsers;

  const [expandPersonal, setExpandPersonal] = useState(false);
  const [expandShared, setExpandShared]     = useState({});
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [deleteAlert,   setDeleteAlert]     = useState(null);
  const [deletedIds,    setDeletedIds]      = useState(new Set());
  const [alertModal,    setAlertModal]      = useState(null);
  const [transferModal,    setTransferModal]    = useState(null);
  const [outgoingTransfers, setOutgoingTransfers] = useState([]);

  const handleRetract = async (requestId) => {
    const res = await fetch(`/api/transfer-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retract' }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setDeleteAlert(error || 'Hiba történt. Kérjük, próbáld újra.');
      throw new Error(error);
    }
    setOutgoingTransfers(prev => prev.filter(r => r.id !== requestId));
    setAlertModal({ variant: 'success', title: 'Visszavonva', message: 'Az áthelyezési kérelem visszavonva. A dokumentum újra szerkeszthető.' });
  };

  const handleTransferSuccess = (result) => {
    if (result.moved) {
      refreshSupabaseData();
    } else if (result.request) {
      setOutgoingTransfers(prev => [...prev, result.request]);
    }
  };

  const handleDelete = (project) => {
    setConfirmDelete({
      message: `Biztosan törölni kívánja „${project.name}" projektet? Ez nem vonható vissza.`,
      onConfirm: async () => {
        try {
          await deleteProject(project.id, project);
          setDeletedIds(prev => new Set([...prev, project.id]));
          setAlertModal({ variant: 'success', title: 'Projekt törölve', message: `„${project.name}" sikeresen törölve.` });
        } catch (err) { setDeleteAlert(err.message || 'Hiba a törléskor'); }
      },
    });
  };

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

  const activeCreateEntityId = projEntityId || activeCollectiveId || null;
  const effectiveCurrentUserId = currentUser?.id;

  useEffect(() => {
    if (!dataReady || isDemoMode) return;
    fetch('/api/transfer-requests?outgoing=true')
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOutgoingTransfers(d.requests || []))
      .catch(() => {});
  }, [dataReady, isDemoMode]);

  // Auto-open create modal when navigated via ?create=1 (e.g. from mobile FAB)
  // useSearchParams keeps this reactive — works even when already on this page
  useEffect(() => {
    if (searchParams.get('create') === '1') openCreate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const canCreate = !!currentUser;

  const hasCollectives = (collectives || []).length > 0;

  const renderCard = (project) => {
    const client      = clients.find(c => c.id === project.client_id);
    const isDone      = !!(project.done_at || project.closed_at);
    const isOwner     = project.owner_id === currentUser?.id || project.created_by === currentUser?.id;
    const canTransfer = isOwner && !project.collective_id && hasCollectives && !isDemoMode;
    const pendingReq  = outgoingTransfers.find(r => r.document_id === project.id);
    return (
      <ItemCard
        key={project.id}
        href={`${navPrefix}/projektek/${project.id}`}
        title={project.name}
        clientName={client?.name}
        date={project.start_date || project.created_at}
        status={isDone ? 'kesz' : 'folyamatban'}
        photoUrls={project._preview_urls || []}
        isShared={!!project.collective_id}
        onDelete={isOwner && !pendingReq ? () => handleDelete(project) : undefined}
        onTransfer={canTransfer && !pendingReq ? () => setTransferModal({ documentId: project.id, documentTitle: project.name }) : undefined}
        isPendingTransfer={!!pendingReq}
        onRetractTransfer={pendingReq ? () => handleRetract(pendingReq.id) : undefined}
      />
    );
  };

  const visiblePersonal = (personalProjects || []).filter(p => !deletedIds.has(p.id));
  const visibleShared   = (sharedProjects   || []).filter(p => !deletedIds.has(p.id));
  const allProjects = [...visiblePersonal, ...visibleShared];

  const sharedByCollective = (collectives || []).map(col => ({
    ...col,
    projects: visibleShared.filter(p => p.collective_id === col.id),
  }));

  return (
    <div className="container page-body">

      {/* ── Mobile-only header ── */}
      <div className="list-page-mobile-header" style={{ marginBottom: 20 }}>
        <Link
          href={`${navPrefix}/dashboard`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 15, fontWeight: 600, color: '#475569',
            textDecoration: 'none', height: 44, marginBottom: 4,
          }}
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Kezdőlap
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '38px' }}>
          Projektek
        </h1>
      </div>

      {/* ── Desktop header ── */}
      <div className="page-header list-page-header">
        <div className="page-header-row">
          <h1 className="page-title">Projektek</h1>
          {canCreate && (
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új projekt
            </button>
          )}
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FolderKanban size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} aria-hidden="true" />
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
          <WorkspaceSectionHeader type="personal" count={visiblePersonal.length} />
          {visiblePersonal.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Nincsenek személyes projektek.</p>
          ) : (
            <>
              <div className="card-grid">
                {(expandPersonal ? visiblePersonal : visiblePersonal.slice(0, PREVIEW_COUNT)).map(p => renderCard(p))}
              </div>
              <ExpandButton
                total={visiblePersonal.length}
                showing={PREVIEW_COUNT}
                expanded={expandPersonal}
                onToggle={() => setExpandPersonal(v => !v)}
              />
            </>
          )}

          {sharedByCollective.map(col => (
            <div key={col.id} className="collective-inset-panel" style={{ marginTop: 24 }}>
              <WorkspaceSectionHeader type="collective" name={col.name} count={col.projects.length} />
              {col.projects.length === 0 ? (
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 8 }}>Nincsenek közös projektek.</p>
              ) : (
                <>
                  <div className="card-grid">
                    {(expandShared[col.id] ? col.projects : col.projects.slice(0, PREVIEW_COUNT)).map(p => renderCard(p))}
                  </div>
                  <ExpandButton
                    total={col.projects.length}
                    showing={PREVIEW_COUNT}
                    expanded={!!expandShared[col.id]}
                    onToggle={() => setExpandShared(v => ({ ...v, [col.id]: !v[col.id] }))}
                  />
                </>
              )}
            </div>
          ))}

          {!hasCollectives && (
            <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.825rem', marginBottom: '0.15rem' }}>Csapatban is dolgozol?</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  Hozz létre egy kollektívát a közös projektekhez.{' '}
                  <Link href={`${navPrefix}/kollektivak`} style={{ color: 'var(--accent)', fontWeight: 700 }}>Kollektívák →</Link>
                </div>
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
          <CollectiveSelector value={projEntityId} onChange={setProjEntityId} />
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
              <div>
                <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Pl. Horváth Béla" autoFocus /></div>
                <div className="grid-2col">
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail *</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
                </div>
                <div className="form-group" style={{ marginTop: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddr} onChange={e => setNewClientAddr(e.target.value)} /></div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: '#fff', border: `1px solid ${newClientGdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', marginBottom: '0.65rem' }}>
                  <input type="checkbox" checked={newClientGdpr} onChange={e => setNewClientGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Az ügyfél hozzájárult adatainak tárolásához. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient || !newClientGdpr} onClick={handleCreateClient}>{creatingClient ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Ügyfél létrehozása'}</button>
                </div>
              </div>
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

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null); }}
        title="Projekt törlése"
        message={confirmDelete?.message}
        confirmLabel="Törlés"
      />
      <AlertModal
        isOpen={!!deleteAlert}
        onClose={() => setDeleteAlert(null)}
        title="Hiba"
        message={deleteAlert}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant || 'error'}
        title={alertModal?.title}
        message={alertModal?.message}
      />
      <TransferToCollectiveModal
        isOpen={!!transferModal}
        onClose={() => setTransferModal(null)}
        documentType="project"
        documentId={transferModal?.documentId}
        documentTitle={transferModal?.documentTitle}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
