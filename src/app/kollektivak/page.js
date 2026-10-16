'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import {
  Users, Plus, Crown, UserCheck, Trash2, UserMinus,
  Mail, AlertCircle, CheckCircle2, Settings, ChevronDown, ChevronUp,
} from 'lucide-react';

const ROLE_LABEL = { owner: 'Tulajdonos', admin: 'Admin', contributor: 'Közreműködő' };
const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--text-secondary)' };
const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--bg-subtle)' };

export default function KollektivakPage() {
  const router = useRouter();
  const { currentUser, loading, dataReady } = useApp();

  const [collectives, setCollectives] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [inviteCollectiveId, setInviteCollectiveId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [renameCollective, setRenameCollective] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [expandedId, setExpandedId] = useState(null);

  const fetchCollectives = async () => {
    const res = await fetch('/api/collectives');
    const data = await res.json();
    if (res.ok) setCollectives(data.collectives || []);
    setFetching(false);
  };

  useEffect(() => { if (dataReady) fetchCollectives(); }, [dataReady]);

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setCreateError('');
    const res = await fetch('/api/collectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      if (data.error === 'PREMIUM_REQUIRED') { setShowCreate(false); setShowPremiumModal(true); return; }
      setCreateError(data.error || 'Hiba a létrehozáskor');
      return;
    }
    setShowCreate(false);
    setCreateName('');
    toast('Kollektíva létrehozva.');
    fetchCollectives();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true); setInviteError('');
    const res = await fetch(`/api/collectives/${inviteCollectiveId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { setInviteError(data.error || 'Hiba a meghívásnál'); return; }
    setInviteCollectiveId(null);
    setInviteEmail('');
    toast('Tag sikeresen meghívva.');
    fetchCollectives();
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenaming(true); setRenameError('');
    const res = await fetch(`/api/collectives/${renameCollective.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameName.trim() }),
    });
    const data = await res.json();
    setRenaming(false);
    if (!res.ok) { setRenameError(data.error || 'Hiba az átnevezésnél'); return; }
    setRenameCollective(null);
    toast('Kollektíva átnevezve.');
    fetchCollectives();
  };

  const handleRemoveMember = (collective, member) => {
    const isSelf = member.user_id === currentUser?.id;
    setConfirmModal({
      message: isSelf
        ? `Biztosan ki szeretne lépni a(z) „${collective.name}" kollektívából?`
        : `Biztosan eltávolítja „${member.display_name}" tagot a(z) „${collective.name}" kollektívából?`,
      onConfirm: async () => {
        const res = await fetch(`/api/collectives/${collective.id}/members/${member.user_id}`, { method: 'DELETE' });
        const data = await res.json();
        setConfirmModal(null);
        if (!res.ok) { setAlertModal({ message: data.error }); return; }
        toast(isSelf ? 'Kilépett a kollektívából.' : 'Tag eltávolítva.');
        fetchCollectives();
      },
    });
  };

  const handleDeleteCollective = (collective) => {
    setConfirmModal({
      message: `Biztosan törli a(z) „${collective.name}" kollektívát? Ez a lépés nem vonható vissza.`,
      onConfirm: async () => {
        const res = await fetch(`/api/collectives/${collective.id}`, { method: 'DELETE' });
        const data = await res.json();
        setConfirmModal(null);
        if (!res.ok) { setAlertModal({ message: data.error }); return; }
        toast('Kollektíva törölve.');
        fetchCollectives();
      },
    });
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const myCollectives       = collectives.filter(c => c.my_role === 'owner');
  const invitedCollectives  = collectives.filter(c => c.my_role !== 'owner');

  const renderCollective = (collective) => {
    const isOwner    = collective.my_role === 'owner';
    const isExpanded = expandedId === collective.id;

    return (
      <div key={collective.id} className="card" style={{ marginBottom: '0.75rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} color="var(--accent)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collective.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontWeight: 700, padding: '0.05rem 0.45rem', borderRadius: 'var(--radius-pill)', fontSize: '0.68rem' }}>
                  {ROLE_LABEL[collective.my_role]}
                </span>
                <span>{collective.members.filter(m => m.status === 'active').length} tag</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
            {isOwner && (
              <>
                <button type="button" className="btn btn-secondary btn-sm" title="Tag meghívása" onClick={() => { setInviteCollectiveId(collective.id); setInviteEmail(''); setInviteError(''); }}>
                  <Mail size={13} /> Meghívás
                </button>
                <button type="button" className="btn btn-secondary btn-sm" title="Átnevezés" onClick={() => { setRenameCollective(collective); setRenameName(collective.name); setRenameError(''); }}>
                  <Settings size={13} />
                </button>
                <button type="button" className="btn btn-danger btn-sm" title="Törlés" onClick={() => handleDeleteCollective(collective)}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedId(isExpanded ? null : collective.id)}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Members list */}
        {isExpanded && (
          <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            {collective.members.map(member => {
              const isSelf = member.user_id === currentUser?.id;
              const canRemove = isOwner ? !isSelf || collective.members.filter(m => m.role === 'owner').length > 1 : isSelf;
              return (
                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {member.role === 'owner' ? <Crown size={14} color="var(--accent)" /> : <UserCheck size={14} color="var(--text-muted)" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {member.display_name}
                        {isSelf && <span style={{ fontSize: '0.65rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>én</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{member.email}</span>
                        <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: 'var(--radius-pill)', fontSize: '0.65rem' }}>{ROLE_LABEL[member.role]}</span>
                      </div>
                    </div>
                  </div>
                  {canRemove && (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem' }} title={isSelf ? 'Kilépés' : 'Eltávolítás'} onClick={() => handleRemoveMember(collective, member)}>
                      <UserMinus size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Kollektívák</h1>
            <p className="page-subtitle">Megosztott csapatmunkaterületek kezelése</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCreateName(''); setCreateError(''); setShowCreate(true); }}>
            <Plus size={15} /> Új kollektíva
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} />{successMsg}
        </div>
      )}

      {/* My collectives (owner) */}
      {myCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Általam létrehozva
          </div>
          {myCollectives.map(renderCollective)}
        </div>
      )}

      {/* Invited collectives */}
      {invitedCollectives.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Meghívottként
          </div>
          {invitedCollectives.map(renderCollective)}
        </div>
      )}

      {collectives.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>Még nincsenek kollektívák</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Hozz létre egy kollektívát, vagy várj, amíg valaki meghív.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCreateName(''); setCreateError(''); setShowCreate(true); }}>
            <Plus size={15} /> Új kollektíva
          </button>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Új kollektíva létrehozása">
        {createError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{createError}</span>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Kollektíva neve *</label>
            <input type="text" required autoFocus className="form-control" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="pl. Kovács és Társai" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>{creating ? 'Létrehozás...' : 'Létrehozás'}</button>
          </div>
        </form>
      </Modal>

      {/* Premium required modal */}
      <Modal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} title="Prémium előfizetés szükséges">
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <Crown size={40} color="var(--accent)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
            Kollektíva létrehozásához Prémium előfizetés szükséges.
          </p>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Csapatmunkaterületek létrehozása és kezelése csak Prémium csomaggal érhető el.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPremiumModal(false)}>Mégse</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setShowPremiumModal(false); router.push('/elofizetes'); }}>
              Előfizetések megtekintése
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal isOpen={!!inviteCollectiveId} onClose={() => setInviteCollectiveId(null)} title="Tag meghívása">
        {inviteError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">Meghívott e-mail címe *</label>
            <input type="email" required autoFocus className="form-control" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pelda@email.hu" />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>A felhasználónak regisztrált fiókkal kell rendelkeznie.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInviteCollectiveId(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>{inviting ? 'Meghívás...' : 'Meghívás'}</button>
          </div>
        </form>
      </Modal>

      {/* Rename modal */}
      <Modal isOpen={!!renameCollective} onClose={() => setRenameCollective(null)} title="Kollektíva átnevezése">
        {renameError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{renameError}</span>
          </div>
        )}
        <form onSubmit={handleRename}>
          <div className="form-group">
            <label className="form-label">Új név *</label>
            <input type="text" required autoFocus className="form-control" value={renameName} onChange={e => setRenameName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRenameCollective(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={renaming}>{renaming ? 'Mentés...' : 'Mentés'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
