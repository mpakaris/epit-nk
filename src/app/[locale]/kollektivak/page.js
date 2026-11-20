'use client';

import { useState } from 'react';
import { useRouter } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { useCollectives } from '@/hooks/useCollectives';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import CollectiveCard from './components/CollectiveCard';
import InvitationCard from './components/InvitationCard';
import PageSpinner from '@/components/PageSpinner';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import useMobile from '@/hooks/useMobile';
import KollektivakMobile from './mobile/KollektivakMobile';
import { Plus, RefreshCw, Users, AlertCircle, Loader2, Trash2, AlertTriangle, Lock, Zap } from 'lucide-react';

export default function KollektivakPage() {
  const isMobile = useMobile();
  if (isMobile) return <KollektivakMobile />;
  return <KollektivakPageDesktop />;
}

function KollektivakPageDesktop() {
  const t = useTranslations('collectives');
  const router = useRouter();
  const { currentUser, loading, dataReady } = useApp();
  const { collectives, myInvitations, transferRequests, fetching, refresh, actions } = useCollectives();

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen,  setCreateOpen]  = useState(false);
  const [createName,  setCreateName]  = useState('');
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Invite modal ──────────────────────────────────────────────────────────
  const [inviteCollective, setInviteCollective] = useState(null);
  const [inviteEmail,      setInviteEmail]      = useState('');
  const [inviting,         setInviting]         = useState(false);
  const [inviteError,      setInviteError]      = useState('');

  // ── Inline action state ───────────────────────────────────────────────────
  const [reInvitingId,        setReInvitingId]        = useState(null);
  const [retractingId,        setRetractingId]        = useState(null);
  const [blockingId,          setBlockingId]          = useState(null);
  const [respondingInvId,     setRespondingInvId]     = useState(null);
  const [respondingInvAction, setRespondingInvAction] = useState(null);
  const [respondingTransferId, setRespondingTransferId] = useState(null);

  // ── Global modals ─────────────────────────────────────────────────────────
  const [confirmModal,     setConfirmModal]     = useState(null);
  const [alertModal,       setAlertModal]       = useState(null);
  const [deleteModal,      setDeleteModal]      = useState(null);
  const [deleteInput,      setDeleteInput]      = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const isPremium       = isEffectivePremium(currentUser ?? {});
  const isBasic         = !isPremium;
  const myCollectives   = collectives.filter(c => c.my_role === 'owner');
  const memberOf        = collectives.filter(c => c.my_role !== 'owner');

  // Inject transfer requests into the relevant collective
  const collectivesWithTransfers = myCollectives.map(c => ({
    ...c,
    _transferRequests: transferRequests.filter(r => r.collective_id === c.id),
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError('');
    const result = await actions.create(createName.trim());
    setCreating(false);
    if (!result.ok) {
      if (result.data?.error === 'PREMIUM_REQUIRED') { router.push('/elofizetes'); return; }
      setCreateError(result.data?.error || t('createError'));
      return;
    }
    setCreateOpen(false);
    setCreateName('');
    setAlertModal({ variant: 'success', title: t('createSuccess'), message: t('renameSuccessMsg') });
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    const result = await actions.invite(inviteCollective.id, inviteEmail.trim());
    setInviting(false);
    if (!result.ok) { setInviteError(result.data?.error || t('inviteErrorMsg')); return; }
    setInviteCollective(null);
    setInviteEmail('');
    setAlertModal({ variant: 'success', title: t('inviteSuccessTitle'), message: t('inviteSentMsg', { email: inviteEmail.trim() }) });
  }

  async function handleRespondInvitation(inv, action) {
    setRespondingInvId(inv.id);
    setRespondingInvAction(action);
    const result = await actions.respondInvitation(inv, action);
    setRespondingInvId(null);
    setRespondingInvAction(null);
    if (!result.ok) { setAlertModal({ message: result.data?.error || t('errorGeneric') }); return; }
    if (action === 'accept') setAlertModal({ variant: 'success', title: t('joinSuccess'), message: t('joinSuccessMsg', { name: inv.collective_name }) });
  }

  function handleRemoveMember(collective, member) {
    const isSelf = member.user_id === currentUser?.id;
    setConfirmModal({
      message: isSelf
        ? t('leaveConfirmMsg', { collective: collective.name })
        : t('removeConfirmMsg', { member: member.display_name, collective: collective.name }),
      onConfirm: async () => {
        const result = await actions.manageMember(collective.id, member.user_id, 'remove');
        setConfirmModal(null);
        if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
        setAlertModal({ variant: 'success', title: isSelf ? t('leaveSuccess') : t('removeSuccess'), message: isSelf ? t('leaveSuccessMsg', { name: collective.name }) : t('removeSuccessMsg', { name: member.display_name }) });
      },
    });
  }

  async function handleBlockMember(collective, member, action) {
    setBlockingId(member.user_id);
    const result = await actions.manageMember(collective.id, member.user_id, action);
    setBlockingId(null);
    if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
    setAlertModal({ variant: 'success', title: action === 'block' ? t('blockSuccess') : t('unblockSuccess'), message: action === 'block' ? t('blockSuccessMsg', { name: member.display_name }) : t('unblockSuccessMsg', { name: member.display_name }) });
  }

  async function handleRetract(inv) {
    setRetractingId(inv.id);
    const result = await actions.retract(inv.id);
    setRetractingId(null);
    if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
    setAlertModal({ variant: 'success', title: t('retractSuccess'), message: t('retractSuccessMsg') });
  }

  async function handleReInvite(collectiveId, email) {
    setReInvitingId(email);
    const result = await actions.reInvite(collectiveId, email);
    setReInvitingId(null);
    if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
    setAlertModal({ variant: 'success', title: t('reInviteSuccess'), message: t('reInviteSentMsg', { email }) });
  }

  async function handleRename(id, name) {
    const result = await actions.rename(id, name);
    if (!result.ok) setAlertModal({ message: result.data?.error || t('renameError') });
    else setAlertModal({ variant: 'success', title: t('renameSuccess'), message: t('renameSuccessMsg') });
  }

  function handleDelete(collective) {
    if (collective.is_inclusive) {
      setAlertModal({ variant: 'warning', title: t('cantDeleteInclusiveTitle'), message: t('cantDeleteInclusiveMsg') });
      return;
    }
    const sub = collective.subscription_status ?? 'active';
    if (sub === 'active' || sub === 'trialing' || sub === 'paused' || sub === 'past_due') {
      setAlertModal({ variant: 'warning', message: t('deleteBlockedActiveMsg', { name: collective.name }) });
      return;
    }
    setDeleteInput('');
    setDeleteModal(collective);
  }

  async function executeDelete() {
    if (!deleteModal) return;
    setDeleteConfirming(true);
    const result = await actions.remove(deleteModal.id);
    setDeleteConfirming(false);
    if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
    setDeleteModal(null);
    setAlertModal({ variant: 'success', title: t('deleteSuccess'), message: t('deleteSuccessMsg', { name: deleteModal.name }) });
  }

  async function handleTransferResponse(req, action) {
    setRespondingTransferId(req.id);
    const result = await actions.respondTransfer(req, action);
    setRespondingTransferId(null);
    const docRoute = { project: '/projektek', quote: '/ajanlatok', survey: '/felmeres' };
    if (!result.ok) { setAlertModal({ message: result.data?.error || t('errorGeneric') }); return; }
    if (action === 'accept') {
      setAlertModal({ variant: 'success', title: t('transferAcceptedTitle'), message: t('transferAcceptedMsg', { name: req.document_title }), action: { href: `${docRoute[req.document_type] || ''}/${req.document_id}`, label: t('viewBtn') } });
    } else {
      setAlertModal({ variant: 'warning', title: t('transferRejectedTitle'), message: req.document_title });
    }
  }

  // ── Card prop bundle ───────────────────────────────────────────────────────
  const cardProps = {
    currentUser, t,
    onInvite:          c  => { setInviteCollective(c); setInviteEmail(''); setInviteError(''); },
    onRename:          handleRename,
    onRemoveMember:    handleRemoveMember,
    onBlockMember:     handleBlockMember,
    onRetract:         handleRetract,
    onReInvite:        handleReInvite,
    onDelete:          handleDelete,
    onTransferResponse: handleTransferResponse,
    reInvitingId, retractingId, blockingId, respondingTransferId,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t('pageTitle')}</h1>
            <p className="page-subtitle">{t('subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={fetching} title={t('refresh')}>
              <RefreshCw size={13} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
            <button type="button" onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }} style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Pending invitations */}
      {myInvitations.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('pendingInvitations')}
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{myInvitations.length}</span>
          </div>
          {myInvitations.map(inv => (
            <InvitationCard key={inv.id} inv={inv} responding={respondingInvId} respondingAction={respondingInvAction} onAccept={i => handleRespondInvitation(i, 'accept')} onDecline={i => handleRespondInvitation(i, 'decline')} t={t} />
          ))}
        </div>
      )}

      {/* Basic locked placeholder */}
      {isBasic && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t('inclusiveCollective')}</div>
          <div className="card" style={{ opacity: 0.75, border: '2px dashed var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={18} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{t('inclusiveCollective')}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('inclusiveLockedText')}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{t('premiumRequiredToUnlock')}</span>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                <Zap size={13} /> {t('premiumActivateBtn')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* My collectives */}
      {collectivesWithTransfers.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t('createdByMe')}</div>
          {collectivesWithTransfers.map(c => <CollectiveCard key={c.id} collective={c} {...cardProps} />)}
        </div>
      )}

      {/* Member of */}
      {memberOf.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t('invitedTo')}</div>
          {memberOf.map(c => <CollectiveCard key={c.id} collective={c} {...cardProps} />)}
        </div>
      )}

      {/* Empty */}
      {collectives.length === 0 && myInvitations.length === 0 && !isBasic && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontWeight: 800, marginBottom: '0.35rem' }}>{t('emptyTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{t('emptyText')}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }}>
            <Plus size={15} /> {t('new')}
          </button>
        </div>
      )}

      {/* ── Create modal ── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={isPremium ? t('createStep1Title') : t('premiumGateTitle')}>
        {!isPremium ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
              <AlertCircle size={18} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.825rem', color: '#7c2d12', lineHeight: 1.55 }}>{t('premiumGateText')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreateOpen(false)}>{t('close')}</button>
              <a href="/elofizetes" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }} onClick={() => setCreateOpen(false)}>
                <Zap size={13} /> {t('premiumActivateBtn')}
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            {createError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
                <AlertCircle size={15} /><span>{createError}</span>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{t('collectiveName')}</label>
              <input type="text" required autoFocus className="form-control" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="pl. Kovács és Társai" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreateOpen(false)}>{t('cancel')}</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!createName.trim() || creating}>
                {creating ? <><Loader2 size={13} className="animate-spin" /> {t('creating')}</> : t('createBtn')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Invite modal ── */}
      <Modal isOpen={!!inviteCollective} onClose={() => setInviteCollective(null)} title={t('inviteTitle')}>
        {inviteError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">{t('inviteEmail')}</label>
            <input type="email" required autoFocus className="form-control" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pelda@email.hu" />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{t('inviteEmailHint')}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInviteCollective(null)}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={inviting}>{inviting ? t('inviting') : t('invite')}</button>
          </div>
        </form>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleteConfirming && setDeleteModal(null)} title={t('deleteTitle')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--danger-text)', lineHeight: 1.5 }}>
            <strong>{t('deleteIrreversible')}</strong>
            <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
              <li>{t('deleteContentItem1')}</li><li>{t('deleteContentItem2')}</li>
              <li>{t('deleteContentItem3')}</li><li>{t('deleteContentItem4')}</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('deleteConfirmPrompt')} <strong>{deleteModal?.name}</strong></p>
        <input type="text" className="form-control" placeholder={deleteModal?.name} value={deleteInput} onChange={e => setDeleteInput(e.target.value)} disabled={deleteConfirming} autoFocus style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeleteModal(null)} disabled={deleteConfirming}>{t('cancel')}</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={deleteInput !== deleteModal?.name || deleteConfirming} onClick={executeDelete}>
            {deleteConfirming ? <><Loader2 size={13} className="animate-spin" /> {t('deleting')}</> : <><Trash2 size={13} /> {t('deleteButton')}</>}
          </button>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title ?? t('confirmation')} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant ?? 'error'} title={alertModal?.title} action={alertModal?.action} />
    </div>
  );
}
