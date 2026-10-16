'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import Modal, { AlertModal } from '@/components/Modal';
import {
  UserPlus, Lock, CheckCircle2, ArrowLeft, AlertCircle,
  RotateCcw, UserMinus, Users, ShieldCheck, User as UserIcon,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import WorkspaceBadge from '@/components/WorkspaceBadge';

function CreateUserModal({ isOpen, onClose, createUser, onSuccess }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Epitek2026!');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;
  const reset = () => { setDisplayName(''); setEmail(''); setPassword('Epitek2026!'); setRole('user'); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createUser({ displayName, email, password, role });
      onSuccess(`"${displayName}" sikeresen meghívva! Kezdő jelszó: ${password}`);
      reset();
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Tag meghívása a csoportba">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Név *</label>
          <input type="text" required className="form-control" placeholder="pl. Varga Balázs" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email cím *</label>
          <input type="email" required className="form-control" placeholder="varga@email.hu" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Ideiglenes jelszó *</label>
          <input type="text" required className="form-control text-mono" value={password} onChange={e => setPassword(e.target.value)} />
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>Első belépéskor kötelező jelszócsere.</span>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Szerepkör</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['user', 'admin'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{ flex: 1, padding: '0.55rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: role === r ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', background: role === r ? 'var(--accent-light)' : 'var(--bg-subtle)', color: role === r ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>
                {r === 'user' ? 'Tag' : 'Admin'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { reset(); onClose(); }}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Meghívás...' : 'Meghívás'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ isOpen, onClose, targetUser, resetUserPassword, onSuccess }) {
  const [password, setPassword] = useState('Epitek2026!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await resetUserPassword(targetUser.id, password);
      onSuccess(`Jelszó visszaállítva: ${targetUser.display_name}`);
      setPassword('Epitek2026!');
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jelszó visszaállítása">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Felhasználó</div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{targetUser.display_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{targetUser.email}</div>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Új ideiglenes jelszó *</label>
          <input type="text" required minLength={6} className="form-control text-mono" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? '...' : 'Visszaállítás'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const {
    currentUser, isAdmin, loading, isSuperAdmin, impersonating,
    activeCollectiveId, collectives,
    users, invoices, projects,
    createUser, deleteUser, resetUserPassword,
  } = useApp();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (isSuperAdmin && !impersonating) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Entitáskezelés</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Superadminként az entitásokat a Superadmin nézetből kezeld.</p>
        <Link href="/superadmin" className="btn btn-primary btn-sm">Superadmin</Link>
      </div>
    );
  }

  if (loading) return <PageSpinner />;
  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza</Link>
      </div>
    );
  }

  // Determine the active collective name for display
  const activeCollective = (collectives || []).find(c => c.collective_id === activeCollectiveId);
  const collectiveName = activeCollective?.name || (activeCollectiveId ? '…' : null);

  // Users from entity/data are already scoped to active collective (or personal)
  const activeUsers = (users || []).filter(u => !u.deleted_at);
  const formerUsers = (users || []).filter(u => u.deleted_at);

  const handleRemoveUser = (u) => {
    if (u.id === currentUser.id) {
      setAlertModal({ title: 'Nem lehetséges', message: 'Saját fiókját nem léptetheti ki!' });
      return;
    }
    if (window.confirm(`Biztosan ki szeretnéd léptetni: ${u.display_name}?`)) {
      deleteUser(u.id)
        .then(() => setSuccessMsg(`"${u.display_name}" kiléptetve.`))
        .catch(err => setAlertModal({ title: 'Hiba', message: err.message }));
    }
  };

  const renderUserRow = (u, isFormer = false) => (
    <tr key={u.id} style={{ opacity: isFormer ? 0.6 : 1 }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
            {u.display_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              {u.display_name}
              {u.id === currentUser?.id && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
              {isFormer && <span style={{ fontSize: '0.65rem', color: '#fff', background: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Kilépett</span>}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700, color: (u.collective_role === 'owner' || u.role === 'admin') ? 'var(--accent)' : 'var(--text-secondary)' }}>
          {(u.collective_role === 'owner' || u.role === 'admin') ? <ShieldCheck size={13} /> : <UserIcon size={13} />}
          {u.collective_role === 'owner' ? 'Tulajdonos' : u.collective_role === 'admin' ? 'Admin' : 'Tag'}
        </span>
      </td>
      <td className="hide-mobile">
        {isFormer
          ? <span style={{ color: 'var(--danger-text)', fontSize: '0.775rem', fontWeight: 600 }}>Kilépett: {formatDate(u.deleted_at)}</span>
          : u.must_change_password
            ? <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><Lock size={12} /> Jelszócsere</span>
            : <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={12} /> Aktív</span>
        }
      </td>
      <td style={{ textAlign: 'right' }}>
        {!isFormer && (
          <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
            <button type="button" onClick={() => setResetTarget(u)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.55rem', gap: '0.25rem' }}>
              <RotateCcw size={12} /><span style={{ fontSize: '0.75rem' }}>Jelszó</span>
            </button>
            {u.id !== currentUser?.id && (
              <button type="button" onClick={() => handleRemoveUser(u)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                <UserMinus size={13} />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Users size={22} /> Csoport tagjai <WorkspaceBadge />
            </h1>
            {collectiveName
              ? <p className="page-subtitle">Aktív csoport: <strong>{collectiveName}</strong></p>
              : <p className="page-subtitle">Személyes munkaterület — nincs aktív csoport</p>
            }
          </div>
          {activeCollectiveId && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={15} /> Tag meghívása
            </button>
          )}
        </div>
      </div>

      {!activeCollectiveId && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          Válassz egy csoportot a fejléc kapcsolóval a tagok megtekintéséhez.
        </div>
      )}

      {activeCollectiveId && (
        <>
          {successMsg && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={16} /><span>{successMsg}</span>
            </div>
          )}

          <div className="table-container mb-6">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Szerepkör</th>
                  <th className="hide-mobile">Állapot</th>
                  <th style={{ textAlign: 'right' }}>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map(u => renderUserRow(u, false))}
                {activeUsers.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Nincsenek aktív tagok</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {formerUsers.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserMinus size={14} /> Kilépett tagok ({formerUsers.length})
              </h3>
              <div className="table-container mb-6">
                <table className="custom-table">
                  <thead>
                    <tr><th>Tag</th><th>Szerepkör</th><th className="hide-mobile">Állapot</th><th /></tr>
                  </thead>
                  <tbody>{formerUsers.map(u => renderUserRow(u, true))}</tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} createUser={createUser} onSuccess={msg => setSuccessMsg(msg)} />
      <ResetPasswordModal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} targetUser={resetTarget} resetUserPassword={resetUserPassword} onSuccess={msg => setSuccessMsg(msg)} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} title={alertModal?.title} message={alertModal?.message} />
    </div>
  );
}
