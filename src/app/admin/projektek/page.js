'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  FolderKanban, Plus, Users, Trash2, UserCheck,
  ArrowUpRight, ArrowLeft, AlertCircle, CheckCircle2, User, Edit3
} from 'lucide-react';

// ---- Isolated modal components — each manages its own form state ----

function CreateProjectModal({ isOpen, onClose, users, clients, currentUser, createProject, createClient, onSuccess }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline client creation sub-state
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
    setError('');
  };

  const handleOpen = () => { reset(); };

  if (!isOpen) return null;

  const toggle = (uid) => setMemberIds(prev =>
    prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createProject({ name: name.trim(), description: desc.trim(), memberIds, startDate: startDate || null, endDate: endDate || null, clientId: clientId || null });
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
      const c = await createClient({ name: clientName.trim(), phone: clientPhone.trim(), email: clientEmail.trim(), address: clientAddr.trim() });
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
              <input id="cp-start" type="date" required className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cp-end">Befejezés *</label>
              <input id="cp-end" type="date" required className="form-control" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-client">Megrendelő</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select id="cp-client" className="form-control" style={{ flex: 1 }} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">– Ügyfél nélkül –</option>
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
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.45rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.825rem' }}>
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} />
                  <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                  {u.id === currentUser?.id && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 'var(--radius-pill)', padding: '0.05rem 0.4rem' }}>én</span>}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({u.email})</span>
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

function EditProjectModal({ isOpen, onClose, project, clients, updateProject, onSuccess }) {
  const [name, setName] = useState(project?.name || '');
  const [desc, setDesc] = useState(project?.description || '');
  const [startDate, setStartDate] = useState(project?.start_date || '');
  const [endDate, setEndDate] = useState(project?.end_date || '');
  const [clientId, setClientId] = useState(project?.client_id || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync when project changes (different project opened)
  React.useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setError('');
    }
  }, [project?.id]);

  if (!isOpen || !project) return null;

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
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" htmlFor="ep-start">Kezdés</label><input id="ep-start" type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" htmlFor="ep-end">Befejezés</label><input id="ep-end" type="date" className="form-control" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="ep-client">Megrendelő</label>
          <select id="ep-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">– Ügyfél nélkül –</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
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
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggle(u.id)} />
              <span style={{ fontWeight: 600 }}>{u.display_name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({u.email})</span>
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

// ---- Page component — only tracks which modal is open, no form state ----

export default function AdminProjectsPage() {
  const { currentUser, isAdmin, projects, users, clients, invoices, createProject, createClient, updateProject, updateProjectMembers, deleteProject } = useApp();

  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [assignProject, setAssignProject] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza a projektekhez</Link>
      </div>
    );
  }

  const handleDelete = (project) => {
    setConfirmModal({
      title: `"${project.name}" törlése`,
      message: `Biztosan törölni szeretné a "${project.name}" projektet? Ez a művelet nem vonható vissza.`,
      onConfirm: async () => {
        try {
          await deleteProject(project.id);
          setSuccessMsg(`"${project.name}" projekt törölve.`);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törlés során' });
        }
      }
    });
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
        {projects.map(project => {
          const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
          const totalCost = projectInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
          const memberUsers = users.filter(u => (project.members || []).includes(u.id));

          return (
            <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <Link href={`/admin/projektek/${project.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {project.name} <ArrowUpRight size={15} color="var(--text-muted)" />
                    </h3>
                  </Link>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', paddingTop: '0.2rem' }}>
                    {projectInvoices.length} számla
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {project.description || 'Nincs leírás megadva.'}
                </p>
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Összes kiadás</div>
                    <div className="text-mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatHUF(totalCost)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Egyenlő rész / fő</div>
                    <div className="text-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatHUF(memberUsers.length > 0 ? Math.round(totalCost / memberUsers.length) : totalCost)}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={13} /><span>Tagok ({memberUsers.length}):</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {memberUsers.length > 0 ? memberUsers.map(m => (
                      <span key={m.id} style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)', fontWeight: 600 }}>{m.display_name}</span>
                    )) : <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>Nincs még hozzárendelt tag</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', gap: '0.4rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={() => setEditProject(project)} className="btn btn-secondary btn-sm"><Edit3 size={14} /> Szerkesztés</button>
                  <button type="button" onClick={() => setAssignProject(project)} className="btn btn-secondary btn-sm"><UserCheck size={14} /> Tagok</button>
                </div>
                <button type="button" onClick={() => handleDelete(project)} className="btn btn-danger btn-sm"><Trash2 size={13} /> Törlés</button>
              </div>
            </div>
          );
        })}
      </div>

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        clients={clients}
        currentUser={currentUser}
        createProject={createProject}
        createClient={createClient}
        onSuccess={msg => setSuccessMsg(msg)}
      />
      <EditProjectModal
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        project={editProject}
        clients={clients}
        updateProject={updateProject}
        onSuccess={msg => setSuccessMsg(msg)}
      />
      <AssignMembersModal
        isOpen={!!assignProject}
        onClose={() => setAssignProject(null)}
        project={assignProject}
        users={users}
        updateProjectMembers={updateProjectMembers}
        onSuccess={msg => setSuccessMsg(msg)}
      />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title || 'Megerősítés'} message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
