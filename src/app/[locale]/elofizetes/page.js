'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { Check, Zap, Star, Building2, Clock, ArrowLeft, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, CreditCard, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from '@/navigation';
import WorkspaceBadge from '@/components/WorkspaceBadge';
import Modal, { AlertModal } from '@/components/Modal';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { formatDate } from '@/lib/constants';
import useMobile from '@/hooks/useMobile';
import ElofizetesPageMobile from './mobile/ElofizetesPageMobile';

function TrialBanner({ trialEndsAt }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / 86400000));
  const t = useTranslations('subscription');
  return (
    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
      <Clock size={16} color="#854d0e" style={{ flexShrink: 0 }} />
      <div>
        <span style={{ fontWeight: 700, color: '#854d0e' }}>{t('trialActive')}</span>
        <span style={{ color: '#78350f', marginLeft: '0.4rem' }}>
          {t('trialDaysLeftBanner', { days: daysLeft })}
        </span>
      </div>
    </div>
  );
}

export default function ElofizetesPage() {
  const isMobile = useMobile();
  if (isMobile) return <ElofizetesPageMobile />;
  return <ElofizetesPageDesktop />;
}

function ElofizetesPageDesktop() {
  const { currentUser, refreshSupabaseData, collectives } = useApp();
  const router = useRouter();
  const t  = useTranslations('subscription');
  const tp = useTranslations('profile');
  const tc = useTranslations('common');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [activationBanner, setActivationBanner] = useState(null); // 'success' | 'error'

  // ── Subscription management state ────────────────────────────────────────────
  const [premiumSubId,             setPremiumSubId]             = useState(null);
  const [premiumSubStarted,        setPremiumSubStarted]        = useState(null);
  const [premiumBillingCycles,     setPremiumBillingCycles]     = useState(null);
  const [subDetailLoading,         setSubDetailLoading]         = useState(false);
  const [subHistory,               setSubHistory]               = useState(null);
  const [subHistoryLoading,        setSubHistoryLoading]        = useState(false);
  const [collectiveSubs,           setCollectiveSubs]           = useState([]);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt,          setPremiumCancelAt]          = useState(null);
  const [premiumRenewalAt,         setPremiumRenewalAt]         = useState(null);
  const [cancelPremiumModal,       setCancelPremiumModal]       = useState(false);
  const [cancelingPremium,         setCancelingPremium]         = useState(false);
  const [resumingPremium,          setResumingPremium]          = useState(false);
  const [portalLoading,            setPortalLoading]            = useState(false);
  const [portalError,              setPortalError]              = useState('');
  const [alertModal,               setAlertModal]               = useState(null);
  const [cancelCollectiveModal,    setCancelCollectiveModal]    = useState(null);
  const [cancelingCollective,      setCancelingCollective]      = useState(false);
  const [cancelSuccessModal,       setCancelSuccessModal]       = useState(null);

  const PLANS = [
    {
      key: 'basic',
      name: t('basic'),
      price: t('free'),
      priceNote: t('forever'),
      icon: Zap,
      color: 'var(--text-muted)',
      features: [
        t('basicFeature1'),
        t('basicFeature2'),
        t('basicFeature3'),
        t('basicFeature4'),
        t('basicFeature5'),
      ],
    },
    {
      key: 'premium',
      name: t('premium'),
      price: t('premiumPrice'),
      priceNote: t('perMonthVat'),
      icon: Star,
      color: '#b45309',
      highlight: true,
      productId: process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID,
      features: [
        t('premiumFeature1'),
        t('premiumFeature2'),
        { text: t('premiumFeature3'), highlight: true },
        t('premiumFeature4'),
        t('premiumFeature5'),
        t('premiumFeature6'),
      ],
      cta: t('upgradeButton'),
    },
    {
      key: 'collective',
      name: t('collective'),
      price: t('collectivePriceLabel'),
      priceNote: t('perPackage'),
      icon: Building2,
      color: 'var(--accent)',
      features: [
        t('collectiveFeature1'),
        t('collectiveFeature2'),
        t('collectiveFeature3'),
        t('collectiveFeature4'),
        t('collectiveFeature5'),
      ],
      note: t('collectiveNote'),
      cta: t('startCollective'),
      href: '/kollektivak',
    },
  ];

  // Handle Creem redirect: ?upgraded=1&subscription_id=...
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Step 2: clean reload — read stored result
    const stored = sessionStorage.getItem('creem_elofizetes_result');
    if (stored) {
      try { setActivationBanner(JSON.parse(stored).status); } catch {}
      sessionStorage.removeItem('creem_elofizetes_result');
      refreshSupabaseData?.();
      return;
    }

    // Step 1: fresh Creem redirect
    const params = new URLSearchParams(window.location.search);
    if (!params.has('upgraded')) return;

    window.history.replaceState({}, '', '/elofizetes');

    const subscriptionId = params.get('subscription_id');
    const customerId     = params.get('customer_id');

    const finish = (status) => {
      sessionStorage.setItem('creem_elofizetes_result', JSON.stringify({ status }));
      window.location.replace('/elofizetes');
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load subscription details ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ premiumSub, ownedCollectiveSubs }) => {
        setCollectiveSubs(ownedCollectiveSubs ?? []);
        const subId = premiumSub?.creem_subscription_id || null;
        setPremiumSubId(subId);
        setPremiumSubStarted(premiumSub?.created_at || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
        setPremiumRenewalAt(premiumSub?.status !== 'scheduled_cancel' ? (premiumSub?.period_end || null) : null);
        if (subId) {
          setSubDetailLoading(true);
          fetch('/api/subscriptions/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: subId }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (!d) return;
              if (d.corrected_subscription_id) setPremiumSubId(d.corrected_subscription_id);
              if (d.created_at) setPremiumSubStarted(d.created_at);
              if (d.status === 'scheduled_cancel') {
                setPremiumIsScheduledCancel(true);
                if (d.current_period_end) setPremiumCancelAt(d.current_period_end);
              } else if (d.status === 'canceled' || d.status === 'expired') {
                setPremiumSubId(null);
              } else {
                const renewal = d.next_billing_date || d.current_period_end;
                if (renewal) setPremiumRenewalAt(renewal);
              }
              if (d.billing_cycle_count != null) setPremiumBillingCycles(d.billing_cycle_count);
            })
            .finally(() => setSubDetailLoading(false));
        }
      });
    setSubHistoryLoading(true);
    fetch('/api/subscriptions/history')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setSubHistory(d.events ?? []))
      .catch(() => setSubHistory([]))
      .finally(() => setSubHistoryLoading(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPremium = currentUser?.is_subscription_premium ?? false;
  const isOnTrial = !isPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const currentTierKey = isPremium ? 'premium' : isOnTrial ? 'trial' : 'basic';

  const handleOpenPortal = async () => {
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

  const handleCancelPremium = async () => {
    if (!premiumSubId) {
      setAlertModal({ variant: 'error', title: tc('error'), message: tp('subscriptionIdMissing') });
      return;
    }
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
        setCancelSuccessModal({ premiumPeriodEnd: periodEnd, canceledCollectives: data.canceled_collectives ?? [] });
      } else {
        setAlertModal({ variant: 'error', title: tc('error'), message: data.error || tp('cancelErrorMsg') });
      }
    } catch {
      setAlertModal({ variant: 'error', title: tc('error'), message: tp('cancelErrorMsg') });
    } finally {
      setCancelingPremium(false);
    }
  };

  const handleResumePremium = async () => {
    if (!premiumSubId) {
      setAlertModal({ variant: 'error', title: tc('error'), message: tp('subscriptionIdMissing') });
      return;
    }
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
        setAlertModal({ variant: 'success', title: tp('resumeSuccessTitle'), message: tp('resumeSuccessMsg') });
      } else {
        const data = await res.json();
        setAlertModal({ variant: 'error', title: tc('error'), message: data.error || tp('resumeErrorMsg') });
      }
    } catch {
      setAlertModal({ variant: 'error', title: tc('error'), message: tp('resumeErrorMsg') });
    } finally {
      setResumingPremium(false);
    }
  };

  const handleCancelCollective = async () => {
    if (!cancelCollectiveModal) return;
    setCancelingCollective(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: cancelCollectiveModal.creem_subscription_id, collectiveId: cancelCollectiveModal.collective_id }),
      });
      const data = await res.json();
      setCancelCollectiveModal(null);
      if (res.ok) {
        const periodEnd = data.subscription_period_end ?? null;
        setCollectiveSubs(prev => prev.map(c =>
          c.collective_id === cancelCollectiveModal.collective_id
            ? { ...c, subscription_status: 'scheduled_cancel', subscription_period_end: periodEnd }
            : c
        ));
      } else {
        setAlertModal({ variant: 'error', title: tc('error'), message: data.error || tp('cancelErrorMsg') });
      }
    } catch {
      setAlertModal({ variant: 'error', title: tc('error'), message: tp('cancelErrorMsg') });
    } finally {
      setCancelingCollective(false);
    }
  };

  async function handleCheckout(plan) {
    if (!plan.productId) {
      if (plan.href) router.push(plan.href);
      return;
    }
    setLoadingPlan(plan.key);
    setCheckoutError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: plan.productId, successUrl: '/elofizetes' }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        setCheckoutError(data.error || t('checkoutError'));
      }
    } catch {
      setCheckoutError(t('checkoutError'));
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> {t('backToDashboard')}
        </Link>
      </div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {t('pageTitle')} <WorkspaceBadge />
            </h1>
            <p className="page-subtitle">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {activationBanner === 'success' && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          {t('activateSuccess')}
          <button type="button" onClick={() => setActivationBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={15} /></button>
        </div>
      )}
      {activationBanner === 'error' && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {t('activateError')}
          <button type="button" onClick={() => setActivationBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={15} /></button>
        </div>
      )}

      {checkoutError && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.825rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {checkoutError}
        </div>
      )}

      {isOnTrial && <TrialBanner trialEndsAt={currentUser.trial_ends_at} />}

      {!isOnTrial && !isPremium && (
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{t('currentPlanLabel')}</span>
          <span style={{
            fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)',
          }}>
            {t('basic')}
          </span>
        </div>
      )}

      {/* ── My Subscription (Premium) ── */}
      {isPremium && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <CreditCard size={16} color="var(--accent)" />
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{tp('activeSubs')}</span>
          </div>

          {/* Premium row */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: collectiveSubs.length > 0 ? '0.65rem' : '1rem' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <Star size={14} color="#b45309" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tp('planPremiumName')}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)',
                  background: premiumIsScheduledCancel ? '#fef9c3' : 'var(--success-bg)',
                  color: premiumIsScheduledCancel ? '#854d0e' : 'var(--success-text)',
                  border: `1px solid ${premiumIsScheduledCancel ? '#fde047' : 'var(--success-border)'}` }}>
                  {premiumIsScheduledCancel ? tp('subCancels') : tp('subActive')}
                </span>
              </div>
              {subDetailLoading && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{tp('subLoadingDetails')}</div>}
              {premiumSubStarted && !subDetailLoading && (
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {tp('subStartedLabel')}: <strong>{formatDate(premiumSubStarted)}</strong>
                </div>
              )}
              {!premiumIsScheduledCancel && premiumRenewalAt && !subDetailLoading && (
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {tp('subNextRenewalLabel')}: <strong>{formatDate(premiumRenewalAt)}</strong>
                </div>
              )}
              {premiumIsScheduledCancel && premiumCancelAt && !subDetailLoading && (
                <div style={{ fontSize: '0.775rem', color: '#854d0e' }}>
                  {tp('subActiveUntilLabel')}: <strong>{formatDate(premiumCancelAt)}</strong>
                </div>
              )}
              {premiumBillingCycles != null && premiumBillingCycles > 0 && !subDetailLoading && (
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {tp('subBillingCyclesLabel')}: <strong>{premiumBillingCycles}×</strong>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
              {premiumIsScheduledCancel ? (
                <button type="button" onClick={handleResumePremium} disabled={resumingPremium}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.85rem', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.78rem', cursor: resumingPremium ? 'default' : 'pointer' }}>
                  {resumingPremium ? <><Loader2 size={12} className="animate-spin" /> {tp('subResumingBtn')}</> : <><RefreshCw size={12} /> {tp('subResumeBtn')}</>}
                </button>
              ) : (
                <button type="button" onClick={() => setCancelPremiumModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.85rem', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--danger-text)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  {tp('premiumCancel')}
                </button>
              )}
              <button type="button" onClick={handleOpenPortal} disabled={portalLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.78rem', cursor: portalLoading ? 'default' : 'pointer', opacity: portalLoading ? 0.6 : 1 }}>
                {portalLoading ? <><Loader2 size={12} className="animate-spin" /> {tp('portalOpening')}</> : <>{tp('managePayment')} <ChevronRight size={12} /></>}
              </button>
            </div>
          </div>
          {portalError && <div style={{ marginBottom: '0.65rem', fontSize: '0.78rem', color: 'var(--danger-text)' }}>{portalError}</div>}

          {/* Collective addon subs */}
          {collectiveSubs.map(c => {
            const isScheduled = c.subscription_status === 'scheduled_cancel';
            const periodEnd = c.subscription_period_end ? formatDate(c.subscription_period_end) : null;
            return (
              <div key={c.collective_id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                    <Building2 size={13} color="var(--accent)" />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)',
                      background: isScheduled ? '#fef9c3' : 'var(--success-bg)',
                      color: isScheduled ? '#854d0e' : 'var(--success-text)',
                      border: `1px solid ${isScheduled ? '#fde047' : 'var(--success-border)'}` }}>
                      {isScheduled ? tp('subCancels') : tp('subActive')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {isScheduled
                      ? (periodEnd ? tp('subActiveUntil', { date: periodEnd }) : tp('subActiveUntilPeriod'))
                      : (periodEnd ? tp('subNextRenewal', { date: periodEnd }) : tp('subRenewsMonthly'))}
                  </div>
                </div>
                {!isScheduled && (
                  <button type="button"
                    onClick={() => setCancelCollectiveModal({ collective_id: c.collective_id, name: c.name, creem_subscription_id: c.creem_subscription_id })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.85rem', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--danger-text)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}>
                    {tp('cancelSubscriptionBtn')}
                  </button>
                )}
              </div>
            );
          })}

          {/* History */}
          {subHistory !== null && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.65rem', paddingTop: '0.85rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{tp('historyTitle')}</span>
              {subHistoryLoading && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{tp('subLoadingDetails')}</div>}
              {!subHistoryLoading && subHistory?.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{tp('historyEmpty')}</div>}
              {!subHistoryLoading && subHistory?.length > 0 && (
                <div className="scroll-y-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', maxHeight: '14rem' }}>
                  {subHistory.slice(0, 10).map((ev, i) => {
                    const isPayment = ev.source === 'creem';
                    const { label, color } = (() => {
                      if (isPayment) return { label: tp('historyPayment'), color: 'var(--success-text)' };
                      if (ev.type === 'activated') return { label: tp('historyActivated'), color: 'var(--success-text)' };
                      if (ev.type === 'cancelled') return { label: tp('historyCancelled'), color: '#b45309' };
                      if (ev.type === 'resumed') return { label: tp('historyResumed'), color: 'var(--accent)' };
                      return { label: ev.action?.includes('admin') ? tp('historyAdminChange') : tp('historyDeactivated'), color: 'var(--text-muted)' };
                    })();
                    const amountStr = isPayment && ev.amount ? ` · ${(ev.amount / 100).toLocaleString('hu-HU')} ${ev.currency}` : '';
                    return (
                      <div key={ev.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}{amountStr}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                          {ev.date ? new Date(ev.date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px,100%), 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = (plan.key === 'basic' && !effectivePremium) || (plan.key === 'premium' && isPremium);
          const isLoading = loadingPlan === plan.key;
          return (
            <div
              key={plan.key}
              className="card"
              style={{
                display: 'flex', flexDirection: 'column', gap: '1rem',
                border: isCurrent ? `2px solid ${plan.color}` : undefined,
                position: 'relative',
              }}
            >
              {isCurrent && (
                <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: 'white', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.2rem 0.7rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                  {t('currentPlan')}
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={plan.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{plan.name}</div>
                  {plan.note && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{plan.note}</div>}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{plan.price}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>{plan.priceNote}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                {plan.features.map(f => {
                  const text = typeof f === 'string' ? f : f.text;
                  const hi   = typeof f === 'object' && f.highlight;
                  return (
                    <li key={text} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                      fontSize: '0.85rem',
                      ...(hi ? {
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.5rem',
                        color: '#15803d', fontWeight: 600,
                      } : { color: 'var(--text-secondary)' }),
                    }}>
                      <Check size={14} color={hi ? '#16a34a' : 'var(--success-text)'} style={{ flexShrink: 0, marginTop: 2 }} />
                      {text}
                    </li>
                  );
                })}
              </ul>

              {plan.cta && (
                <button
                  type="button"
                  disabled={isCurrent || isLoading}
                  onClick={() => !isCurrent && handleCheckout(plan)}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)',
                    fontWeight: 700, fontSize: '0.875rem',
                    cursor: isCurrent || isLoading ? 'default' : 'pointer',
                    border: 'none',
                    background: isCurrent ? 'var(--bg-subtle)' : plan.highlight ? plan.color : 'var(--accent)',
                    color: isCurrent ? 'var(--text-muted)' : 'white',
                    opacity: isCurrent || isLoading ? 0.7 : 1,
                  }}
                >
                  {isCurrent ? t('currentPlan') : isLoading ? t('redirecting') : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        {t('contactQuestion')} <a href="mailto:info@okosszaki.hu" style={{ color: 'var(--accent)' }}>info@okosszaki.hu</a>
      </p>

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant ?? 'success'}
        title={alertModal?.title}
        message={alertModal?.message}
      />

      {/* ── Premium cancel confirm modal ── */}
      <Modal isOpen={cancelPremiumModal} onClose={() => !cancelingPremium && setCancelPremiumModal(false)} title={tp('premiumCancelTitle')}>
        {(() => {
          const ownedNames = (collectives || []).filter(c => c.role === 'owner').map(c => c.name);
          return (
            <div>
              {ownedNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={18} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: '0.825rem', color: 'var(--warning-text)', lineHeight: 1.5 }}>
                    <strong>{tp('premiumCancelOwnedWarning', { count: ownedNames.length })}</strong>
                    <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0 }}>{ownedNames.map(n => <li key={n}>{n}</li>)}</ul>
                    <div style={{ marginTop: '0.4rem' }}>{tp('premiumCancelFreezeNote')}</div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {tp('premiumCancelContent')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={cancelingPremium} onClick={() => setCancelPremiumModal(false)}>{tc('cancel')}</button>
                <button type="button" className="btn btn-danger btn-sm" disabled={cancelingPremium} onClick={handleCancelPremium}>
                  {cancelingPremium ? <><Loader2 size={13} className="animate-spin" /> {tp('cancelingBtn')}</> : tp('premiumCancel')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Collective cancel confirm modal ── */}
      <Modal isOpen={!!cancelCollectiveModal} onClose={() => !cancelingCollective && setCancelCollectiveModal(null)} title={tp('cancelCollectiveTitle')}>
        {cancelCollectiveModal && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.825rem', color: '#7c2d12', lineHeight: 1.55 }}>
                {tp('cancelCollectiveWarning')}
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {tp('cancelCollectiveConfirmText', { name: cancelCollectiveModal.name })}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelCollectiveModal(null)} disabled={cancelingCollective}>
                {tp('keepSubscriptionBtn')}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handleCancelCollective} disabled={cancelingCollective}>
                {cancelingCollective ? <><Loader2 size={13} className="animate-spin" /> {tp('cancelingBtn')}</> : tp('cancelSubscriptionBtn')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel success modal ── */}
      <Modal isOpen={!!cancelSuccessModal} onClose={() => setCancelSuccessModal(null)} title={tp('cancelSuccessModalTitle')}>
        {cancelSuccessModal && (() => {
          const fmt = iso => iso ? new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
          const premiumDate = fmt(cancelSuccessModal.premiumPeriodEnd);
          const cols = cancelSuccessModal.canceledCollectives || [];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} color="var(--success-text)" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem' }}>{tp('premiumCanceledTitle')}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {premiumDate ? tp('premiumActiveUntilDate', { date: premiumDate }) : tp('premiumActiveUntilPeriod')}
                  </div>
                </div>
              </div>
              {cols.length > 0 && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {tp('canceledCollectivesTitle')}
                  </div>
                  {cols.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: i < cols.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {fmt(c.period_end) ? tp('activeUntilDateLabel', { date: fmt(c.period_end) }) : tp('activeUntilPeriodLabel')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {tp('canRestoreAnytime')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setCancelSuccessModal(null)}>{tp('ok')}</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
