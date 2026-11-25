'use client';

/**
 * Client detail with tabs (mobile pods view)
 * Rose header, 3 tabs: Quotes / Projects / Surveys
 * Edit sheet inline — no separate page.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';

const CLIENTS_BG = '#B8456B';
const CLIENTS_DEEP = '#2A0F1A';
const CLIENTS_TINT = '#F8E4EC';
const CLIENTS_INK = '#8A2B4C';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';
const ROW_SHADOW = 'inset 0 1px 0 #fff, 0 14px 22px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

function SendPortalSheet({ client, portalUrl, onClose, t }) {
  const [email, setEmail] = useState(client.email || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setError(t('sendPortalEmailRequired')); return; }
    setSending(true); setError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/send-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || t('createError')); }
      setSent(true);
      setTimeout(onClose, 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button onClick={onClose} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.5)', border: 0, cursor: 'default' }} />
      <div role="dialog" aria-label={t('sendPortalSheetTitle')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, borderRadius: '28px 28px 0 0', background: '#EFEDE6', padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 24px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{t('sendPortalSheetTitle')}</span>
          <button onClick={onClose} aria-label={t('close')} style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: '#E5E0D8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68' }}>{t('sendPortalEmailLabel')}</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            autoFocus
            style={{ height: 48, borderRadius: 14, border: `1.5px solid ${error ? '#B71C1C' : '#E0DAD0'}`, background: '#fff', color: 'var(--m-ink)', padding: '0 14px', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
          />
          {error && <span style={{ fontSize: 13, color: '#B71C1C', fontWeight: 600 }}>{error}</span>}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || sent}
          style={{ height: 56, border: 0, borderRadius: 28, background: sent ? '#14532D' : CLIENTS_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: sending || sent ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background .2s' }}
        >
          {sent ? (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>{t('sendPortalSuccess')}</>
          ) : sending ? t('sendPortalSending') : (
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M4 12l16-8-6 16-3-6z" /></svg>{t('sendPortalSendBtn')}</>
          )}
        </button>
      </div>
    </>
  );
}

const FIELD_INPUT = {
  width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 14,
  border: '1.5px solid #E0DAD0', background: '#fff', color: 'var(--m-ink)',
  padding: '0 14px', fontSize: 15, fontFamily: 'inherit', outline: 'none',
};

function EField({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EditSheet({ client, collectives, onSave, onClose, t }) {
  const ownedCollectives = collectives.filter(c => c.role === 'owner' || c.role === 'admin');
  const initShares = (client.client_collective_shares || []).map(s => s.collective_id);

  const [name, setName]           = useState(client.name || '');
  const [company, setCompany]     = useState(client.company_name || '');
  const [taxNum, setTaxNum]       = useState(client.tax_number || '');
  const [address, setAddress]     = useState(client.address || '');
  const [phone, setPhone]         = useState(client.phone || '');
  const [email, setEmail]         = useState(client.email || '');
  const [discount, setDiscount]   = useState(String(client.discount_percent ?? 0));
  const [notes, setNotes]         = useState(client.notes || '');
  const [gdpr, setGdpr]           = useState(!!client.gdpr_consented_at);
  const [shares, setShares]       = useState(initShares);
  const [sharesInitial]           = useState(initShares);
  const [sharesGdpr, setSharesGdpr] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const hasNewShares = shares.some(id => !sharesInitial.includes(id));
  const canSubmit = name.trim() && gdpr && (!hasNewShares || sharesGdpr) && !submitting;

  const toggleShare = (id) => {
    setShares(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSharesGdpr(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        company_name: company.trim() || null,
        tax_number: taxNum.trim() || null,
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        discount_percent: parseFloat(discount) || 0,
        collectiveShares: shares,
        sharesGdprConfirmed: !hasNewShares || sharesGdpr,
      });
      onClose();
    } catch (err) {
      setAlertModal({ message: err.message || t('createError') });
      setSubmitting(false);
    }
  };

  return (
    <>
      <button onClick={onClose} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.5)', border: 0, cursor: 'default' }} />
      <div role="dialog" aria-label={t('editClient')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, maxHeight: '94dvh', borderRadius: '28px 28px 0 0', background: '#EFEDE6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 16px 10px', flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{t('editClient')}</span>
            <button onClick={onClose} aria-label={t('close')} style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: '#E5E0D8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Scrollable fields */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 14px 110px' }}>
          <EField label={t('contactName')}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('namePlaceholder')} autoFocus style={FIELD_INPUT} />
          </EField>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <EField label={t('companyName')} style={{ flex: 1 }}>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder={t('companyPlaceholder')} style={FIELD_INPUT} />
            </EField>
            <EField label={t('taxNumber')} style={{ flex: 1 }}>
              <input type="text" value={taxNum} onChange={e => setTaxNum(e.target.value)} placeholder={t('taxNumberPlaceholder')} style={FIELD_INPUT} />
            </EField>
          </div>

          <EField label={t('address')} style={{ marginTop: 10 }}>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} style={FIELD_INPUT} />
          </EField>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <EField label={t('phone')} style={{ flex: 1 }}>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phonePlaceholder')} style={FIELD_INPUT} />
            </EField>
            <EField label={t('email')} style={{ flex: 1 }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} style={FIELD_INPUT} />
            </EField>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <EField label={t('discount')} style={{ flex: 1 }}>
              <input type="number" min="0" max="100" step="0.5" value={discount} onChange={e => setDiscount(e.target.value)} style={FIELD_INPUT} />
            </EField>
            <div style={{ flex: 1 }} />
          </div>

          <EField label={t('notes')} style={{ marginTop: 10 }}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('notesPlaceholder')} style={{ ...FIELD_INPUT, height: 'auto', paddingTop: 12, paddingBottom: 12, resize: 'none' }} />
          </EField>

          {/* GDPR */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, marginTop: 12, background: gdpr ? '#E7F4EC' : '#fff', border: `1.5px solid ${gdpr ? '#86efac' : '#E0DAD0'}`, cursor: 'pointer' }}>
            <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: CLIENTS_BG, width: 18, height: 18 }} />
            <span style={{ fontSize: 14, color: 'var(--m-ink)', lineHeight: 1.45 }}>
              {t('gdprConfirmText')} <span style={{ color: '#B71C1C', fontWeight: 700 }}>*</span>
            </span>
          </label>

          {/* Collective shares */}
          {ownedCollectives.length > 0 && (
            <div style={{ padding: 14, borderRadius: 16, marginTop: 10, background: '#fff', border: '1.5px solid #E0DAD0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink)' }}>{t('shareWithCollectives')}</span>
              {ownedCollectives.map(col => (
                <label key={col.collective_id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--m-ink)' }}>
                  <input type="checkbox" checked={shares.includes(col.collective_id)} onChange={() => toggleShare(col.collective_id)} style={{ accentColor: CLIENTS_BG, width: 16, height: 16, flexShrink: 0 }} />
                  {col.name}
                </label>
              ))}
              {hasNewShares && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 12, background: sharesGdpr ? '#E7F4EC' : '#FFF1E0', border: `1.5px solid ${sharesGdpr ? '#86efac' : '#fcd34d'}`, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sharesGdpr} onChange={e => setSharesGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: CLIENTS_BG, width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, color: 'var(--m-ink)', lineHeight: 1.45 }}>
                    {t('shareGdprConfirmText')} <span style={{ color: '#B71C1C', fontWeight: 700 }}>*</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Sticky save */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)', background: 'linear-gradient(to top, #EFEDE6 70%, transparent)', flexShrink: 0 }}>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{ width: '100%', height: 56, border: 0, borderRadius: 28, background: canSubmit ? CLIENTS_BG : '#C0BAB4', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', transition: 'background .15s' }}>
            {submitting ? t('modifying') : t('modify')}
          </button>
        </div>

        <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
      </div>
    </>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 20, background: '#fff', boxShadow: CARD_SHADOW, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#5A5F68', letterSpacing: '0.03em' }}>{label}</span>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      <span style={{ fontSize: 12, color: '#5A5F68', fontWeight: 500 }}>{sub}</span>
    </div>
  );
}

