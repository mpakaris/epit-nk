'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useApp } from '@/context/AppContext';
import {
  User, KeyRound, LogOut, CheckCircle2, AlertCircle, Loader2,
  FileText, Upload, Trash2, Check, Zap, Star, Clock, Building2, X,
  ShieldCheck, Mail, ChevronRight, AlertTriangle, RefreshCw, CreditCard,
  Globe, Lock,
} from 'lucide-react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import Modal, { AlertModal } from '@/components/Modal';
import useMobile from '@/hooks/useMobile';
import ProfileMobile from './mobile/ProfileMobile';

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{subtitle}</p>}
    </div>
  );
}

function getInitials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const DEMO_PROFILE = {
  display_name:        'Nemes Péter',
  first_name:          'Péter',
  last_name:           'Nemes',
  company_name:        'Nemes Renováló Kft.',
  street:              'Alkotás utca',
  street_number:       '15',
  zip:                 '1124',
  city:                'Budapest',
  tax_number:          '99887766-2-43',
  default_tax_percent: 27,
};

export default function ProfilPage() {
  const { currentUser, logout, changePassword, isDemoMode, refreshSupabaseData, collectives, updateDisplayName } = useApp();

  const t = useTranslations('profile');
  const tc = useTranslations('common');
  const currentLocale = useLocale();
  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const isMobile = useMobile();

  const isPremium = currentUser?.is_subscription_premium ?? false;
  const isOnTrial = !isPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000))
    : 0;

  // ── Profile form ────────────────────────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState('');
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [companyName,   setCompanyName]   = useState('');
  const [street,        setStreet]        = useState('');
  const [streetNumber,  setStreetNumber]  = useState('');
  const [zip,           setZip]           = useState('');
  const [city,          setCity]          = useState('');
  const [taxNumber,     setTaxNumber]     = useState('');
  const [defaultTaxPct, setDefaultTaxPct] = useState('27');
  const [phone,             setPhone]             = useState('');
  const [bankAccount,       setBankAccount]       = useState('');
  const [bankName,          setBankName]          = useState('');
  const [offerValidityDays, setOfferValidityDays] = useState('30');
  const [offerTermsText,    setOfferTermsText]    = useState('');
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState('8');
  const [paymentMethod,       setPaymentMethod]       = useState('');
  const [depositPercent,      setDepositPercent]      = useState('0');
  const [warrantyMonths,      setWarrantyMonths]      = useState('0');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saveOk,  setSaveOk]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // ── Password form ───────────────────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pw,        setPw]        = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [pwErr,     setPwErr]     = useState('');

  // ── Terms PDF ───────────────────────────────────────────────────────────────
  const [termsPdfUrl,        setTermsPdfUrl]        = useState(null);
  const [termsPdfName,       setTermsPdfName]       = useState(null);
  const [termsPdfUploadedAt, setTermsPdfUploadedAt] = useState(null);
  const [uploadingPdf,       setUploadingPdf]       = useState(false);
  const [pdfError,           setPdfError]           = useState('');
  const pdfInputRef = useRef(null);

  // ── Language preference ──────────────────────────────────────────────────────
  const [savingLocale,  setSavingLocale]  = useState(false);
  const [localeOk,      setLocaleOk]      = useState(false);

  // ── Account deletion ────────────────────────────────────────────────────────
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteText,    setDeleteText]    = useState('');
  const [deleteErr,     setDeleteErr]     = useState('');
  const [deleting,      setDeleting]      = useState(false);

  // ── Subscription info (read-only) ────────────────────────────────────────────
  const [premiumSubStarted,        setPremiumSubStarted]        = useState(null);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt,          setPremiumCancelAt]          = useState(null);
  const [premiumRenewalAt,         setPremiumRenewalAt]         = useState(null);

  // ── Misc ──────────────────────────────────────────────────────────────────────
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState(null);
  const [cancelingDeletion,   setCancelingDeletion]   = useState(false);
  const [alertModal,          setAlertModal]          = useState(null);

  useEffect(() => {
    if (isDemoMode) {
      const p = DEMO_PROFILE;
      setDisplayName(p.display_name);
      setFirstName(p.first_name);
      setLastName(p.last_name);
      setCompanyName(p.company_name);
      setStreet(p.street);
      setStreetNumber(p.street_number);
      setZip(p.zip);
      setCity(p.city);
      setTaxNumber(p.tax_number);
      setDefaultTaxPct(String(p.default_tax_percent));
      setLoadingProfile(false);
      return;
    }
    fetch('/api/auth/profile')
      .then(r => r.json())
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
        setScheduledDeletionAt(profile.scheduled_deletion_at || null);
        setPremiumSubStarted(premiumSub?.created_at || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
        setPremiumRenewalAt(premiumSub?.status !== 'scheduled_cancel' ? (premiumSub?.period_end || null) : null);
      })
      .finally(() => setLoadingProfile(false));
  }, [isDemoMode]);

  const [nameSaving, setNameSaving] = useState(false);
  const [nameOk, setNameOk] = useState(false);
  const [nameErr, setNameErr] = useState('');

  const handleSaveName = async () => {
    if (!displayName.trim()) { setNameErr('A megjelenítési név nem lehet üres.'); return; }
    setNameSaving(true); setNameErr(''); setNameOk(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a mentéskor');
      updateDisplayName(displayName.trim());
      setNameOk(true);
      setTimeout(() => setNameOk(false), 3000);
    } catch (err) { setNameErr(err.message); }
    finally { setNameSaving(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:        displayName.trim()   || null,
          first_name:          firstName.trim()     || null,
          last_name:           lastName.trim()      || null,
          company_name:        companyName.trim()   || null,
          street:              street.trim()        || null,
          street_number:       streetNumber.trim()  || null,
          zip:                 zip.trim()           || null,
          city:                city.trim()          || null,
          tax_number:          taxNumber.trim()     || null,
          default_tax_percent: defaultTaxPct !== '' ? Number(defaultTaxPct) : 27,
          phone:               phone.trim()         || null,
          bank_account:        bankAccount.trim()   || null,
          bank_name:           bankName.trim()      || null,
          offer_validity_days:   offerValidityDays !== '' ? Number(offerValidityDays) : 30,
          offer_terms_text:      offerTermsText.trim() || null,
          payment_deadline_days: paymentDeadlineDays !== '' ? Number(paymentDeadlineDays) : 8,
          payment_method:        paymentMethod.trim() || null,
          deposit_percent:       depositPercent !== '' ? Number(depositPercent) : 0,
          warranty_months:       warrantyMonths !== '' ? Number(warrantyMonths) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a mentéskor');
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwOk(false);
    if (pw.length < 8) { setPwErr('A jelszónak legalább 8 karakterből kell állnia!'); return; }
    if (!/[A-Z]/.test(pw)) { setPwErr('A jelszónak tartalmaznia kell legalább 1 nagybetűt!'); return; }
    if (!/[0-9]/.test(pw)) { setPwErr('A jelszónak tartalmaznia kell legalább 1 számot!'); return; }
    if (!/[^A-Za-z0-9]/.test(pw)) { setPwErr('A jelszónak tartalmaznia kell legalább 1 speciális karaktert!'); return; }
    if (pw !== pwConfirm) { setPwErr('A jelszavak nem egyeznek!'); return; }
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
      const res = await fetch('/api/auth/profile/terms-pdf', { method: 'POST', body: fd });
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
      // Set cookie then hard-reload. With localePrefix:'never' the locale lives
      // entirely in the NEXT_LOCALE cookie — next-intl's router methods all produce
      // wrong URLs (prefix injection, nxtPlocale param, wrong page). A plain reload
      // sends the updated cookie to the server and the middleware picks it up.
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
      window.location.reload();
    } finally {
      setSavingLocale(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteErr('');
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteOpen(false);
      setDeleteText('');
      logout();
    } catch (err) { setDeleteErr(err.message || 'Hiba történt.'); }
    finally { setDeleting(false); }
  };

  const handleCancelDeletion = async () => {
    setCancelingDeletion(true);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_deletion: true }),
      });
      if (res.ok) {
        setScheduledDeletionAt(null);
      } else {
        const data = await res.json();
        setDeleteErr(data.error || 'Hiba a visszavonáskor.');
      }
    } catch {
      setDeleteErr('Hiba a kapcsolódás során.');
    } finally {
      setCancelingDeletion(false);
    }
  };

  if (loadingProfile) return (
    <div className="container" style={{ padding: '2rem' }}>
      <Loader2 size={20} className="animate-spin" />
    </div>
  );

  if (isMobile) return <ProfileMobile />;

  const initials = getInitials(displayName || currentUser?.display_name);

  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: '3rem' }}>

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant ?? 'success'}
        title={alertModal?.title}
        message={alertModal?.message}
      />

      {/* ── ACCOUNT CARD ── */}
      <div style={{ padding: '1.5rem 0 1rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} /> {t('pageTitle')}
        </h1>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', marginBottom: '1.25rem' }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent, #6366f1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{displayName || currentUser?.display_name || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={12} /> {currentUser?.email}
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                ...(isPremium
                  ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }
                  : isOnTrial
                  ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                ),
              }}>
                {isPremium ? t('subscriptionBadgePremium') : isOnTrial ? t('subscriptionBadgeTrial') : t('subscriptionBadgeBasic')}
              </span>
            </div>
          </div>
        </div>

        {/* Display name field */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('displayName')}</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text" className="form-control"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setNameErr(''); setNameOk(false); }}
              placeholder={currentUser?.display_name || 'pl. Kovács János'}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveName}
              disabled={nameSaving}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {nameSaving ? <Loader2 size={13} className="animate-spin" /> : nameOk ? <CheckCircle2 size={13} /> : <Check size={13} />}
              {nameSaving ? t('saving') : nameOk ? t('saved') : t('save')}
            </button>
          </div>
          {nameErr && <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>{nameErr}</div>}
          {!nameErr && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {t('displayNameHint')}
          </div>}
        </div>
      </div>

      {/* ── SECURITY ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionHeader title={t('security')} />

        {!pwOpen ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPwOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <KeyRound size={14} /> {t('passwordChange')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
            >
              <LogOut size={14} /> {t('logout')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
            {pwErr && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.4rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{pwErr}
              </div>
            )}
            {pwOk && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.4rem' }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {t('passwordSaved')}
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('newPassword')}</label>
              <input type="password" className="form-control" value={pw} onChange={e => setPw(e.target.value)} placeholder={t('newPasswordPlaceholder')} autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('passwordConfirm')}</label>
              <input type="password" className="form-control" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder={t('passwordRepeatPlaceholder')} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPwOpen(false); setPw(''); setPwConfirm(''); setPwErr(''); }}>
                {tc('cancel')}
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {pwSaving ? <><Loader2 size={13} className="animate-spin" /> {tc('saving')}</> : <><ShieldCheck size={13} /> {t('passwordSave')}</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── SUBSCRIPTION ── */}
      <div id="elofizetes" style={{ marginBottom: '1.25rem', scrollMarginTop: '5rem' }}>
        <SectionHeader
          title={t('subscription')}
          subtitle={t('subscriptionSubtitle')}
        />

        <div className="card" style={{ padding: '1.25rem' }}>

          {/* Trial banner */}
          {isOnTrial && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
              <Clock size={14} color="#854d0e" style={{ flexShrink: 0 }} />
              <span style={{ color: '#78350f' }}>{t('trialBannerText', { days: trialDaysLeft })}</span>
            </div>
          )}
          {/* Plan header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            {isPremium ? <Star size={16} color="#b45309" /> : isOnTrial ? <Clock size={16} color="#b45309" /> : <Zap size={16} color="var(--text-muted)" />}
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>
              {isPremium ? t('planPremiumName') : isOnTrial ? t('subscriptionBadgeTrial') : t('planBasicName')}
            </span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
              padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
              ...(isPremium
                ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }
                : isOnTrial
                ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
              ),
            }}>
              {isPremium
                ? (premiumIsScheduledCancel ? t('subCancels') : t('subActive'))
                : isOnTrial ? t('subscriptionBadgeTrial') : t('subscriptionBadgeBasic')}
            </span>
          </div>
          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.825rem' }}>
            {premiumSubStarted && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('subStartedLabel')}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(premiumSubStarted).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            {isPremium && !premiumIsScheduledCancel && premiumRenewalAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('subNextRenewalLabel')}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(premiumRenewalAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            {isPremium && premiumIsScheduledCancel && premiumCancelAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('subActiveUntilLabel')}</span>
                <span style={{ fontWeight: 700, color: 'var(--danger-text)' }}>
                  {new Date(premiumCancelAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            {isOnTrial && currentUser?.trial_ends_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('subActiveUntilLabel')}</span>
                <span style={{ fontWeight: 700, color: '#b45309' }}>
                  {new Date(currentUser.trial_ends_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
          {/* Manage link */}
          <AppLink
            href="/elofizetes"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
          >
            {t('subscriptionPageLink')} <ChevronRight size={13} />
          </AppLink>

        </div>
      </div>

      {/* ── INVOICE HEADER ── */}
      <form id="szamla" onSubmit={handleSaveProfile} style={{ scrollMarginTop: '5rem' }}>
        <SectionHeader
          title={t('invoiceHeader')}
          subtitle={t('invoiceHeaderSubtitle')}
        />
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {saveErr && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />{saveErr}
            </div>
          )}
          {saveOk && (
            <div style={{ background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #86efac)', color: 'var(--success-text, #166534)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {t('invoiceSaved')}
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('companyName')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('companyNameOptional')}</span></label>
            <input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="pl. Kovács Építő Kft." />
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('firstName')}</label>
              <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. János" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('lastName')}</label>
              <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('street')}</label>
              <input type="text" className="form-control" value={street} onChange={e => setStreet(e.target.value)} placeholder="pl. Fő utca" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('streetNumber')}</label>
              <input type="text" className="form-control" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="pl. 12/A" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('zip')}</label>
              <input type="text" className="form-control" value={zip} onChange={e => setZip(e.target.value)} placeholder="pl. 1234" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('city')}</label>
              <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="pl. Budapest" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('taxNumber')}</label>
              <input type="text" className="form-control" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="pl. 12345678-2-41" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('defaultVat')}</label>
              <input type="number" min="0" max="100" step="0.5" className="form-control" value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} placeholder="27" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('phone')}</label>
              <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="pl. +36 30 123 4567" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('offerValidity')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('offerValidityUnit')}</span></label>
              <input type="number" min="1" max="365" className="form-control" value={offerValidityDays} onChange={e => setOfferValidityDays(e.target.value)} placeholder="30" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('bankAccount')}</label>
              <input type="text" className="form-control" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="pl. HU12 1234 5678 9012 3456 7890" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('bankName')}</label>
              <input type="text" className="form-control" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="pl. OTP Bank" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('paymentDeadline')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('paymentDeadlineUnit')}</span></label>
              <input type="number" min="0" max="365" className="form-control" value={paymentDeadlineDays} onChange={e => setPaymentDeadlineDays(e.target.value)} placeholder="8" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('paymentMethod')}</label>
              <input type="text" className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder={t('paymentMethodPlaceholder')} />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('deposit')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('depositUnit')}</span></label>
              <input type="number" min="0" max="100" className="form-control" value={depositPercent} onChange={e => setDepositPercent(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{t('warranty')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('warrantyUnit')}</span></label>
              <input type="number" min="0" max="120" className="form-control" value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{t('otherTerms')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{t('otherTermsUnit')}</span></label>
            <textarea className="form-control" rows={2} value={offerTermsText} onChange={e => setOfferTermsText(e.target.value)} placeholder="pl. Az ajánlat a vállalkozás mindenkori Általános Szerződési Feltételei mellett érvényes." style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> {tc('saving')}</> : <><Check size={14} /> {tc('save')}</>}
            </button>
          </div>
        </div>
      </form>

      {/* ── TERMS PDF ── */}
      <div id="aszf" style={{ marginBottom: '1.25rem', scrollMarginTop: '5rem' }}>
        <SectionHeader
          title={t('termsTitle')}
          subtitle={t('termsSubtitle')}
        />
        <div className="card" style={{ padding: '1rem' }}>
          {pdfError && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{pdfError}
            </div>
          )}
          {termsPdfUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', minWidth: 0 }}>
                <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <a href={termsPdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {termsPdfName || 'aszf.pdf'}
                  </a>
                  {termsPdfUploadedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {t('uploadedAt')} {new Date(termsPdfUploadedAt).toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf}>
                <Upload size={13} /> {t('replacePdf')}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handlePdfDelete} disabled={uploadingPdf}>
                {uploadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
              {uploadingPdf ? <><Loader2 size={15} className="animate-spin" /> {t('uploading')}</> : <><Upload size={15} /> {t('uploadPdf')}</>}
            </button>
          )}
          <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
        </div>
      </div>

      {/* ── LANGUAGE & CURRENCY ── */}
      {!isDemoMode && (
        <div id="preferences" style={{ marginBottom: '1.25rem', scrollMarginTop: '5rem' }}>
          <SectionHeader title={t('preferencesTitle')} subtitle={t('preferencesSubtitle')} />
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Language */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={14} color="var(--accent)" /> {t('languageLabel')}
                </label>
                {localeOk && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <CheckCircle2 size={13} /> {t('languageSaved')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[{ code: 'hu', label: 'Magyar' }, { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }].map(lang => {
                  const isActive = currentLocale === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      disabled={savingLocale}
                      onClick={() => handleSaveLocale(lang.code)}
                      style={{
                        flex: 1, padding: '0.6rem 0.5rem', borderRadius: 'var(--radius-md)', cursor: isActive ? 'default' : 'pointer',
                        border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        background: isActive ? 'var(--accent-bg, #eff6ff)' : 'var(--bg-base)',
                        fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
                {t('languageNote')}
              </p>
            </div>

            {/* Currency — read-only after onboarding */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.1rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <Lock size={14} color="var(--text-muted)" /> {t('currencyLabel')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { code: 'HUF', sub: 'Forint' }, { code: 'EUR', sub: 'Euro' },
                  { code: 'GBP', sub: 'Pound'  }, { code: 'USD', sub: 'Dollar' },
                ].map(cur => {
                  const isActive = (currentUser?.currency || 'HUF') === cur.code;
                  return (
                    <div
                      key={cur.code}
                      style={{
                        flex: 1, padding: '0.6rem 0.5rem', borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        background: isActive ? 'var(--accent-bg, #eff6ff)' : 'var(--bg-subtle)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>{cur.code}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{cur.sub}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.55rem', padding: '0.45rem 0.65rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-sm)' }}>
                <Lock size={11} color="#854d0e" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 600 }}>{t('currencyNote')}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── DANGER ZONE ── */}
      <div className="card" style={{ border: '1px solid var(--danger-border)', padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>{t('dangerZone')}</h3>

        {(() => {
          const warningText = isPremium ? t('dangerWarningPremium') : t('dangerWarningBasic');
          return (
          <div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {warningText}
            </p>
            {!deleteOpen ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} /> {t('deleteAccount')}
              </button>
            ) : (
              <div>
                <p style={{ fontSize: '0.825rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {t('deleteConfirmPrompt')} <strong>{t('deleteConfirmWord')}</strong>
                </p>
                <input type="text" className="form-control" placeholder={t('deleteConfirmWord')} value={deleteText} onChange={e => setDeleteText(e.target.value)} style={{ marginBottom: '0.75rem' }} />
                {deleteErr && (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {deleteErr}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeleteOpen(false); setDeleteText(''); setDeleteErr(''); }}>
                    {tc('cancel')}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={deleteText !== t('deleteConfirmWord') || deleting} onClick={handleDeleteAccount}>
                    {deleting ? <><Loader2 size={13} className="animate-spin" /> {t('deleting')}</> : t('deleteAccountFinal')}
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}
      </div>

    </div>
  );
}
