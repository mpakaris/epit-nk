'use client';

/**
 * C2 — Client create / edit form (mobile pods view)
 * Rose pod-style header; full field set; GDPR + collective-share consent.
 * Edit mode: ?edit=<clientId> in URL triggers loading of existing data.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';

const CLIENTS_BG = '#B8456B';
const CLIENTS_DEEP = '#2A0F1A';
const CLIENTS_TINT = '#F8E4EC';
const CLIENTS_INK = '#8A2B4C';

export default function ClientFormMobile() {
  const t = useTranslations('clients');
  const tf = useTranslations('forms');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnline();
  const { clients = [], collectives: userMemberships = [], createClient, updateClient, currentUser, isDemoMode } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;

  const editId = searchParams.get('edit');
  const isEdit = !!editId;
  const existing = isEdit ? clients.find(c => c.id === editId) : null;

  const ownedCollectives = userMemberships.filter(c => c.role === 'owner' || c.role === 'admin');

  const initShares = existing ? (existing.client_collective_shares || []).map(s => s.collective_id) : [];

  // Form fields — lazy-initialize from existing client when editing
  const [name, setName]               = useState(() => existing?.name || '');
  const [company, setCompany]         = useState(() => existing?.company_name || '');
  const [taxNumber, setTaxNumber]     = useState(() => existing?.tax_number || '');
  const [address, setAddress]         = useState(() => existing?.address || '');
  const [phone, setPhone]             = useState(() => existing?.phone || '');
  const [email, setEmail]             = useState(() => existing?.email || '');
  const [discount, setDiscount]       = useState(() => String(existing?.discount_percent ?? 0));
  const [notes, setNotes]             = useState(() => existing?.notes || '');
  const [gdpr, setGdpr]               = useState(() => !!existing?.gdpr_consented_at);
  const [shares, setShares]           = useState(() => initShares);
  const [sharesInitial]               = useState(() => initShares);
  const [sharesGdpr, setSharesGdpr]   = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal]     = useState(null);

  const toggleShare = (id) => {
    setShares(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSharesGdpr(false);
  };

  const hasNewShares = shares.some(id => !sharesInitial.includes(id));
  const canSubmit = name.trim() && gdpr && (!hasNewShares || sharesGdpr) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateClient(editId, {
          name: name.trim(),
          company_name: company.trim() || null,
          tax_number: taxNumber.trim() || null,
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          discount_percent: parseFloat(discount) || 0,
          collectiveShares: shares,
          sharesGdprConfirmed: !hasNewShares || sharesGdpr,
        });
        router.push(p(`/ugyfelek/${editId}`));
      } else {
        const created = await createClient({
          name: name.trim(),
          companyName: company.trim() || null,
          taxNumber: taxNumber.trim() || null,
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          discountPercent: parseFloat(discount) || 0,
          gdprConsent: gdpr,
          collectiveShares: shares,
          sharesGdprConfirmed: shares.length === 0 || sharesGdpr,
        });
        router.push(p(`/ugyfelek/${created.id}`));
      }
    } catch (err) {
      setAlertModal({ message: err.message || t('createError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (isEdit && editId) router.push(p(`/ugyfelek/${editId}`));
    else router.push(p('/ugyfelek'));
  };

  return (
    <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', position: 'relative' }}>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div role="alert" style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 50, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: CLIENTS_BG, padding: '64px 16px 20px', borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={goBack} aria-label={t('back')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>
        <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', display: 'block', marginBottom: 4 }}>
          {t('gdprNotice')}
        </span>
        <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#fff' }}>
          {isEdit ? t('editClient') : tf('newClient')}
        </h1>
      </header>

      {/* ── Form ── */}
      <div style={{ padding: '20px 16px 180px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Name */}
        <Field label={`${t('contactName')}`} required>
          <input id="cf-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" autoFocus aria-required="true" style={INPUT_STYLE} />
        </Field>

        {/* Company + Tax */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label={t('companyName')} style={{ flex: 1 }}>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Fekete Kft." style={INPUT_STYLE} />
          </Field>
          <Field label={t('taxNumber')} style={{ flex: 1 }}>
            <input type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="12345678-1-01" style={INPUT_STYLE} />
          </Field>
        </div>

        {/* Address */}
        <Field label={t('address')}>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="8600 Siófok, Fő utca 12." style={INPUT_STYLE} />
        </Field>

        {/* Phone + Email */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label={t('phone')} style={{ flex: 1 }}>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+36 70 …" style={INPUT_STYLE} />
          </Field>
          <Field label={t('email')} style={{ flex: 1 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={INPUT_STYLE} />
          </Field>
        </div>

        {/* Discount */}
        <Field label={t('discount')}>
          <input type="number" min="0" max="100" step="0.5" value={discount} onChange={e => setDiscount(e.target.value)} style={INPUT_STYLE} />
        </Field>

        {/* Notes */}
        <Field label={t('notes')}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Egyéb tudnivalók az ügyfélről…" style={{ ...INPUT_STYLE, resize: 'none', height: 'auto', paddingTop: 12, paddingBottom: 12 }} />
        </Field>

        {/* GDPR */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, background: gdpr ? '#E7F4EC' : '#fff', border: `1px solid ${gdpr ? '#86efac' : '#E0E0E0'}`, cursor: 'pointer', transition: 'background .15s' }}>
          <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: CLIENTS_BG, width: 18, height: 18 }} />
          <span style={{ fontSize: 14, color: 'var(--m-ink)', lineHeight: 1.45 }}>
            {t('gdprConfirmText')}{' '}
            <span style={{ color: '#B71C1C', fontWeight: 700 }}>*</span>
          </span>
        </label>

        {/* Share with collectives */}
        {ownedCollectives.length > 0 && (
          <div style={{ padding: 14, borderRadius: 20, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4" /></svg>
              {t('shareWithCollectives')}
            </span>
            {ownedCollectives.map(col => (
              <label key={col.collective_id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--m-ink)' }}>
                <input type="checkbox" checked={shares.includes(col.collective_id)} onChange={() => toggleShare(col.collective_id)} style={{ accentColor: CLIENTS_BG, width: 16, height: 16, flexShrink: 0 }} />
                {col.name}
              </label>
            ))}
            {hasNewShares && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 14, background: sharesGdpr ? '#E7F4EC' : '#FFF1E0', border: `1px solid ${sharesGdpr ? '#86efac' : '#fcd34d'}`, cursor: 'pointer' }}>
                <input type="checkbox" checked={sharesGdpr} onChange={e => setSharesGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: CLIENTS_BG, width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: 'var(--m-ink)', lineHeight: 1.45 }}>
                  {t('shareGdprConfirmText')}{' '}
                  <span style={{ color: '#B71C1C', fontWeight: 700 }}>*</span>
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: `linear-gradient(to top, ${CLIENTS_DEEP} 65%, transparent)`, padding: '24px 16px 32px' }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: canSubmit ? CLIENTS_BG : '#5A5F68', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', transition: 'background .15s' }}
        >
          {isSubmitting
            ? (isEdit ? t('modifying') : t('creating'))
            : (isEdit ? t('modify') : t('createClient'))}
        </button>
      </div>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}

function Field({ label, children, required, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' }}>
        {label}{required && <span style={{ color: '#fca5a5', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE = {
  width: '100%',
  boxSizing: 'border-box',
  height: 48,
  borderRadius: 16,
  border: 0,
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  padding: '0 14px',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
};
