'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useCollectives } from '@/hooks/useCollectives';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { TIER_DISPLAY } from '@/lib/collectivesService';
import { formatDate } from '@/lib/constants';
import { podColor } from '@/lib/podColor';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PodList from '@/components/mobile/pods/PodList';
import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';
import PageSpinner from '@/components/PageSpinner';
import {
  Users, Mail, Crown, UserCheck, Ban, UserMinus, Trash2, Loader2,
  Plus, Lock, Zap, ArrowUpRight, AlertCircle, AlertTriangle, X,
  CheckCircle2, ChevronRight,
} from 'lucide-react';

const CARD_SH = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

const STATUS_LABEL = {
  active: 'Aktív', scheduled_cancel: 'Lemondás ütemezve',
  canceled: 'Lemondva', expired: 'Lejárt',
  paused: 'Szüneteltetett', past_due: 'Késedelmes',
};
const LIFECYCLE_BADGE = {
  not_activated: { bg: '#FFF4CD', color: '#B45309', label: 'Nem aktivált' },
  frozen:        { bg: '#FDECEC', color: '#B71C1C', label: 'Felfüggesztett' },
  active:        { bg: '#E7F4EC', color: '#14532D', label: 'Aktív' },
};

// ── Sheet (bottom sheet) ──────────────────────────────────────────────────────
function Sheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <button onClick={onClose} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,.55)', cursor: 'pointer' }} />
      <div role="dialog" className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `10px 16px calc(env(safe-area-inset-bottom) + 24px)`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #F5F5F5)', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '86vh', overflowY: 'auto' }}>
        <span style={{ alignSelf: 'center', flexShrink: 0, width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        {children}
      </div>
    </>
  );
}

