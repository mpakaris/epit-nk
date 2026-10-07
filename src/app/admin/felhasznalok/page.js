'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { UserPlus, Trash2, Lock, CheckCircle2, ArrowLeft, AlertCircle, RotateCcw } from 'lucide-react';

function CreateUserModal({ isOpen, onClose, createUser, effectiveEntityId, onSuccess }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Epitek2026!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const reset = () => { setDisplayName(''); setEmail(''); setPassword('Epitek2026!'); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createUser({ displayName, email, password, role: 'user', entityId: effectiveEntityId });
      onSuccess(`"${displayName}" sikeresen létrehozva! Kezdő jelszó: ${password}`);
      reset();
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt a felhasználó létrehozásakor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Új felhasználó regisztrációja">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="nu-name">Név *</label>
          <input id="nu-name" type="text" required className="form-control" placeholder="pl. Varga Balázs" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="nu-email">Email cím *</label>
          <input id="nu-email" type="email" required className="form-control" placeholder="varga.balazs@epitek.hu" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="nu-pass">Ideiglenes jelszó *</label>
          <input id="nu-pass" type="text" required className="form-control text-mono" value={password} onChange={e => setPassword(e.target.value)} />
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Első belépéskor a rendszer kötelező jelszócserét fog kérni.</span>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Szerepkör</label>
          <div className="form-control" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>Tag (felhasználó)</div>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Adminisztrátori fiókot csak a Superadmin hozhat létre.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { reset(); onClose(); }}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Létrehozás...' : 'Létrehozás'}</button>
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
      onSuccess(`Jelszó visszaállítva: ${targetUser.display_name}. Új ideiglenes jelszó: ${password}`);
      setPassword('Epitek2026!');
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a jelszó visszaállításakor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jelszó visszaállítása">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Kiválasztott felhasználó</div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{targetUser.display_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{targetUser.email}</div>
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="rp-pass">Új ideiglenes jelszó *</label>
          <input id="rp-pass" type="text" required minLength={6} className="form-control text-mono" value={password} onChange={e => setPassword(e.target.value)} placeholder="pl. Epitek2026!" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--warning-text)', marginTop: '0.4rem', background: 'var(--warning-bg)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-border)' }}>
            <Lock size={13} /><span>A felhasználónak a következő belépéskor kötelezően új jelszót kell beállítania!</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Visszaállítás...' : 'Jelszó visszaállítása'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const { currentUser, isAdmin, loading, isSuperAdmin, impersonating, effectiveEntityId, users, invoices, createUser, deleteUser, resetUserPassword } = useApp();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (isSuperAdmin && !impersonating) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Felhasználókat az entitás nézetből hozz létre</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Superadminként a felhasználókat az entitás részletes nézetéből kezeld.</p>
        <Link href="/superadmin" className="btn btn-primary btn-sm">Entitások</Link>
      </div>
    );
  }

  if (loading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza a projektekhez</Link>
      </div>
    );
  }

  const handleDeleteUser = (user) => {
    if (user.id === currentUser.id) { setAlertModal({ title: 'Nem lehetséges', message: 'Saját adminisztrátori fiókját nem törölheti!' }); return; }
    const uploadedCount = invoices.filter(inv => inv.uploaded_by === user.id).length;
    const invoiceWarning = uploadedCount > 0 ? ` Figyelem: a felhasználóhoz ${uploadedCount} feltöltött számla tartozik.` : '';
    setConfirmModal({
      title: `"${user.display_name}" törlése`,
      message: `Biztosan törölni szeretné: ${user.display_name} (${user.email})? Ez a művelet nem vonható vissza.${invoiceWarning}`,
      onConfirm: async () => {
        try { await deleteUser(user.id); setSuccessMsg(`"${user.display_name}" törölve.`); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törlés során' }); }
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
            <h1 className="page-title">Felhasználók kezelése</h1>
            <p className="page-subtitle">Fiókok regisztrálása, jelszó visszaállítás és jogosultságok</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <UserPlus size={15} /> Új Felhasználó
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Név</th>
              <th className="hide-mobile">Email</th>
              <th>Szerepkör</th>
              <th className="hide-mobile">Állapot</th>
              <th className="hide-mobile">Dátum</th>
              <th style={{ textAlign: 'right' }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {u.display_name}
                    {u.id === currentUser?.id && <span style={{ marginLeft: '0.35rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
                  </div>
                  {/* Status shown as sub-text on mobile instead of a separate column */}
                  <div className="show-mobile" style={{ marginTop: '0.2rem' }}>
                    {u.must_change_password
                      ? <span style={{ color: 'var(--warning-text)', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}><Lock size={10} /> Jelszócsere</span>
                      : <span style={{ color: 'var(--success-text)', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}><CheckCircle2 size={10} /> Aktív</span>}
                  </div>
                </td>
                <td className="text-secondary hide-mobile">{u.email}</td>
                <td><span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Tag'}</span></td>
                <td className="hide-mobile">
                  {u.must_change_password
                    ? <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><Lock size={12} /> Jelszócsere szükséges</span>
                    : <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={12} /> Aktív</span>}
                </td>
                <td className="text-muted hide-mobile" style={{ fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => setResetTarget(u)} className="btn btn-secondary btn-sm" title="Jelszó visszaállítása" style={{ padding: '0.25rem 0.55rem', gap: '0.25rem' }}>
                      <RotateCcw size={12} /><span style={{ fontSize: '0.75rem' }}>Jelszó</span>
                    </button>
                    {u.id !== currentUser?.id && (
                      <button type="button" onClick={() => handleDeleteUser(u)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} createUser={createUser} effectiveEntityId={effectiveEntityId} onSuccess={msg => setSuccessMsg(msg)} />
      <ResetPasswordModal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} targetUser={resetTarget} resetUserPassword={resetUserPassword} onSuccess={msg => setSuccessMsg(msg)} />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title || 'Megerősítés'} message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} title={alertModal?.title} message={alertModal?.message} />
    </div>
  );
}
