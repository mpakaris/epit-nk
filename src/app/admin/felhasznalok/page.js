'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { 
  UserPlus, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  ArrowLeft,
  AlertCircle,
  KeyRound,
  RotateCcw
} from 'lucide-react';

export default function AdminUsersPage() {
  const { currentUser, isAdmin, users, invoices, createUser, deleteUser, resetUserPassword } = useApp();

  // Create user modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Epitek2026!');
  const [role, setRole] = useState('user');

  // Reset password modal
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('Epitek2026!');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await createUser({
        displayName,
        email,
        password,
        role
      });
      setSuccessMsg(`"${displayName}" sikeresen létrehozva! Kezdő jelszó: ${password}`);
      setDisplayName('');
      setEmail('');
      setPassword('Epitek2026!');
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Hiba történt a felhasználó létrehozásakor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setError('');
    setIsSubmitting(true);

    try {
      await resetUserPassword(resetTargetUser.id, tempPassword);
      setSuccessMsg(`Jelszó sikeresen visszaállítva: ${resetTargetUser.display_name} (${resetTargetUser.email}). Új ideiglenes jelszó: ${tempPassword}`);
      setResetTargetUser(null);
      setTempPassword('Epitek2026!');
    } catch (err) {
      setError(err.message || 'Hiba a jelszó visszaállításakor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user) => {
    if (user.id === currentUser.id) {
      setAlertModal({ title: 'Nem lehetséges', message: 'Saját adminisztrátori fiókját nem törölheti!' });
      return;
    }
    const uploadedCount = invoices.filter(inv => inv.uploaded_by === user.id).length;
    const invoiceWarning = uploadedCount > 0
      ? ` Figyelem: a felhasználóhoz ${uploadedCount} feltöltött számla tartozik — ezek a rendszerben maradnak, de a feltöltő neve elveszhet.`
      : '';
    setConfirmModal({
      title: `"${user.display_name}" törlése`,
      message: `Biztosan törölni szeretné: ${user.display_name} (${user.email})? Ez a művelet nem vonható vissza.${invoiceWarning}`,
      onConfirm: async () => {
        try {
          await deleteUser(user.id);
          setSuccessMsg(`"${user.display_name}" törölve.`);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törlés során' });
        }
      }
    });
  };

  return (
    <div className="container">
      {/* Top back link */}
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link 
          href="/admin" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza az áttekintéshez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Felhasználók kezelése</h1>
            <p className="page-subtitle">
              Fiókok regisztrálása, jelszó visszaállítás és jogosultságok
            </p>
          </div>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setError('');
              setIsModalOpen(true);
            }}
          >
            <UserPlus size={15} /> Új Felhasználó
          </button>
        </div>
      </div>

      {successMsg && (
        <div 
          style={{ 
            background: 'var(--success-bg)', 
            border: '1px solid var(--success-border)', 
            color: 'var(--success-text)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="table-container mb-6">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Név</th>
              <th>Email</th>
              <th>Szerepkör</th>
              <th>Állapot</th>
              <th>Dátum</th>
              <th style={{ textAlign: 'right' }}>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {u.display_name}
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: '0.35rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                        Ön
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-secondary">{u.email}</td>
                <td>
                  <span className={`role-tag ${u.role}`}>
                    {u.role === 'admin' ? 'Admin' : 'Tag'}
                  </span>
                </td>
                <td>
                  {u.must_change_password ? (
                    <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      <Lock size={12} /> Jelszócsere szükséges
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Aktív
                    </span>
                  )}
                </td>
                <td className="text-muted" style={{ fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                    {/* Reset password button */}
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setResetTargetUser(u);
                        setTempPassword('Epitek2026!');
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Jelszó visszaállítása"
                      style={{ padding: '0.25rem 0.55rem', gap: '0.25rem' }}
                    >
                      <RotateCcw size={12} />
                      <span style={{ fontSize: '0.75rem' }}>Jelszó</span>
                    </button>

                    {/* Delete user button */}
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="btn btn-danger btn-sm"
                        title="Felhasználó törlése"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
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

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Új felhasználó regisztrációja"
      >
        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger-text)', 
              padding: '0.65rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem'
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-name">Név *</label>
            <input
              id="new-name"
              type="text"
              required
              className="form-control"
              placeholder="pl. Varga Balázs"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-email">Email cím *</label>
            <input
              id="new-email"
              type="email"
              required
              className="form-control"
              placeholder="varga.balazs@epitek.hu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-pass">
              Ideiglenes jelszó *
            </label>
            <input
              id="new-pass"
              type="text"
              required
              className="form-control text-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Első belépéskor a rendszer kötelező jelszócserét fog kérni.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="new-role">Szerepkör</label>
            <select
              id="new-role"
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">Tag (Normál számlafeltöltő)</option>
              <option value="admin">Adminisztrátor</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsModalOpen(false)}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Létrehozás...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        title="Jelszó visszaállítása"
      >
        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger-text)', 
              padding: '0.65rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem'
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Kiválasztott felhasználó
            </div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {resetTargetUser?.display_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {resetTargetUser?.email}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="temp-pass">
              Új ideiglenes jelszó beállítása *
            </label>
            <input
              id="temp-pass"
              type="text"
              required
              minLength={6}
              className="form-control text-mono"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="pl. Epitek2026!"
            />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              color: 'var(--warning-text)', 
              marginTop: '0.4rem',
              background: 'var(--warning-bg)',
              padding: '0.45rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--warning-border)'
            }}>
              <Lock size={13} />
              <span>A felhasználónak a következő belépéskor kötelezően új jelszót kell beállítania!</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setResetTargetUser(null)}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Visszaállítás...' : 'Jelszó visszaállítása'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title={confirmModal?.title || 'Megerősítés'}
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title}
        message={alertModal?.message}
      />
    </div>
  );
}
