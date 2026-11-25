'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { podColor } from '@/lib/podColor';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { AlertModal } from '@/components/Modal';
import {
  User, KeyRound, LogOut, CheckCircle2, AlertCircle, Loader2,
  FileText, Upload, Trash2, Check, Clock,
  ShieldCheck, Mail, ChevronRight, Globe, Lock,
} from 'lucide-react';

function getInitials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function PodTitle({ children }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116', marginBottom: 16, letterSpacing: '-0.01em' }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5F68', display: 'block', marginBottom: 6 }}>
      {children}
    </span>
  );
}

function FieldRow({ children }) {
  return <div style={{ display: 'flex', gap: 10 }}>{children}</div>;
}

function FieldGroup({ label, children, flex }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: flex ?? 1, minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
    </div>
  );
}

export default function ProfileDesktop() {
  const {
    currentUser, logout, changePassword, isDemoMode,
    updateDisplayName, activeCollectiveId,
  } = useApp();

  const t  = useTranslations('profile');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const AppLink = isDemoMode ? Link : LocaleLink;
  const navPrefix = isDemoMode ? '/demo' : '';

  const wsStyle = activeCollectiveId
    ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
    : {};

  const isPremium  = currentUser?.is_subscription_premium ?? false;
  const isOnTrial  = !isPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000))
    : 0;

  // ── Profile fields ─────────────────────────────────────────────────────────
  const [displayName,          setDisplayName]          = useState('');
  const [firstName,            setFirstName]            = useState('');
  const [lastName,             setLastName]             = useState('');
  const [companyName,          setCompanyName]          = useState('');
  const [street,               setStreet]               = useState('');
  const [streetNumber,         setStreetNumber]         = useState('');
  const [zip,                  setZip]                  = useState('');
  const [city,                 setCity]                 = useState('');
  const [taxNumber,            setTaxNumber]            = useState('');
  const [defaultTaxPct,        setDefaultTaxPct]        = useState('27');
  const [phone,                setPhone]                = useState('');
  const [bankAccount,          setBankAccount]          = useState('');
  const [bankName,             setBankName]             = useState('');
  const [offerValidityDays,    setOfferValidityDays]    = useState('30');
  const [offerTermsText,       setOfferTermsText]       = useState('');
  const [paymentDeadlineDays,  setPaymentDeadlineDays]  = useState('8');
  const [paymentMethod,        setPaymentMethod]        = useState('');
  const [depositPercent,       setDepositPercent]       = useState('0');
  const [warrantyMonths,       setWarrantyMonths]       = useState('0');
  const [loadingProfile,       setLoadingProfile]       = useState(true);
  const [saving,               setSaving]               = useState(false);
  const [saveOk,               setSaveOk]               = useState(false);
  const [saveErr,              setSaveErr]              = useState('');

  // ── Password ───────────────────────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pw,        setPw]        = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [pwErr,     setPwErr]     = useState('');

  // ── Terms PDF ──────────────────────────────────────────────────────────────
  const [termsPdfUrl,        setTermsPdfUrl]        = useState(null);
  const [termsPdfName,       setTermsPdfName]       = useState(null);
  const [termsPdfUploadedAt, setTermsPdfUploadedAt] = useState(null);
  const [uploadingPdf,       setUploadingPdf]       = useState(false);
  const [pdfError,           setPdfError]           = useState('');
  const pdfInputRef = useRef(null);

  // ── Language ───────────────────────────────────────────────────────────────
  const [savingLocale, setSavingLocale] = useState(false);

  // ── Subscription (read-only) ───────────────────────────────────────────────
  const [premiumSubStarted,        setPremiumSubStarted]        = useState(null);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt,          setPremiumCancelAt]          = useState(null);
  const [premiumRenewalAt,         setPremiumRenewalAt]         = useState(null);

  // ── Account deletion ───────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteErr,  setDeleteErr]  = useState('');
  const [deleting,   setDeleting]   = useState(false);

  const [alertModal, setAlertModal] = useState(null);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const req = isDemoMode
      ? Promise.resolve({ profile: { display_name: 'Nemes Péter', first_name: 'Péter', last_name: 'Nemes', company_name: 'Nemes Renováló Kft.', street: 'Alkotás utca', street_number: '15', zip: '1124', city: 'Budapest', tax_number: '99887766-2-43', default_tax_percent: 27 }, premiumSub: null })
      : fetch('/api/auth/profile').then(r => r.json());

    req
      .then(({ profile, premiumSub }) => {
        if (!profile) return;
        setDisplayName(profile.display_name       || '');
        setFirstName(profile.first_name           || '');
        setLastName(profile.last_name             || '');
        setCompanyName(profile.company_name       || '');
        setStreet(profile.street                  || '');
        setStreetNumber(profile.street_number     || '');
        setZip(profile.zip                        || '');
        setCity(profile.city                      || '');
        setTaxNumber(profile.tax_number           || '');
        setDefaultTaxPct(profile.default_tax_percent != null ? String(profile.default_tax_percent) : '27');
        setPhone(profile.phone                             || '');
        setBankAccount(profile.bank_account                || '');
        setBankName(profile.bank_name                      || '');
        setOfferValidityDays(profile.offer_validity_days != null ? String(profile.offer_validity_days) : '30');
        setOfferTermsText(profile.offer_terms_text         || '');
        setPaymentDeadlineDays(profile.payment_deadline_days != null ? String(profile.payment_deadline_days) : '8');
        setPaymentMethod(profile.payment_method            || '');
        setDepositPercent(profile.deposit_percent != null ? String(profile.deposit_percent) : '0');
        setWarrantyMonths(profile.warranty_months != null ? String(profile.warranty_months) : '0');
        setTermsPdfUrl(profile.terms_pdf_url               || null);
        setTermsPdfName(profile.terms_pdf_name             || null);
        setTermsPdfUploadedAt(profile.terms_pdf_uploaded_at || null);
        setPremiumSubStarted(premiumSub?.created_at || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
        setPremiumRenewalAt(premiumSub?.status !== 'scheduled_cancel' ? (premiumSub?.period_end || null) : null);
      })
      .finally(() => setLoadingProfile(false));
  }, [isDemoMode]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:          displayName.trim()   || null,
          first_name:            firstName.trim()     || null,
          last_name:             lastName.trim()      || null,
          company_name:          companyName.trim()   || null,
          street:                street.trim()        || null,
          street_number:         streetNumber.trim()  || null,
          zip:                   zip.trim()           || null,
          city:                  city.trim()          || null,
          tax_number:            taxNumber.trim()     || null,
          default_tax_percent:   defaultTaxPct !== '' ? Number(defaultTaxPct) : 27,
          phone:                 phone.trim()         || null,
          bank_account:          bankAccount.trim()   || null,
          bank_name:             bankName.trim()      || null,
          offer_validity_days:   offerValidityDays !== '' ? Number(offerValidityDays) : 30,
          offer_terms_text:      offerTermsText.trim() || null,
          payment_deadline_days: paymentDeadlineDays !== '' ? Number(paymentDeadlineDays) : 8,
          payment_method:        paymentMethod.trim() || null,
          deposit_percent:       depositPercent !== '' ? Number(depositPercent) : 0,
          warranty_months:       warrantyMonths !== '' ? Number(warrantyMonths) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('saveError'));
      if (displayName.trim()) updateDisplayName(displayName.trim());
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwOk(false);
    if (pw.length < 8)                  { setPwErr('A jelszónak legalább 8 karakterből kell állnia!'); return; }
    if (!/[A-Z]/.test(pw))              { setPwErr('A jelszónak tartalmaznia kell legalább 1 nagybetűt!'); return; }
    if (!/[0-9]/.test(pw))              { setPwErr('A jelszónak tartalmaznia kell legalább 1 számot!'); return; }
    if (!/[^A-Za-z0-9]/.test(pw))       { setPwErr('A jelszónak tartalmaznia kell legalább 1 speciális karaktert!'); return; }
    if (pw !== pwConfirm)                { setPwErr('A jelszavak nem egyeznek!'); return; }
    setPwSaving(true);
    try {
      await changePassword(pw);
      setPwOk(true);
      setPw(''); setPwConfirm('');
      setTimeout(() => { setPwOk(false); setPwOpen(false); }, 2500);
    } catch (err) { setPwErr(err.message || 'Hiba a jelszóváltoztatáskor'); }
    finally { setPwSaving(false); }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(''); setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/auth/profile/terms-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a feltöltéskor');
      setTermsPdfUrl(data.terms_pdf_url);
      setTermsPdfName(data.terms_pdf_name);
      setTermsPdfUploadedAt(data.terms_pdf_uploaded_at || null);
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); e.target.value = ''; }
  };

  const handlePdfDelete = async () => {
    setPdfError(''); setUploadingPdf(true);
    try {
      const res = await fetch('/api/auth/profile/terms-pdf', { method: 'DELETE' });
      if (!res.ok) throw new Error('Hiba a törléskor');
      setTermsPdfUrl(null); setTermsPdfName(null); setTermsPdfUploadedAt(null);
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); }
  };

  const handleSaveLocale = async (newLocale) => {
    if (savingLocale || newLocale === currentLocale) return;
    setSavingLocale(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        setAlertModal({ variant: 'error', title: tc('error'), message: error || t('saveError') });
        return;
      }
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      window.location.reload();
    } finally {
      setSavingLocale(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteErr('');
    try {
      const res  = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteOpen(false); setDeleteText('');
      logout();
    } catch (err) { setDeleteErr(err.message || 'Hiba történt.'); }
    finally { setDeleting(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const initials   = getInitials(displayName || currentUser?.display_name);
  const tierLabel  = isPremium ? t('subscriptionBadgePremium') : isOnTrial ? t('subscriptionBadgeTrial') : t('subscriptionBadgeBasic');
  const tierBadge  = isPremium
    ? { background: '#fef9c3', color: '#854d0e' }
    : isOnTrial
    ? { background: '#fff7ed', color: '#c2410c' }
    : { background: '#F0F0F2', color: '#5A5F68' };

  if (loadingProfile) {
    return (
      <div className="dk-page dk-mod-profile" style={{ ...wsStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />
      </div>
    );
  }

  return (
    <div className="dk-page dk-mod-profile" style={wsStyle}>

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant ?? 'success'}
        title={alertModal?.title}
        message={alertModal?.message}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, position: 'relative' }}>
          <span className="dk-kick">{t('accountSection')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          <button type="button" onClick={logout} className="dk-btn dk-btn-g">
            <LogOut size={16} aria-hidden="true" />
            {t('logout')}
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="dk-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

          {/* ── Left column: forms ─────────────────────────────────────────── */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Personal data pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>{t('personalDataTitle')}</PodTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <FieldLabel>{t('displayName')}</FieldLabel>
                  <input
                    className="dk-input"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder={currentUser?.display_name || 'pl. Kovács János'}
                  />
                  <span style={{ fontSize: 12, color: '#8A8F98', fontWeight: 600, marginTop: 5, display: 'block' }}>
                    {t('displayNameHint')}
                  </span>
                </div>
                <FieldRow>
                  <FieldGroup label={t('firstName')}>
                    <input className="dk-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. János" />
                  </FieldGroup>
                  <FieldGroup label={t('lastName')}>
                    <input className="dk-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" />
                  </FieldGroup>
                </FieldRow>
                <div>
                  <FieldLabel>{t('phone')}</FieldLabel>
                  <input className="dk-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="pl. +36 30 123 4567" />
                </div>
              </div>
            </div>

            {/* Invoice header pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>
                {t('invoiceHeader')}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68', marginLeft: 8 }}>{t('invoiceHeaderSubtitle')}</span>
              </PodTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <FieldLabel>
                    {t('companyName')}{' '}
                    <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{t('companyNameOptional')}</span>
                  </FieldLabel>
                  <input className="dk-input" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="pl. Kovács Építő Kft." />
                </div>
                <FieldRow>
                  <FieldGroup label={t('street')}>
                    <input className="dk-input" type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="pl. Fő utca" />
                  </FieldGroup>
                  <FieldGroup label={t('streetNumber')} flex="0 0 130px">
                    <input className="dk-input" type="text" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="pl. 12/A" />
                  </FieldGroup>
                </FieldRow>
                <FieldRow>
                  <FieldGroup label={t('zip')} flex="0 0 130px">
                    <input className="dk-input" type="text" value={zip} onChange={e => setZip(e.target.value)} placeholder="pl. 1234" />
                  </FieldGroup>
                  <FieldGroup label={t('city')}>
                    <input className="dk-input" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="pl. Budapest" />
                  </FieldGroup>
                </FieldRow>
                <FieldRow>
                  <FieldGroup label={t('taxNumber')}>
                    <input className="dk-input" type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="pl. 12345678-2-41" />
                  </FieldGroup>
                  <FieldGroup label={t('bankName')}>
                    <input className="dk-input" type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="pl. OTP Bank" />
                  </FieldGroup>
                </FieldRow>
                <div>
                  <FieldLabel>{t('bankAccount')}</FieldLabel>
                  <input className="dk-input" type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="pl. HU12 1234 5678 9012 3456 7890" />
                </div>
              </div>
            </div>

            {/* Offer defaults pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>{t('offerDefaultsTitle')}</PodTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FieldRow>
                  <FieldGroup label={`${t('defaultVat')} (%)`}>
                    <input className="dk-input" type="number" min="0" max="100" step="0.5" value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} placeholder="27" />
                  </FieldGroup>
                  <FieldGroup label={`${t('offerValidity')} (${t('offerValidityUnit')})`}>
                    <input className="dk-input" type="number" min="1" max="365" value={offerValidityDays} onChange={e => setOfferValidityDays(e.target.value)} placeholder="30" />
                  </FieldGroup>
                </FieldRow>
                <FieldRow>
                  <FieldGroup label={`${t('paymentDeadline')} (${t('paymentDeadlineUnit')})`}>
                    <input className="dk-input" type="number" min="0" max="365" value={paymentDeadlineDays} onChange={e => setPaymentDeadlineDays(e.target.value)} placeholder="8" />
                  </FieldGroup>
                  <FieldGroup label={t('paymentMethod')}>
                    <input className="dk-input" type="text" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder={t('paymentMethodPlaceholder')} />
                  </FieldGroup>
                </FieldRow>
                <FieldRow>
                  <FieldGroup label={`${t('deposit')} (${t('depositUnit')})`}>
                    <input className="dk-input" type="number" min="0" max="100" value={depositPercent} onChange={e => setDepositPercent(e.target.value)} placeholder="0" />
                  </FieldGroup>
                  <FieldGroup label={`${t('warranty')} (${t('warrantyUnit')})`}>
                    <input className="dk-input" type="number" min="0" max="120" value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} placeholder="0" />
                  </FieldGroup>
                </FieldRow>
                <div>
                  <FieldLabel>
                    {t('otherTerms')}{' '}
                    <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{t('otherTermsUnit')}</span>
                  </FieldLabel>
                  <textarea
                    className="dk-input"
                    value={offerTermsText}
                    onChange={e => setOfferTermsText(e.target.value)}
                    placeholder="pl. Az ajánlat az ÁSZF mellett érvényes."
                    style={{ height: 80, padding: '12px 14px', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Save button row */}
            <div>
              {saveErr && (
                <div style={{ background: '#FDECEC', border: '1px solid #FBBABA', color: '#B71C1C', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  {saveErr}
                </div>
              )}
              <button type="submit" className="dk-btn dk-btn-g" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : saveOk ? <CheckCircle2 size={16} /> : <Check size={16} />}
                {saving ? tc('saving') : saveOk ? t('saved') : tc('save')}
              </button>
            </div>

          </form>

          {/* ── Right column: account ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* User identity pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 28, flexShrink: 0,
                  background: '#44413B', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 22, fontWeight: 700,
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName || currentUser?.display_name || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#5A5F68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Mail size={12} aria-hidden="true" />
                    {currentUser?.email}
                  </div>
                </div>
              </div>
              <span className="dk-badge" style={tierBadge}>{tierLabel}</span>
            </div>

            {/* Subscription pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>{t('subscription')}</PodTitle>
              {isOnTrial && (
                <div style={{ background: '#fff7ed', borderRadius: 12, padding: '10px 12px', marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#9A3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} aria-hidden="true" />
                  {t('trialBannerText', { days: trialDaysLeft })}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {premiumSubStarted && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#5A5F68', fontWeight: 600 }}>{t('subStartedLabel')}</span>
                    <span style={{ fontWeight: 700 }}>
                      {new Date(premiumSubStarted).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {isPremium && premiumRenewalAt && !premiumIsScheduledCancel && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#5A5F68', fontWeight: 600 }}>{t('subNextRenewalLabel')}</span>
                    <span style={{ fontWeight: 700 }}>
                      {new Date(premiumRenewalAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {isPremium && premiumIsScheduledCancel && premiumCancelAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#5A5F68', fontWeight: 600 }}>{t('subActiveUntilLabel')}</span>
                    <span style={{ fontWeight: 700, color: '#B71C1C' }}>
                      {new Date(premiumCancelAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
              <AppLink
                href={`${navPrefix}/elofizetes`}
                className="dk-btn dk-btn-dark"
                style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
              >
                {t('subscriptionPageLink')}
                <ChevronRight size={15} aria-hidden="true" />
              </AppLink>
            </div>

            {/* Terms PDF pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>{t('termsTitle')}</PodTitle>
              <p style={{ fontSize: 13, color: '#5A5F68', fontWeight: 600, margin: '0 0 14px', lineHeight: 1.5 }}>
                {t('termsSubtitle')}
              </p>
              {pdfError && (
                <div style={{ background: '#FDECEC', color: '#B71C1C', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  {pdfError}
                </div>
              )}
              {termsPdfUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#F7F6F4', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="#44413B" style={{ flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={termsPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 14, fontWeight: 700, color: '#44413B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textDecoration: 'none' }}
                      >
                        {termsPdfName || 'aszf.pdf'}
                      </a>
                      {termsPdfUploadedAt && (
                        <div style={{ fontSize: 12, color: '#5A5F68' }}>
                          {t('uploadedAt')} {new Date(termsPdfUploadedAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="dk-btn dk-btn-l"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={uploadingPdf}
                    >
                      <Upload size={15} aria-hidden="true" />
                      {t('replacePdf')}
                    </button>
                    <button
                      type="button"
                      className="dk-btn"
                      style={{ background: '#FDECEC', color: '#B71C1C', width: 44, padding: 0, justifyContent: 'center' }}
                      onClick={handlePdfDelete}
                      disabled={uploadingPdf}
                      aria-label={tc('delete')}
                    >
                      {uploadingPdf ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="dk-btn dk-btn-l"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={uploadingPdf}
                >
                  {uploadingPdf
                    ? <><Loader2 size={15} className="animate-spin" /> {tc('uploading')}</>
                    : <><Upload size={15} aria-hidden="true" /> {t('uploadPdf')}</>
                  }
                </button>
              )}
              <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
            </div>

            {/* Language & currency pod */}
            {!isDemoMode && (
              <div className="dk-card" style={{ padding: '20px 24px' }}>
                <PodTitle>{t('preferencesTitle')}</PodTitle>

                <div style={{ marginBottom: 18 }}>
                  <FieldLabel>
                    <Globe size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} aria-hidden="true" />
                    {t('languageLabel')}
                  </FieldLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ code: 'hu', label: 'Magyar' }, { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }].map(lang => {
                      const isActive = currentLocale === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          disabled={savingLocale}
                          onClick={() => handleSaveLocale(lang.code)}
                          className="dk-btn"
                          style={{
                            flex: 1, height: 40, fontSize: 13, padding: '0 10px',
                            justifyContent: 'center',
                            background: isActive ? '#0E1116' : '#F0F0F2',
                            color:      isActive ? '#fff'    : '#5A5F68',
                          }}
                        >
                          {lang.label}
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: '#8A8F98', fontWeight: 600, margin: '6px 0 0', lineHeight: 1.5 }}>
                    {t('languageNote')}
                  </p>
                </div>

                <div>
                  <FieldLabel>
                    <Lock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} aria-hidden="true" />
                    {t('currencyLabel')}
                  </FieldLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ code: 'HUF', sub: 'Forint' }, { code: 'EUR', sub: 'Euro' }, { code: 'GBP', sub: 'Pound' }, { code: 'USD', sub: 'Dollar' }].map(cur => {
                      const isActive = (currentUser?.currency || 'HUF') === cur.code;
                      return (
                        <div
                          key={cur.code}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 12,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: isActive ? '#0E1116' : '#F0F0F2',
                            opacity: isActive ? 1 : 0.4,
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 12, color: isActive ? '#fff' : '#5A5F68' }}>{cur.code}</div>
                          <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.65)' : '#8A8F98' }}>{cur.sub}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '8px 10px', background: '#fef9c3', borderRadius: 10 }}>
                    <Lock size={11} color="#854d0e" style={{ flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>{t('currencyNote')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Security pod */}
            <div className="dk-card" style={{ padding: '20px 24px' }}>
              <PodTitle>{t('security')}</PodTitle>
              {!pwOpen ? (
                <button
                  type="button"
                  className="dk-btn dk-btn-dark"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setPwOpen(true)}
                >
                  <KeyRound size={15} aria-hidden="true" />
                  {t('passwordChange')}
                </button>
              ) : (
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pwErr && (
                    <div style={{ background: '#FDECEC', color: '#B71C1C', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                      {pwErr}
                    </div>
                  )}
                  {pwOk && (
                    <div style={{ background: '#E7F4EC', color: '#14532D', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <CheckCircle2 size={13} aria-hidden="true" />
                      {t('passwordSaved')}
                    </div>
                  )}
                  <div>
                    <FieldLabel>{t('newPassword')}</FieldLabel>
                    <input className="dk-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder={t('newPasswordPlaceholder')} autoFocus />
                  </div>
                  <div>
                    <FieldLabel>{t('passwordConfirm')}</FieldLabel>
                    <input className="dk-input" type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder={t('passwordRepeatPlaceholder')} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="dk-btn dk-btn-l"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => { setPwOpen(false); setPw(''); setPwConfirm(''); setPwErr(''); }}
                    >
                      {tc('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="dk-btn dk-btn-dark"
                      disabled={pwSaving}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} aria-hidden="true" />}
                      {pwSaving ? tc('saving') : t('passwordSave')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Danger zone pod */}
            <div className="dk-card" style={{ padding: '20px 24px', borderTop: '3px solid #FBBABA' }}>
              <PodTitle>{t('dangerZone')}</PodTitle>
              <p style={{ fontSize: 13, color: '#5A5F68', fontWeight: 600, margin: '0 0 14px', lineHeight: 1.6 }}>
                {isPremium ? t('dangerWarningPremium') : t('dangerWarningBasic')}
              </p>
              {!deleteOpen ? (
                <button
                  type="button"
                  className="dk-btn"
                  style={{ background: '#FDECEC', color: '#B71C1C', width: '100%', justifyContent: 'center' }}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {t('deleteAccount')}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#B71C1C', margin: 0 }}>
                    {t('deleteConfirmPrompt')} <strong>{t('deleteConfirmWord')}</strong>
                  </p>
                  <input
                    className="dk-input"
                    type="text"
                    placeholder={t('deleteConfirmWord')}
                    value={deleteText}
                    onChange={e => setDeleteText(e.target.value)}
                  />
                  {deleteErr && (
                    <div style={{ background: '#FDECEC', color: '#B71C1C', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                      {deleteErr}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="dk-btn dk-btn-l"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => { setDeleteOpen(false); setDeleteText(''); setDeleteErr(''); }}
                    >
                      {tc('cancel')}
                    </button>
                    <button
                      type="button"
                      className="dk-btn"
                      style={{
                        flex: 1, justifyContent: 'center',
                        background: deleteText === t('deleteConfirmWord') ? '#B71C1C' : '#E5BFBF',
                        color: '#fff',
                      }}
                      disabled={deleteText !== t('deleteConfirmWord') || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} aria-hidden="true" />}
                      {deleting ? t('deleting') : t('deleteAccountFinal')}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
