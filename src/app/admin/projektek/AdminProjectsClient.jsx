'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  FolderKanban, Plus, Users,
  ArrowLeft, AlertCircle, CheckCircle2, User, ChevronUp,
  Search, Calendar, ArrowUpDown, Building2, Receipt, Hammer, BookOpen,
} from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function CreateProjectModal({ isOpen, onClose, users, clients, currentUser, effectiveEntityId, createProject, createClient, onSuccess }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showNewClient, setShowNewClient] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddr, setClientAddr] = useState('');
  const [clientError, setClientError] = useState('');
  const [clientSaving, setClientSaving] = useState(false);

  const reset = () => {
    setName(''); setDesc(''); setStartDate(''); setEndDate('');
    setClientId(''); setMemberIds(currentUser ? [currentUser.id] : []);
    setError(''); setShowNewClient(false);
  };

  React.useEffect(() => { if (isOpen) reset(); }, [isOpen]);

  if (!isOpen) return null;

  const memberList = currentUser && !users.find(u => u.id === currentUser.id)
    ? [currentUser, ...users]
    : users;

  const toggle = (uid) => setMemberIds(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!clientId) { setError('Ügyfél megadása kötelező! Válasszon meglévőt vagy hozzon létre újat.'); return; }
    setSubmitting(true);
    try {
      await createProject({ name: name.trim(), description: desc.trim(), memberIds, startDate: startDate || null, endDate: endDate || null, clientId: clientId || null, entityId: effectiveEntityId });
      onSuccess(`"${name.trim()}" projekt létrehozva!`);
      onClose();
      reset();
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setClientError('');
    if (!clientName.trim()) { setClientError('A név megadása kötelező!'); return; }
    setClientSaving(true);
    try {
      const c = await createClient({ name: clientName.trim(), phone: clientPhone.trim(), email: clientEmail.trim(), address: clientAddr.trim(), entityId: effectiveEntityId });
      setClientId(c.id);
      setShowNewClient(false);
      setClientName(''); setClientPhone(''); setClientEmail(''); setClientAddr('');
    } catch (err) {
      setClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setClientSaving(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Új építkezési projekt">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-name">Projekt neve *</label>
            <input id="cp-name" type="text" required className="form-control" placeholder="pl. Balatoni Nyaraló Felújítás" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-desc">Rövid leírás</label>
            <textarea id="cp-desc" rows={2} className="form-control" placeholder="Rövid tájékoztató" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="cp-start">Kezdés *</label>
              <input id="cp-start" type="date" required className="form-control" min={today()} value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cp-end">Befejezés *</label>
              <input id="cp-end" type="date" required className="form-control" min={startDate ? nextDay(startDate) : today()} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-client">Megrendelő *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select id="cp-client" className="form-control" style={{ flex: 1, borderColor: !clientId ? 'var(--warning-border)' : undefined }} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">– Válasszon ügyfelet –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.discount_percent > 0 ? ` (${c.discount_percent}% kedv.)` : ''}</option>)}
              </select>
              <button type="button" onClick={() => { setClientError(''); setShowNewClient(true); }} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={14} /> Új
              </button>
            </div>
            {selectedClient && (
              <div style={{ marginTop: '0.45rem', padding: '0.4rem 0.7rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={13} />{selectedClient.name}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
              </div>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Résztvevők</label>
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
              {memberList.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.825rem', minWidth: 0 }}>
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>{u.display_name}</span>
                  {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 'var(--radius-pill)', padding: '0.05rem 0.4rem', flexShrink: 0 }}>én</span>}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>({u.email})</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Létrehozás...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewClient} onClose={() => setShowNewClient(false)} title="Új ügyfél">
        {clientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{clientError}</span></div>}
        <form onSubmit={handleCreateClient}>
          <div className="form-group"><label className="form-label" htmlFor="nc-name">Név *</label><input id="nc-name" type="text" required autoFocus className="form-control" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Horváth Béla" /></div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}><label className="form-label" htmlFor="nc-phone">Telefon</label><input id="nc-phone" type="tel" className="form-control" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+36 70 …" /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label" htmlFor="nc-email">E-mail</label><input id="nc-email" type="email" className="form-control" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@…" /></div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}><label className="form-label" htmlFor="nc-addr">Cím</label><input id="nc-addr" type="text" className="form-control" value={clientAddr} onChange={e => setClientAddr(e.target.value)} placeholder="Irányítószám, Város, utca" /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewClient(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={clientSaving}>{clientSaving ? 'Mentés...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function EditProjectModal({ isOpen, onClose, project, clients, effectiveEntityId, updateProject, createClient, onSuccess }) {
  const [name, setName] = useState(project?.name || '');
  const [desc, setDesc] = useState(project?.description || '');
  const [startDate, setStartDate] = useState(project?.start_date || '');
  const [endDate, setEndDate] = useState(project?.end_date || '');
  const [clientId, setClientId] = useState(project?.client_id || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddr, setNewClientAddr] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  React.useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setError('');
      setShowNewClient(false);
    }
  }, [project?.id, isOpen]);

  if (!isOpen || !project) return null;

  const handleCreateClient = async () => {
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const c = await createClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddr.trim(), entityId: effectiveEntityId || project.entity_id });
      setClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddr('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await updateProject(project.id, { name: name.trim(), description: desc.trim() || null, start_date: startDate || null, end_date: endDate || null, client_id: clientId || null });
      onSuccess(`"${name.trim()}" frissítve.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Szerkesztés: ${project.name}`}>
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label className="form-label" htmlFor="ep-name">Projekt neve *</label><input id="ep-name" type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="form-group"><label className="form-label" htmlFor="ep-desc">Leírás</label><textarea id="ep-desc" rows={2} className="form-control" value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" htmlFor="ep-start">Kezdés</label><input id="ep-start" type="date" className="form-control" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" htmlFor="ep-end">Befejezés</label><input id="ep-end" type="date" className="form-control" min={startDate ? nextDay(startDate) : today()} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: showNewClient ? '0.5rem' : '1.25rem' }}>
          <label className="form-label" htmlFor="ep-client">Megrendelő</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select id="ep-client" className="form-control" style={{ flex: 1 }} value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => { setShowNewClient(v => !v); setNewClientError(''); }}>
              {showNewClient ? <ChevronUp size={14} /> : <Plus size={14} />} {showNewClient ? 'Bezár' : 'Új ügyfél'}
            </button>
          </div>
        </div>
        {showNewClient && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1.25rem', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
            {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>{newClientError}</div>}
            <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Horváth Béla" /></div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" /></div>
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="email@…" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddr} onChange={e => setNewClientAddr(e.target.value)} placeholder="Irányítószám, Város, utca" /></div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>{creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Mentés...' : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AssignMembersModal({ isOpen, onClose, project, users, updateProjectMembers, onSuccess }) {
  const [memberIds, setMemberIds] = useState(project?.members || []);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (project) { setMemberIds(project.members || []); setError(''); }
  }, [project?.id]);

  if (!isOpen || !project) return null;

  const toggle = (uid) => setMemberIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await updateProjectMembers(project.id, memberIds);
      onSuccess(`"${project.name}" tagjai frissítve!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a tagok mentésekor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Résztvevők: ${project.name}`}>
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Jelölje be a projektben részt vevő tagokat:</p>
        <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem', marginBottom: '1.25rem' }}>
          {users.map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)', minWidth: 0 }}>
              <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, flexShrink: 0 }}>{u.display_name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>({u.email})</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Mentés...' : 'Tagok mentése'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminProjectsClient({
  initialProjects,
  initialUsers,
  initialClients,
  initialInvoices,
  initialLabourEntries,
  initialDiaryEntries,
  currentUser,
  effectiveEntityId,
}) {
  const router = useRouter();
  const {
    createProject: ctxCreateProject,
    createClient: ctxCreateClient,
  } = useApp();

  const projects      = initialProjects;
  const clients       = initialClients;
  const users         = initialUsers;
  const invoices      = initialInvoices;
  const labourEntries = initialLabourEntries || [];
  const diaryEntries  = initialDiaryEntries  || [];

  const createProject = async (args) => {
    const newProject = await ctxCreateProject(args);
    router.refresh();
    return newProject;
  };

  const createClient = async (args) => {
    const newClient = await ctxCreateClient(args);
    router.refresh();
    return newClient;
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filteredProjects = projects
    .filter(p => {
      if (!search.trim()) return true;
      const q = norm(search);
      const clientName = norm(clients.find(c => c.id === p.client_id)?.name || '');
      return norm(p.name).includes(q) || clientName.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'alpha') return norm(a.name).localeCompare(norm(b.name), 'hu');
      if (sortBy === 'created') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'upcoming') {
        const dateOf = p => {
          const s = p.start_date ? new Date(p.start_date) : null;
          const e = p.end_date   ? new Date(p.end_date)   : null;
          if (s && s >= today) return s;
          if (e && e >= today) return e;
          return e || s || new Date(8640000000000000);
        };
        return dateOf(a) - dateOf(b);
      }
      return 0;
    });

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az áttekintéshez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Projektek kezelése</h1>
            <p className="page-subtitle">Építkezési projektek létrehozása és tagok hozzárendelése</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Új Projekt Létrehozása
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Keresés projekt vagy ügyfél neve szerint…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 0.35rem', flexShrink: 0 }}>
          <ArrowUpDown size={13} color="var(--text-muted)" />
          <select
            className="form-control"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: '0.825rem', fontWeight: 600, paddingLeft: '0.15rem', paddingRight: '0.5rem' }}
          >
            <option value="upcoming">Közelgő dátum</option>
            <option value="alpha">A–Z</option>
            <option value="created">Létrehozva (legújabb)</option>
          </select>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <FolderKanban size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nincs találat.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '1rem' }}>
          {filteredProjects.map(project => {
            const client = clients.find(c => c.id === project.client_id);
            const invoiceCount = invoices.filter(inv => inv.project_id === project.id).length;
            const labourCount  = labourEntries.filter(e => e.project_id === project.id).length;
            const diaryCount   = diaryEntries.filter(e => e.project_id === project.id).length;
            const memberUsers  = users.filter(u => (project.members || []).includes(u.id));

            const startDate = project.start_date ? new Date(project.start_date) : null;
            const endDate   = project.end_date   ? new Date(project.end_date)   : null;
            const isActive  = startDate && endDate && startDate <= today && endDate >= today;
            const isUpcoming = startDate && startDate > today;
            const isPast    = endDate && endDate < today;

            return (
              <div
                key={project.id}
                className="card card-interactive"
                onClick={() => router.push(`/admin/projektek/${project.id}`)}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', justifyContent: 'space-between' }}
              >
                {/* Name + client */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{project.name}</h3>
                    {isActive && <span style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-pill)' }}>Folyamatban</span>}
                    {isUpcoming && <span style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-pill)' }}>Közelgő</span>}
                    {isPast && <span style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-pill)' }}>Lezárt</span>}
                  </div>
                  {client && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      <Building2 size={12} color="var(--text-muted)" /> {client.name}
                    </div>
                  )}
                  {project.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Dates */}
                {(startDate || endDate) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', color: isActive ? 'var(--success-text)' : isUpcoming ? 'var(--warning-text)' : 'var(--text-muted)', fontWeight: 600 }}>
                    <Calendar size={13} />
                    <span>{startDate ? startDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) : '?'} – {endDate ? endDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}</span>
                  </div>
                )}

                {/* Bottom stats */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <Users size={11} /> {memberUsers.length}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <Receipt size={11} /> {invoiceCount}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <Hammer size={11} /> {labourCount}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                    <BookOpen size={11} /> {diaryCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        clients={clients}
        currentUser={currentUser}
        effectiveEntityId={effectiveEntityId}
        createProject={createProject}
        createClient={createClient}
        onSuccess={msg => setSuccessMsg(msg)}
      />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title || 'Megerősítés'} message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
