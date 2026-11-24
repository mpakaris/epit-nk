'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { useCollectives } from '@/hooks/useCollectives';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { formatDate } from '@/lib/constants';
import { podColor } from '@/lib/podColor';
import { TIER_DISPLAY } from '@/lib/collectivesService';
import Link from 'next/link';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';
import {
  Plus, Users, Mail, Crown, UserCheck, Ban, UserMinus, Trash2, Loader2,
  X, CheckCircle2, ArrowUpRight, Zap, AlertCircle, AlertTriangle, Lock,
  ShieldCheck, Pencil, Check, MoreHorizontal, ChevronRight, ChevronDown, RefreshCw,
  Rocket,
} from 'lucide-react';

const CARD_SH = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

const ROLE_COLOR = {
  owner:       '#6F93FF',
  admin:       '#FFC83D',
  contributor: '#5DDC96',
};
const ROLE_BG = {
  owner:       'rgba(111,147,255,0.18)',
  admin:       'rgba(255,200,61,0.18)',
  contributor: 'rgba(93,220,150,0.18)',
};

const STATUS_LABEL = {
  active:           'Aktív',
  scheduled_cancel: 'Lemondás ütemezve',
  canceled:         'Lemondva',
  expired:          'Lejárt',
  paused:           'Szüneteltetett',
  past_due:         'Késedelmes',
};

// ── Helper: section heading inside pod ──────────────────────────────────────

function SecHead({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.5)', padding: '10px 2px 4px',
    }}>
      {children}
    </div>
  );
}

// ── Member row (white inner card inside pod) ─────────────────────────────────

function MemberRow({ member, collective, isOwner, currentUser, t, onRemoveMember, onBlockMember, blockingId, podBg }) {
  const isSelf      = member.user_id === currentUser?.id;
  const isThisOwner = member.role === 'owner';
  const isBlocked   = member.status === 'blocked';
  const busy        = blockingId === member.user_id;
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: CARD_SH, opacity: isBlocked ? 0.7 : 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18, flexShrink: 0,
        background: isThisOwner ? `${podBg}22` : '#F1F1F3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isThisOwner
          ? <Crown size={16} color={podBg} />
          : isBlocked
            ? <Ban size={16} color="#B71C1C" />
            : <UserCheck size={16} color="#5A5F68" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {member.display_name}
          {isSelf && (
            <span style={{ fontSize: 10, fontWeight: 800, background: `${podBg}22`, color: podBg, padding: '1px 6px', borderRadius: 999 }}>
              {t('selfBadge')}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 800, background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], padding: '1px 6px', borderRadius: 999 }}>
            {t(member.role)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#8A8F98' }}>{member.email}</div>
      </div>
      {isOwner && !isThisOwner && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onBlockMember(collective, member, isBlocked ? 'unblock' : 'block')}
            disabled={busy}
            title={isBlocked ? t('unblockConfirmLabel') : t('blockedLabel')}
            style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: isBlocked ? '#E7F4EC' : '#F1F1F3', color: isBlocked ? '#14532D' : '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : isBlocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onRemoveMember(collective, member)}
            style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <UserMinus size={14} />
          </button>
        </div>
      )}
      {!isOwner && isSelf && (
        <button
          type="button"
          onClick={() => onRemoveMember(collective, member)}
          style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <UserMinus size={14} />
        </button>
      )}
    </div>
  );
}

// ── Collective pod card ───────────────────────────────────────────────────────

