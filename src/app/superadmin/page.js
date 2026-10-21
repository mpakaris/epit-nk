'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import StatCard from '@/components/StatCard';
import { formatDate, formatHUF } from '@/lib/constants';
import {
  Building2, Plus, Users, FolderKanban, Eye, Trash2,
  ShieldAlert, AlertCircle, CheckCircle2, Edit3, ArrowUpRight,
  FileText, Receipt, Coins, Globe, CreditCard, Image, Mail, Loader2,
  Skull, Search, X,
} from 'lucide-react';

export default function SuperAdminPage() {
  const {
    isSuperAdmin, loading, entities, users, projects, invoices,
    createEntity, updateEntity, deleteEntity, startImpersonation, allMemberships
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

  const [smtpPinging, setSmtpPinging] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null); // null | { ok, from } | { ok: false, error }

  const [repairEmail, setRepairEmail] = useState('');
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const [deletionRunning, setDeletionRunning] = useState(false);
  const [deletionResult, setDeletionResult] = useState(null);

  const handleRepairAuth = async () => {
    if (!repairEmail.trim()) return;
    setRepairLoading(true);
    setRepairResult(null);
    try {
      const res = await fetch('/api/superadmin/repair-auth-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: repairEmail.trim() }),
      });
      const data = await res.json();
      setRepairResult(data);
    } catch (err) {
      setRepairResult({ error: err.message });
    } finally {
      setRepairLoading(false);
    }
  };

  const [deletionEmail, setDeletionEmail] = useState('');

  // ── Total Recall ──
  const [recallUsers,    setRecallUsers]    = useState([]);
  const [recallLoading,  setRecallLoading]  = useState(false);
  const [recallSearch,   setRecallSearch]   = useState('');
  const [recallDeleting, setRecallDeleting] = useState(null);  // email being deleted
  const [recallConfirm,  setRecallConfirm]  = useState(null);  // { user } awaiting typed confirmation
  const [recallInput,    setRecallInput]    = useState('');
  const [recallResult,   setRecallResult]   = useState(null);  // { ok, email } | { error }

  useEffect(() => {
    fetch('/api/superadmin/total-recall')
      .then(r => r.json())
      .then(d => setRecallUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  const handleTotalRecall = async (user) => {
    setRecallDeleting(user.email);
    setRecallResult(null);
    try {
      const res = await fetch('/api/superadmin/total-recall', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecallUsers(prev => prev.filter(u => u.email !== user.email));
        setRecallResult({ ok: true, email: user.email });
      } else {
        setRecallResult({ error: data.error });
      }
    } catch (e) {
      setRecallResult({ error: e.message });
    } finally {
      setRecallDeleting(null);
      setRecallConfirm(null);
      setRecallInput('');
    }
  };

  const handleExecuteDeletions = async (email) => {
    setDeletionRunning(true);
    setDeletionResult(null);
    try {
      const res = await fetch('/api/superadmin/execute-deletions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();
      setDeletionResult(data);
      if (email && data.ok) setDeletionEmail('');
    } catch (err) {
      setDeletionResult({ error: err.message });
    } finally {
      setDeletionRunning(false);
    }
  };

  const handleSmtpPing = async () => {
    setSmtpPinging(true);
    setSmtpStatus(null);
    try {
      const res = await fetch('/api/superadmin/email/ping', { method: 'POST' });
      const data = await res.json();
      setSmtpStatus(data);
    } catch (err) {
      setSmtpStatus({ ok: false, error: err.message });
    } finally {
      setSmtpPinging(false);
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
      </div>
    );
  }

  const collectiveEntities = entities.filter(e => e.type !== 'personal');

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

  // ---- Entity jump / user picker ────────────────────────────────────────
  const handleJump = (entity) => {
    // Build member list directly from allMemberships (includes display_name)
    const members = allMemberships
      .filter(m => m.entity_id === entity.id)
      .map(m => ({ id: m.user_id, display_name: m.display_name, email: m.email, role: m.role }));

    if (members.length === 0) {
      setAlertModal({ message: `"${entity.name}" has no members yet.` });
      return;
    }
    if (members.length === 1) {
      startImpersonation(members[0].id).catch(err => setAlertModal({ message: err.message }));
      return;
    }
    setPickerEntity(entity);
    setPickerAdmins(members);
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
        <StatCard label="Entities"       value={collectiveEntities.length} sub="Active tenants"       icon={Building2}   href="/superadmin" />
        <StatCard label="Total users"    value={totalUsers}      sub="Across all entities"  icon={Users} />
        <StatCard label="Total projects" value={totalProjects}   sub="Across all entities"  icon={FolderKanban} href="/superadmin/projektek" />
        <StatCard label="Total invoices" value={totalInvoices}   sub={formatHUF(totalHUF)}  icon={Coins} href="/superadmin/projektek" />
        <StatCard label="Websites"        value="→"              sub="Partner pages"          icon={Globe}       href="/superadmin/websites" />
        <StatCard label="Subscriptions"  value="→"              sub="Premium management"     icon={CreditCard}  href="/superadmin/subscriptions" />
        <StatCard label="Árazás"         value="→"              sub="Díjak és limitek"        icon={CreditCard}  href="/superadmin/pricing" />
        <StatCard label="Képkönyvtár"    value="→"              sub="Hero & library images"  icon={Image}       href="/superadmin/image-library" />
        <StatCard label="About Us Image"  value="→"              sub="Portrait photo for /about page" icon={Image} href="/superadmin/about" />
        <StatCard label="Ügyfél portálok" value="→"             sub="Minden ügyfél portálja" icon={Users}       href="/superadmin/portals" />
      </div>

      {/* Entity list */}
      {collectiveEntities.length === 0 ? (
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
          {collectiveEntities.map(entity => {
            const entityMemberships = allMemberships.filter(m => m.entity_id === entity.id);
            const entityAdmins      = entityMemberships.filter(m => ['owner', 'admin'].includes(m.role));
            const entityMembers     = entityMemberships.filter(m => !['owner', 'admin'].includes(m.role));
            const entityProjects    = projects.filter(p => p.entity_id === entity.id || p.collective_id === entity.id);

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

      {/* ── Auth User Repair ── */}
      <div className="card" style={{ padding: '1.15rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <ShieldAlert size={16} color="var(--warning)" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Auth Repair — Missing Supabase User</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
          If a profile exists in the database but has no corresponding entry in Supabase Authentication,
          use this to recreate the auth user with the same UUID — all data references stay intact.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="user@example.com"
            value={repairEmail}
            onChange={e => { setRepairEmail(e.target.value); setRepairResult(null); }}
            style={{ flex: 1, minWidth: 220, padding: '0.5rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRepairAuth}
            disabled={repairLoading || !repairEmail.trim()}
          >
            {repairLoading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Repairing…</> : 'Repair Auth User'}
          </button>
        </div>
        {repairResult && (
          <div style={{ marginTop: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: repairResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${repairResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: repairResult.ok ? 'var(--success-text)' : 'var(--danger-text)',
          }}>
            {repairResult.ok
              ? <><CheckCircle2 size={15} /> {repairResult.message} <code style={{ fontSize: '0.75rem' }}>{repairResult.userId}</code></>
              : <><AlertCircle size={15} /> {repairResult.error}</>}
          </div>
        )}
      </div>

      {/* ── Pending Deletions ── */}
      <div className="card" style={{ padding: '1.15rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Trash2 size={16} color="var(--danger)" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Delete Account</h3>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
          Delete by email (e.g. from a user email request), or run all pending scheduled deletions.
          Personal data is wiped, collective contributions stay as "Törölt felhasználó".
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
          <input
            type="email"
            placeholder="user@example.com (optional)"
            value={deletionEmail}
            onChange={e => { setDeletionEmail(e.target.value); setDeletionResult(null); }}
            style={{ flex: 1, minWidth: 220, padding: '0.5rem 0.75rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleExecuteDeletions(deletionEmail.trim() || null)} disabled={deletionRunning}>
            {deletionRunning ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : deletionEmail.trim() ? 'Delete User' : 'Run Pending'}
          </button>
        </div>
        {deletionResult && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem',
            background: deletionResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${deletionResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: deletionResult.ok ? 'var(--success-text)' : 'var(--danger-text)',
          }}>
            {deletionResult.ok
              ? deletionResult.deleted === 0
                ? <><CheckCircle2 size={14} /> No pending deletions found.</>
                : <><CheckCircle2 size={14} /> Deleted {deletionResult.deleted} of {deletionResult.total} users. {deletionResult.users?.filter(u => !u.success).map(u => `${u.email}: ${u.error}`).join(', ')}</>
              : <><AlertCircle size={14} /> {deletionResult.error}</>
            }
          </div>
        )}
      </div>

      {/* ── SMTP / Email ── */}
      <div className="card" style={{ padding: '1.15rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Mail size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Email / SMTP</h3>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSmtpPing} disabled={smtpPinging}>
            {smtpPinging ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Tesztelés…</> : <>Kapcsolat tesztelése</>}
          </button>
        </div>
        {smtpStatus && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: smtpStatus.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${smtpStatus.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: smtpStatus.ok ? 'var(--success-text)' : 'var(--danger-text)',
          }}>
            {smtpStatus.ok
              ? <><CheckCircle2 size={15} /> Sikeres kapcsolat — küldés innen: <strong>{smtpStatus.from}</strong></>
              : <><AlertCircle size={15} /> Hiba: {smtpStatus.error}</>}
          </div>
        )}
        {!smtpStatus && (
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
            Gmail SMTP · <code>smtp.gmail.com:587</code> · {process.env.SMTP_FROM_EMAIL || 'SMTP_FROM_EMAIL not set'}
          </p>
        )}
      </div>

      {/* ── Total Recall ── */}
      <div className="card" style={{ padding: '1.15rem', marginBottom: '1.5rem', border: '1.5px solid var(--danger-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <Skull size={16} color="var(--danger)" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Total Recall</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
          Permanently wipes every DB row and auth record for a user — projects, quotes, collectives, subscriptions, trial history, everything. Irreversible.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Filter by email or name…"
            value={recallSearch}
            onChange={e => setRecallSearch(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Result banner */}
        {recallResult && (
          <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: recallResult.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${recallResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
            color: recallResult.ok ? 'var(--success-text)' : 'var(--danger-text)',
          }}>
            {recallResult.ok
              ? <><CheckCircle2 size={14} /> <strong>{recallResult.email}</strong> — fully wiped.</>
              : <><AlertCircle size={14} /> {recallResult.error}</>}
            <button type="button" onClick={() => setRecallResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={13} /></button>
          </div>
        )}

        {/* User list */}
        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          {recallUsers
            .filter(u => {
              const q = recallSearch.toLowerCase();
              return !q || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
            })
            .map(u => {
              const tierColor = u.is_subscription_premium ? '#b45309' : u.subscription_tier === 'trial' ? '#1d4ed8' : 'var(--text-muted)';
              const tierLabel = u.is_subscription_premium ? '⭐ Premium' : u.subscription_tier === 'trial' ? '⏳ Trial' : 'Basic';
              const isDeleting = recallDeleting === u.email;
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', background: isDeleting ? 'var(--danger-bg)' : 'transparent' }}>
                  {/* Avatar */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {(u.display_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  {/* Tier badge */}
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', color: tierColor, border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                    {tierLabel}
                  </span>
                  {/* Delete button */}
                  <button
                    type="button"
                    disabled={!!recallDeleting}
                    onClick={() => { setRecallConfirm(u); setRecallInput(''); setRecallResult(null); }}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 700, cursor: recallDeleting ? 'default' : 'pointer', opacity: recallDeleting ? 0.5 : 1 }}
                  >
                    {isDeleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Skull size={12} />}
                    {isDeleting ? 'Wiping…' : 'Recall'}
                  </button>
                </div>
              );
            })}
          {recallUsers.filter(u => {
            const q = recallSearch.toLowerCase();
            return !q || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
          }).length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              {recallSearch ? 'No users match your search.' : 'No users found.'}
            </div>
          )}
        </div>
      </div>

      {/* Total Recall confirmation modal */}
      <Modal isOpen={!!recallConfirm} onClose={() => { setRecallConfirm(null); setRecallInput(''); }} title="⚠ Total Recall — Irreversible">
        {recallConfirm && (
          <div>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.6 }}>
              This will permanently destroy <strong>every record</strong> for <strong>{recallConfirm.email}</strong> — projects, quotes, collectives, subscriptions, auth account, trial history. There is no undo.
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Type the email address to confirm:
            </p>
            <input
              type="text"
              autoFocus
              className="form-control"
              placeholder={recallConfirm.email}
              value={recallInput}
              onChange={e => setRecallInput(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setRecallConfirm(null); setRecallInput(''); }}>Cancel</button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={recallInput !== recallConfirm.email || !!recallDeleting}
                onClick={() => handleTotalRecall(recallConfirm)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Skull size={13} /> Total Recall
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Delete Entity" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
