'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  User, KeyRound, LogOut, CheckCircle2, AlertCircle, Loader2,
  FileText, Upload, Trash2, Check, Zap, Star, Clock, Building2, X,
  ShieldCheck, Mail, ChevronRight, AlertTriangle, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import Modal, { AlertModal } from '@/components/Modal';

// ── Pricing plans ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'basic',
    name: 'Bázis',
    price: 'Ingyenes',
    priceNote: 'örökre',
    icon: Zap,
    color: 'var(--text-muted)',
    features: [
      'Max. 1 projekt',
      'Max. 5 felmérés',
      'Max. 5 ajánlat',
      'Személyes weboldal (szakember profil)',
      'Meghívható kollektívákba',
    ],
  },
  {
    key: 'premium',
    name: 'Prémium',
    price: '€17.50',
    priceHuf: '≈ 6 999 Ft',
    priceNote: '/ hó + ÁFA',
    icon: Star,
    color: '#b45309',
    highlight: true,
    productId: process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID,
    features: [
      'Korlátlan projektek',
      'Korlátlan felmérések és ajánlatok',
      'Kollektíva létrehozása',
      'Naptár és ügyféltár',
      'Teljes weboldal funkciók',
      'Korlátlan képfeltöltés',
    ],
    cta: 'Váltás Prémiumra',
  },
];

const BUNDLE_PRODUCT_IDS = [
  process.env.NEXT_PUBLIC_CREEM_BUNDLE_SMALL_PRODUCT_ID,
  process.env.NEXT_PUBLIC_CREEM_BUNDLE_MEDIUM_PRODUCT_ID,
  process.env.NEXT_PUBLIC_CREEM_BUNDLE_LARGE_PRODUCT_ID,
];

