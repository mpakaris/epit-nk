'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import { formatDate } from '@/lib/constants';
import {
  Users, Plus, Crown, UserCheck, Trash2, UserMinus,
  Mail, AlertCircle, CheckCircle2, Settings, Loader2, X, Ban, ShieldCheck, RefreshCw, AlertTriangle,
} from 'lucide-react';

const ROLE_LABEL = { owner: 'Tulajdonos', admin: 'Admin', contributor: 'Közreműködő' };
const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--success-text)' };
const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--success-bg)' };

export default function KollektivakPage() {
  const router = useRouter();
  const { currentUser, loading, dataReady, refreshCollectives } = useApp();

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

  const [retractingId, setRetractingId]   = useState(null);
  const [reInvitingId, setReInvitingId]   = useState(null);
  const [blockingId, setBlockingId]       = useState(null);

  const handleBlockMember = async (collective, member, action) => {
    setBlockingId(member.user_id);
    const res = await fetch(`/api/collectives/${collective.id}/members/${member.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBlockingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    toast(action === 'block'
      ? `${member.display_name} kitiltva a kollektívából.`
      : `${member.display_name} hozzáférése visszaállítva.`
    );
    fetchCollectives();
  };

  const handleReInvite = async (collectiveId, inv) => {
    setReInvitingId(inv.id);
    const res  = await fetch(`/api/collectives/${collectiveId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inv.email }),
    });
    const data = await res.json();
    setReInvitingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    toast(`Meghívó újraküldve: ${inv.email}`);
    fetchCollectives();
  };

  const handleRetractInvitation = async (inv) => {
    setRetractingId(inv.id);
    const res = await fetch(`/api/collectives/invitations/${inv.id}`, { method: 'DELETE' });
    const data = await res.json();
    setRetractingId(null);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    toast('Meghívó visszavonva.');
    fetchCollectives();
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const fetchCollectives = async () => {
    const [colRes, invRes] = await Promise.all([
      fetch('/api/collectives'),
      fetch('/api/collectives/invitations'),
    ]);
    const colData = await colRes.json();
    const invData = invRes.ok ? await invRes.json() : { invitations: [] };

    if (colRes.ok) {
      const pendingBy  = {};
      const declinedBy = {};
      for (const inv of (invData.invitations || [])) {
        if (inv.status === 'pending') {
          if (!pendingBy[inv.collective_id])  pendingBy[inv.collective_id]  = [];
          pendingBy[inv.collective_id].push(inv);
        } else if (inv.status === 'declined') {
          if (!declinedBy[inv.collective_id]) declinedBy[inv.collective_id] = [];
          declinedBy[inv.collective_id].push(inv);
        }
      }
      setCollectives((colData.collectives || []).map(c => ({
        ...c,
        pending_invitations:  pendingBy[c.id]  || [],
        declined_invitations: declinedBy[c.id] || [],
      })));
    }
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
    refreshCollectives();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true); setInviteError('');
    const res = await fetch(`/api/collectives/${inviteCollectiveId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { setInviteError(data.error || 'Hiba a meghívásnál'); return; }
    setInviteCollectiveId(null);
    setInviteEmail('');
    toast('Meghívó elküldve e-mailben.');
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
    refreshCollectives();
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
    setDeleteInput('');
    setDeleteModal(collective);
  };

  const executeDeleteCollective = async () => {
    if (!deleteModal) return;
    setDeleteConfirming(true);
    const res = await fetch(`/api/collectives/${deleteModal.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleteConfirming(false);
    if (!res.ok) { setAlertModal({ message: data.error }); return; }
    setDeleteModal(null);
    toast('Kollektíva törölve.');
    fetchCollectives();
    refreshCollectives();
  };

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const myCollectives       = collectives.filter(c => c.my_role === 'owner');
  const invitedCollectives  = collectives.filter(c => c.my_role !== 'owner');

  const renderMemberRow = (collective, member) => {
    const isOwnerViewing = collective.my_role === 'owner';
    const isSelf         = member.user_id === currentUser?.id;
    const isBlocked      = member.status === 'blocked';
    const isThisOwner    = member.role === 'owner';
    const isWorking      = blockingId === member.user_id;

    return (
      <div key={member.user_id} style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem', opacity: isBlocked ? 0.55 : 1 }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isBlocked ? 'var(--danger-bg)' : isThisOwner ? 'var(--accent-light)' : 'var(--bg-subtle)',
            border: `1px solid ${isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
          }}>
            {isBlocked    ? <Ban size={13} color="var(--danger)" />
             : isThisOwner ? <Crown size={13} color="var(--accent)" />
             : <UserCheck size={13} color="var(--text-muted)" />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
              {member.display_name}
              {isSelf      && <span style={{ fontSize: '0.6rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>én</span>}
              {isBlocked   && <span style={{ fontSize: '0.6rem', background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>Tiltott</span>}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{member.email}</span>
              <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.4rem', borderRadius: 'var(--radius-pill)', fontSize: '0.6rem' }}>{ROLE_LABEL[member.role]}</span>
              {member.joined_at && <span>· Csatlakozott: {formatDate(member.joined_at)}</span>}
            </div>
          </div>
        </div>

        {/* Buttons — owner sees controls for non-owner members; members see only Leave for themselves */}
        {isOwnerViewing && !isThisOwner && (
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            {isBlocked ? (
              <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking} onClick={() => handleBlockMember(collective, member, 'unblock')} style={{ gap: '0.3rem' }}>
                {isWorking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={12} />} Tiltás feloldása
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" disabled={isWorking} onClick={() => handleBlockMember(collective, member, 'block')} style={{ gap: '0.3rem' }}>
                {isWorking ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={12} />} Tiltás
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ gap: '0.3rem' }}>
              <UserMinus size={12} /> Eltávolítás
            </button>
          </div>
        )}
        {!isOwnerViewing && isSelf && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveMember(collective, member)} style={{ gap: '0.3rem' }}>
              <UserMinus size={12} /> Kilépés
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCollective = (collective) => {
    const isOwner       = collective.my_role === 'owner';
    const activeMembers = (collective.members || []).filter(m => m.status === 'active');
    const blockedMembers= (collective.members || []).filter(m => m.status === 'blocked');
    const pendingInvs   = collective.pending_invitations  || [];
    const declinedInvs  = collective.declined_invitations || [];

    return (
      <div key={collective.id} className="card" style={{ marginBottom: '1rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={19} color="var(--accent)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{collective.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem' }}>
                <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontWeight: 700, padding: '0.05rem 0.45rem', borderRadius: 'var(--radius-pill)', fontSize: '0.65rem' }}>
                  {ROLE_LABEL[collective.my_role]}
                </span>
                <span><strong>{activeMembers.length}</strong> aktív tag</span>
                {pendingInvs.length > 0 && <span>· {pendingInvs.length} függőben lévő meghívó</span>}
              </div>
            </div>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary btn-sm" style={{ gap: '0.3rem' }} onClick={() => { setInviteCollectiveId(collective.id); setInviteEmail(''); setInviteError(''); }}>
                <Mail size={13} /> Meghívás
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setRenameCollective(collective); setRenameName(collective.name); setRenameError(''); }}>
                <Settings size={13} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteCollective(collective)}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── Active members ── */}
        {activeMembers.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tagok</div>
            {activeMembers.map(m => renderMemberRow(collective, m))}
          </div>
        )}

        {/* ── Blocked members (owner only) ── */}
        {isOwner && blockedMembers.length > 0 && (
          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: '0.35rem' }}>Tiltott tagok</div>
            {blockedMembers.map(m => renderMemberRow(collective, m))}
          </div>
        )}

        {/* ── Pending invitations (owner only) ── */}
        {isOwner && pendingInvs.length > 0 && (
          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning-text)', marginBottom: '0.35rem' }}>Függőben lévő meghívók</div>
            {pendingInvs.map(inv => (
              <div key={inv.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={13} color="var(--warning-text)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 600 }}>Meghívó elküldve · {formatDate(inv.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ gap: '0.3rem' }}>
                    {reInvitingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={12} />} Újraküldés
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={retractingId === inv.id} onClick={() => handleRetractInvitation(inv)} style={{ gap: '0.3rem' }}>
                    {retractingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />} Visszavonás
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Declined invitations (owner only) ── */}
        {isOwner && declinedInvs.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: '0.35rem' }}>Visszautasított meghívók</div>
            {declinedInvs.map(inv => (
              <div key={inv.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem', opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} color="var(--danger)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.email}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>Visszautasítva · {formatDate(inv.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => handleReInvite(collective.id, inv)} style={{ gap: '0.3rem' }}>
                    {reInvitingId === inv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={12} />} Újra meghívás
                  </button>
                </div>
              </div>
            ))}
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchCollectives} disabled={fetching} title="Frissítés">
              <RefreshCw size={13} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCreateName(''); setCreateError(''); setShowCreate(true); }}>
              <Plus size={15} /> Új kollektíva
            </button>
          </div>
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
            <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>{creating ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Létrehozás'}</button>
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
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Meghívó e-mailt kap. Még nem regisztrált tagok is meghívhatók.</div>
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
            <button type="submit" className="btn btn-primary btn-sm" disabled={renaming}>{renaming ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      {/* Collective delete — typed-name confirmation */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleteConfirming && setDeleteModal(null)} title="Kollektíva törlése">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.5 }}>
            <strong>Ez a művelet nem vonható vissza.</strong> A kollektíva törlésével az összes hozzá tartozó tartalom véglegesen törlődik:
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
              <li>Projektek és naplóbejegyzések</li>
              <li>Számlák és munkabejegyzések</li>
              <li>Felmérések és médiatartalmak</li>
              <li>Ajánlatok</li>
            </ul>
          </div>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          A megerősítéshez írja be a kollektíva nevét: <strong>{deleteModal?.name}</strong>
        </p>
        <input
          type="text"
          className="form-control"
          placeholder={deleteModal?.name}
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          disabled={deleteConfirming}
          autoFocus
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeleteModal(null)} disabled={deleteConfirming}>
            Mégse
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={deleteInput !== deleteModal?.name || deleteConfirming}
            onClick={executeDeleteCollective}
          >
            {deleteConfirming ? <><Loader2 size={13} className="animate-spin" /> Törlés...</> : <><Trash2 size={13} /> Kollektíva törlése</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
