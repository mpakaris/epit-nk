'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

const BG      = '#44413B';
const DEEP    = '#121110';
const TINT    = '#ECEAE5';
const ROW_SH  = 'inset 0 1px 0 #fff, 0 14px 22px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

function getInitials(name = '') {
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ChevL  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>;
const ChevR  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>;
const CheckSvg = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>;
const SpinSvg  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'mpspin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-18 0"/></svg>;
const LockSvg  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>;

// ── Shared micro-components ───────────────────────────────────────────────────
function SecLabel({ children }) {
  return <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)' }}>{children}</span>;
}

function SheetSecLabel({ children }) {
  return <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98', paddingTop: 4 }}>{children}</span>;
}

function NavRow({ icon, title, subtitle, onClick, danger, noChevron }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: 64, boxSizing: 'border-box', padding: '10px 14px', border: 0,
      borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : '#0E1116',
      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: ROW_SH,
    }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span>{title}</span>
        {subtitle && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
      </span>
      {!noChevron && <span style={{ flexShrink: 0, color: '#8A8F98' }}><ChevR /></span>}
    </button>
  );
}

function Fld({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{label}</span>}
      {children}
    </label>
  );
}

function FldInput({ value, onChange, placeholder, disabled, type = 'text', textarea }) {
  const base = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #E8E5DF', borderRadius: 16,
    background: '#fff', padding: '0 16px',
    fontSize: 16, fontWeight: 500, color: '#0E1116',
    opacity: disabled ? 0.6 : 1,
  };
  if (textarea) return <textarea value={value} onChange={onChange} placeholder={placeholder} style={{ ...base, height: 88, padding: '12px 16px', resize: 'none', fontFamily: 'inherit' }} />;
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{ ...base, height: 52 }} />;
}

