'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { formatDate, formatHUF } from '@/lib/constants';
import {
  ArrowLeft, Users, FolderKanban, Plus, Eye, Trash2,
  UserPlus, RotateCcw, Lock, CheckCircle2, AlertCircle, ShieldCheck, Briefcase
} from 'lucide-react';

export default function EntityDetailPage() {
  const { id } = useParams();
  const {
    isSuperAdmin, entities, users, projects, invoices, clients,
    createUser, deleteUser, resetUserPassword, startImpersonation,
    createProject, createClient,
  } = useApp();

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Epitek2026!');
  const [newRole, setNewRole] = useState('user');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [tempPass, setTempPass] = useState('Epitek2026!');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  // Project creation
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStartDate, setProjStartDate] = useState('');
  const [projEndDate, setProjEndDate] = useState('');
  const [projFormError, setProjFormError] = useState('');
  const [projSubmitting, setProjSubmitting] = useState(false);

  // Client creation
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientFormError, setClientFormError] = useState('');
  const [clientSubmitting, setClientSubmitting] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
      </div>
    );
  }

  const entity = entities.find(e => e.id === id);
  if (!entity) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Entitás nem található</h2>
        <Link href="/superadmin" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const entityUsers = users.filter(u => u.entity_id === id);
  const entityProjects = projects.filter(p => p.entity_id === id);
  const entityClients = clients.filter(c => c.entity_id === id);
  const totalCost = invoices
    .filter(inv => entityProjects.some(p => p.id === inv.project_id))
    .reduce((s, inv) => s + Number(inv.value_huf || 0), 0);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newName.trim() || !newEmail.trim() || !newPassword) { setFormError('Minden mező kitöltése kötelező!'); return; }

    setIsSubmitting(true);
    try {
      await createUser({ displayName: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole, entityId: id });
      setSuccessMsg(`„${newName.trim()}" létrehozva.`);
      setNewName(''); setNewEmail(''); setNewPassword('Epitek2026!'); setNewRole('user');
      setShowCreateUser(false);
    } catch (err) {
      setFormError(err.message || 'Hiba a létrehozásnál');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await resetUserPassword(resetTarget.id, tempPass);
      setSuccessMsg(`Jelszó visszaállítva: ${resetTarget.display_name}`);
      setResetTarget(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja: ${user.display_name} (${user.email})?`,
      onConfirm: async () => {
        try {
          await deleteUser(user.id);
          setSuccessMsg(`„${user.display_name}" törölve.`);
        } catch (err) {
          setAlertModal({ message: err.message });
        }
      }
    });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjFormError('');
    if (!projName.trim()) { setProjFormError('A projekt neve kötelező!'); return; }
    setProjSubmitting(true);
    try {
      await createProject({ name: projName.trim(), description: projDesc.trim(), startDate: projStartDate || null, endDate: projEndDate || null, entityId: id });
      setSuccessMsg(`„${projName.trim()}" projekt létrehozva.`);
      setProjName(''); setProjDesc(''); setProjStartDate(''); setProjEndDate('');
      setShowCreateProject(false);
    } catch (err) {
      setProjFormError(err.message || 'Hiba a létrehozásnál');
    } finally {
      setProjSubmitting(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setClientFormError('');
    if (!clientName.trim()) { setClientFormError('Az ügyfél neve kötelező!'); return; }
    setClientSubmitting(true);
    try {
      await createClient({ name: clientName.trim(), email: clientEmail.trim(), phone: clientPhone.trim(), address: clientAddress.trim(), entityId: id });
      setSuccessMsg(`„${clientName.trim()}" ügyfél létrehozva.`);
      setClientName(''); setClientEmail(''); setClientPhone(''); setClientAddress('');
      setShowCreateClientModal(false);
    } catch (err) {
      setClientFormError(err.message || 'Hiba a létrehozásnál');
    } finally {
      setClientSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az entitásokhoz
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> Superadmin – Entitás
          </div>
          <h1 className="page-title">{entity.name}</h1>
          <p className="page-subtitle">Létrehozva: {formatDate(entity.created_at)}</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-label">Felhasználók</div><div className="stat-value">{entityUsers.length}</div></div>
        <div className="stat-card"><div className="stat-label">Projektek</div><div className="stat-value">{entityProjects.length}</div></div>
        <div className="stat-card"><div className="stat-label">Összes kiadás</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatHUF(totalCost)}</div></div>
      </div>

      {/* Users */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={18} color="var(--accent)" /> Felhasználók ({entityUsers.length})
        </h2>
        <button type="button" onClick={() => { setFormError(''); setShowCreateUser(true); }} className="btn btn-primary btn-sm">
          <UserPlus size={14} /> Új felhasználó
        </button>
      </div>

      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Név</th>
              <th>Email</th>
              <th>Szerepkör</th>
              <th>Állapot</th>
              <th style={{ textAlign: 'right' }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {entityUsers.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Nincs felhasználó ebben az entitásban.</td></tr>
            ) : entityUsers.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700 }}>{u.display_name}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                <td>
                  <span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Tag'}</span>
                </td>
                <td>
                  {u.must_change_password
                    ? <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><Lock size={12} /> Jelszócsere szükséges</span>
                    : <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={12} /> Aktív</span>
                  }
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    <button type="button" onClick={() => startImpersonation(u.id).catch(err => setAlertModal({ message: err.message }))} className="btn btn-secondary btn-sm" title="God Mode" style={{ padding: '0.25rem 0.55rem' }}>
                      <Eye size={13} />
                    </button>
                    <button type="button" onClick={() => { setFormError(''); setResetTarget(u); setTempPass('Epitek2026!'); }} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.55rem' }}>
                      <RotateCcw size={12} />
                    </button>
                    <button type="button" onClick={() => handleDeleteUser(u)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Projects */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FolderKanban size={18} color="var(--accent)" /> Projektek ({entityProjects.length})
        </h2>
        <button type="button" onClick={() => { setProjFormError(''); setShowCreateProject(true); }} className="btn btn-primary btn-sm">
          <Plus size={14} /> Új projekt
        </button>
      </div>
      {entityProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Nincs projekt ebben az entitásban.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {entityProjects.map(p => {
            const cost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <div key={p.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{p.description}</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(cost)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Clients */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Briefcase size={18} color="var(--accent)" /> Ügyfelek ({entityClients.length})
        </h2>
        <button type="button" onClick={() => { setClientFormError(''); setShowCreateClientModal(true); }} className="btn btn-primary btn-sm">
          <Plus size={14} /> Új ügyfél
        </button>
      </div>
      {entityClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Nincs ügyfél ebben az entitásban.
        </div>
      ) : (
        <div className="table-container mb-6">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Név</th>
                <th>Email</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {entityClients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.email || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} title="Új felhasználó hozzáadása">
        {formError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label" htmlFor="su-name">Név *</label>
            <input id="su-name" type="text" className="form-control" required value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="su-email">Email *</label>
            <input id="su-email" type="email" className="form-control" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="su-pass">Ideiglenes jelszó *</label>
            <input id="su-pass" type="text" className="form-control text-mono" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="su-role">Szerepkör</label>
            <select id="su-role" className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="user">Tag (felhasználó)</option>
              <option value="admin">Entitás Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateUser(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Létrehozás...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title="Jelszó visszaállítása">
        {formError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '0.85rem' }}>
            {formError}
          </div>
        )}
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 800 }}>{resetTarget?.display_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{resetTarget?.email}</div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Új ideiglenes jelszó *</label>
            <input type="text" required minLength={6} className="form-control text-mono" value={tempPass} onChange={e => setTempPass(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetTarget(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Visszaállítás...' : 'Jelszó visszaállítása'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Új projekt létrehozása">
        {projFormError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{projFormError}</span>
          </div>
        )}
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-name">Projekt neve *</label>
            <input id="proj-name" type="text" className="form-control" required value={projName} onChange={e => setProjName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-desc">Leírás</label>
            <input id="proj-desc" type="text" className="form-control" value={projDesc} onChange={e => setProjDesc(e.target.value)} />
          </div>
          <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-start">Kezdés *</label>
              <input id="proj-start" type="date" required className="form-control" value={projStartDate} onChange={e => setProjStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-end">Befejezés *</label>
              <input id="proj-end" type="date" required className="form-control" min={projStartDate || undefined} value={projEndDate} onChange={e => setProjEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateProject(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={projSubmitting}>{projSubmitting ? 'Létrehozás...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Client Modal */}
      <Modal isOpen={showCreateClientModal} onClose={() => setShowCreateClientModal(false)} title="Új ügyfél létrehozása">
        {clientFormError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{clientFormError}</span>
          </div>
        )}
        <form onSubmit={handleCreateClient}>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-name">Ügyfél neve *</label>
            <input id="cl-name" type="text" className="form-control" required value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-email">Email</label>
            <input id="cl-email" type="email" className="form-control" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-phone">Telefon</label>
            <input id="cl-phone" type="text" className="form-control" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="cl-address">Cím</label>
            <input id="cl-address" type="text" className="form-control" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateClientModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={clientSubmitting}>{clientSubmitting ? 'Létrehozás...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
