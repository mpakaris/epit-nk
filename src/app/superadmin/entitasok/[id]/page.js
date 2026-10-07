'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { formatDate, formatHUF } from '@/lib/constants';
import {
  ArrowLeft, ArrowUpRight, Users, FolderKanban, Plus, Eye, Trash2,
  UserPlus, RotateCcw, Lock, CheckCircle2, AlertCircle, ShieldCheck, Briefcase, HardDriveUpload, Edit3, X, Save
} from 'lucide-react';

export default function EntityDetailPage() {
  const { id } = useParams();
  const {
    isSuperAdmin, loading, entities, users, projects, invoices, clients,
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

  // Drive folder configuration
  const [editingDrive, setEditingDrive] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveSaving, setDriveSaving] = useState(false);

  // Client creation
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientFormError, setClientFormError] = useState('');
  const [clientSubmitting, setClientSubmitting] = useState(false);

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
      </div>
    );
  }

  const entity = entities.find(e => e.id === id);
  if (!entity) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Entity not found</h2>
        <Link href="/superadmin" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Back</Link>
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
    if (!newName.trim() || !newEmail.trim() || !newPassword) { setFormError('All fields are required!'); return; }

    setIsSubmitting(true);
    try {
      await createUser({ displayName: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole, entityId: id });
      setSuccessMsg(`"${newName.trim()}" created.`);
      setNewName(''); setNewEmail(''); setNewPassword('Epitek2026!'); setNewRole('user');
      setShowCreateUser(false);
    } catch (err) {
      setFormError(err.message || 'Error creating user');
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
      setSuccessMsg(`Password reset for: ${resetTarget.display_name}`);
      setResetTarget(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmModal({
      message: `Are you sure you want to delete: ${user.display_name} (${user.email})?`,
      onConfirm: async () => {
        try {
          await deleteUser(user.id);
          setSuccessMsg(`"${user.display_name}" deleted.`);
        } catch (err) {
          setAlertModal({ message: err.message });
        }
      }
    });
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjFormError('');
    if (!projName.trim()) { setProjFormError('Project name is required!'); return; }
    setProjSubmitting(true);
    try {
      await createProject({ name: projName.trim(), description: projDesc.trim(), startDate: projStartDate || null, endDate: projEndDate || null, entityId: id });
      setSuccessMsg(`"${projName.trim()}" project created.`);
      setProjName(''); setProjDesc(''); setProjStartDate(''); setProjEndDate('');
      setShowCreateProject(false);
    } catch (err) {
      setProjFormError(err.message || 'Error creating project');
    } finally {
      setProjSubmitting(false);
    }
  };

  const handleSaveDriveFolder = async () => {
    setDriveSaving(true);
    try {
      const res = await fetch(`/api/superadmin/entity/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_drive_folder_id: driveFolderId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error saving');
      setSuccessMsg('Google Drive folder configured.');
      setEditingDrive(false);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setDriveSaving(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setClientFormError('');
    if (!clientName.trim()) { setClientFormError('Client name is required!'); return; }
    setClientSubmitting(true);
    try {
      await createClient({ name: clientName.trim(), email: clientEmail.trim(), phone: clientPhone.trim(), address: clientAddress.trim(), entityId: id });
      setSuccessMsg(`"${clientName.trim()}" client created.`);
      setClientName(''); setClientEmail(''); setClientPhone(''); setClientAddress('');
      setShowCreateClientModal(false);
    } catch (err) {
      setClientFormError(err.message || 'Error creating client');
    } finally {
      setClientSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to entities
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> Superadmin – Entity
          </div>
          <h1 className="page-title">{entity.name}</h1>
          <p className="page-subtitle">Created: {formatDate(entity.created_at)}</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-label">Users</div><div className="stat-value">{entityUsers.length}</div></div>
        <div className="stat-card"><div className="stat-label">Projects</div><div className="stat-value">{entityProjects.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total expenses</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatHUF(totalCost)}</div></div>
      </div>

      {/* Google Drive folder */}
      <div className="card mb-6" style={{ padding: '1rem 1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HardDriveUpload size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Google Drive Folder</h3>
          </div>
          {!editingDrive && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDriveFolderId(entity.google_drive_folder_id || ''); setEditingDrive(true); }}>
              <Edit3 size={13} /> Edit
            </button>
          )}
        </div>

        {editingDrive ? (
          <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>Drive folder ID</label>
              <input
                type="text"
                className="form-control text-mono"
                placeholder="e.g. 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                value={driveFolderId}
                onChange={e => setDriveFolderId(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingDrive(false)} disabled={driveSaving}>
                <X size={13} /> Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveDriveFolder} disabled={driveSaving}>
                <Save size={13} /> {driveSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: entity.google_drive_folder_id ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: entity.google_drive_folder_id ? 'var(--font-mono)' : 'inherit' }}>
            {entity.google_drive_folder_id || 'Not configured — required for diary photo uploads'}
          </div>
        )}
      </div>

      {/* Users */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={18} color="var(--accent)" /> Users ({entityUsers.length})
        </h2>
        <button type="button" onClick={() => { setFormError(''); setShowCreateUser(true); }} className="btn btn-primary btn-sm">
          <UserPlus size={14} /> New user
        </button>
      </div>

      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="hide-mobile">Email</th>
              <th>Role</th>
              <th className="hide-mobile">Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entityUsers.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No users in this entity.</td></tr>
            ) : entityUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{u.display_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {u.must_change_password
                      ? <span style={{ color: 'var(--warning-text)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Lock size={11} /> Password change</span>
                      : <span style={{ color: 'var(--success-text)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={11} /> Active</span>
                    }
                  </div>
                </td>
                <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                <td><span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Member'}</span></td>
                <td className="hide-mobile">
                  {u.must_change_password
                    ? <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><Lock size={12} /> Password change required</span>
                    : <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={12} /> Active</span>
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
          <FolderKanban size={18} color="var(--accent)" /> Projects ({entityProjects.length})
        </h2>
        <button type="button" onClick={() => { setProjFormError(''); setShowCreateProject(true); }} className="btn btn-primary btn-sm">
          <Plus size={14} /> New project
        </button>
      </div>
      {entityProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          No projects in this entity.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {entityProjects.map(p => {
            const cost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            const invoiceCount = invoices.filter(inv => inv.project_id === p.id).length;
            return (
              <Link key={p.id} href={`/projektek/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                  <div>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-primary)' }}>
                      {p.name} <ArrowUpRight size={13} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{invoiceCount} számla{p.description ? ` · ${p.description}` : ''}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(cost)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Clients */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Briefcase size={18} color="var(--accent)" /> Clients ({entityClients.length})
        </h2>
        <button type="button" onClick={() => { setClientFormError(''); setShowCreateClientModal(true); }} className="btn btn-primary btn-sm">
          <Plus size={14} /> New client
        </button>
      </div>
      {entityClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          No clients in this entity.
        </div>
      ) : (
        <div className="table-container mb-6">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hide-mobile">Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {entityClients.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.email || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} title="Add new user">
        {formError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label" htmlFor="su-name">Name *</label>
            <input id="su-name" type="text" className="form-control" required value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="su-email">Email *</label>
            <input id="su-email" type="email" className="form-control" required value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="su-pass">Temporary password *</label>
            <input id="su-pass" type="text" className="form-control text-mono" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="su-role">Role</label>
            <select id="su-role" className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="user">Member (user)</option>
              <option value="admin">Entity Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateUser(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset password">
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
            <label className="form-label">New temporary password *</label>
            <input type="text" required minLength={6} className="form-control text-mono" value={tempPass} onChange={e => setTempPass(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetTarget(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Resetting...' : 'Reset password'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Create new project">
        {projFormError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{projFormError}</span>
          </div>
        )}
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-name">Project name *</label>
            <input id="proj-name" type="text" className="form-control" required value={projName} onChange={e => setProjName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-desc">Description</label>
            <input id="proj-desc" type="text" className="form-control" value={projDesc} onChange={e => setProjDesc(e.target.value)} />
          </div>
          <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-start">Start *</label>
              <input id="proj-start" type="date" required className="form-control" value={projStartDate} onChange={e => setProjStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-end">End *</label>
              <input id="proj-end" type="date" required className="form-control" min={projStartDate || undefined} value={projEndDate} onChange={e => setProjEndDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateProject(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={projSubmitting}>{projSubmitting ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Client Modal */}
      <Modal isOpen={showCreateClientModal} onClose={() => setShowCreateClientModal(false)} title="Create new client">
        {clientFormError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{clientFormError}</span>
          </div>
        )}
        <form onSubmit={handleCreateClient}>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-name">Client name *</label>
            <input id="cl-name" type="text" className="form-control" required value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-email">Email</label>
            <input id="cl-email" type="email" className="form-control" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="cl-phone">Phone</label>
            <input id="cl-phone" type="text" className="form-control" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="cl-address">Address</label>
            <input id="cl-address" type="text" className="form-control" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateClientModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={clientSubmitting}>{clientSubmitting ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