function UpgradeModal({ status, purchasedProductId, onClose }) {
  const canvasRef = useRef(null);
  const isBundle = BUNDLE_PRODUCT_IDS.includes(purchasedProductId);

  useEffect(() => {
    if (status !== 'success' || !canvasRef.current) return;
    const colors = ['#2563eb', '#b45309', '#16a34a', '#9333ea'];
    import('canvas-confetti').then(m => {
      const fire = m.default.create(canvasRef.current, { resize: true });
      // Three quick bursts, no animation loop
      fire({ particleCount: 80, spread: 90, origin: { y: 0.55 }, colors });
      setTimeout(() => {
        fire({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
        fire({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
      }, 300);
      setTimeout(() => {
        fire({ particleCount: 30, spread: 100, origin: { y: 0.5 }, colors });
      }, 700);
    });
  }, [status]);

  if (!status) return null;
  const isSuccess = status === 'success';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      {/* Confetti canvas lives inside the overlay so it's above the blur */}
      {isSuccess && (
        <canvas ref={canvasRef} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none',
        }} />
      )}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card, #fff)', borderRadius: 'var(--radius-lg)', padding: '2.5rem 2rem',
        maxWidth: 440, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {isSuccess ? '🎉' : '😔'}
        </div>
        <h2 style={{ margin: '0 0 0.6rem', fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
          {isSuccess ? 'Sikeres előfizetés!' : 'Valami nem sikerült'}
        </h2>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {isSuccess
            ? isBundle
              ? 'Gratulálunk! Prémium előfizetésed és az első Kollektívád is aktiválva lett. Hívd meg kollégáidat, és dolgozzatok együtt projekteken, ajánlatokon — korlátok nélkül.'
              : 'Gratulálunk! Prémium csomagra váltottál. Korlátlan projektek, felmérések és ajánlatok állnak rendelkezésedre — és bármikor indíthatsz Kollektíva munkaterületet a csapatodnak.'
            : 'Úgy tűnik, valami hiba történt — pl. a kártyát elutasítottak vagy megszakadt az internetkapcsolat. Kérjük, próbáld újra, vagy vedd fel a kapcsolatot az oldal üzemeltetőjével.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isSuccess ? (
            <button className="btn btn-primary" onClick={onClose}>
              Tovább →
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Vissza
              </button>
              <a href="mailto:info@epitunk.hu" className="btn btn-primary">
                Kapcsolat
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Step 2: clean page after reload — read result but DON'T clear yet (StrictMode safe)
    const stored = sessionStorage.getItem('creem_upgrade_result');
    if (stored) {
      try { setUpgradeModal(JSON.parse(stored)); } catch {}
      return;
    }

    // Step 1: Creem redirected here with ?upgraded=1 params
    const params = new URLSearchParams(window.location.search);
    if (!params.has('upgraded')) return;

    // Clean URL immediately so StrictMode's second run finds nothing and exits
    window.history.replaceState({}, '', '/profil');

    const subscriptionId = params.get('subscription_id');
    const customerId = params.get('customer_id');
    const productId = params.get('product_id');

    const finish = (status) => {
      sessionStorage.setItem('creem_upgrade_result', JSON.stringify({ status, productId: productId ?? null }));
      window.location.replace('/profil');
    };

    if (subscriptionId) {
      fetch('/api/checkout/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, customerId }),
      })
        .then(res => finish(res.ok ? 'success' : 'error'))
        .catch(() => finish('error'));
    } else {
      finish('error');
    }
  }, []);

  const [upgradeModal, setUpgradeModal] = useState(null);
  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);

  const isPremium = currentUser?.is_subscription_premium ?? false;
  const isOnTrial = !isPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const trialDaysLeft = isOnTrial
    ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000))
    : 0;

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [premiumSubId, setPremiumSubId] = useState(null);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt, setPremiumCancelAt] = useState(null); // ISO string — may be null even when scheduled
  const [cancelPremiumModal, setCancelPremiumModal] = useState(false);
  const [cancelingPremium, setCancelingPremium] = useState(false);
  const [resumingPremium, setResumingPremium] = useState(false);
  const [alertModal, setAlertModal] = useState(null); // { title, message, variant }
  const [cancelSuccessModal, setCancelSuccessModal] = useState(null); // { premiumPeriodEnd, canceledCollectives }

  const [scheduledDeletionAt, setScheduledDeletionAt] = useState(null);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);

  const doOpenPortal = async () => {
    setPortalLoading(true);
    setPortalError('');
    try {
      const res = await fetch('/api/billing/portal');
      const data = await res.json();
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPortalError(data.error || 'Nem sikerült megnyitni az előfizetés-kezelő felületet.');
      }
    } catch {
      setPortalError('Hiba a kapcsolódás során. Kérjük, próbáld újra.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleOpenPortal = () => doOpenPortal();

  const handleCancelPremium = async () => {
    if (!premiumSubId) return;
    setCancelingPremium(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: premiumSubId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCancelPremiumModal(false);
        const periodEnd = data.subscription_period_end ?? null;
        setPremiumIsScheduledCancel(true);
        setPremiumCancelAt(periodEnd);
        setCancelSuccessModal({
          premiumPeriodEnd: periodEnd,
          canceledCollectives: data.canceled_collectives ?? [],
        });
      } else {
        setAlertModal({ variant: 'error', title: 'Hiba', message: data.error || 'Lemondás sikertelen.' });
      }
    } catch {
      alert('Hiba a kapcsolódás során.');
    } finally {
      setCancelingPremium(false);
    }
  };

  const handleResumePremium = async () => {
    if (!premiumSubId) return;
    setResumingPremium(true);
    try {
      const res = await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: premiumSubId }),
      });
      if (res.ok) {
        setPremiumIsScheduledCancel(false);
        setPremiumCancelAt(null);
        setAlertModal({
          variant: 'success',
          title: 'Előfizetés visszaállítva',
          message: 'Prémium előfizetésed ismét aktív — a számlázás a szokott ütemezés szerint folytatódik.',
        });
      } else {
        const data = await res.json();
        setAlertModal({ variant: 'error', title: 'Hiba', message: data.error || 'Visszaállítás sikertelen.' });
      }
    } catch {
      alert('Hiba a kapcsolódás során.');
    } finally {
      setResumingPremium(false);
    }
  };

  const handleCheckout = async (plan) => {
    if (!plan.productId) return;
    setLoadingPlan(plan.key);
    setCheckoutError('');

    let checkoutUrl;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: plan.productId, successUrl: window.innerWidth < 768 ? '/checkout-popup-success?checkout_type=premium' : '/profil' }),
      });
      const data = await res.json();
      if (!data.checkoutUrl) {
        setCheckoutError(data.error || 'Hiba történt a fizetési folyamat indításakor. Kérjük, próbáld újra.');
        setLoadingPlan(null);
        return;
      }
      checkoutUrl = data.checkoutUrl;
    } catch {
      setCheckoutError('Hiba történt a fizetési folyamat indításakor. Kérjük, próbáld újra.');
      setLoadingPlan(null);
      return;
    }

    const isMobile = window.innerWidth < 768;
    const productId = plan.productId;

    if (isMobile) {
      // Mobile: bottom sheet drawer with iframe, result via storage event
      const handleSuccess = async (data) => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('message', onMessage);
        setCheckoutIframeUrl(null);
        localStorage.removeItem('creem_checkout_done');
        try {
          const res = await fetch('/api/checkout/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: data.subscriptionId, customerId: data.customerId }),
          });
          setUpgradeModal({ status: res.ok ? 'success' : 'error', productId: data.productId ?? productId });
          if (res.ok) refreshSupabaseData();
        } catch {
          setUpgradeModal({ status: 'error', productId });
        }
        setLoadingPlan(null);
      };
      const onStorage = (e) => {
        if (e.key !== 'creem_checkout_done') return;
        let data; try { data = JSON.parse(e.newValue); } catch { return; }
        if (data?.checkoutType !== 'premium') return;
        handleSuccess(data);
      };
      const onMessage = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== 'creem_checkout_success') return;
        if (e.data?.checkoutType !== 'premium') return;
        handleSuccess(e.data);
      };
      window.addEventListener('storage', onStorage);
      window.addEventListener('message', onMessage);
      setCheckoutIframeUrl(checkoutUrl);
    } else {
      // Desktop: open new tab, Creem redirects back to /profil?upgraded=1
      // The existing useEffect handles activation automatically
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setLoadingPlan(null);
    }
  };

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

  // ── Account deletion ────────────────────────────────────────────────────────
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteText,    setDeleteText]    = useState('');
  const [deleteErr,     setDeleteErr]     = useState('');
  const [deleting,      setDeleting]      = useState(false);

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
        setTermsPdfUrl(profile.terms_pdf_url               || null);
        setTermsPdfName(profile.terms_pdf_name             || null);
        setTermsPdfUploadedAt(profile.terms_pdf_uploaded_at || null);
        setScheduledDeletionAt(profile.scheduled_deletion_at || null);
        setPremiumSubId(premiumSub?.creem_subscription_id || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
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

  const initials = getInitials(displayName || currentUser?.display_name);

  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: '3rem' }}>

      <UpgradeModal
        status={upgradeModal?.status ?? null}
        purchasedProductId={upgradeModal?.productId ?? null}
        onClose={() => {
          sessionStorage.removeItem('creem_upgrade_result');
          setUpgradeModal(null);
        }}
      />

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
          <User size={20} /> Profilom
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
                {isPremium ? '⭐ Prémium' : isOnTrial ? '🎁 Próba' : 'Bázis'}
              </span>
            </div>
          </div>
        </div>

        {/* Display name field */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Megjelenítési név</label>
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
              {nameSaving ? 'Mentés…' : nameOk ? 'Mentve!' : 'Mentés'}
            </button>
          </div>
          {nameErr && <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>{nameErr}</div>}
          {!nameErr && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Ez a név jelenik meg a felületen és a megosztott tartalmakban.
          </div>}
        </div>
      </div>

      {/* ── SECURITY ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionHeader title="Biztonság" />

        {!pwOpen ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPwOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <KeyRound size={14} /> Jelszó módosítása
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
            >
              <LogOut size={14} /> Kijelentkezés
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
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Jelszó sikeresen megváltoztatva!
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Új jelszó</label>
              <input type="password" className="form-control" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 8 karakter, 1 nagybetű, 1 szám, 1 spec. karakter" autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Jelszó megerősítése</label>
              <input type="password" className="form-control" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Ismételd meg az új jelszót" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPwOpen(false); setPw(''); setPwConfirm(''); setPwErr(''); }}>
                Mégse
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {pwSaving ? <><Loader2 size={13} className="animate-spin" /> Mentés…</> : <><ShieldCheck size={13} /> Jelszó mentése</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── SUBSCRIPTION ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Előfizetés"
          subtitle="Az első regisztrációkor 14 napos ingyenes Prémium próba jár — bankkártya nélkül."
        />

        {/* Checkout error */}
        {checkoutError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.825rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {checkoutError}
          </div>
        )}

        {/* Portal error */}
        {portalError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.825rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {portalError}
          </div>
        )}

        {/* Trial banner */}
        {isOnTrial && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <Clock size={14} color="#854d0e" style={{ flexShrink: 0 }} />
            <span style={{ color: '#78350f' }}>
              <strong>Ingyenes próba aktív</strong> — még <strong>{trialDaysLeft} nap</strong> van hátra. Utána a Bázis csomagra vált a fiókod.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))', gap: '0.85rem' }}>
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = (plan.key === 'basic' && !effectivePremium) || (plan.key === 'premium' && (isPremium || isOnTrial));
            const isLoading = loadingPlan === plan.key;
            return (
              <div key={plan.key} className="card" style={{
                padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
                border: isCurrent ? `2px solid ${plan.color}` : undefined, position: 'relative',
              }}>
                {isCurrent && (
                  <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: isOnTrial && plan.key === 'premium' ? '#b45309' : plan.color, color: 'white', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.18rem 0.65rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                    {isOnTrial && plan.key === 'premium' ? '🎁 Próba aktív' : 'Aktív csomag'}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={16} color={plan.color} />
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{plan.name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{plan.priceNote}</span>
                  {plan.priceHuf && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{plan.priceHuf}</div>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Check size={12} color="var(--success-text)" style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>
                {plan.cta && (
                  <button
                    type="button"
                    disabled={isCurrent || isLoading}
                    onClick={() => !isCurrent && handleCheckout(plan)}
                    style={{
                      width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)',
                      fontWeight: 700, fontSize: '0.8rem',
                      cursor: isCurrent || isLoading ? 'default' : 'pointer',
                      border: 'none',
                      background: isCurrent ? 'var(--bg-subtle)' : plan.highlight ? plan.color : 'var(--accent)',
                      color: isCurrent ? 'var(--text-muted)' : 'white',
                      opacity: isCurrent || isLoading ? 0.6 : 1,
                    }}
                  >
                    {isCurrent ? 'Aktív' : isLoading ? 'Átirányítás...' : plan.cta}
                  </button>
                )}
                {plan.key === 'premium' && isPremium && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {premiumIsScheduledCancel ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--warning-text)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.6rem', textAlign: 'center' }}>
                          {premiumCancelAt
                            ? `Lemondva — aktív ${new Date(premiumCancelAt).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}-ig`
                            : 'Lemondva — aktív a számlázási időszak végéig'}
                        </div>
                        <button type="button" onClick={handleResumePremium} disabled={resumingPremium}
                          style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid var(--success-border)', background: 'var(--success-bg)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: resumingPremium ? 'default' : 'pointer' }}>
                          {resumingPremium ? <><Loader2 size={12} className="animate-spin" /> Visszaállítás…</> : <><RefreshCw size={12} /> Előfizetés visszaállítása</>}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setCancelPremiumModal(true)}
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid var(--danger-border)', background: 'transparent', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        Prémium lemondása
                      </button>
                    )}
                    <button type="button" onClick={handleOpenPortal} disabled={portalLoading}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.75rem', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: portalLoading ? 'default' : 'pointer', opacity: portalLoading ? 0.6 : 1 }}>
                      {portalLoading ? <><Loader2 size={12} className="animate-spin" /> Megnyitás…</> : <>Fizetési adatok kezelése <ChevronRight size={12} /></>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* ── Collective packages callout ── */}
        <div style={{ marginTop: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Building2 size={15} color="var(--accent)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Kollektíva munkaterületek</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem', lineHeight: 1.6 }}>
            Minden Kollektíva egy önálló, megosztott munkaterület a csapatodnak — <strong>több is lehet egyszerre</strong>, mindegyik külön előfizetéssel. A tulajdonos fizet az összes tagért. Kollektíva létrehozásához Prémium előfizetés szükséges.
          </p>
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Building2 size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Kollektíva munkaterületeket a Kollektívák oldalon indíthatsz és kezelhetsz.
            </div>
            <Link
              href="/kollektivak"
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
            >
              Kollektívák kezelése <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
          Kérdésed van? <a href="mailto:info@epitunk.hu" style={{ color: 'var(--accent)' }}>info@epitunk.hu</a>
        </p>
      </div>

      {/* ── INVOICE HEADER ── */}
      <form onSubmit={handleSaveProfile}>
        <SectionHeader
          title="Számla fejléc"
          subtitle={'Ez az adat jelenik meg az ajánlatok fejlécében a „Tól:" mezőként.'}
        />
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {saveErr && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />{saveErr}
            </div>
          )}
          {saveOk && (
            <div style={{ background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #86efac)', color: 'var(--success-text, #166534)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> Adatok elmentve!
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Cégnév <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ha van)</span></label>
            <input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="pl. Kovács Építő Kft." />
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Keresztnév</label>
              <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. János" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vezetéknév</label>
              <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Utca</label>
              <input type="text" className="form-control" value={street} onChange={e => setStreet(e.target.value)} placeholder="pl. Fő utca" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Házszám</label>
              <input type="text" className="form-control" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="pl. 12/A" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Irányítószám</label>
              <input type="text" className="form-control" value={zip} onChange={e => setZip(e.target.value)} placeholder="pl. 1234" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Város</label>
              <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="pl. Budapest" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Adószám</label>
              <input type="text" className="form-control" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="pl. 12345678-2-41" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Alapértelmezett ÁFA (%)</label>
              <input type="number" min="0" max="100" step="0.5" className="form-control" value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} placeholder="27" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Mentés…</> : <><Check size={14} /> Mentés</>}
            </button>
          </div>
        </div>
      </form>

      {/* ── TERMS PDF ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Általános Szerződési Feltételek (ÁSZF)"
          subtitle="Az itt feltöltött PDF automatikusan csatolódik az ajánlat e-mailekhez."
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
                      Feltöltve: {new Date(termsPdfUploadedAt).toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf}>
                <Upload size={13} /> Csere
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handlePdfDelete} disabled={uploadingPdf}>
                {uploadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
              {uploadingPdf ? <><Loader2 size={15} className="animate-spin" /> Feltöltés…</> : <><Upload size={15} /> PDF feltöltése</>}
            </button>
          )}
          <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
        </div>
      </div>

      {/* ── DANGER ZONE ── */}
      <div className="card" style={{ border: '1px solid var(--danger-border)', padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>Veszélyes zóna</h3>

        {(() => {
          const warningText = isPremium
            ? 'A fiók törlése végleges. Személyes adataid törlődnek, kollektívákban végzett munkáid megmaradnak. Prémium előfizetésed azonnal leáll.'
            : 'A fiók törlése végleges és azonnali. Személyes adataid törlődnek, kollektívákban végzett munkáid megmaradnak. Nem kerül felszámításra semmilyen költség.';
          return (
          <div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {warningText}
            </p>
            {!deleteOpen ? (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} /> Fiók törlése
              </button>
            ) : (
              <div>
                <p style={{ fontSize: '0.825rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>
                  A megerősítéshez írd be: <strong>TÖRLÉS</strong>
                </p>
                <input type="text" className="form-control" placeholder="TÖRLÉS" value={deleteText} onChange={e => setDeleteText(e.target.value)} style={{ marginBottom: '0.75rem' }} />
                {deleteErr && (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {deleteErr}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeleteOpen(false); setDeleteText(''); setDeleteErr(''); }}>
                    Mégse
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={deleteText !== 'TÖRLÉS' || deleting} onClick={handleDeleteAccount}>
                    {deleting ? <><Loader2 size={13} className="animate-spin" /> Törlés…</> : 'Fiók végleges törlése'}
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })()}
      </div>

      {/* ── Premium cancel success modal ── */}
      <Modal isOpen={!!cancelSuccessModal} onClose={() => setCancelSuccessModal(null)} title="Előfizetés lemondva">
        {cancelSuccessModal && (() => {
          const fmt = (iso) => iso
            ? new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
            : null;
          const premiumDate = fmt(cancelSuccessModal.premiumPeriodEnd);
          const cols = cancelSuccessModal.canceledCollectives || [];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} color="var(--success-text)" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem' }}>Prémium előfizetés lemondva</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {premiumDate
                      ? <>Prémium hozzáférésed <strong>{premiumDate}</strong>-ig aktív marad.</>
                      : 'Prémium hozzáférésed a számlázási időszak végéig aktív marad.'}
                  </div>
                </div>
              </div>

              {cols.length > 0 && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Lemondott kollektívák
                  </div>
                  {cols.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: i < cols.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {fmt(c.period_end) ? `aktív ${fmt(c.period_end)}-ig` : 'időszak végéig aktív'}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    A tagok e-mailben értesítést kaptak.
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Addig bármikor visszaállíthatod az előfizetésedet.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setCancelSuccessModal(null)}>Rendben</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Premium cancel confirm modal ── */}
      <Modal isOpen={cancelPremiumModal} onClose={() => !cancelingPremium && setCancelPremiumModal(false)} title="Prémium lemondása">
        {(() => {
          const ownedNames = (collectives || []).filter(c => c.role === 'owner').map(c => c.name);
          return (
            <div>
              {ownedNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={18} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.825rem', color: 'var(--warning-text)', lineHeight: 1.5 }}>
                    <strong>{ownedNames.length} kollektíva tulajdonosa vagy:</strong>
                    <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>
                      {ownedNames.map(n => <li key={n}>{n}</li>)}
                    </ul>
                    <div style={{ marginTop: '0.4rem' }}>A Prémium lemondásával ezek a kollektívák a számlázási időszak végén befagynak.</div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                A Prémium és az összes kollektíva előfizetése a jelenlegi számlázási időszak végéig aktív marad. Addig bármikor visszaállíthatod.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={cancelingPremium} onClick={() => setCancelPremiumModal(false)}>Mégse</button>
                <button type="button" className="btn btn-danger btn-sm" disabled={cancelingPremium} onClick={handleCancelPremium}>
                  {cancelingPremium ? <><Loader2 size={13} className="animate-spin" /> Lemondás…</> : 'Prémium lemondása'}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Creem checkout — mobile bottom sheet ── */}
      {checkoutIframeUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => { setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setLoadingPlan(null); }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '92vh',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
            background: '#fff',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem 0.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🔒 Biztonságos fizetés – Creem</span>
              <button type="button" onClick={() => { setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setLoadingPlan(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <iframe src={checkoutIframeUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="Creem fizetési felület" />
          </div>
        </div>
      )}
    </div>
  );
}
