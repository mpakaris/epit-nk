import { useState } from 'react';
import {
  Users, Crown, UserCheck, Trash2, UserMinus, Mail, Loader2,
  X, Ban, ShieldCheck, MoreHorizontal, Pencil, Check,
  ArrowUpRight, Zap, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/constants';
import { TIER_DISPLAY } from '@/lib/collectivesService';

const ROLE_COLOR = { owner: 'var(--accent)', admin: 'var(--warning-text)', contributor: 'var(--success-text)' };
const ROLE_BG    = { owner: 'var(--accent-light)', admin: 'var(--warning-bg)', contributor: 'var(--success-bg)' };

const STATUS_BADGE = {
  active:           { label: 'Aktív',                bg: 'var(--success-bg)',  color: 'var(--success-text)' },
  scheduled_cancel: { label: 'Lemondás ütemezve',    bg: '#fef9c3',            color: '#854d0e'              },
  canceled:         { label: 'Lemondva',             bg: 'var(--danger-bg)',   color: 'var(--danger-text)'   },
  expired:          { label: 'Lejárt',               bg: 'var(--danger-bg)',   color: 'var(--danger-text)'   },
  paused:           { label: 'Szüneteltetett',        bg: 'var(--bg-subtle)',   color: 'var(--text-muted)'    },
  past_due:         { label: 'Késedelmes fizetés',    bg: '#fff7ed',            color: '#c2410c'              },
};

export default function CollectiveCard({
  collective, currentUser, t,
  onInvite, onRename, onRemoveMember, onBlockMember, onRetract, onReInvite,
  onDelete, onTransferResponse,
  reInvitingId, retractingId, blockingId, respondingTransferId,
}) {
  const [openMenu,    setOpenMenu]    = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue,   setNameValue]   = useState(collective.name);
  const [savingName,  setSavingName]  = useState(false);

  const isOwner        = collective.my_role === 'owner';
  const isInclusive    = collective.is_inclusive ?? false;
  const activeMembers  = (collective.members || []).filter(m => m.status === 'active');
  const blockedMembers = (collective.members || []).filter(m => m.status === 'blocked');
  const pendingInvs    = collective.pending_invitations  || [];
  const declinedInvs   = collective.declined_invitations || [];

  const subStatus = collective.subscription_status ?? 'active';
  const badge     = STATUS_BADGE[subStatus] ?? STATUS_BADGE.active;
  const tier      = TIER_DISPLAY[collective.collective_tier] ?? null;
  const usedSeats = activeMembers.filter(m => m.role !== 'owner').length + pendingInvs.length;
  const periodEnd = collective.subscription_period_end
    ? new Date(collective.subscription_period_end).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const isInclusiveFrozen = isInclusive && (subStatus === 'canceled' || subStatus === 'expired');

  async function saveName() {
    const name = nameValue.trim();
    if (!name || name === collective.name) { setEditingName(false); return; }
    setSavingName(true);
    await onRename(collective.id, name);
    setSavingName(false);
    setEditingName(false);
  }

  function MemberRow({ member }) {
    const isSelf      = member.user_id === currentUser?.id;
    const isBlocked   = member.status === 'blocked';
    const isThisOwner = member.role === 'owner';
    const busy        = blockingId === member.user_id;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem', borderRadius: 'var(--radius-md)', background: isBlocked ? 'var(--danger-bg)' : 'transparent', opacity: isBlocked ? 0.7 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-light)' : 'var(--bg-card)',
            border: `1px solid ${isBlocked ? 'var(--danger-border)' : isThisOwner ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
          }}>
            {isBlocked ? <Ban size={12} color="var(--danger)" /> : isThisOwner ? <Crown size={12} color="var(--accent)" /> : <UserCheck size={12} color="var(--text-muted)" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', lineHeight: 1.3 }}>
              {member.display_name}
              {isSelf && <span style={{ fontSize: '0.58rem', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)' }}>{t('selfBadge')}</span>}
              <span style={{ background: ROLE_BG[member.role], color: ROLE_COLOR[member.role], fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-pill)', fontSize: '0.58rem' }}>{t(member.role)}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{member.email}</div>
          </div>
        </div>
        {isOwner && !isThisOwner && (
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
            {isBlocked
              ? <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onBlockMember(collective, member, 'unblock')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {t('unblockConfirmLabel')}</button>
              : <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onBlockMember(collective, member, 'block')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} {t('blockedLabel')}</button>
            }
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><UserMinus size={13} /> {t('removeFromCollective')}</button>
          </div>
        )}
        {!isOwner && isSelf && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRemoveMember(collective, member)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}><UserMinus size={13} /> {t('leaveCollective')}</button>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: isInclusive ? '#f0fdf4' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Users size={19} color={isInclusive ? '#16a34a' : 'var(--accent)'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isOwner && editingName ? (
            <form onSubmit={e => { e.preventDefault(); saveName(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
              <input autoFocus className="form-control" value={nameValue} onChange={e => setNameValue(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === 'Escape' && setEditingName(false)} style={{ fontSize: '1rem', fontWeight: 800, padding: '0.2rem 0.5rem', height: 'auto' }} disabled={savingName} />
              <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-text)', padding: '0.2rem', display: 'flex' }}>
                {savingName ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
            </form>
          ) : (
            <div onClick={() => isOwner && (setEditingName(true), setNameValue(collective.name))} style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isOwner ? 'text' : 'default', marginBottom: '0.15rem' }} title={isOwner ? t('renameTooltip') : undefined}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collective.name}</span>
              {isOwner && <Pencil size={12} color="var(--text-muted)" style={{ opacity: 0.5, flexShrink: 0 }} />}
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isOwner && <span style={{ background: ROLE_BG[collective.my_role], color: ROLE_COLOR[collective.my_role], fontWeight: 700, padding: '0.05rem 0.45rem', borderRadius: 'var(--radius-pill)', fontSize: '0.65rem' }}>{t(collective.my_role)}</span>}
            <span><strong>{activeMembers.length}</strong> {t('activeCount', { count: activeMembers.length }).replace(String(activeMembers.length) + ' ', '')}</span>
            {pendingInvs.length > 0 && <span>· {t('pendingCount', { count: pendingInvs.length })}</span>}
          </div>
        </div>

        {isOwner && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button type="button" onClick={() => setOpenMenu(v => !v)} style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              <MoreHorizontal size={16} />
            </button>
            {openMenu && (
              <>
                <div onClick={() => setOpenMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden' }}>
                  {subStatus === 'active' && (
                    <button type="button" onClick={() => { setOpenMenu(false); onInvite(collective); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', color: 'var(--text-primary)' }}>
                      <Mail size={14} /> {t('menuInvite')}
                    </button>
                  )}
                  {!isInclusive && (
                    <>
                      <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                      <a href="/elofizetes" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none' }}>
                        <ChevronRight size={14} /> {t('menuManageSubscription')}
                      </a>
                    </>
                  )}
                  <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                  <button type="button" onClick={() => { setOpenMenu(false); onDelete(collective); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', textAlign: 'left' }}>
                    <Trash2 size={14} /> {t('menuDelete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Subscription strip */}
      {isOwner && (
        <div style={{ background: isInclusiveFrozen ? 'var(--danger-bg)' : 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isInclusive ? (
            isInclusiveFrozen ? (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger-text)' }}>{t('suspendedLabel')}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)' }}>{t('premiumNeeded')}</span>
                <a href="/elofizetes" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', background: 'var(--accent-light)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-border)' }}>
                  <Zap size={11} /> {t('restorePremiumLink')}
                </a>
              </>
            ) : (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success-text)' }}>{t('statusActive')}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a' }}>{t('inclusiveLabel')}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('inclusiveSeats', { count: activeMembers.length })}</span>
              </>
            )
          ) : (
            <>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: badge.color }}>
                {subStatus === 'scheduled_cancel' && periodEnd ? t('scheduledCancelUntil', { status: badge.label, date: periodEnd }) : badge.label}
              </span>
              {tier && (
                <>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)' }}>{tier.seats} {t('seats')}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('seatsUsed', { used: usedSeats, total: tier.seats })}</span>
                </>
              )}
              <a href="/elofizetes" style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {t('menuManageSubscription')} <ArrowUpRight size={11} />
              </a>
            </>
          )}
        </div>
      )}

      {/* People */}
      {(activeMembers.length > 0 || (isOwner && (blockedMembers.length > 0 || pendingInvs.length > 0 || declinedInvs.length > 0))) && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {activeMembers.map(m => <MemberRow key={m.user_id} member={m} />)}

          {isOwner && pendingInvs.length > 0 && (
            <>
              {activeMembers.length > 0 && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />}
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--warning-text)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('pendingInvitationsSection')}</div>
              {pendingInvs.map(inv => (
                <div key={inv.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={12} color="var(--warning-text)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{inv.email}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--warning-text)' }}>{t('inviteSentDate', { date: formatDate(inv.created_at) })}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {reInvitingId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} {t('resendBtn')}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" disabled={retractingId === inv.id} onClick={() => onRetract(inv)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {retractingId === inv.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} {t('retractBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {isOwner && blockedMembers.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('blockedMembers')}</div>
              {blockedMembers.map(m => <MemberRow key={m.user_id} member={m} />)}
            </>
          )}

          {isOwner && declinedInvs.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0.35rem' }} />
              <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0.25rem 0.6rem 0.1rem' }}>{t('declinedInvitations')}</div>
              {declinedInvs.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem', opacity: 0.65 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={12} color="var(--danger)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{inv.email}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>{t('inviteDeclinedDate', { date: formatDate(inv.created_at) })}</div>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={reInvitingId === inv.id} onClick={() => onReInvite(collective.id, inv.email)} style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }} title={t('resendBtn')}>
                    {reInvitingId === inv.id ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Transfer requests */}
      {isOwner && collective._transferRequests?.length > 0 && (
        <div style={{ marginTop: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', padding: '0.25rem 0.6rem 0.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {t('transferRequests')}
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: '0.6rem', fontWeight: 800, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {collective._transferRequests.length}
            </span>
          </div>
          {collective._transferRequests.map(req => {
            const DOC_LABEL = { project: t('docTypeProject'), quote: t('docTypeQuote'), survey: t('docTypeSurvey') };
            return (
              <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem 0.6rem', padding: '0.5rem 0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 180px', minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowUpRight size={12} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.document_title || t('unnamed')}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{DOC_LABEL[req.document_type]} · {req.requester?.display_name || req.requester?.email} · {formatDate(req.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={respondingTransferId === req.id} onClick={() => onTransferResponse(req, 'reject')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                    {respondingTransferId === req.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} {t('rejectTransferLabel')}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={respondingTransferId === req.id} onClick={() => onTransferResponse(req, 'accept')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {respondingTransferId === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {t('accept')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
