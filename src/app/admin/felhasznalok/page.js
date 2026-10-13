'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatDate, formatHUF } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { UserPlus, Trash2, Lock, CheckCircle2, ArrowLeft, AlertCircle, RotateCcw, UserMinus, Folder, Users } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

function CreateUserModal({ isOpen, onClose, createUser, effectiveEntityId, isSuperAdmin, onSuccess }) {
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
      await createUser({ displayName, email, password, role, entityId: effectiveEntityId });
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
          {isSuperAdmin ? (
            <select className="form-control" value={role} onChange={e => setRole(e.target.value)}>
              <option value="user">Tag (felhasználó)</option>
              <option value="admin">Admin</option>
            </select>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['user', 'admin'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: '0.55rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: role === r ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                    background: role === r ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    color: role === r ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.85rem',
                  }}
                >
                  {r === 'user' ? 'Tag' : 'Admin'}
                </button>
              ))}
            </div>
          )}
          {role === 'admin' && (
            <span style={{ fontSize: '0.725rem', color: 'var(--warning-text)', marginTop: '0.35rem', display: 'block' }}>
              Az admin teljes hozzáférést kap az entitás adataihoz.
            </span>
          )}
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

function RemoveMemberModal({ isOpen, onClose, target, soloProjects, sharedProjects, userInvoiceTotal, onConfirm }) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !target) return null;

  const handleConfirm = async () => {
    setError('');
    setRemoving(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a kiléptetés során');
      setRemoving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tag kiléptetése">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* Who */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: 'var(--danger-text)', flexShrink: 0 }}>
          {target.display_name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{target.display_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{target.email}</div>
        </div>
      </div>

      {/* Impact summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>

        {soloProjects.length > 0 && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <Trash2 size={13} /> {soloProjects.length} egyéni projekt törlésre kerül
            </div>
            <div style={{ fontSize: '0.775rem', opacity: 0.85 }}>
              {soloProjects.map(p => p.name).join(', ')} — ezekben csak ő volt tag, a számlák is törlődnek.
            </div>
          </div>
        )}

        {sharedProjects.length > 0 && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg, #fffbeb)', border: '1px solid var(--warning-border, #fcd34d)', color: 'var(--warning-text, #92400e)', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <Users size={13} /> {sharedProjects.length} közös projekt — adatok megmaradnak
            </div>
            <div style={{ fontSize: '0.775rem', opacity: 0.85 }}>
              {sharedProjects.map(p => p.name).join(', ')} — a tag „Kilépett" jelölést kap, számlái és egyenlege megmarad.
            </div>
          </div>
        )}

        {userInvoiceTotal > 0 && sharedProjects.length > 0 && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>Fennmaradó kiadás a közös projektekben: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{formatHUF(userInvoiceTotal)}</span>
            <span style={{ fontSize: '0.775rem', display: 'block', marginTop: '0.2rem', color: 'var(--text-muted)' }}>Az egyenleg és az elszámolás a kilépés után is látható marad.</span>
          </div>
        )}

        {soloProjects.length === 0 && sharedProjects.length === 0 && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Ennek a tagnak nincs projektje — a fiók egyszerűen letiltásra kerül.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={removing}>Mégse</button>
        <button type="button" className="btn btn-sm" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleConfirm} disabled={removing}>
          {removing ? 'Kiléptetés...' : 'Kiléptetés megerősítése'}
        </button>
      </div>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const { currentUser, isAdmin, loading, isSuperAdmin, impersonating, effectiveEntityId, users, invoices, projects, createUser, deleteUser, resetUserPassword } = useApp();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [removeModal, setRemoveModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (isSuperAdmin && !impersonating) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Felhasználókat az entitás nézetből hozz létre</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Superadminként a felhasználókat az entitás részletes nézetéből kezeld.</p>
        <Link href="/superadmin" className="btn btn-primary btn-sm">Entitások</Link>
      </div>
    );
  }

  if (loading) return <PageSpinner />;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza a projektekhez</Link>
      </div>
    );
  }

  const handleRemoveUser = (user) => {
    if (user.id === currentUser.id) {
      setAlertModal({ title: 'Nem lehetséges', message: 'Saját adminisztrátori fiókját nem léptetheti ki!' });
      return;
    }

    // Compute impact from AppContext data
    const userProjects = (projects || []).filter(p => (p.members || []).includes(user.id));
    const soloProjects = userProjects.filter(p => (p.members || []).length <= 1);
    const sharedProjects = userProjects.filter(p => (p.members || []).length > 1);
    const sharedProjectIds = new Set(sharedProjects.map(p => p.id));
    const userInvoiceTotal = (invoices || [])
      .filter(inv => inv.uploaded_by === user.id && sharedProjectIds.has(inv.project_id))
      .reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);

    setRemoveModal({
      user,
      soloProjects,
      sharedProjects,
      userInvoiceTotal,
      onConfirm: async () => {
        await deleteUser(user.id);
        setSuccessMsg(`"${user.display_name}" kiléptetve.`);
      },
    });
  };

  const activeUsers = users.filter(u => !u.deleted_at);
  const formerUsers = users.filter(u => u.deleted_at);

  const renderUserRow = (u, isFormer = false) => (
    <tr key={u.id} style={{ opacity: isFormer ? 0.6 : 1 }}>
      <td>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {u.display_name}
          {u.id === currentUser?.id && (
            <span style={{ fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>
          )}
          {isFormer && (
            <span style={{ fontSize: '0.675rem', color: '#fff', background: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Kilépett</span>
          )}
        </div>
        <div className="show-mobile" style={{ marginTop: '0.2rem' }}>
          {isFormer
            ? <span style={{ color: 'var(--danger-text)', fontSize: '0.7rem', fontWeight: 600 }}>Kilépett: {formatDate(u.deleted_at)}</span>
            : u.must_change_password
              ? <span style={{ color: 'var(--warning-text)', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}><Lock size={10} /> Jelszócsere</span>
              : <span style={{ color: 'var(--success-text)', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}><CheckCircle2 size={10} /> Aktív</span>
          }
        </div>
      </td>
      <td className="text-secondary hide-mobile">{u.email}</td>
      <td><span className={`role-tag ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'Tag'}</span></td>
      <td className="hide-mobile">
        {isFormer
          ? <span style={{ color: 'var(--danger-text)', fontSize: '0.775rem', fontWeight: 600 }}>Kilépett: {formatDate(u.deleted_at)}</span>
          : u.must_change_password
            ? <span style={{ color: 'var(--warning-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><Lock size={12} /> Jelszócsere szükséges</span>
            : <span style={{ color: 'var(--success-text)', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}><CheckCircle2 size={12} /> Aktív</span>
        }
      </td>
      <td className="text-muted hide-mobile" style={{ fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
      <td style={{ textAlign: 'right' }}>
        {!isFormer && (
          <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
            <button type="button" onClick={() => setResetTarget(u)} className="btn btn-secondary btn-sm" title="Jelszó visszaállítása" style={{ padding: '0.25rem 0.55rem', gap: '0.25rem' }}>
              <RotateCcw size={12} /><span style={{ fontSize: '0.75rem' }}>Jelszó</span>
            </button>
            {u.id !== currentUser?.id && (
              <button type="button" onClick={() => handleRemoveUser(u)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} title="Tag kiléptetése">
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

      {/* Active members */}
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
            {activeUsers.map(u => renderUserRow(u, false))}
            {activeUsers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>Nincsenek aktív tagok</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Former members */}
      {formerUsers.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserMinus size={14} /> Kilépett tagok ({formerUsers.length})
          </h3>
          <div className="table-container mb-6">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Név</th>
                  <th className="hide-mobile">Email</th>
                  <th>Szerepkör</th>
                  <th className="hide-mobile">Állapot</th>
                  <th className="hide-mobile">Regisztrálva</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {formerUsers.map(u => renderUserRow(u, true))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} createUser={createUser} effectiveEntityId={effectiveEntityId} isSuperAdmin={isSuperAdmin} onSuccess={msg => setSuccessMsg(msg)} />
      <ResetPasswordModal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} targetUser={resetTarget} resetUserPassword={resetUserPassword} onSuccess={msg => setSuccessMsg(msg)} />
      <RemoveMemberModal
        isOpen={!!removeModal}
        onClose={() => setRemoveModal(null)}
        target={removeModal?.user}
        soloProjects={removeModal?.soloProjects || []}
        sharedProjects={removeModal?.sharedProjects || []}
        userInvoiceTotal={removeModal?.userInvoiceTotal || 0}
        onConfirm={removeModal?.onConfirm}
      />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} title={alertModal?.title} message={alertModal?.message} />
    </div>
  );
}