function CollectivePodCard({
  collective, currentUser, t, initialExpanded = false,
  onInvite, onRename, onRemoveMember, onBlockMember, onRetract, onReInvite,
  onDelete, onTransferResponse,
  reInvitingId, retractingId, blockingId, respondingTransferId,
}) {
  const colors = podColor(collective.id);
  const [expanded,    setExpanded]    = useState(initialExpanded);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue,   setNameValue]   = useState(collective.name);
  const [savingName,  setSavingName]  = useState(false);

  const isOwner        = collective.my_role === 'owner';
  const isInclusive    = collective.is_inclusive ?? false;
  const colStatus      = collective.status ?? 'active';
  const isNotActivated = colStatus === 'not_activated';
  const isFrozen       = colStatus === 'frozen';
  const activeMembers  = (collective.members || []).filter(m => m.status === 'active');
  const blockedMembers = (collective.members || []).filter(m => m.status === 'blocked');
  const pendingInvs    = collective.pending_invitations  || [];
  const declinedInvs   = collective.declined_invitations || [];
  const transfers      = collective._transferRequests    || [];
  const subStatus      = collective.subscription_status ?? 'active';
  const isInclusiveFrozen = isInclusive && (subStatus === 'canceled' || subStatus === 'expired' || isFrozen);
  const tier     = TIER_DISPLAY?.[collective.collective_tier] ?? null;
  const usedSeats = activeMembers.filter(m => m.role !== 'owner').length + pendingInvs.length;

  const STATUS_BADGE = {
    not_activated: { label: t('statusNotActivated'), bg: '#FFF4CD', color: '#B45309' },
    frozen:        { label: t('statusFrozen'),        bg: '#FDECEC', color: '#B71C1C' },
    active:        { label: t('statusActive'),        bg: '#E7F4EC', color: '#14532D' },
  };
  const statusBadge = STATUS_BADGE[colStatus] || STATUS_BADGE.active;

  async function saveName() {
    const name = nameValue.trim();
    if (!name || name === collective.name) { setEditingName(false); return; }
    setSavingName(true);
    await onRename(collective.id, name);
    setSavingName(false);
    setEditingName(false);
  }

  const podBg = colors.bg;

  return (
    <div style={{ background: colors.deep, borderRadius: 24, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Card header: icon + name + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, background: `${podBg}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={24} color={podBg} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge */}
          <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.label}
          </span>
          {isOwner && editingName ? (
            <form onSubmit={e => { e.preventDefault(); saveName(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <input
                autoFocus
                className="dk-input"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => e.key === 'Escape' && setEditingName(false)}
                disabled={savingName}
                style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#0E1116' }}
              />
              <button type="submit" style={{ width: 36, height: 36, flexShrink: 0, border: 0, borderRadius: 18, background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span
                onClick={() => isOwner && (setEditingName(true), setNameValue(collective.name))}
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', cursor: isOwner ? 'text' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={isOwner ? t('renameTooltip') : undefined}
              >
                {collective.name}
              </span>
              {isOwner && <Pencil size={12} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />}
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{activeMembers.length} {t('activeCount', { count: activeMembers.length }).replace(String(activeMembers.length) + ' ', '')}</span>
            {!isOwner && (
              <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999 }}>
                {t(collective.my_role)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Összecsukás' : 'Kibontás'}
            style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ChevronDown size={18} style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} />
          </button>
          {/* Not-activated: Activate + Delete only */}
          {isOwner && isNotActivated && (
            <>
              <Link
                href={`/elofizetes?activate=${collective.id}`}
                className="dk-btn dk-btn-w"
                style={{ height: 40, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <Rocket size={15} /> {t('activateBtn')}
              </Link>
              <button
                type="button"
                onClick={() => onDelete(collective)}
                style={{ height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={15} /> {t('deleteNotActivated')}
              </button>
            </>
          )}
          {/* Active: Invite + menu */}
          {isOwner && !isNotActivated && subStatus === 'active' && !isFrozen && (
            <button type="button" className="dk-btn dk-btn-g" onClick={() => onInvite(collective)} style={{ height: 40, fontSize: 14 }}>
              <Mail size={15} /> {t('menuInvite')}
            </button>
          )}
          {isOwner && !isNotActivated && (
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setMenuOpen(v => !v)} style={{ width: 40, height: 40, border: 0, borderRadius: 20, background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <>
                  <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20, background: '#fff', border: '1px solid #EDEBE5', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 220, overflow: 'hidden' }}>
                    {!isInclusive && (
                      <Link href="/elofizetes" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#0E1116', textDecoration: 'none' }}>
                        <ChevronRight size={15} color="#6F93FF" /> {t('menuManageSubscription')}
                      </Link>
                    )}
                    <div style={{ height: 1, background: '#EDEBE5' }} />
                    <button type="button" onClick={() => { setMenuOpen(false); onDelete(collective); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#B71C1C', textAlign: 'left' }}>
                      <Trash2 size={15} /> {t('menuDelete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!isOwner && (
            <button
              type="button"
              className="dk-btn"
              onClick={() => onRemoveMember(collective, activeMembers.find(m => m.user_id === currentUser?.id))}
              style={{ height: 40, fontSize: 14, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <UserMinus size={15} /> {t('leaveCollective')}
            </button>
          )}
        </div>
      </div>

      {/* Frozen warning */}
      {isInclusiveFrozen && (
        <div style={{ background: '#FDECEC', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={15} color="#B71C1C" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#B71C1C' }}>{t('premiumNeeded')}</span>
          <Link href="/elofizetes" style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#B71C1C', padding: '4px 10px', borderRadius: 999, textDecoration: 'none', flexShrink: 0 }}>
            {t('restorePremiumLink')}
          </Link>
        </div>
      )}

      {/* Subscription strip for non-inclusive owners */}
      {isOwner && !isInclusive && (
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            {STATUS_LABEL[subStatus] ?? subStatus}
          </span>
          {tier && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                {tier.seats} {t('seats')} · {t('seatsUsed', { used: usedSeats, total: tier.seats })}
              </span>
            </>
          )}
          <Link href="/elofizetes" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.14)', padding: '4px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {t('menuManageSubscription')} <ArrowUpRight size={11} />
          </Link>
        </div>
      )}

      {/* Members — collapsible */}
      {expanded && activeMembers.length > 0 && (
        <>
          <SecHead>{t('activeMembers', { count: activeMembers.length })}</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeMembers.map(m => (
              <MemberRow
                key={m.user_id}
                member={m}
                collective={collective}
                isOwner={isOwner}
                currentUser={currentUser}
                t={t}
                onRemoveMember={onRemoveMember}
                onBlockMember={onBlockMember}
                blockingId={blockingId}
                podBg={podBg}
              />
            ))}
          </div>
        </>
      )}

      {expanded && isOwner && blockedMembers.length > 0 && (
        <>
          <SecHead>{t('blockedMembers')}</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blockedMembers.map(m => (
              <MemberRow
                key={m.user_id}
                member={m}
                collective={collective}
                isOwner={isOwner}
                currentUser={currentUser}
                t={t}
                onRemoveMember={onRemoveMember}
                onBlockMember={onBlockMember}
                blockingId={blockingId}
                podBg={podBg}
              />
            ))}
          </div>
        </>
      )}

      {expanded && isOwner && pendingInvs.length > 0 && (
        <>
          <SecHead>{t('pendingInvitationsSection')}</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendingInvs.map(inv => (
              <div key={inv.id} style={{ background: '#fff', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} color="#8A4200" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                  <div style={{ fontSize: 12, color: '#8A4200' }}>{t('inviteSentDate', { date: formatDate(inv.created_at) })}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} title={t('resendBtn')} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {reInvitingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  </button>
                  <button type="button" disabled={retractingId === inv.id} onClick={() => onRetract(inv)} title={t('retractBtn')} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {retractingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {expanded && isOwner && declinedInvs.length > 0 && (
        <>
          <SecHead>{t('declinedInvitations')}</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {declinedInvs.map(inv => (
              <div key={inv.id} style={{ background: '#fff', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH, opacity: 0.65 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#B71C1C" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{inv.email}</div>
                  <div style={{ fontSize: 12, color: '#B71C1C' }}>{formatDate(inv.created_at)}</div>
                </div>
                <button type="button" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} title={t('resendBtn')} style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#5A5F68', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {reInvitingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {expanded && isOwner && transfers.length > 0 && (
        <>
          <SecHead>{t('transferRequests')} ({transfers.length})</SecHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transfers.map(req => {
              const DOC_LABEL = { project: t('docTypeProject'), quote: t('docTypeQuote'), survey: t('docTypeSurvey') };
              const busy = respondingTransferId === req.id;
              return (
                <div key={req.id} style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: CARD_SH }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0, background: `${podBg}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowUpRight size={16} color={podBg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.document_title || t('unnamed')}</div>
                    <div style={{ fontSize: 12, color: '#5A5F68' }}>
                      {DOC_LABEL[req.document_type]} · {req.requester?.display_name || req.requester?.email} · {formatDate(req.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" disabled={busy} onClick={() => onTransferResponse(req, 'reject')} style={{ height: 36, padding: '0 14px', border: '1px solid #B71C1C', borderRadius: 18, background: '#fff', color: '#B71C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} {t('rejectTransferLabel')}
                    </button>
                    <button type="button" disabled={busy} onClick={() => onTransferResponse(req, 'accept')} style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: podBg, color: colors.fg ?? '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {t('accept')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Invitation banner (pending join invitations at top of page) ───────────────

function InvitationBanner({ inv, responding, respondingAction, onAccept, onDecline, t }) {
  const busy   = responding === inv.id;
  const colors = podColor(inv.id || inv.collective_name || '');
  return (
    <div className="dk-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 15, flexShrink: 0, background: `${colors.bg}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Mail size={22} color={colors.bg} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inv.collective_name}
        </div>
        <div style={{ fontSize: 13, color: '#5A5F68' }}>
          {t('invitedBy')} <strong>{inv.inviter_name || t('unknown')}</strong>
          {' · '}
          {new Date(inv.created_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button type="button" disabled={busy} onClick={() => onDecline(inv)} style={{ height: 40, padding: '0 16px', border: '1.5px solid #B71C1C', borderRadius: 20, background: '#fff', color: '#B71C1C', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {busy && respondingAction === 'decline' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} {t('decline')}
        </button>
        <button type="button" disabled={busy} onClick={() => onAccept(inv)} style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 20, background: colors.bg, color: colors.fg ?? '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {busy && respondingAction === 'accept' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t('accept')}
        </button>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
      {label}
    </h2>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KollektivakDesktop() {
  const t      = useTranslations('collectives');
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
  const [reInvitingId,         setReInvitingId]         = useState(null);
  const [retractingId,         setRetractingId]         = useState(null);
  const [blockingId,           setBlockingId]           = useState(null);
  const [respondingInvId,      setRespondingInvId]      = useState(null);
  const [respondingInvAction,  setRespondingInvAction]  = useState(null);
  const [respondingTransferId, setRespondingTransferId] = useState(null);

  // ── Global modals ─────────────────────────────────────────────────────────
  const [confirmModal,       setConfirmModal]       = useState(null);
  const [alertModal,         setAlertModal]         = useState(null);
  const [deleteModal,        setDeleteModal]        = useState(null);
  const [deleteInput,        setDeleteInput]        = useState('');
  const [deleteConfirming,   setDeleteConfirming]   = useState(false);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState(null); // { name } — active sub blocks delete

  if (loading || !dataReady) return <PageSpinner />;

  const isPremium = isEffectivePremium(currentUser ?? {});
  const myCollectives = collectives.filter(c => c.my_role === 'owner');
  const memberOf      = collectives.filter(c => c.my_role !== 'owner');
  const hasPendingCollective = myCollectives.some(c => c.status === 'not_activated');

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
    if (!member) return;
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
    // Not-activated: simple confirm (no data, no subscription)
    if (collective.status === 'not_activated') {
      setConfirmModal({
        message: t('deleteNotActivatedConfirmBody', { name: collective.name }),
        onConfirm: async () => {
          const result = await actions.remove(collective.id);
          setConfirmModal(null);
          if (!result.ok) { setAlertModal({ message: result.data?.error }); return; }
          setAlertModal({ variant: 'success', title: t('deleteSuccess'), message: t('deleteSuccessMsg', { name: collective.name }) });
        },
      });
      return;
    }
    const sub = collective.subscription_status ?? 'active';
    if (sub === 'active' || sub === 'trialing' || sub === 'paused' || sub === 'past_due') {
      setDeleteBlockedModal({ name: collective.name });
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

  const cardProps = {
    currentUser, t,
    onInvite:          c => { setInviteCollective(c); setInviteEmail(''); setInviteError(''); },
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
    <div className="dk-page dk-mod-collectives">
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <span className="dk-kick">{t('kickerLabel')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="dk-btn dk-btn-g" onClick={refresh} disabled={fetching} title={t('refresh')}>
            <RefreshCw size={15} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button
            type="button"
            className="dk-btn dk-btn-w"
            onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }}
            disabled={hasPendingCollective || !isPremium}
            title={hasPendingCollective ? t('newCollectiveDisabledHasPending') : !isPremium ? t('newCollectiveDisabledNoPremium') : undefined}
            style={{ opacity: (hasPendingCollective || !isPremium) ? 0.5 : 1, cursor: (hasPendingCollective || !isPremium) ? 'default' : 'pointer' }}
          >
            <Plus size={15} /> {t('new')}
          </button>
        </div>
      </header>

      <div className="dk-body">
        {fetching && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="dk-ws-spinner" />
          </div>
        )}

        {!fetching && (
          <>
            {/* Pending join invitations */}
            {myInvitations.length > 0 && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel label={t('pendingInvitations')} />
                {myInvitations.map(inv => (
                  <InvitationBanner
                    key={inv.id}
                    inv={inv}
                    responding={respondingInvId}
                    respondingAction={respondingInvAction}
                    onAccept={i => handleRespondInvitation(i, 'accept')}
                    onDecline={i => handleRespondInvitation(i, 'decline')}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Basic locked placeholder */}
            {!isPremium && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel label={t('inclusiveCollective')} />
                <div className="dk-card" style={{ marginTop: 10, padding: '20px 24px', opacity: 0.85 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div className="dk-ic" style={{ background: '#F0F0F2', flexShrink: 0 }}>
                      <Lock size={20} color="#8A8F98" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#8A8F98', marginBottom: 4 }}>{t('inclusiveCollective')}</div>
                      <div style={{ fontSize: 14, color: '#8A8F98', lineHeight: 1.5 }}>{t('inclusiveLockedText')}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #EDEBE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#8A8F98' }}>{t('premiumRequiredToUnlock')}</span>
                    <Link href="/elofizetes" className="dk-btn dk-btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', height: 40, fontSize: 14 }}>
                      <Zap size={15} /> {t('premiumActivateBtn')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* My collectives (owner) */}
            {collectivesWithTransfers.length > 0 && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel label={t('createdByMe')} />
                {collectivesWithTransfers.map((c, i) => (
                  <CollectivePodCard key={c.id} collective={c} initialExpanded={i === 0} {...cardProps} />
                ))}
              </div>
            )}

            {/* Member of */}
            {memberOf.length > 0 && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel label={t('invitedTo')} />
                {memberOf.map((c, i) => (
                  <CollectivePodCard key={c.id} collective={{ ...c, _transferRequests: [] }} initialExpanded={i === 0} {...cardProps} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {collectives.length === 0 && myInvitations.length === 0 && isPremium && (
              <div className="dk-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Users size={44} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116', marginBottom: 6 }}>{t('emptyTitle')}</div>
                <div style={{ fontSize: 14, color: '#5A5F68', marginBottom: 20 }}>{t('emptyText')}</div>
                <button type="button" className="dk-btn dk-btn-dark" onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }} style={{ height: 48, fontSize: 15 }}>
                  <Plus size={16} /> {t('new')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create modal ── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={isPremium ? t('createStep1Title') : t('premiumGateTitle')}>
        {!isPremium ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <AlertCircle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 14, color: '#7C2D12', lineHeight: 1.55 }}>{t('premiumGateText')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => setCreateOpen(false)} style={{ height: 44, fontSize: 15 }}>{t('close')}</button>
              <Link href="/elofizetes" className="dk-btn dk-btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', height: 44, fontSize: 15 }} onClick={() => setCreateOpen(false)}>
                <Zap size={15} /> {t('premiumActivateBtn')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {createError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '10px 14px', borderRadius: 12, fontSize: 14, display: 'flex', gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{createError}</span>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0E1116', marginBottom: 6 }}>{t('collectiveName')}</label>
              <input
                type="text"
                required
                autoFocus
                className="dk-input"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="pl. Kovács és Társai"
                style={{ width: '100%', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => setCreateOpen(false)} style={{ height: 44, fontSize: 15 }}>{t('cancel')}</button>
              <button type="submit" className="dk-btn dk-btn-dark" disabled={!createName.trim() || creating} style={{ height: 44, fontSize: 15 }}>
                {creating ? <><Loader2 size={15} className="animate-spin" /> {t('creating')}</> : t('createBtn')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Invite modal ── */}
      <Modal isOpen={!!inviteCollective} onClose={() => setInviteCollective(null)} title={t('inviteTitle')}>
        {inviteCollective && (
          <p style={{ fontSize: 14, color: '#5A5F68', marginBottom: 16, marginTop: 0 }}>
            <strong>{inviteCollective.name}</strong>
          </p>
        )}
        {inviteError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '10px 14px', borderRadius: 12, fontSize: 14, display: 'flex', gap: 8, marginBottom: 12 }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{inviteError}</span>
          </div>
        )}
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0E1116', marginBottom: 6 }}>{t('inviteEmail')}</label>
            <input
              type="email"
              required
              autoFocus
              className="dk-input"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="pelda@email.hu"
              style={{ width: '100%', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ fontSize: 13, color: '#8A8F98', marginTop: 6 }}>{t('inviteEmailHint')}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="dk-btn dk-btn-l" onClick={() => setInviteCollective(null)} style={{ height: 44, fontSize: 15 }}>{t('cancel')}</button>
            <button type="submit" className="dk-btn dk-btn-dark" disabled={inviting} style={{ height: 44, fontSize: 15 }}>
              {inviting ? <><Loader2 size={15} className="animate-spin" /> {t('inviting')}</> : t('invite')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal isOpen={!!deleteModal} onClose={() => !deleteConfirming && setDeleteModal(null)} title={t('deleteTitle')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: 16 }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14, color: 'var(--danger-text)', lineHeight: 1.5 }}>
            <strong>{t('deleteIrreversible')}</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>{t('deleteContentItem1')}</li>
              <li>{t('deleteContentItem2')}</li>
              <li>{t('deleteContentItem3')}</li>
              <li>{t('deleteContentItem4')}</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {t('deleteConfirmPrompt')} <strong>{deleteModal?.name}</strong>
        </p>
        <input
          type="text"
          autoFocus
          className="dk-input"
          placeholder={deleteModal?.name}
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
          disabled={deleteConfirming}
          style={{ width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={() => setDeleteModal(null)} disabled={deleteConfirming} style={{ height: 44, fontSize: 15 }}>
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={deleteInput !== deleteModal?.name || deleteConfirming}
            onClick={executeDelete}
            style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: 'var(--danger)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: deleteInput !== deleteModal?.name || deleteConfirming ? 0.4 : 1 }}
          >
            {deleteConfirming ? <><Loader2 size={15} className="animate-spin" /> {t('deleting')}</> : <><Trash2 size={15} /> {t('deleteButton')}</>}
          </button>
        </div>
      </Modal>

      {/* ── Delete blocked: active subscription modal ─────────────────────── */}
      <Modal isOpen={!!deleteBlockedModal} onClose={() => setDeleteBlockedModal(null)} title={t('deleteTitle')}>
        {deleteBlockedModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <AlertTriangle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, color: '#7C2D12', lineHeight: 1.5 }}>
                {t('deleteBlockedActiveMsg', { name: deleteBlockedModal.name })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => setDeleteBlockedModal(null)} style={{ height: 44, fontSize: 15 }}>
                {t('cancel')}
              </button>
              <Link href="/elofizetes" className="dk-btn dk-btn-dark" onClick={() => setDeleteBlockedModal(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', height: 44, fontSize: 15 }}>
                {t('deleteBlockedManageBtn')}
              </Link>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title={confirmModal?.title ?? t('confirmation')}
        message={confirmModal?.message}
        confirmLabel={confirmModal?.confirmLabel}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
        variant={alertModal?.variant ?? 'error'}
        title={alertModal?.title}
        action={alertModal?.action}
      />
    </div>
  );
}