function SheetRow({ icon: d, label, onClick, danger, sub }) {
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,.05),0 12px 22px -18px rgba(14,17,22,.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d={d} /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        {label}
        {sub && <div style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68', marginTop: 1 }}>{sub}</div>}
      </span>
    </button>
  );
}

function SH({ children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', display: 'block', marginTop: 4 }}>
      {children}
    </span>
  );
}

const QUOTE_STATUS = {
  draft:    { bg: '#F0F0F2', fg: '#2B3038' },
  sent:     { bg: '#EDE7FB', fg: '#4A2796' },
  accepted: { bg: '#E7F4EC', fg: '#14532D' },
  rejected: { bg: '#FDECEC', fg: '#B71C1C' },
};

export default function ClientDetailMobile({ clientId, onClose }) {
  const t = useTranslations('clients');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    clients = [], quotes = [], quoteEntries = [], projects = [], invoices = [], surveys = [],
    collectives = [], isDemoMode, userCurrency, updateClient, deleteClient,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [tab, setTab] = useState('s');
  const [mode, setMode] = useState(null); // 'menu' | 'del' | 'edit'
  const [showPortalEmail, setShowPortalEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const client = clients.find(c => c.id === clientId);
  const isMine = client && !client._shared_via?.length;

  if (!client) {
    return (
      <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>{t('clientNotFound')}</p>
        <button onClick={() => onClose ? onClose() : router.push(p('/ugyfelek'))} style={{ height: 52, padding: '0 24px', border: 0, borderRadius: 26, background: CLIENTS_BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {t('backToClients')}
        </button>
      </div>
    );
  }

  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(proj => proj.client_id === client.id || quoteProjectIds.has(proj.id));
  const clientSurveys = surveys.filter(s => s.client_id === client.id);

  const totalQuoteValue = clientQuotes.reduce((sum, q) =>
    sum + quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0), 0);
  const totalInvoices = clientProjects.reduce((sum, proj) =>
    sum + invoices.filter(inv => inv.project_id === proj.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0), 0);

  const portalUrl = client.email
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal?email=${encodeURIComponent(client.email)}`
    : null;

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      if (onClose) onClose(); else router.push(p('/ugyfelek'));
    } catch (err) {
      setAlertModal({ message: err.message || t('createError') });
      setMode(null);
    } finally {
      setDeleting(false);
    }
  };

  const TABS = [
    { id: 's', label: `${t('detailTabSurveys')} (${clientSurveys.length})` },
    { id: 'q', label: `${t('detailTabQuotes')} (${clientQuotes.length})` },
    { id: 'p', label: `${t('detailTabProjects')} (${clientProjects.length})` },
  ];

  const shareCount = client.client_collective_shares?.length || 0;

  return (
    <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', position: 'relative' }}>

      {!isOnline && (
        <div role="alert" style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 50, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      <header style={{ background: CLIENTS_BG, padding: '64px 16px 20px', borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => onClose ? onClose() : router.push(p('/ugyfelek'))} aria-label={t('backToClients')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
            {isMine ? t('personalWorkspace') : t('sharedLabel')}
          </span>
          {isMine ? (
            <button onClick={() => setMode('menu')} aria-label={t('actionsLabel')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
            </button>
          ) : <span style={{ width: 48 }} />}
        </div>
        <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', display: 'block', marginBottom: 4 }}>
          {t('detailsTitle')}
        </span>
        <h1 style={{ position: 'relative', margin: '0 0 4px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#fff' }}>
          {client.name}
        </h1>
        {client.company_name && (
          <p style={{ position: 'relative', margin: 0, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{client.company_name}</p>
        )}
      </header>

      <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        <SH>{t('detailSectionOverview')}</SH>
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard label={t('detailTotalQuotes')} value={formatMoney(totalQuoteValue, userCurrency)} sub={t('detailQuotesCount', { count: clientQuotes.length })} />
          <StatCard label={t('detailInvoiced')} value={formatMoney(totalInvoices, userCurrency)} sub={t('detailProjectsCount', { count: clientProjects.length })} />
        </div>

        <SH>{t('detailSectionContact')}</SH>
        <div style={{ borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, padding: '8px 14px' }}>
          {client.phone && (
            <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, textDecoration: 'none' }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)' }}>{client.phone}</span>
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, textDecoration: 'none' }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18v12H3zM3 7l9 7 9-7" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</span>
            </a>
          )}
          {client.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 11l8-7 8 7v9H4z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--m-ink)' }}>{client.address}</span>
            </div>
          )}
          {!client.phone && !client.email && !client.address && (
            <div style={{ padding: '10px 0', fontSize: 14, color: '#5A5F68' }}>{t('detailNoContact')}</div>
          )}
          {(client.gdpr_consented_at || client.discount_percent > 0 || shareCount > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 0 8px' }}>
              {client.gdpr_consented_at && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#E7F4EC', color: '#14532D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
                  GDPR
                </span>
              )}
              {client.discount_percent > 0 && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: CLIENTS_TINT, color: CLIENTS_INK, display: 'inline-flex', alignItems: 'center' }}>
                  {client.discount_percent}% {t('discountAbbr')}
                </span>
              )}
              {shareCount > 0 && (
                <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#EDE7FB', color: '#4A2796', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4" /></svg>
                  {t('collectivesCount', { count: shareCount })}
                </span>
              )}
            </div>
          )}
        </div>

        <SH>{t('detailSectionDocuments')}</SH>
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.12)', padding: 4, borderRadius: 28 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} aria-pressed={tab === tb.id} style={{ flex: 1, minWidth: 0, height: 48, border: 0, borderRadius: 22, background: tab === tb.id ? '#fff' : 'transparent', color: tab === tb.id ? CLIENTS_INK : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
              {tb.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'q' && (clientQuotes.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noQuotesForClient')}</p>
          ) : clientQuotes.map(quote => {
            const qTotal = quoteEntries.filter(e => e.quote_id === quote.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            const st = QUOTE_STATUS[quote.status] || QUOTE_STATUS.draft;
            return (
              <button key={quote.id} onClick={() => router.push(p(`/ajanlatok/${quote.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <b style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.title}</b>
                  <span style={{ fontSize: 12, color: '#5A5F68' }}>{formatDate(quote.created_at)}</span>
                  <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 11, fontWeight: 700, alignSelf: 'flex-start', background: st.bg, color: st.fg, display: 'inline-flex', alignItems: 'center' }}>{quote.status}</span>
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--m-ink)', whiteSpace: 'nowrap' }}>{formatMoney(qTotal, userCurrency)}</span>
              </button>
            );
          }))}

          {tab === 'p' && (clientProjects.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noProjectsForClient')}</p>
          ) : clientProjects.map(proj => {
            const cost = invoices.filter(inv => inv.project_id === proj.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <button key={proj.id} onClick={() => router.push(p(`/projektek/${proj.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
                <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#E3E7EE', color: '#263248', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 7h6l2 2h10v11H3z" /></svg>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</b>
                  <span style={{ fontSize: 12, color: '#5A5F68' }}>{proj.description || proj.location || ''}</span>
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--m-ink)', whiteSpace: 'nowrap' }}>{formatMoney(cost, userCurrency)}</span>
              </button>
            );
          }))}

          {tab === 's' && (clientSurveys.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>{t('noSurveysForClient')}</p>
          ) : clientSurveys.map(surv => (
            <button key={surv.id} onClick={() => router.push(p(`/felmeres/${surv.id}`))} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: ROW_SHADOW }}>
              <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: '#D9F2EE', color: '#0A5C53', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2" /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surv.title}</b>
                <span style={{ fontSize: 12, color: '#5A5F68' }}>{surv.location && `${surv.location} · `}{formatDate(surv.date)}</span>
              </span>
            </button>
          )))}
        </div>

        <SH>{t('detailSectionPortal')}</SH>
        <div style={{ borderRadius: 26, background: CLIENTS_TINT, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: CLIENTS_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: CLIENTS_INK }}>{t('clientPortalLabel')}</span>
          </div>

          {/* How it works */}
          <div style={{ background: 'rgba(184,69,107,0.08)', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: CLIENTS_INK }}>{t('portalHowItWorks')}</span>
            {[t('portalStep1'), t('portalStep2'), t('portalStep3')].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 10, background: CLIENTS_BG, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: CLIENTS_INK, lineHeight: 1.45, fontWeight: 500 }}>{step}</span>
              </div>
            ))}
          </div>
          {client.email ? (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: CLIENTS_INK, lineHeight: 1.4 }}>
                {t('clientPortalLoginInfo')} <strong>{client.email}</strong>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyPortalLink} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: CLIENTS_BG, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 9h11v11H9zM5 15V4h11" /></svg>
                  {copied ? t('copiedBtn') : t('copyPortalLink')}
                </button>
                <button onClick={() => setShowPortalEmail(true)} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, background: '#fff', color: CLIENTS_INK, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18v12H3zM3 7l9 7 9-7" /></svg>
                  {t('sendPortalEmail')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10, background: '#FFF4E5', borderRadius: 14, padding: 12, color: '#6B3A00' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0 }} aria-hidden><path d="M12 8v5M12 16h.01M12 3l10 18H2z" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{t('noEmailForPortal')}</span>
            </div>
          )}
        </div>
      </div>


      {/* Scrim for menu / del */}
      {(mode === 'menu' || mode === 'del') && (
        <button onClick={() => setMode(null)} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', border: 0, cursor: 'default' }} />
      )}

      {/* Menu sheet */}
      {mode === 'menu' && (
        <div className="pod-sheet" role="dialog" aria-label={t('actionsLabel')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{client.name}</p>
          <SheetRow icon="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" label={t('editTitle')} onClick={() => setMode('edit')} />
          <SheetRow icon="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" label={t('deleteTitle')} danger onClick={() => setMode('del')} />
        </div>
      )}

      {/* Delete confirm sheet */}
      {mode === 'del' && (
        <div className="pod-sheet" role="dialog" aria-label={t('deleteConfirmTitle')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</p>
          <p style={{ margin: '0 4px 8px', fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.45 }}>
            {t('deleteConfirmMessage', { name: client.name })}
          </p>
          <button onClick={handleDelete} disabled={deleting} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
            {deleting ? t('deleting') : t('deleteTitle')}
          </button>
          <button onClick={() => setMode(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
            {t('cancel')}
          </button>
        </div>
      )}

      {/* Edit sheet */}
      {mode === 'edit' && (
        <EditSheet
          key={client.id}
          client={client}
          collectives={collectives}
          onSave={(data) => updateClient(client.id, data)}
          onClose={() => setMode(null)}
          t={t}
        />
      )}

      {/* Send portal email sheet */}
      {showPortalEmail && (
        <SendPortalSheet
          key={client.id + '-portal'}
          client={client}
          portalUrl={portalUrl}
          onClose={() => setShowPortalEmail(false)}
          t={t}
        />
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