function SheetSaveBtn({ onSave, label, busy }) {
  return (
    <button onClick={onSave} disabled={busy} style={{
      width: '100%', height: 60, border: 0, borderRadius: 30,
      background: BG, color: '#fff', fontSize: 17, fontWeight: 700,
      cursor: busy ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginTop: 4, flexShrink: 0, opacity: busy ? 0.7 : 1,
    }}>
      {busy ? <SpinSvg /> : <CheckSvg />}
      {label}
    </button>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div role="status" style={{ position: 'fixed', zIndex: 200, left: 16, right: 16, top: 18, padding: '14px 16px', borderRadius: 22, background: '#14532D', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
      <CheckSvg />{msg}
    </div>
  );
}

// z=40 → main sheets; z=60 → sub-sheets on top of main; z=80 → alerts
function Sheet({ open, onClose, title, children, z = 40 }) {
  if (!open) return null;
  return (
    <>
      <button onClick={onClose} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: z, border: 0, padding: 0, background: 'rgba(14,17,22,.5)', cursor: 'pointer' }} />
      <div style={{ position: 'fixed', zIndex: z + 10, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px 32px', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}>
        <span style={{ alignSelf: 'center', flexShrink: 0, width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, lineHeight: 1.1, color: '#0E1116' }}>{title}</span>
            <button onClick={onClose} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileMobile() {
  const router = useRouter();
  const { currentUser, logout, changePassword, isDemoMode, collectives, updateDisplayName, refreshSupabaseData, refreshCurrentUser } = useApp();
  const t     = useTranslations('profile');
  const tc    = useTranslations('common');
  const tColl = useTranslations('collectives');
  const locale = useLocale();

  // which main sheet is open
  const [openSheet, setOpenSheet] = useState(null);
  // null | 'personal' | 'invoice' | 'defaults' | 'terms' | 'subscription' | 'language' | 'security'

  const [toast, setToast] = useState('');
  const flash = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); }, []);

  // ── Profile fields ────────────────────────────────────────────────────────
  const [loadingProfile,      setLoadingProfile]      = useState(true);
  const [displayName,         setDisplayName]         = useState('');
  const [firstName,           setFirstName]           = useState('');
  const [lastName,            setLastName]            = useState('');
  const [companyName,         setCompanyName]         = useState('');
  const [street,              setStreet]              = useState('');
  const [streetNumber,        setStreetNumber]        = useState('');
  const [zip,                 setZip]                 = useState('');
  const [city,                setCity]                = useState('');
  const [taxNumber,           setTaxNumber]           = useState('');
  const [phone,               setPhone]               = useState('');
  const [bankAccount,         setBankAccount]         = useState('');
  const [bankName,            setBankName]            = useState('');
  const [iban,                setIban]                = useState('');
  const [bic,                 setBic]                 = useState('');
  const [defaultTaxPct,       setDefaultTaxPct]       = useState('27');
  const [offerValidityDays,   setOfferValidityDays]   = useState('30');
  const [offerTermsText,      setOfferTermsText]      = useState('');
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState('8');
  const [paymentMethod,       setPaymentMethod]       = useState('');
  const [depositPercent,      setDepositPercent]      = useState('0');
  const [warrantyMonths,      setWarrantyMonths]      = useState('0');
  const [termsPdfUrl,         setTermsPdfUrl]         = useState(null);
  const [termsPdfName,        setTermsPdfName]        = useState(null);
  const [termsPdfUploadedAt,  setTermsPdfUploadedAt]  = useState(null);
  const [saving,              setSaving]              = useState(false);

  // ── Subscription state ────────────────────────────────────────────────────
  const [premiumSubId,             setPremiumSubId]             = useState(null);
  const [premiumSubStarted,        setPremiumSubStarted]        = useState(null);
  const [premiumBillingCycles,     setPremiumBillingCycles]     = useState(null);
  const [subDetailLoading,         setSubDetailLoading]         = useState(false);
  const [subHistory,               setSubHistory]               = useState(null); // null = not loaded
  const [subHistoryLoading,        setSubHistoryLoading]        = useState(false);
  const [collectiveSubs,           setCollectiveSubs]           = useState([]);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt,          setPremiumCancelAt]          = useState(null);
  const [premiumRenewalAt,         setPremiumRenewalAt]         = useState(null);
  const [subSheet,                 setSubSheet]                 = useState(null);
  const [subOkData,                setSubOkData]                = useState(null);
  const [subBusy,                  setSubBusy]                  = useState(false);
  const [checkoutBusy,             setCheckoutBusy]             = useState(false);
  const [checkoutIframeUrl,        setCheckoutIframeUrl]        = useState(null);
  const [upgradeModal,             setUpgradeModal]             = useState(null);
  const [alertSheet,               setAlertSheet]               = useState(null);

  // ── Password state ────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwErr,     setPwErr]     = useState('');

  // ── Delete account ────────────────────────────────────────────────────────
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [deleteWord,  setDeleteWord]  = useState('');
  const [deleting,    setDeleting]    = useState(false);

  // ── PDF ───────────────────────────────────────────────────────────────────
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfError,     setPdfError]     = useState('');
  const pdfRef = useRef(null);

  // ── Locale ────────────────────────────────────────────────────────────────
  const [savingLocale, setSavingLocale] = useState(false);

  // Derived
  const isPremium    = currentUser?.is_subscription_premium ?? false;
  const isOnTrial    = !isPremium && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
  const trialDays    = isOnTrial ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000)) : 0;
  const userCurrency = currentUser?.currency || 'HUF';

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) {
      setDisplayName('Nemes Péter'); setFirstName('Péter'); setLastName('Nemes');
      setCompanyName('Nemes Felújító E.V.'); setStreet('Ráday utca'); setStreetNumber('8.');
      setZip('1092'); setCity('Budapest'); setTaxNumber('12345678-1-42');
      setPhone('+36 70 555 0123'); setBankAccount('11773016-11111018'); setBankName('OTP Bank');
      setDefaultTaxPct('27'); setOfferValidityDays('30'); setPaymentDeadlineDays('8');
      setLoadingProfile(false);
      return;
    }
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ profile, premiumSub, ownedCollectiveSubs }) => {
        if (!profile) return;
        setCollectiveSubs(ownedCollectiveSubs ?? []);
        setDisplayName(profile.display_name || '');
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setCompanyName(profile.company_name || '');
        setStreet(profile.street || '');
        setStreetNumber(profile.street_number || '');
        setZip(profile.zip || '');
        setCity(profile.city || '');
        setTaxNumber(profile.tax_number || '');
        setDefaultTaxPct(profile.default_tax_percent != null ? String(profile.default_tax_percent) : '27');
        setPhone(profile.phone || '');
        setBankAccount(profile.bank_account || '');
        setBankName(profile.bank_name || '');
        setIban(profile.iban || '');
        setBic(profile.bic || '');
        setOfferValidityDays(profile.offer_validity_days != null ? String(profile.offer_validity_days) : '30');
        setOfferTermsText(profile.offer_terms_text || '');
        setPaymentDeadlineDays(profile.payment_deadline_days != null ? String(profile.payment_deadline_days) : '8');
        setPaymentMethod(profile.payment_method || '');
        setDepositPercent(profile.deposit_percent != null ? String(profile.deposit_percent) : '0');
        setWarrantyMonths(profile.warranty_months != null ? String(profile.warranty_months) : '0');
        setTermsPdfUrl(profile.terms_pdf_url || null);
        setTermsPdfName(profile.terms_pdf_name || null);
        setTermsPdfUploadedAt(profile.terms_pdf_uploaded_at || null);
        setPremiumSubId(premiumSub?.creem_subscription_id || null);
        setPremiumSubStarted(premiumSub?.created_at || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
        setPremiumRenewalAt(premiumSub?.status !== 'scheduled_cancel' ? (premiumSub?.period_end || null) : null);
      })
      .finally(() => setLoadingProfile(false));
  }, [isDemoMode]);

  // Creem activation — handle ?upgraded=1 redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('creem_upgrade_result');
    if (stored) { try { setUpgradeModal(JSON.parse(stored)); } catch {} return; }
    const params = new URLSearchParams(window.location.search);
    if (!params.has('upgraded')) return;
    window.history.replaceState({}, '', '/profil');
    const subscriptionId = params.get('subscription_id');
    const customerId     = params.get('customer_id');
    const productId      = params.get('product_id');
    const finish = (status) => { sessionStorage.setItem('creem_upgrade_result', JSON.stringify({ status, productId: productId ?? null })); window.location.replace('/profil'); };
    if (subscriptionId) {
      fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId, customerId }) })
        .then(res => finish(res.ok ? 'success' : 'error')).catch(() => finish('error'));
    } else { finish('error'); }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:  displayName.trim()  || null,
          first_name:    firstName.trim()    || null,
          last_name:     lastName.trim()     || null,
          company_name:  companyName.trim()  || null,
          street:        street.trim()       || null,
          street_number: streetNumber.trim() || null,
          zip:           zip.trim()          || null,
          city:          city.trim()         || null,
          tax_number:    taxNumber.trim()    || null,
          phone:         phone.trim()        || null,
          bank_name:     bankName.trim()     || null,
          iban:          iban.trim()         || null,
          bic:           bic.trim()          || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || t('saveError')); }
      if (displayName.trim()) updateDisplayName(displayName.trim());
      setOpenSheet(null);
      flash(t('invoiceSaved'));
    } catch (err) { setAlertSheet({ title: tc('error'), msg: err.message }); }
    finally { setSaving(false); }
  };

  const handleSaveDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_tax_percent:   defaultTaxPct !== '' ? Number(defaultTaxPct) : 27,
          offer_validity_days:   offerValidityDays !== '' ? Number(offerValidityDays) : 30,
          offer_terms_text:      offerTermsText.trim() || null,
          payment_deadline_days: paymentDeadlineDays !== '' ? Number(paymentDeadlineDays) : 8,
          payment_method:        paymentMethod.trim() || null,
          deposit_percent:       depositPercent !== '' ? Number(depositPercent) : 0,
          warranty_months:       warrantyMonths !== '' ? Number(warrantyMonths) : 0,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || t('saveError')); }
      setOpenSheet(null);
      flash(t('invoiceSaved'));
    } catch (err) { setAlertSheet({ title: tc('error'), msg: err.message }); }
    finally { setSaving(false); }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPdfError(''); setUploadingPdf(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res  = await fetch('/api/auth/profile/terms-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a feltöltéskor');
      setTermsPdfUrl(data.terms_pdf_url); setTermsPdfName(data.terms_pdf_name); setTermsPdfUploadedAt(data.terms_pdf_uploaded_at || null);
      flash(t('saved'));
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); e.target.value = ''; }
  };

  const handlePdfDelete = async () => {
    setUploadingPdf(true);
    try {
      const res = await fetch('/api/auth/profile/terms-pdf', { method: 'DELETE' });
      if (!res.ok) throw new Error('Hiba a törléskor');
      setTermsPdfUrl(null); setTermsPdfName(null); setTermsPdfUploadedAt(null);
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); }
  };

  const handleSaveLocale = async (newLocale) => {
    if (savingLocale || newLocale === locale) return;
    setSavingLocale(true);
    try {
      const res = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: newLocale }) });
      if (!res.ok) { flash(t('saveError')); return; }
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      window.location.reload();
    } finally { setSavingLocale(false); }
  };

  const handleChangePassword = async () => {
    setPwErr('');
    if (newPw.length < 8)         { setPwErr('A jelszónak legalább 8 karakterből kell állnia!'); return; }
    if (!/[A-Z]/.test(newPw))     { setPwErr('A jelszónak tartalmaznia kell legalább 1 nagybetűt!'); return; }
    if (!/[0-9]/.test(newPw))     { setPwErr('A jelszónak tartalmaznia kell legalább 1 számot!'); return; }
    if (newPw !== confirmPw)       { setPwErr('A jelszavak nem egyeznek!'); return; }
    setPwSaving(true);
    try {
      await changePassword(newPw);
      setOpenSheet(null);
      flash(t('passwordSaved'));
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) { setPwErr(err.message || 'Hiba a jelszóváltoztatáskor'); }
    finally { setPwSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteWord.trim() !== 'TÖRLÉS') return;
    setDeleting(true);
    try {
      const res  = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteSheet(false); logout();
    } catch (err) { setAlertSheet({ title: tc('error'), msg: err.message || 'Hiba történt.' }); }
    finally { setDeleting(false); }
  };

  const handleCancelPremium = async () => {
    if (!premiumSubId) { setAlertSheet({ title: tc('error'), msg: t('subscriptionIdMissing') }); return; }
    setSubBusy(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      const data = await res.json();
      if (res.ok) {
        const endDate = data.subscription_period_end ?? null;
        setPremiumIsScheduledCancel(true);
        setPremiumCancelAt(endDate);
        setPremiumRenewalAt(null);
        setSubSheet(null);
        setSubOkData({
          title: t('premiumCanceledTitle'),
          text:  endDate ? t('premiumActiveUntilDate', { date: formatDate(endDate) }) : t('premiumActiveUntilPeriod'),
          notes: [t('premiumCanceledDataNote'), t('premiumCanceledResumeHint')],
        });
        setSubSheet('ok');
      } else { setAlertSheet({ title: tc('error'), msg: data.error || t('cancelErrorMsg') }); }
    } catch { setAlertSheet({ title: tc('error'), msg: t('cancelErrorMsg') }); }
    finally { setSubBusy(false); }
  };

  const handleResumePremium = async () => {
    if (!premiumSubId) { setAlertSheet({ title: tc('error'), msg: t('subscriptionIdMissing') }); return; }
    setSubBusy(true);
    try {
      const res = await fetch('/api/subscriptions/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      if (res.ok) {
        setPremiumIsScheduledCancel(false);
        setPremiumCancelAt(null);
        setSubSheet(null);
        setSubOkData({
          title: t('resumeSuccessTitle'),
          text:  t('resumeSuccessText'),
        });
        setSubSheet('ok');
        await refreshCurrentUser();
      } else { const d = await res.json(); setAlertSheet({ title: tc('error'), msg: d.error || t('resumeErrorMsg') }); }
    } catch { setAlertSheet({ title: tc('error'), msg: t('resumeErrorMsg') }); }
    finally { setSubBusy(false); }
  };

  const handleCancelCollective = async (collective) => {
    setSubBusy(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: collective.creem_subscription_id, collectiveId: collective.collective_id }) });
      const data = await res.json();
      setSubSheet(null);
      if (res.ok) {
        const end = data.subscription_period_end ?? null;
        setCollectiveSubs(prev => prev.map(c => c.collective_id === collective.collective_id ? { ...c, subscription_status: 'scheduled_cancel', subscription_period_end: end } : c));
        flash(t('cancelSuccessModalTitle'));
      } else { setAlertSheet({ title: tc('error'), msg: data.error || t('cancelErrorMsg') }); }
    } catch { setAlertSheet({ title: tc('error'), msg: t('cancelErrorMsg') }); }
    finally { setSubBusy(false); }
  };

  const handleCheckout = async () => {
    const productId = process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID;
    if (!productId) return;
    setCheckoutBusy(true);
    try {
      const res  = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, successUrl: '/checkout-popup-success?checkout_type=premium' }) });
      const data = await res.json();
      if (!data.checkoutUrl) { setAlertSheet({ title: tc('error'), msg: data.error || 'Hiba a fizetési folyamat indításakor.' }); setCheckoutBusy(false); return; }

      const handleSuccess = async (payload) => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('message', onMessage);
        setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done');
        try {
          const r = await fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: payload.subscriptionId, customerId: payload.customerId }) });
          setUpgradeModal({ status: r.ok ? 'success' : 'error', productId: payload.productId ?? productId });
          if (r.ok) { await refreshCurrentUser(); refreshSupabaseData(); }
        } catch { setUpgradeModal({ status: 'error', productId }); }
        setCheckoutBusy(false);
      };
      const onStorage = (e) => { if (e.key !== 'creem_checkout_done') return; let d; try { d = JSON.parse(e.newValue); } catch { return; } if (d?.checkoutType !== 'premium') return; handleSuccess(d); };
      const onMessage = (e) => { if (e.origin !== window.location.origin) return; if (e.data?.type !== 'creem_checkout_success') return; if (e.data?.checkoutType !== 'premium') return; handleSuccess(e.data); };
      window.addEventListener('storage', onStorage);
      window.addEventListener('message', onMessage);
      setCheckoutIframeUrl(data.checkoutUrl);
    } catch { setAlertSheet({ title: tc('error'), msg: 'Hiba a fizetési folyamat indításakor.' }); setCheckoutBusy(false); }
  };

  // ── Derived display values ────────────────────────────────────────────────
  const tierPill    = isPremium ? t('subscriptionBadgePremium') : (isOnTrial ? t('subscriptionBadgeTrial') : t('subscriptionBadgeBasic'));
  const initials    = getInitials(displayName || currentUser?.display_name || currentUser?.email || '');
  const localeLabel = { hu: 'Magyar', de: 'Deutsch', en: 'English' }[locale] || locale;
  const subRowSub   = isPremium
    ? (premiumIsScheduledCancel ? t('scheduledCancelNoDate') : (premiumRenewalAt ? t('subNextRenewal', { date: formatDate(premiumRenewalAt) }) : t('subRenewsMonthly')))
    : (isOnTrial ? t('trialBannerText', { days: trialDays }) : t('planFree'));
  const subBadge    = premiumIsScheduledCancel
    ? { label: t('subCancels'), bg: '#FFF4E5', fg: '#6B3A00' }
    : { label: t('subActive'),  bg: '#E7F4EC', fg: '#14532D' };
  const subNote     = premiumIsScheduledCancel
    ? (premiumCancelAt ? t('subActiveUntil', { date: formatDate(premiumCancelAt) }) : t('subActiveUntilPeriod'))
    : (premiumRenewalAt ? t('subNextRenewal', { date: formatDate(premiumRenewalAt) }) : t('subRenewsMonthly'));

  if (loadingProfile) return (
    <div style={{ minHeight: '100vh', background: DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes mpspin{to{transform:rotate(360deg)}}`}</style>
      <SpinSvg />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: DEEP, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes mpspin{to{transform:rotate(360deg)}}`}</style>
      <Toast msg={toast} />

      {/* ── Overview — always visible ──────────────────────────────────── */}
      <div style={{ paddingBottom: 60 }}>
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: BG, color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => router.back()} aria-label="Vissza" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
              <ChevL />
            </button>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.18)' }}>{tierPill}</span>
            <span style={{ width: 48 }} />
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>{t('accountSection')}</span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{t('pageTitle')}</h1>
          <span style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{currentUser?.email}</span>
          <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ width: 64, height: 64, borderRadius: 32, background: '#fff', color: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, flexShrink: 0 }}>{initials}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 18 }}>{displayName || currentUser?.display_name || '—'}</b>
              <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: '#fff', color: BG, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>
                {tierPill}
              </span>
            </span>
          </span>
        </header>

        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isOnTrial && (
            <div style={{ padding: 14, borderRadius: 26, display: 'flex', gap: 12, alignItems: 'center', background: '#FFF4E5', color: '#6B3A00' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-5 0 1 1 5 0 5 0zM12 7c2-4 6-3 5 0-1 1-5 0-5 0z"/></svg>
              <span style={{ flex: 1 }}>
                <b style={{ display: 'block', fontSize: 16 }}>{t('trialBannerText', { days: trialDays })}</b>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8A5A1A' }}>{t('planPremiumName')} funkciók elérhetők.</span>
              </span>
            </div>
          )}

          <SecLabel>{t('myDataSection')}</SecLabel>
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8a4 4 0 108 0 4 4 0 10-8 0M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>}
            title={t('personalDataTitle')}
            subtitle={t('personalDataSubtitle')}
            onClick={() => setOpenSheet('personal')}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/></svg>}
            title={t('invoiceHeader')}
            subtitle={t('invoiceHeaderShortSubtitle')}
            onClick={() => setOpenSheet('invoice')}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 17h5"/></svg>}
            title={t('offerDefaultsTitle')}
            subtitle={t('offerDefaultsSubtitle')}
            onClick={() => setOpenSheet('defaults')}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 15h6M9 11h3"/></svg>}
            title={t('termsTitle').replace(' (ÁSZF)', '')}
            subtitle={termsPdfName ? `${termsPdfName} · feltöltve` : t('uploadPdf')}
            onClick={() => setOpenSheet('terms')}
          />

          <SecLabel>{t('accountSection')}</SecLabel>
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/></svg>}
            title={t('subscription')}
            subtitle={subRowSub}
            onClick={() => setOpenSheet('subscription')}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4"/></svg>}
            title={t('collectiveWorkspacesTitle')}
            subtitle={collectives?.length ? `${collectives.length} kollektíva` : undefined}
            onClick={() => router.push('/kollektivak')}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h8M8 3v2M5 5c1 4 4 7 7 8M11 5c-1 4-4 7-8 9M13 20l4-9 4 9M14.5 17h5"/></svg>}
            title={t('preferencesTitle')}
            subtitle={`${localeLabel} · ${userCurrency}`}
            onClick={() => setOpenSheet('language')}
          />

          <SecLabel>{t('security')}</SecLabel>
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a4 4 0 11-3 3.8L4 21v-3l2-2v-2h2l3.5-3.5"/></svg>}
            title={t('passwordChange')}
            onClick={() => { setPwErr(''); setOpenSheet('security'); }}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H5v16h5M15 8l5 4-5 4M20 12H9"/></svg>}
            title={t('logout')}
            onClick={() => { if (!isDemoMode) logout(); }}
          />
          <NavRow
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>}
            title={t('deleteAccount')}
            subtitle={t('deleteAccountSubtitle')}
            onClick={() => { setDeleteWord(''); setDeleteSheet(true); }}
            danger
          />

          <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{t('contactQuestion')} info@okosszaki.hu</p>
        </div>
      </div>

      {/* ── Personal Data Sheet ────────────────────────────────────────── */}
      <Sheet open={openSheet === 'personal'} onClose={() => setOpenSheet(null)} title={t('personalDataTitle')}>
        <Fld label={t('displayName')}>
          <FldInput value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </Fld>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('displayNameHint')}</span>
        <Fld label={t('email')}>
          <FldInput value={currentUser?.email || ''} disabled />
        </Fld>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('firstName')}</span>
            <FldInput value={firstName} onChange={e => setFirstName(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('lastName')}</span>
            <FldInput value={lastName} onChange={e => setLastName(e.target.value)} />
          </label>
        </div>
        <Fld label={t('phone')}><FldInput value={phone} onChange={e => setPhone(e.target.value)} /></Fld>
        <SheetSaveBtn onSave={handleSaveProfile} label={saving ? t('saving') : t('save')} busy={saving} />
      </Sheet>

      {/* ── Invoice Header Sheet ───────────────────────────────────────── */}
      <Sheet open={openSheet === 'invoice'} onClose={() => setOpenSheet(null)} title={t('invoiceHeader')}>
        <div style={{ padding: '14px 14px', borderRadius: 18, background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7zM14 3v5h4M9 13h6M9 9h3"/></svg>
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F', lineHeight: 1.6 }}>{t('invoiceHeaderSubtitle')}</span>
        </div>
        <Fld label={`${t('companyName')} ${t('companyNameOptional')}`}>
          <FldInput value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </Fld>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('street')}</span>
            <FldInput value={street} onChange={e => setStreet(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('streetNumber')}</span>
            <FldInput value={streetNumber} onChange={e => setStreetNumber(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('zip')}</span>
            <FldInput value={zip} onChange={e => setZip(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('city')}</span>
            <FldInput value={city} onChange={e => setCity(e.target.value)} />
          </label>
        </div>
        <Fld label={t('taxNumber')}><FldInput value={taxNumber} onChange={e => setTaxNumber(e.target.value)} /></Fld>
        <Fld label={t('iban')}>
          <FldInput value={iban} onChange={e => setIban(e.target.value)} placeholder="HU42 1177 3016 1111 1018 0000 0000" />
        </Fld>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>{t('ibanHint')}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('bic')}</span>
            <FldInput value={bic} onChange={e => setBic(e.target.value)} placeholder="OTPVHUHB" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('bankName')}</span>
            <FldInput value={bankName} onChange={e => setBankName(e.target.value)} />
          </label>
        </div>
        <SheetSaveBtn onSave={handleSaveProfile} label={saving ? t('saving') : t('save')} busy={saving} />
      </Sheet>

      {/* ── Offer Defaults Sheet ───────────────────────────────────────── */}
      <Sheet open={openSheet === 'defaults'} onClose={() => setOpenSheet(null)} title={t('offerDefaultsTitle')}>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('defaultVat')} (%)</span>
            <FldInput value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('offerValidity')} {t('offerValidityUnit')}</span>
            <FldInput value={offerValidityDays} onChange={e => setOfferValidityDays(e.target.value)} />
          </label>
        </div>
        <Fld label={t('paymentMethod')}>
          <FldInput value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder={t('paymentMethodPlaceholder')} />
        </Fld>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('paymentDeadline')} {t('paymentDeadlineUnit')}</span>
            <FldInput value={paymentDeadlineDays} onChange={e => setPaymentDeadlineDays(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('deposit')} {t('depositUnit')}</span>
            <FldInput value={depositPercent} onChange={e => setDepositPercent(e.target.value)} />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('warranty')} {t('warrantyUnit')}</span>
          <FldInput value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('otherTerms')} {t('otherTermsUnit')}</span>
          <FldInput value={offerTermsText} onChange={e => setOfferTermsText(e.target.value)} textarea />
        </label>
        <SheetSaveBtn onSave={handleSaveDefaults} label={saving ? t('saving') : t('save')} busy={saving} />
      </Sheet>

      {/* ── Terms (ÁSZF) Sheet ─────────────────────────────────────────── */}
      <Sheet open={openSheet === 'terms'} onClose={() => setOpenSheet(null)} title={t('termsTitle').replace(' (ÁSZF)', '')}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>{t('termsSubtitle')}</span>
        {pdfError && <div role="alert" style={{ padding: '12px 14px', borderRadius: 14, background: '#FDECEC', color: '#B71C1C', fontSize: 14, fontWeight: 700 }}>{pdfError}</div>}
        {termsPdfName ? (
          <>
            <div style={{ background: '#fff', borderRadius: 20, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid #E8E5DF' }}>
              <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: TINT, color: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 15h6M9 11h3"/></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{termsPdfName}</b>
                {termsPdfUploadedAt && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('uploadedAt')} {formatDate(termsPdfUploadedAt)}</span>}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => pdfRef.current?.click()} disabled={uploadingPdf} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>
                {uploadingPdf ? t('uploading') : t('replacePdf')}
              </button>
              <button onClick={handlePdfDelete} disabled={uploadingPdf} aria-label="Törlés" style={{ flexShrink: 0, width: 56, height: 56, border: 0, borderRadius: 28, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => pdfRef.current?.click()} disabled={uploadingPdf} style={{ minHeight: 96, border: '2px dashed #D5D2C8', borderRadius: 20, background: 'transparent', color: BG, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>
            {uploadingPdf ? t('uploading') : t('uploadPdf')}
          </button>
        )}
        <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
      </Sheet>

      {/* ── Subscription Sheet ─────────────────────────────────────────── */}
      <Sheet open={openSheet === 'subscription'} onClose={() => setOpenSheet(null)} title={t('subscription')}>
        {/* Trial banner */}
        {isOnTrial && (
          <div style={{ padding: 12, borderRadius: 18, background: '#FFF4E5', color: '#6B3A00', fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
            {t('trialBannerText', { days: trialDays })}
          </div>
        )}

        {/* Current plan info */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 17, color: '#0E1116' }}>
              {isPremium ? t('planPremiumName') : isOnTrial ? t('subscriptionBadgeTrial') : t('planBasicName')}
            </b>
            {isPremium && (
              <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: subBadge.bg, color: subBadge.fg, display: 'inline-flex', alignItems: 'center' }}>
                {subBadge.label}
              </span>
            )}
          </div>
          {premiumSubStarted && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#5A5F68', fontWeight: 600 }}>{t('subStartedLabel')}</span>
              <span style={{ fontWeight: 700, color: '#0E1116' }}>{formatDate(premiumSubStarted)}</span>
            </div>
          )}
          {isOnTrial && currentUser?.trial_ends_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#5A5F68', fontWeight: 600 }}>{t('subActiveUntilLabel')}</span>
              <span style={{ fontWeight: 700, color: '#B45309' }}>{formatDate(currentUser.trial_ends_at)}</span>
            </div>
          )}
        </div>

        {/* Forward to full subscription page — flexShrink:0 so the history div can't squish it */}
        <a href="/elofizetes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, flexShrink: 0, border: 0, borderRadius: 28, background: BG, color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', marginTop: 4 }}>
          {t('subscriptionPageLink')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </Sheet>

      {/* ── Language & Currency Sheet ──────────────────────────────────── */}
      <Sheet open={openSheet === 'language'} onClose={() => setOpenSheet(null)} title={t('preferencesTitle')}>
        <SheetSecLabel>{t('languageLabel')}</SheetSecLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ code: 'hu', label: 'Magyar' }, { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }].map(l => {
            const on = l.code === locale;
            return (
              <button key={l.code} onClick={() => handleSaveLocale(l.code)} style={{ flex: 1, height: 56, border: `2px solid ${on ? BG : '#E8E5DF'}`, borderRadius: 28, cursor: 'pointer', background: on ? BG : '#fff', color: on ? '#fff' : '#0E1116', fontSize: 16, fontWeight: 700, opacity: savingLocale && !on ? 0.6 : 1 }}>
                {l.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('languageNote')}</span>
        <SheetSecLabel>{t('currencyLabel')}</SheetSecLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['HUF', 'EUR', 'GBP', 'USD'].map(cur => {
            const on     = cur === userCurrency;
            const locked = userCurrency && !on;
            return (
              <button key={cur} disabled={locked} style={{ flex: 1, minWidth: 70, height: 56, border: `2px solid ${on ? BG : '#E8E5DF'}`, borderRadius: 28, cursor: locked ? 'default' : 'pointer', background: on ? BG : '#fff', color: on ? '#fff' : '#0E1116', fontSize: 16, fontWeight: 700, opacity: locked ? 0.4 : 1 }}>
                {cur}
              </button>
            );
          })}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 14, display: 'flex', gap: 8, alignItems: 'center', background: TINT, color: BG, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
          <LockSvg />
          {t('currencyNote')}
        </div>
      </Sheet>

      {/* ── Security / Password Sheet ──────────────────────────────────── */}
      <Sheet open={openSheet === 'security'} onClose={() => setOpenSheet(null)} title={t('passwordChange')}>
        {pwErr && <div role="alert" style={{ padding: '12px 14px', borderRadius: 14, background: '#FDECEC', color: '#B71C1C', fontSize: 14, fontWeight: 700 }}>{pwErr}</div>}
        <Fld label={t('currentPassword')}><FldInput type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} /></Fld>
        <Fld label={t('newPassword')}><FldInput type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t('newPasswordPlaceholder')} /></Fld>
        <Fld label={t('passwordConfirm')}><FldInput type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t('passwordRepeatPlaceholder')} /></Fld>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>Min. 8 karakter, 1 nagybetű, 1 szám.</span>
        <SheetSaveBtn onSave={handleChangePassword} label={pwSaving ? t('saving') : t('passwordSave')} busy={pwSaving} />
      </Sheet>

      {/* ── Delete Account Sheet ───────────────────────────────────────── */}
      <Sheet open={deleteSheet} onClose={() => { setDeleteSheet(false); setDeleteWord(''); }} title={t('deleteAccount')} z={60}>
        <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{isPremium ? t('dangerWarningPremium') : t('dangerWarningBasic')}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('deleteConfirmPrompt')}</span>
        <FldInput value={deleteWord} onChange={e => setDeleteWord(e.target.value)} placeholder={t('deleteConfirmWord')} />
        <button onClick={handleDeleteAccount} disabled={deleting || deleteWord.trim() !== 'TÖRLÉS'} style={{ height: 60, border: 0, borderRadius: 30, fontSize: 17, fontWeight: 700, cursor: 'pointer', background: deleteWord.trim() === 'TÖRLÉS' ? '#B71C1C' : '#E5BFBF', color: '#fff' }}>
          {deleting ? t('deleting') : t('deleteAccountFinal')}
        </button>
        <button onClick={() => { setDeleteSheet(false); setDeleteWord(''); }} style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{tc('cancel')}</button>
      </Sheet>

      {/* ── Subscription confirm sub-sheets ───────────────────────────── */}
      <Sheet open={subSheet === 'cancelPrem'} onClose={() => setSubSheet(null)} title={t('premiumCancelTitle')} z={60}>
        {/* Show specific end date if we have it from the live status fetch */}
        {premiumRenewalAt ? (
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#9A3412', display: 'block', marginBottom: 6 }}>
              {t('premiumCancelContentDate', { date: formatDate(premiumRenewalAt) })}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#9A3412', lineHeight: 1.5 }}>
              {t('premiumCanceledDataNote')}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{t('premiumCancelContent')}</span>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>{t('premiumCanceledResumeHint')}</span>
        <button onClick={handleCancelPremium} disabled={subBusy} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
          {subBusy ? t('cancelingBtn') : t('cancelSubscriptionBtn')}
        </button>
        <button onClick={() => setSubSheet(null)} style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{t('keepSubscriptionBtn')}</button>
      </Sheet>

      <Sheet open={subSheet?.type === 'cancelCol'} onClose={() => setSubSheet(null)} title={t('cancelCollectiveTitle')} z={60}>
        {subSheet?.type === 'cancelCol' && (
          <>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{t('cancelCollectiveConfirmText', { name: subSheet.collective.name })}</span>
            <button onClick={() => handleCancelCollective(subSheet.collective)} disabled={subBusy} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {subBusy ? t('cancelingBtn') : t('cancelSubscriptionBtn')}
            </button>
            <button onClick={() => setSubSheet(null)} style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{t('keepSubscriptionBtn')}</button>
          </>
        )}
      </Sheet>

      <Sheet open={subSheet === 'ok'} onClose={() => setSubSheet(null)} z={60}>
        {subOkData && (
          <>
            <span style={{ alignSelf: 'center', width: 64, height: 64, borderRadius: 32, background: '#E7F4EC', color: '#14532D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckSvg /></span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, textAlign: 'center', color: '#0E1116' }}>{subOkData.title}</span>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, textAlign: 'center', color: '#0E1116' }}>{subOkData.text}</span>
            {subOkData.notes?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subOkData.notes.map((note, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#F5F4F0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14532D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M5 12l5 5 9-10"/></svg>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#3A3F47', lineHeight: 1.45 }}>{note}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setSubSheet(null)} style={{ height: 60, border: 0, borderRadius: 30, background: BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{t('ok')}</button>
          </>
        )}
      </Sheet>

      {/* ── Alert Sheet ────────────────────────────────────────────────── */}
      <Sheet open={!!alertSheet} onClose={() => setAlertSheet(null)} title={alertSheet?.title} z={80}>
        {alertSheet && (
          <>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{alertSheet.msg}</span>
            <button onClick={() => setAlertSheet(null)} style={{ height: 60, border: 0, borderRadius: 30, background: BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tc('ok')}</button>
          </>
        )}
      </Sheet>

      {/* ── Checkout iframe ────────────────────────────────────────────── */}
      {checkoutIframeUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => { setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setCheckoutBusy(false); }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '92vh', borderRadius: '16px 16px 0 0', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem 0.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>{t('securePayment')}</span>
              <button onClick={() => { setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setCheckoutBusy(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <iframe src={checkoutIframeUrl} style={{ flex: 1, border: 'none', width: '100%' }} title={t('securePayment')} />
          </div>
        </div>
      )}

      {/* ── Upgrade result modal ───────────────────────────────────────── */}
      {upgradeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 26, padding: '2.5rem 2rem', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{upgradeModal.status === 'success' ? '🎉' : '😔'}</div>
            <h2 style={{ margin: '0 0 0.6rem', fontSize: '1.25rem', fontWeight: 900, color: '#0E1116' }}>{upgradeModal.status === 'success' ? t('upgradeSuccessTitle') : t('upgradeErrorTitle')}</h2>
            <p style={{ margin: '0 0 1.75rem', fontSize: '0.9rem', lineHeight: 1.6, color: '#5A5F68' }}>{upgradeModal.status === 'success' ? t('upgradeSuccessDesc') : t('upgradeErrorDesc')}</p>
            <button onClick={() => { sessionStorage.removeItem('creem_upgrade_result'); setUpgradeModal(null); if (upgradeModal.status === 'success') { refreshCurrentUser(); refreshSupabaseData(); } }} style={{ padding: '0.75rem 2rem', border: 0, borderRadius: 30, background: BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{t('continueBtn')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
