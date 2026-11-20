import { Mail, CheckCircle2, X, Loader2 } from 'lucide-react';
import useMobile from '@/hooks/useMobile';

export default function InvitationCard({ inv, responding, respondingAction, onAccept, onDecline, t }) {
  const isMobile = useMobile();
  const busy = responding === inv.id;

  const buttons = (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => onDecline(inv)}
        style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
      >
        {busy && respondingAction === 'decline' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
        {t('decline')}
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={busy}
        onClick={() => onAccept(inv)}
      >
        {busy && respondingAction === 'accept' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
        {t('accept')}
      </button>
    </>
  );

  return (
    <div className="card" style={{ marginBottom: '0.75rem', border: '1px solid var(--accent-border, #bfdbfe)', background: 'var(--accent-light, #eff6ff)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mail size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.15rem' }}>{inv.collective_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('invitedBy')} <strong>{inv.inviter_name || t('unknown')}</strong>
            {' · '}
            {new Date(inv.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        {!isMobile && <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>{buttons}</div>}
      </div>
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.65rem' }}>
          {buttons}
        </div>
      )}
    </div>
  );
}