function SheetRow({ icon, label, onClick, danger, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : '#0E1116', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', boxShadow: 'inset 0 1px 0 #fff, 0 12px 22px -18px rgba(0,0,0,0.35)', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

// ── Collective body — rendered inside each open pod ───────────────────────────
function CollectiveBody({ collective, transfers, colors, currentUser, t, onInvite, onDelete, onRemoveMember, onBlockMember, onRetract, onReInvite, onTransferResponse, blockingId, reInvitingId, retractingId, respondingTransferId }) {
  const { bg, fg } = colors;
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner        = collective.my_role === 'owner';
  const isInclusive    = collective.is_inclusive ?? false;
  const colStatus      = collective.status ?? 'active';
  const isNotActivated = colStatus === 'not_activated';
  const isFrozen       = colStatus === 'frozen';
  const activeMembers  = (collective.members || []).filter(m => m.status === 'active');
  const blockedMembers = (collective.members || []).filter(m => m.status === 'blocked');
  const pendingInvs    = collective.pending_invitations  || [];
  const declinedInvs   = collective.declined_invitations || [];
  const subStatus      = collective.subscription_status ?? 'active';
  const isInclusiveFrozen = isInclusive && (subStatus === 'canceled' || subStatus === 'expired' || isFrozen);
  const tier      = TIER_DISPLAY?.[collective.collective_tier] ?? null;
  const usedSeats = activeMembers.filter(m => m.role !== 'owner').length + pendingInvs.length;

  function SecHead({ children }) {
    return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', padding: '4px 2px 0' }}>{children}</div>;
  }

  function MemberCard({ member }) {
    const isSelf      = member.user_id === currentUser?.id;
    const isThisOwner = member.role === 'owner';
    const isBlocked   = member.status === 'blocked';
    const busy        = blockingId === member.user_id;
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: isThisOwner ? `${bg}22` : '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isThisOwner ? <Crown size={18} color={bg} /> : isBlocked ? <Ban size={18} color="#B71C1C" /> : <UserCheck size={18} color="#5A5F68" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.display_name}
            {isSelf && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: `${bg}22`, color: bg, padding: '1px 6px', borderRadius: 999 }}>{t('selfBadge')}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#8A8F98' }}>{member.email}</div>
        </div>
        {isOwner && !isThisOwner && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => onBlockMember(collective, member, isBlocked ? 'unblock' : 'block')} disabled={busy} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: isBlocked ? '#E7F4EC' : '#F1F1F3', color: isBlocked ? '#14532D' : '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : isBlocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
            </button>
            <button type="button" onClick={() => onRemoveMember(collective, member)} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserMinus size={14} />
            </button>
          </div>
        )}
        {!isOwner && isSelf && (
          <button type="button" onClick={() => onRemoveMember(collective, member)} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserMinus size={14} />
          </button>
        )}
      </div>
    );
  }

  // Not-activated: show activate + delete only, no member management
  if (isOwner && isNotActivated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#FFF4CD', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#B45309' }}>{t('notActivatedBannerTitle')}</span>
        </div>
        <Link href={`/elofizetes?activate=${collective.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, background: '#B45309', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
          {t('activateBtn')}
        </Link>
        <button type="button" onClick={onDelete} style={{ width: '100%', height: 52, border: '1.5px solid #B71C1C', borderRadius: 26, background: '#fff', color: '#B71C1C', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {t('deleteNotActivated')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Status badge + seat count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {colStatus !== 'active' && (
          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: LIFECYCLE_BADGE[colStatus]?.bg, color: LIFECYCLE_BADGE[colStatus]?.color }}>
            {LIFECYCLE_BADGE[colStatus]?.label}
          </span>
        )}
        {tier && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
            {t('seatsUsed', { used: usedSeats, total: tier.seats })}
          </span>
        )}
      </div>

      {/* Frozen warning */}
      {isInclusiveFrozen && (
        <div style={{ background: '#FDECEC', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#B71C1C" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#B71C1C' }}>{t('premiumNeeded')}</span>
          <Link href="/elofizetes" style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#B71C1C', padding: '4px 10px', borderRadius: 999 }}>
            {t('restorePremiumLink')}
          </Link>
        </div>
      )}

      {/* Subscription strip for non-inclusive */}
      {isOwner && !isInclusive && (
        <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{STATUS_LABEL[subStatus] ?? subStatus}</span>
          <Link href="/elofizetes" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: fg, textDecoration: 'none', background: 'rgba(255,255,255,0.18)', padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('menuManageSubscription')} <ArrowUpRight size={11} />
          </Link>
        </div>
      )}

      {/* Active members */}
      {activeMembers.length > 0 && (
        <>
          <SecHead>{t('activeMembers', { count: activeMembers.length })}</SecHead>
          {activeMembers.map(m => <MemberCard key={m.user_id} member={m} />)}
        </>
      )}

      {/* Blocked */}
      {isOwner && blockedMembers.length > 0 && (
        <>
          <SecHead>{t('blockedMembers')}</SecHead>
          {blockedMembers.map(m => <MemberCard key={m.user_id} member={m} />)}
        </>
      )}

      {/* Pending invitations */}
      {isOwner && pendingInvs.length > 0 && (
        <>
          <SecHead>{t('pendingInvitationsSection')}</SecHead>
          {pendingInvs.map(inv => (
            <div key={inv.id} style={{ background: '#fff', borderRadius: 20, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} color="#8A4200" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                <div style={{ fontSize: 12, color: '#8A4200' }}>{formatDate(inv.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {reInvitingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                </button>
                <button type="button" disabled={retractingId === inv.id} onClick={() => onRetract(inv)} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {retractingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Declined */}
      {isOwner && declinedInvs.length > 0 && (
        <>
          <SecHead>{t('declinedInvitations')}</SecHead>
          {declinedInvs.map(inv => (
            <div key={inv.id} style={{ background: '#fff', borderRadius: 20, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH, opacity: 0.65 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#B71C1C" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{inv.email}</div>
                <div style={{ fontSize: 12, color: '#B71C1C' }}>{formatDate(inv.created_at)}</div>
              </div>
              <button type="button" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {reInvitingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              </button>
            </div>
          ))}
        </>
      )}

      {/* Transfer requests */}
      {isOwner && transfers.length > 0 && (
        <>
          <SecHead>{t('transferRequests')} ({transfers.length})</SecHead>
          {transfers.map(req => {
            const DOC_LABEL = { project: t('docTypeProject'), quote: t('docTypeQuote'), survey: t('docTypeSurvey') };
            const busy = respondingTransferId === req.id;
            return (
              <div key={req.id} style={{ background: '#fff', borderRadius: 20, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: CARD_SH }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: `${bg}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowUpRight size={18} color={bg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.document_title || t('unnamed')}</div>
                    <div style={{ fontSize: 12, color: '#5A5F68' }}>{DOC_LABEL[req.document_type]} · {req.requester?.display_name || req.requester?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busy} onClick={() => onTransferResponse(req, 'reject')} style={{ flex: 1, height: 40, border: '1px solid #B71C1C', borderRadius: 20, background: '#fff', color: '#B71C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} {t('rejectTransferLabel')}
                  </button>
                  <button type="button" disabled={busy} onClick={() => onTransferResponse(req, 'accept')} style={{ flex: 1, height: 40, border: 0, borderRadius: 20, background: bg, color: fg, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {t('accept')}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Context menu row */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {isOwner && subStatus === 'active' && (
          <button type="button" onClick={onInvite} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: bg, color: fg, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Mail size={18} /> {t('menuInvite')}
          </button>
        )}
        {isOwner && (
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Műveletek" style={{ width: 52, height: 52, flexShrink: 0, border: 0, borderRadius: 26, background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </button>
        )}
        {!isOwner && (
          <button type="button" onClick={() => onRemoveMember(collective, activeMembers.find(m => m.user_id === currentUser?.id))} style={{ flex: 1, height: 52, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 26, background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <UserMinus size={18} /> {t('leaveCollective')}
          </button>
        )}
      </div>

      {/* Context menu sheet */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: '#0E1116' }}>{collective.name}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('pageTitle')}</span>
        </div>
        {!collective.is_inclusive && (
          <SheetRow icon={<ArrowUpRight size={20} />} label={t('menuManageSubscription')} onClick={() => { setMenuOpen(false); window.location.href = '/elofizetes'; }} />
        )}
        <SheetRow icon={<Trash2 size={20} />} label={t('menuDelete')} danger onClick={() => { setMenuOpen(false); onDelete(); }} />
      </Sheet>
    </div>
  );
}

// ── Invitation card (above pods, light background) ────────────────────────────
function InvitationCard({ inv, responding, respondingAction, onAccept, onDecline, t }) {
  const busy = responding === inv.id;
  const colors = podColor(inv.id || inv.collective_name || '');
  return (
    <div style={{ background: '#fff', borderRadius: 22, padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: `${colors.bg}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={22} color={colors.bg} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, color: '#0E1116' }}>{inv.collective_name}</div>
          <div style={{ fontSize: 13, color: '#5A5F68' }}>
            {t('invitedBy')} <strong>{inv.inviter_name || t('unknown')}</strong>
            {' · '}
            {new Date(inv.created_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" disabled={busy} onClick={() => onDecline(inv)} style={{ flex: 1, height: 48, border: '1.5px solid #B71C1C', borderRadius: 24, background: '#fff', color: '#B71C1C', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {busy && respondingAction === 'decline' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} {t('decline')}
        </button>
        <button type="button" disabled={busy} onClick={() => onAccept(inv)} style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: colors.bg, color: colors.fg, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {busy && respondingAction === 'accept' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t('accept')}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function KollektivakMobile() {
  const t      = useTranslations('collectives');
  const router = useRouter();
  const { currentUser, loading, dataReady } = useApp();
  const { collectives, myInvitations, transferRequests, fetching, actions } = useCollectives();

  const [activeId, setActiveId] = useState(null);

  const [createOpen,  setCreateOpen]  = useState(false);
  const [createName,  setCreateName]  = useState('');
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState('');

  const [inviteCollective, setInviteCollective] = useState(null);
  const [inviteEmail,      setInviteEmail]      = useState('');
  const [inviting,         setInviting]         = useState(false);
  const [inviteError,      setInviteError]      = useState('');

  const [confirmModal,       setConfirmModal]       = useState(null);
  const [alertModal,         setAlertModal]         = useState(null);
  const [deleteModal,        setDeleteModal]        = useState(null);
  const [deleteInput,        setDeleteInput]        = useState('');
  const [deleteConfirming,   setDeleteConfirming]   = useState(false);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState(null);

  const [reInvitingId,         setReInvitingId]         = useState(null);
  const [retractingId,         setRetractingId]         = useState(null);
  const [blockingId,           setBlockingId]           = useState(null);
  const [respondingInvId,      setRespondingInvId]      = useState(null);
  const [respondingInvAction,  setRespondingInvAction]  = useState(null);
  const [respondingTransferId, setRespondingTransferId] = useState(null);

  if (loading || !dataReady || fetching) return <PageSpinner />;

  const isPremium = isEffectivePremium(currentUser ?? {});
  const hasPendingCollective = collectives.some(c => c.my_role === 'owner' && c.status === 'not_activated');

  // Build PodList workspace objects
  const collectivePods = collectives.map(c => {
    const active  = (c.members || []).filter(m => m.status === 'active');
    const pending = (c.pending_invitations || []).length;
    const trs     = transferRequests.filter(r => r.collective_id === c.id);
    const badge   = LIFECYCLE_BADGE[c.status] || LIFECYCLE_BADGE.active;
    return {
      id:        c.id,
      isPersonal: false,
      name:      c.name,
      sub:       `${c.status !== 'active' ? badge.label + ' · ' : ''}${active.length} tag · ${c.my_role === 'owner' ? t('owner') : t(c.my_role)}`,
      count:     active.length + pending,
      members:   active,
      _collective: { ...c, _transferRequests: trs },
    };
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true); setCreateError('');
    const result = await actions.create(createName.trim());
    setCreating(false);
    if (!result.ok) {
      if (result.data?.code === 'PREMIUM_REQUIRED') { router.push('/elofizetes'); return; }
      setCreateError(result.data?.error || t('createError'));
      return;
    }
    setCreateOpen(false); setCreateName('');
    setAlertModal({ variant: 'success', title: t('createSuccess'), message: t('renameSuccessMsg') });
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true); setInviteError('');
    const result = await actions.invite(inviteCollective.id, inviteEmail.trim());
    setInviting(false);
    if (!result.ok) { setInviteError(result.data?.error || t('inviteErrorMsg')); return; }
    setInviteCollective(null); setInviteEmail('');
    setAlertModal({ variant: 'success', title: t('inviteSuccessTitle'), message: t('inviteSentMsg', { email: inviteEmail.trim() }) });
  }

  async function handleRespondInvitation(inv, action) {
    setRespondingInvId(inv.id); setRespondingInvAction(action);
    const result = await actions.respondInvitation(inv, action);
    setRespondingInvId(null); setRespondingInvAction(null);
    if (!result.ok) { setAlertModal({ message: result.data?.error || t('errorGeneric') }); return; }
    if (action === 'accept') setAlertModal({ variant: 'success', title: t('joinSuccess'), message: t('joinSuccessMsg', { name: inv.collective_name }) });
  }

  function handleRemoveMember(collective, member) {
    if (!member) return;
    const isSelf = member.user_id === currentUser?.id;
    setConfirmModal({
      message: isSelf ? t('leaveConfirmMsg', { collective: collective.name }) : t('removeConfirmMsg', { member: member.display_name, collective: collective.name }),
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

  function handleDelete(collective) {
    if (collective.is_inclusive) { setAlertModal({ variant: 'warning', title: t('cantDeleteInclusiveTitle'), message: t('cantDeleteInclusiveMsg') }); return; }
    const sub = collective.subscription_status ?? 'active';
    if (sub === 'active' || sub === 'trialing' || sub === 'paused' || sub === 'past_due') { setDeleteBlockedModal({ name: collective.name }); return; }
    setDeleteInput(''); setDeleteModal(collective);
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
    if (action === 'accept') setAlertModal({ variant: 'success', title: t('transferAcceptedTitle'), message: t('transferAcceptedMsg', { name: req.document_title }), action: { href: `${docRoute[req.document_type] || ''}/${req.document_id}`, label: t('viewBtn') } });
    else setAlertModal({ variant: 'warning', title: t('transferRejectedTitle'), message: req.document_title });
  }

  const bodyProps = {
    currentUser, t,
    onRemoveMember: handleRemoveMember,
    onBlockMember:  handleBlockMember,
    onRetract:      handleRetract,
    onReInvite:     handleReInvite,
    onTransferResponse: handleTransferResponse,
    blockingId, reInvitingId, retractingId, respondingTransferId,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="pod-screen" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas)' }}>
      <PageHeader
        onNotifications={() => {}}
        onMenu={() => {}}
      />
      <div style={{ padding: '108px 16px 170px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Pending invitations */}
        {myInvitations.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--m-ink-2)', paddingLeft: 2 }}>{t('pendingInvitations')}</div>
            {myInvitations.map(inv => (
              <InvitationCard key={inv.id} inv={inv} responding={respondingInvId} respondingAction={respondingInvAction} onAccept={i => handleRespondInvitation(i, 'accept')} onDecline={i => handleRespondInvitation(i, 'decline')} t={t} />
            ))}
          </div>
        )}

        {/* Premium locked */}
        {!isPremium && (
          <div style={{ background: '#fff', borderRadius: 22, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={22} color="#8A8F98" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#8A8F98' }}>{t('inclusiveCollective')}</div>
                <div style={{ fontSize: 13, color: '#8A8F98' }}>{t('inclusiveLockedText')}</div>
              </div>
            </div>
            <Link href="/elofizetes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, background: '#0E1116', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              <Zap size={18} /> {t('premiumActivateBtn')}
            </Link>
          </div>
        )}

        {/* Pod list */}
        {collectivePods.length > 0 ? (
          <PodList
            workspaces={collectivePods}
            activeId={activeId}
            onActivate={id => setActiveId(prev => prev === id ? null : id)}
            moduleLabel={t('pageTitle')}
            onBack={() => router.back()}
            renderBody={(ws, colors) => (
              <CollectiveBody
                collective={ws._collective}
                transfers={ws._collective._transferRequests}
                colors={colors}
                onInvite={() => { setInviteCollective(ws._collective); setInviteEmail(''); setInviteError(''); }}
                onDelete={() => handleDelete(ws._collective)}
                {...bodyProps}
              />
            )}
          />
        ) : isPremium && myInvitations.length === 0 && (
          <div>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: '0 0 20px 2px', cursor: 'pointer' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--m-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--m-ink)' }}>{t('pageTitle')}</span>
            </button>
            <div style={{ background: '#fff', borderRadius: 22, padding: '32px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Users size={44} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0E1116', marginBottom: 6 }}>{t('emptyTitle')}</div>
              <div style={{ fontSize: 14, color: '#5A5F68', marginBottom: 20 }}>{t('emptyText')}</div>
              <button type="button" onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }} style={{ height: 52, padding: '0 28px', border: 0, borderRadius: 26, background: '#0E1116', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} /> {t('new')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dock */}
      <Dock
        onCreatePress={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }}
        activePodColor={activeId ? podColor(activeId) : { plusBg: '#0E1116', plusFg: '#FFFFFF' }}
        activePodName={collectivePods.find(w => w.id === activeId)?.name}
        activeTab="none"
      />

      {/* ── Create sheet ── */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116', lineHeight: 1.1 }}>
          {isPremium ? t('createStep1Title') : t('premiumGateTitle')}
        </span>
        {!isPremium ? (
          <>
            <div style={{ background: '#FFF7ED', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <AlertCircle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, color: '#7C2D12', lineHeight: 1.55 }}>{t('premiumGateText')}</span>
            </div>
            <Link href="/elofizetes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, textDecoration: 'none' }}>
              <Zap size={18} /> {t('premiumActivateBtn')}
            </Link>
            <button type="button" onClick={() => setCreateOpen(false)} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('close')}
            </button>
          </>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {createError && (
              <div style={{ background: '#FDECEC', borderRadius: 14, padding: '10px 14px', fontSize: 14, color: '#B71C1C', display: 'flex', gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{createError}</span>
              </div>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('collectiveName')}</span>
              <input type="text" required autoFocus value={createName} onChange={e => setCreateName(e.target.value)} placeholder="pl. Kovács és Társai"
                style={{ height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 10px 20px -16px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box', outline: 'none' }}
              />
            </label>
            <button type="submit" disabled={!createName.trim() || creating} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: creating ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: creating ? 0.7 : 1, marginTop: 4 }}>
              {creating ? <><Loader2 size={18} className="animate-spin" /> {t('creating')}</> : t('createBtn')}
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('cancel')}
            </button>
          </form>
        )}
      </Sheet>

      {/* ── Invite sheet ── */}
      <Sheet open={!!inviteCollective} onClose={() => setInviteCollective(null)}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116', lineHeight: 1.1 }}>{t('inviteTitle')}</span>
        {inviteCollective && <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>{inviteCollective.name}</span>}
        {inviteError && (
          <div style={{ background: '#FDECEC', borderRadius: 14, padding: '10px 14px', fontSize: 14, color: '#B71C1C', display: 'flex', gap: 8 }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('inviteEmail')}</span>
            <input type="email" required autoFocus value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pelda@email.hu"
              style={{ height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 10px 20px -16px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box', outline: 'none' }}
            />
            <span style={{ fontSize: 13, color: '#8A8F98', paddingLeft: 4 }}>{t('inviteEmailHint')}</span>
          </label>
          <button type="submit" disabled={!inviteEmail.trim() || inviting} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: inviting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: inviting ? 0.7 : 1, marginTop: 4 }}>
            {inviting ? <><Loader2 size={18} className="animate-spin" /> {t('inviting')}</> : t('invite')}
          </button>
          <button type="button" onClick={() => setInviteCollective(null)} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
            {t('cancel')}
          </button>
        </form>
      </Sheet>

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
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('deleteConfirmPrompt')} <strong>{deleteModal?.name}</strong></p>
        <input type="text" autoFocus placeholder={deleteModal?.name} value={deleteInput} onChange={e => setDeleteInput(e.target.value)} disabled={deleteConfirming}
          style={{ height: 56, border: 0, borderRadius: 20, background: 'var(--bg-subtle)', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 10px 20px -16px rgba(14,17,22,0.1)', width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: '0.5rem' }}
        />
        <button type="button" disabled={deleteInput !== deleteModal?.name || deleteConfirming} onClick={executeDelete} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: 'var(--danger)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: deleteInput !== deleteModal?.name || deleteConfirming ? 0.4 : 1 }}>
          {deleteConfirming ? <><Loader2 size={18} className="animate-spin" /> {t('deleting')}</> : <><Trash2 size={18} /> {t('deleteButton')}</>}
        </button>
        <button type="button" onClick={() => setDeleteModal(null)} disabled={deleteConfirming} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          {t('cancel')}
        </button>
      </Modal>

      <Modal isOpen={!!deleteBlockedModal} onClose={() => setDeleteBlockedModal(null)} title={t('deleteTitle')}>
        {deleteBlockedModal && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: 16 }}>
              <AlertTriangle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, color: '#7C2D12', lineHeight: 1.5 }}>
                {t('deleteBlockedActiveMsg', { name: deleteBlockedModal.name })}
              </span>
            </div>
            <Link href="/elofizetes" onClick={() => setDeleteBlockedModal(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 60, border: 0, borderRadius: 30, background: '#1e3a8a', color: '#fff', fontSize: 17, fontWeight: 700, textDecoration: 'none' }}>
              {t('deleteBlockedManageBtn')}
            </Link>
            <button type="button" onClick={() => setDeleteBlockedModal(null)} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              {t('cancel')}
            </button>
          </>
        )}
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title={confirmModal?.title ?? t('confirmation')} message={confirmModal?.message} confirmLabel={confirmModal?.confirmLabel} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} variant={alertModal?.variant ?? 'error'} title={alertModal?.title} action={alertModal?.action} />
    </div>
  );
}
