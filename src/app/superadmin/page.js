'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import StatCard from '@/components/StatCard';
import { formatDate, formatHUF } from '@/lib/constants';
import {
  Building2, Plus, Users, FolderKanban, Eye, Trash2,
  ShieldAlert, AlertCircle, CheckCircle2, Edit3, ArrowUpRight,
  FileText, Receipt, Coins
} from 'lucide-react';

export default function SuperAdminPage() {
  const {
    isSuperAdmin, loading, entities, users, projects, invoices,
    createEntity, updateEntity, deleteEntity, startImpersonation
  } = useApp();

  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityName, setEntityName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Admin picker for entity jump
  const [pickerEntity, setPickerEntity] = useState(null);
  const [pickerAdmins, setPickerAdmins] = useState([]);

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
      </div>
    );
  }

  const totalUsers    = users.length;
  const totalProjects = projects.length;
  const totalInvoices = invoices.length;
  const totalHUF      = invoices.reduce((s, i) => s + Number(i.value_huf || 0), 0);

  // ---- Entity modal ----
  const openCreate = () => {
    setEntityName(''); setFormError(''); setEditingEntity(null);
    setShowEntityModal(true);
  };

  const openEdit = (entity) => {
    setEntityName(entity.name); setFormError(''); setEditingEntity(entity);
    setShowEntityModal(true);
  };

  const handleEntitySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!entityName.trim()) { setFormError('Name is required!'); return; }
    setIsSubmitting(true);
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, { name: entityName.trim() });
        setSuccessMsg('Entity name updated.');
      } else {
        await createEntity({ name: entityName.trim() });
        setSuccessMsg(`"${entityName.trim()}" created.`);
      }
      setShowEntityModal(false);
    } catch (err) {
      setFormError(err.message || 'Error saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Entity jump / admin picker ----
  const handleJump = (entity) => {
    const admins = users.filter(u => u.entity_id === entity.id && u.role === 'admin');
    if (admins.length === 0) {
      setAlertModal({ message: `"${entity.name}" has no administrator yet. Create one in the entity detail view.` });
      return;
    }
    if (admins.length === 1) {
      startImpersonation(admins[0].id).catch(err => setAlertModal({ message: err.message }));
      return;
    }
    // Multiple admins — show picker
    setPickerEntity(entity);
    setPickerAdmins(admins);
  };

  const handleDelete = (entity) => {
    const entityUsers    = users.filter(u => u.entity_id === entity.id).length;
    const entityProjects = projects.filter(p => p.entity_id === entity.id).length;
    setConfirmModal({
      message: `Are you sure you want to delete "${entity.name}"?\n${entityUsers} users and ${entityProjects} projects will also be deleted. This cannot be undone!`,
      onConfirm: async () => {
        try {
          await deleteEntity(entity.id);
          setSuccessMsg(`"${entity.name}" deleted.`);
        } catch (err) {
          setAlertModal({ message: err.message });
        }
      }
    });
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldAlert size={15} /> Superadmin
            </div>
            <h1 className="page-title">Entity Management</h1>
            <p className="page-subtitle">Tenants, users and God Mode overview</p>
          </div>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={15} /> New Entity
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.75rem' }}>
        <StatCard label="Entities"       value={entities.length} sub="Active tenants"       icon={Building2}   href="/superadmin" />
        <StatCard label="Total users"    value={totalUsers}      sub="Across all entities"  icon={Users} />
        <StatCard label="Total projects" value={totalProjects}   sub="Across all entities"  icon={FolderKanban} href="/superadmin/projektek" />
        <StatCard label="Total invoices" value={totalInvoices}   sub={formatHUF(totalHUF)}  icon={Coins} href="/superadmin/projektek" />
      </div>

      {/* Entity list */}
      {entities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <Building2 size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No entities yet</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Create the first tenant entity.
          </p>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={15} /> New Entity
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
          {entities.map(entity => {
            const entityUsers    = users.filter(u => u.entity_id === entity.id);
            const entityAdmins   = entityUsers.filter(u => u.role === 'admin');
            const entityMembers  = entityUsers.filter(u => u.role === 'user');
            const entityProjects = projects.filter(p => p.entity_id === entity.id);

            return (
              <div key={entity.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Card header — title is a clickable link to entity detail */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Link
                    href={`/superadmin/entitasok/${entity.id}`}
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {entity.name}
                      <ArrowUpRight size={15} color="var(--text-muted)" />
                    </h3>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      Created: {formatDate(entity.created_at)}
                    </div>
                  </Link>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button type="button" onClick={() => openEdit(entity)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }} title="Rename">
                      <Edit3 size={13} />
                    </button>
                    <button type="button" onClick={() => handleDelete(entity)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '1.5rem', padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{entityAdmins.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Admin</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{entityMembers.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Members</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{entityProjects.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Projects</div>
                  </div>
                </div>

                {/* Admins list */}
                {entityAdmins.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 700 }}>Admin{entityAdmins.length > 1 ? 's' : ''}:</span>{' '}
                    {entityAdmins.map(a => a.display_name).join(', ')}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link
                    href={`/superadmin/projektek?entity=${entity.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FolderKanban size={14} /> View Projects
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleJump(entity)}
                    className="btn btn-sm"
                    style={{ flex: 1, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', gap: '0.4rem' }}
                  >
                    <Eye size={14} /> God Mode
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Rename Modal */}
      <Modal isOpen={showEntityModal} onClose={() => setShowEntityModal(false)} title={editingEntity ? 'Rename Entity' : 'New Entity'}>
        {formError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleEntitySubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="ent-name">Entity name *</label>
            <input id="ent-name" type="text" className="form-control" autoFocus required value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="e.g. Smith Construction Team" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEntityModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editingEntity ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Picker Modal (multiple admins in entity) */}
      <Modal
        isOpen={!!pickerEntity}
        onClose={() => setPickerEntity(null)}
        title={`Enter as: ${pickerEntity?.name}`}
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          This entity has multiple administrators. Select whose view to take over:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {pickerAdmins.map(admin => (
            <button
              key={admin.id}
              type="button"
              onClick={() => {
                setPickerEntity(null);
                startImpersonation(admin.id).catch(err => setAlertModal({ message: err.message }));
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)', background: '#fff',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Eye size={16} color="var(--warning)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{admin.display_name}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{admin.email || 'Administrator'}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerEntity(null)}>Cancel</button>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Delete Entity" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
