'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useCollectives } from '@/hooks/useCollectives';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Check, Zap, Star, Building2, Clock,
  AlertCircle, CheckCircle2, X, Loader2, RefreshCw,
  CreditCard, AlertTriangle, ChevronDown, Lock, Rocket,
  Users, ChevronRight,
} from 'lucide-react';
import { TIER_DISPLAY } from '@/lib/collectivesService';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { formatDate } from '@/lib/constants';
import Modal, { AlertModal } from '@/components/Modal';
import PageSpinner from '@/components/PageSpinner';

const HEADER_COLOR = '#B45309';

function SecLabel({ children, onCard }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: onCard ? '#8A8F98' : 'rgba(255,255,255,0.45)', padding: '10px 2px 4px' }}>
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <h2 style={{ margin: '8px 0 10px', fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
      {children}
    </h2>
  );
}

// ── History timeline ──────────────────────────────────────────────────────────

function HistoryList({ events, tp }) {
  if (!events?.length) return <span style={{ fontSize: 13, color: '#8A8F98' }}>{tp('historyEmpty')}</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {events.slice(0, 10).map((ev, i) => {
        const isLast    = i === Math.min(events.length, 10) - 1;
        const isPayment = ev.source === 'creem';
        const { label, color } = (() => {
          if (isPayment)             return { label: tp('historyPayment'),     color: '#14532D' };
          if (ev.type === 'activated') return { label: tp('historyActivated'),   color: '#14532D' };
          if (ev.type === 'cancelled') return { label: tp('historyCancelled'),   color: '#B45309' };
          if (ev.type === 'resumed')   return { label: tp('historyResumed'),     color: '#1D4ED8' };
          return { label: ev.action?.includes('admin') ? tp('historyAdminChange') : tp('historyDeactivated'), color: '#5A5F68' };
        })();
        const amountStr = isPayment && ev.amount ? ` · ${(ev.amount / 100).toLocaleString('hu-HU')} ${ev.currency}` : '';
        return (
          <div key={ev.id ?? i} style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 26 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
              </div>
              {!isLast && <div style={{ width: 1.5, flex: 1, background: '#E8E5DF', marginTop: 3 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{label}{amountStr}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8F98', marginTop: 1 }}>
                {ev.date ? new Date(ev.date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, isCurrent, isLoading, onAction, lockedBanner, t }) {
  const Icon = plan.icon;
  const resolvedColor = plan.color.startsWith('var(') ? '#2563eb' : plan.color;
  return (
    <div className="dk-card" style={{ overflow: 'hidden', border: `2px solid ${isCurrent ? resolvedColor : 'transparent'}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: resolvedColor }} />
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: `${resolvedColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={resolvedColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: '#0E1116' }}>{plan.name}</span>
            {isCurrent && (
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 999, background: resolvedColor, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('currentPlan')}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#5A5F68', marginTop: 2 }}>
            <span style={{ fontWeight: 800, color: '#0E1116' }}>{plan.price}</span>
            <span style={{ marginLeft: 4 }}>{plan.priceNote}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px', flex: 1 }}>
        {plan.note && <p style={{ fontSize: 12, color: '#5A5F68', margin: '0 0 10px' }}>{plan.note}</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plan.features.map(f => {
            const text = typeof f === 'string' ? f : f.text;
            const hi   = typeof f === 'object' && f.highlight;
            return (
              <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, ...(hi ? { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '6px 10px', color: '#15803d', fontWeight: 600 } : { color: '#3A3F47' }) }}>
                <Check size={13} color={hi ? '#16a34a' : '#14532D'} style={{ flexShrink: 0, marginTop: 2 }} />
                {text}
              </li>
            );
          })}
        </ul>
      </div>
      <div style={{ padding: '0 20px 18px' }}>
        {lockedBanner && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: plan.cta ? 10 : 0 }}>
            <AlertCircle size={15} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', lineHeight: 1.45 }}>{lockedBanner}</span>
          </div>
        )}
        {plan.cta && !lockedBanner && (
          <button type="button" disabled={isCurrent || isLoading} onClick={onAction} style={{ width: '100%', height: 48, border: 0, borderRadius: 24, fontWeight: 700, fontSize: 15, cursor: isCurrent || isLoading ? 'default' : 'pointer', background: isCurrent ? '#F1F1F3' : resolvedColor, color: isCurrent ? '#8A8F98' : '#fff', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> {t('redirecting')}</> : isCurrent ? t('currentPlan') : plan.cta}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ElofizetesDesktop() {
  const { currentUser, refreshSupabaseData, refreshCurrentUser, collectives: appCollectives } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t  = useTranslations('subscription');
  const tp = useTranslations('profile');
  const tc = useTranslations('common');
  const tk = useTranslations('collectives');
  const { collectives: fullCollectives, refresh: refreshCollectives } = useCollectives();

  // ── Checkout state ─────────────────────────────────────────────────────────
  const [loadingPlan,       setLoadingPlan]       = useState(null);
  const [checkoutError,     setCheckoutError]     = useState('');
  const [activationBanner,  setActivationBanner]  = useState(null);
  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);
  const checkoutPollRef = useRef(null);
  const webhookPollRef  = useRef(null);

  // ── Subscription state ─────────────────────────────────────────────────────
  const [premiumSubId,             setPremiumSubId]             = useState(null);
  const [premiumSubStarted,        setPremiumSubStarted]        = useState(null);
  const [premiumBillingCycles,     setPremiumBillingCycles]     = useState(null);
  const [premiumIsScheduledCancel, setPremiumIsScheduledCancel] = useState(false);
  const [premiumCancelAt,          setPremiumCancelAt]          = useState(null);
  const [premiumRenewalAt,         setPremiumRenewalAt]         = useState(null);
  const [subDetailLoading,         setSubDetailLoading]         = useState(false);
  const [subHistory,               setSubHistory]               = useState(null);
  const [subHistoryLoading,        setSubHistoryLoading]        = useState(false);
  const [collectiveSubs,           setCollectiveSubs]           = useState([]);
  const [historyOpen,              setHistoryOpen]              = useState(false);
  const [subReloadKey,             setSubReloadKey]             = useState(0);

  // ── Collective management state ────────────────────────────────────────────
  const [activateModal,          setActivateModal]          = useState(null); // { id, name } of collective to activate
  const [activateTier,           setActivateTier]           = useState(null); // 's'|'m'|'l'|'xl'
  const [activatingCollective,   setActivatingCollective]   = useState(false);
  const [collectiveCheckoutUrl,  setCollectiveCheckoutUrl]  = useState(null);
  const [collectiveCheckoutId,   setCollectiveCheckoutId]   = useState(null); // which collective we're activating
  const collectiveCheckoutPollRef = useRef(null);
  const collectiveWebhookPollRef  = useRef(null);
  const [changePlanModal,        setChangePlanModal]        = useState(null); // { id, name, tier } of collective
  const [changePlanTier,         setChangePlanTier]         = useState(null);
  const [changingPlan,           setChangingPlan]           = useState(false);
  const [changePlanError,        setChangePlanError]        = useState('');
  const activateCardRef = useRef(null);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [cancelPremiumModal,    setCancelPremiumModal]    = useState(false);
  const [cancelingPremium,      setCancelingPremium]      = useState(false);
  const [resumingPremium,       setResumingPremium]       = useState(false);
  const [cancelCollectiveModal, setCancelCollectiveModal] = useState(null);
  const [cancelingCollective,   setCancelingCollective]   = useState(false);
  const [cancelSuccessModal,    setCancelSuccessModal]    = useState(null);
  const [alertModal,            setAlertModal]            = useState(null);
  const [portalLoading,         setPortalLoading]         = useState(false);

  const PLANS = [
    {
      key: 'basic',
      name: t('basic'),
      price: t('free'),
      priceNote: t('forever'),
      icon: Zap,
      color: '#6B7280',
      features: [t('basicFeature1'), t('basicFeature2'), t('basicFeature3'), t('basicFeature4'), t('basicFeature5')],
    },
    {
      key: 'premium',
      name: t('premium'),
      price: t('premiumPrice'),
      priceNote: t('perMonthVat'),
      icon: Star,
      color: HEADER_COLOR,
      highlight: true,
      productId: process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID,
      features: [t('premiumFeature1'), t('premiumFeature2'), { text: t('premiumFeature3'), highlight: true }, t('premiumFeature4'), t('premiumFeature5'), t('premiumFeature6')],
      cta: t('upgradeButton'),
    },
    {
      key: 'collective',
      name: t('collective'),
      price: t('collectivePriceLabel'),
      priceNote: t('perPackage'),
      icon: Building2,
      color: '#2563eb',
      features: [t('collectiveFeature1'), t('collectiveFeature2'), t('collectiveFeature3'), t('collectiveFeature4'), t('collectiveFeature5')],
      note: t('collectiveNote'),
      cta: t('startCollective'),
      href: '/kollektivak',
    },
  ];

  // ── Auto-open activation modal from ?activate=<id> query param ───────────
  useEffect(() => {
    const activateId = searchParams?.get('activate');
    if (!activateId || !appCollectives?.length) return;
    const col = appCollectives.find(c => c.collective_id === activateId);
    if (col && col.status === 'not_activated') {
      setActivateModal({ id: col.collective_id, name: col.name });
      setActivateTier(null);
    }
  }, [searchParams, appCollectives]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load subscription data ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ profile, premiumSub, ownedCollectiveSubs }) => {
        setCollectiveSubs(ownedCollectiveSubs ?? []);
        const isPrem = profile?.is_subscription_premium ?? false;
        const subId = isPrem ? (premiumSub?.creem_subscription_id || null) : null;
        setPremiumSubId(subId);
        setPremiumSubStarted(premiumSub?.created_at || null);
        setPremiumIsScheduledCancel(premiumSub?.status === 'scheduled_cancel');
        setPremiumCancelAt(premiumSub?.status === 'scheduled_cancel' ? (premiumSub.period_end || null) : null);
        setPremiumRenewalAt(premiumSub?.status !== 'scheduled_cancel' ? (premiumSub?.period_end || null) : null);
        if (subId) {
          setSubDetailLoading(true);
          fetch('/api/subscriptions/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: subId }) })
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
    setSubHistoryLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch('/api/subscriptions/history')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setSubHistory(d.events ?? []))
      .catch(() => setSubHistory([]))
      .finally(() => setSubHistoryLoading(false));
  }, [currentUser?.id, subReloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Creem redirect handler ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('creem_elofizetes_result');
    if (stored) {
      try { setActivationBanner(JSON.parse(stored).status); } catch {} // eslint-disable-line react-hooks/set-state-in-effect
      sessionStorage.removeItem('creem_elofizetes_result');
      refreshCurrentUser?.().then(() => { refreshSupabaseData?.(); setSubReloadKey(k => k + 1); });
      return;
    }
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
      fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId, customerId }) })
        .then(res => finish(res.ok ? 'success' : 'error'))
        .catch(() => finish('error'));
    } else { finish('error'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ──────────────────────────────────────────────────────────
  const isPremium      = currentUser?.is_subscription_premium ?? false;
  const isOnTrial      = !isPremium && currentUser?.subscription_tier === 'trial' && currentUser?.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const daysLeft       = isOnTrial ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000)) : 0;
  const subBadge       = premiumIsScheduledCancel
    ? { label: tp('subCancels'), bg: '#FFF4E5', fg: '#6B3A00' }
    : { label: tp('subActive'),  bg: '#E7F4EC', fg: '#14532D' };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res  = await fetch('/api/billing/portal');
      const data = await res.json();
      if (data.portalUrl) window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      else setAlertModal({ variant: 'error', message: data.error || tp('portalError') });
    } catch { setAlertModal({ variant: 'error', message: tp('portalError') }); }
    finally { setPortalLoading(false); }
  };

  const handleCancelPremium = async () => {
    if (!premiumSubId) { setAlertModal({ variant: 'error', message: tp('subscriptionIdMissing') }); return; }
    setCancelingPremium(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      const data = await res.json();
      if (res.ok) {
        const endDate = data.subscription_period_end ?? null;
        setPremiumIsScheduledCancel(true); setPremiumCancelAt(endDate); setPremiumRenewalAt(null);
        setCancelPremiumModal(false);
        setCancelSuccessModal({ premiumPeriodEnd: endDate, canceledCollectives: data.canceled_collectives ?? [] });
      } else { setAlertModal({ variant: 'error', message: data.error || tp('cancelErrorMsg') }); }
    } catch { setAlertModal({ variant: 'error', message: tp('cancelErrorMsg') }); }
    finally { setCancelingPremium(false); }
  };

  const handleResumePremium = async () => {
    if (!premiumSubId) { setAlertModal({ variant: 'error', message: tp('subscriptionIdMissing') }); return; }
    setResumingPremium(true);
    try {
      const res = await fetch('/api/subscriptions/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      if (res.ok) {
        setPremiumIsScheduledCancel(false); setPremiumCancelAt(null);
        setAlertModal({ variant: 'success', title: tp('resumeSuccessTitle'), message: tp('resumeSuccessMsg') });
        await refreshCurrentUser?.();
      } else {
        const d = await res.json(); setAlertModal({ variant: 'error', message: d.error || tp('resumeErrorMsg') });
      }
    } catch { setAlertModal({ variant: 'error', message: tp('resumeErrorMsg') }); }
    finally { setResumingPremium(false); }
  };

  const handleCancelCollective = async () => {
    if (!cancelCollectiveModal) return;
    setCancelingCollective(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: cancelCollectiveModal.creem_subscription_id, collectiveId: cancelCollectiveModal.collective_id }) });
      const data = await res.json();
      setCancelCollectiveModal(null);
      if (res.ok) {
        const end = data.subscription_period_end ?? null;
        setCollectiveSubs(prev => prev.map(c => c.collective_id === cancelCollectiveModal.collective_id ? { ...c, subscription_status: 'scheduled_cancel', subscription_period_end: end } : c));
      } else { setAlertModal({ variant: 'error', message: data.error || tp('cancelErrorMsg') }); }
    } catch { setAlertModal({ variant: 'error', message: tp('cancelErrorMsg') }); }
    finally { setCancelingCollective(false); }
  };

  // ── Collective activation checkout ─────────────────────────────────────────
  const TIER_PRODUCT = {
    s: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_SMALL_PRODUCT_ID,
    m: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_MEDIUM_PRODUCT_ID,
    l: process.env.NEXT_PUBLIC_CREEM_COLLECTIVE_LARGE_PRODUCT_ID,
  };

  async function handleActivateCollective(collectiveId, tier) {
    if (!collectiveId || !tier || tier === 'xl') return;
    const productId = TIER_PRODUCT[tier];
    if (!productId) { setAlertModal({ variant: 'error', message: `A(z) ${tier.toUpperCase()} csomag termékidentifikátora nincs konfigurálva.` }); return; }
    setActivatingCollective(true);
    // Clear any stale success entry so the 400ms poll doesn't skip over it
    localStorage.removeItem('creem_checkout_done');
    try {
      const res  = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, collectiveId, successUrl: '/checkout-popup-success?checkout_type=collective_activate' }) });
      const data = await res.json();
      if (!data.checkoutUrl) { setAlertModal({ variant: 'error', message: data.error || t('checkoutError') }); setActivatingCollective(false); return; }

      const capturedName = activateModal?.name || '';

      const onCollectiveSuccess = async () => {
        clearInterval(collectiveCheckoutPollRef.current); collectiveCheckoutPollRef.current = null;
        clearInterval(collectiveWebhookPollRef.current);  collectiveWebhookPollRef.current  = null;
        window.removeEventListener('storage', onColStorage);
        window.removeEventListener('message', onColMessage);
        setCollectiveCheckoutUrl(null);
        localStorage.removeItem('creem_checkout_done');
        await refreshCurrentUser?.();
        refreshCollectives?.();
        setSubReloadKey(k => k + 1); // reload ownedCollectiveSubs so Active Subscriptions shows the new entry
        setActivateModal(null);
        setAlertModal({ variant: 'success', title: tk('activateSuccess', { name: capturedName }), message: '' });
        setActivatingCollective(false);
      };

      const onColStorage = (e) => {
        if (e.key !== 'creem_checkout_done') return;
        let d; try { d = JSON.parse(e.newValue); } catch { return; }
        if (d?.checkoutType !== 'collective_activate') return;
        onCollectiveSuccess();
      };
      const onColMessage = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== 'creem_checkout_success') return;
        if (e.data?.checkoutType !== 'collective_activate') return;
        onCollectiveSuccess();
      };

      collectiveCheckoutPollRef.current = setInterval(() => {
        const stored = localStorage.getItem('creem_checkout_done');
        if (!stored) return;
        let d; try { d = JSON.parse(stored); } catch { return; }
        if (d?.checkoutType !== 'collective_activate') return;
        onCollectiveSuccess();
      }, 400);
      window.addEventListener('storage', onColStorage);
      window.addEventListener('message', onColMessage);
      setCollectiveCheckoutId(collectiveId);
      setCollectiveCheckoutUrl(data.checkoutUrl);
      setActivateModal(null); // close tier picker so the Creem iframe is accessible

      // Poll the profile every 1.5s — the webhook sets collectives.status='active';
      // this is the primary auto-close path when the localStorage signal is missed
      collectiveWebhookPollRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/auth/profile?real=1', { cache: 'no-store' });
          if (!r.ok) return;
          const { profile } = await r.json();
          const updated = (profile?.collectives || []).find(c => c.collective_id === collectiveId);
          if (updated?.status === 'active') onCollectiveSuccess();
        } catch {}
      }, 1500);
    } catch { setAlertModal({ variant: 'error', message: t('checkoutError') }); setActivatingCollective(false); }
  }

  async function closeCollectiveCheckout() {
    clearInterval(collectiveCheckoutPollRef.current); collectiveCheckoutPollRef.current = null;
    clearInterval(collectiveWebhookPollRef.current);  collectiveWebhookPollRef.current  = null;
    setCollectiveCheckoutUrl(null);
    setActivatingCollective(false);
    await refreshCurrentUser?.();
    refreshCollectives?.();
    setSubReloadKey(k => k + 1); // reload ownedCollectiveSubs so Active Subscriptions reflects new state
  }

  // ── Resume collective subscription ──────────────────────────────────────────
  const [resumeCollectiveModal, setResumeCollectiveModal] = useState(null); // { collectiveId, name, creem_subscription_id, periodEnd }
  const [resumingCollectiveId,  setResumingCollectiveId]  = useState(null);

  async function handleResumeCollective() {
    const { collectiveId, creem_subscription_id } = resumeCollectiveModal || {};
    if (!creem_subscription_id) { setAlertModal({ variant: 'error', message: tk('resumeError') }); return; }
    setResumingCollectiveId(collectiveId);
    try {
      const res  = await fetch('/api/subscriptions/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: creem_subscription_id, collectiveId }) });
      const data = await res.json();
      if (res.ok) {
        setCollectiveSubs(prev => prev.map(c => c.collective_id === collectiveId ? { ...c, subscription_status: 'active', subscription_period_end: null } : c));
        await refreshCurrentUser?.();
        setResumeCollectiveModal(null);
        setAlertModal({ variant: 'success', title: tk('resumeSuccess'), message: '' });
      } else {
        setAlertModal({ variant: 'error', message: data.error || tk('resumeError') });
      }
    } catch { setAlertModal({ variant: 'error', message: tk('resumeError') }); }
    finally { setResumingCollectiveId(null); }
  }

  // ── Change plan ─────────────────────────────────────────────────────────────
  async function handleChangePlan(collectiveId, tier) {
    if (!tier) return;
    setChangingPlan(true);
    setChangePlanError('');
    try {
      const res  = await fetch(`/api/collectives/${collectiveId}/change-plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
      const data = await res.json();
      if (res.status === 422 && data.error === 'too_many_members') {
        setChangePlanError(tk('changePlanDowngradeBlock', { n: data.current - data.allowed }));
        setChangingPlan(false);
        return;
      }
      if (!res.ok) { setChangePlanError(data.error || tk('errorGeneric')); setChangingPlan(false); return; }
      setChangePlanModal(null);
      setAlertModal({ variant: 'success', title: tk('upgradeSuccess'), message: tk('tierChangeSuccessMsg', { name: tier.toUpperCase() }) });
      await refreshCurrentUser?.();
      refreshCollectives?.();
    } catch { setChangePlanError(tk('connectionError')); }
    finally { setChangingPlan(false); }
  }

  async function handleCheckout(plan) {
    if (!plan.productId) { if (plan.href) router.push(plan.href); return; }
    setLoadingPlan(plan.key);
    setCheckoutError('');
    try {
      const res  = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: plan.productId, successUrl: '/checkout-popup-success?checkout_type=elofizetes_premium' }) });
      const data = await res.json();
      if (!data.checkoutUrl) { setCheckoutError(data.error || t('checkoutError')); setLoadingPlan(null); return; }

      const activate = async (payload) => {
        clearInterval(checkoutPollRef.current); checkoutPollRef.current = null;
        clearInterval(webhookPollRef.current);  webhookPollRef.current  = null;
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('message', onMessage);
        setCheckoutIframeUrl(null);
        localStorage.removeItem('creem_checkout_done');
        if (payload._fromWebhook) {
          await refreshCurrentUser?.(); refreshSupabaseData?.();
          setActivationBanner('success');
          setSubReloadKey(k => k + 1);
        } else {
          try {
            const r = await fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: payload.subscriptionId, customerId: payload.customerId }) });
            setActivationBanner(r.ok ? 'success' : 'error');
            if (r.ok) { await refreshCurrentUser?.(); refreshSupabaseData?.(); setSubReloadKey(k => k + 1); }
          } catch { setActivationBanner('error'); }
        }
        setLoadingPlan(null);
      };

      const onStorage = (e) => { if (e.key !== 'creem_checkout_done') return; let d; try { d = JSON.parse(e.newValue); } catch { return; } if (d?.checkoutType !== 'elofizetes_premium') return; activate(d); };
      const onMessage = (e) => { if (e.origin !== window.location.origin) return; if (e.data?.type !== 'creem_checkout_success') return; if (e.data?.checkoutType !== 'elofizetes_premium') return; activate(e.data); };

      checkoutPollRef.current = setInterval(() => { const stored = localStorage.getItem('creem_checkout_done'); if (!stored) return; let d; try { d = JSON.parse(stored); } catch { return; } if (d?.checkoutType !== 'elofizetes_premium') return; activate(d); }, 400);
      window.addEventListener('storage', onStorage);
      window.addEventListener('message', onMessage);
      setCheckoutIframeUrl(data.checkoutUrl);

      webhookPollRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/auth/profile?real=1', { cache: 'no-store' });
          if (!r.ok) return;
          const { profile } = await r.json();
          if (profile?.is_subscription_premium) activate({ subscriptionId: null, customerId: null, _fromWebhook: true });
        } catch {}
      }, 3000);
    } catch { setCheckoutError(t('checkoutError')); setLoadingPlan(null); }
  }

  async function closeCheckoutIframe() {
    clearInterval(checkoutPollRef.current); checkoutPollRef.current = null;
    clearInterval(webhookPollRef.current);  webhookPollRef.current  = null;
    const stored = localStorage.getItem('creem_checkout_done');
    if (stored) {
      try {
        const d = JSON.parse(stored);
        if (d?.checkoutType === 'elofizetes_premium' && d?.subscriptionId) {
          setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done');
          fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: d.subscriptionId, customerId: d.customerId }) })
            .then(async r => { setActivationBanner(r.ok ? 'success' : 'error'); if (r.ok) { await refreshCurrentUser?.(); refreshSupabaseData?.(); setSubReloadKey(k => k + 1); } })
            .catch(() => setActivationBanner('error'));
          setLoadingPlan(null); return;
        }
      } catch {}
    }
    setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setLoadingPlan(null);
    await refreshCurrentUser?.();
  }

  if (!currentUser) return <PageSpinner />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dk-page dk-mod-subscription">
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <span className="dk-kick">{t('kickerLabel')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ flexShrink: 0 }}>
          <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            {isPremium
              ? <><Star size={13} color="#FDE047" fill="#FDE047" /> {t('premium')}</>
              : isOnTrial
                ? <><Clock size={13} /> {t('trialActive')} · {daysLeft}n</>
                : <><Zap size={13} /> {t('basic')}</>}
          </span>
        </div>
      </header>

      <div className="dk-body">

        {/* Activation banners */}
        {activationBanner === 'success' && (
          <div style={{ background: 'rgba(20,83,45,0.18)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(20,83,45,0.4)' }}>
            <CheckCircle2 size={18} color="#4ADE80" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#4ADE80' }}>{t('activateSuccess')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#4ADE80', display: 'flex' }}><X size={16} /></button>
          </div>
        )}
        {activationBanner === 'error' && (
          <div style={{ background: 'rgba(183,28,28,0.18)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(183,28,28,0.4)' }}>
            <AlertCircle size={18} color="#F87171" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#F87171' }}>{t('activateError')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', display: 'flex' }}><X size={16} /></button>
          </div>
        )}
        {checkoutError && (
          <div style={{ background: 'rgba(183,28,28,0.18)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid rgba(183,28,28,0.4)' }}>
            <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14, color: '#F87171' }}>{checkoutError}</span>
          </div>
        )}

        {/* Trial banner */}
        {isOnTrial && (
          <div style={{ background: '#FFF4E5', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={16} color="#6B3A00" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#6B3A00', flex: 1 }}>
              {t('trialActive')} — {t('trialDaysLeftBanner', { days: daysLeft })}
            </span>
          </div>
        )}

        {/* Section 1: Active Subscriptions */}
        {isPremium && <SectionHeader>{t('sectionActiveSubscriptions')}</SectionHeader>}

        {/* My Subscription card (premium users) */}
        {isPremium && (
          <section className="dk-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="dk-ic" style={{ background: `${HEADER_COLOR}18`, flexShrink: 0 }}>
                <CreditCard size={20} color={HEADER_COLOR} />
              </div>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: '#0E1116' }}>{tp('activeSubs')}</span>
            </div>

            {/* Premium row */}
            <div style={{ background: '#F9F8F5', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Star size={15} color={HEADER_COLOR} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#0E1116' }}>{tp('planPremiumName')}</span>
                    <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 11, fontWeight: 700, background: subBadge.bg, color: subBadge.fg, display: 'inline-flex', alignItems: 'center' }}>
                      {subBadge.label}
                    </span>
                  </div>
                  {subDetailLoading && <div style={{ fontSize: 13, color: '#8A8F98' }}>{tp('subLoadingDetails')}</div>}
                  {premiumSubStarted && !subDetailLoading && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#5A5F68' }}>{tp('subStartedLabel')}:</span>
                      <span style={{ fontWeight: 700 }}>{formatDate(premiumSubStarted)}</span>
                    </div>
                  )}
                  {!premiumIsScheduledCancel && premiumRenewalAt && !subDetailLoading && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#5A5F68' }}>{tp('subNextRenewalLabel')}:</span>
                      <span style={{ fontWeight: 700 }}>{formatDate(premiumRenewalAt)}</span>
                    </div>
                  )}
                  {premiumIsScheduledCancel && premiumCancelAt && !subDetailLoading && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#5A5F68' }}>{tp('subActiveUntilLabel')}:</span>
                      <span style={{ fontWeight: 700, color: '#B71C1C' }}>{formatDate(premiumCancelAt)}</span>
                    </div>
                  )}
                  {premiumBillingCycles != null && premiumBillingCycles > 0 && !subDetailLoading && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#5A5F68' }}>{tp('subBillingCyclesLabel')}:</span>
                      <span style={{ fontWeight: 700 }}>{premiumBillingCycles}×</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {premiumSubId && (
                    premiumIsScheduledCancel ? (
                      <button type="button" onClick={handleResumePremium} disabled={resumingPremium} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#14532D', color: '#fff', fontSize: 13, fontWeight: 700, cursor: resumingPremium ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: resumingPremium ? 0.7 : 1 }}>
                        {resumingPremium ? <><Loader2 size={13} className="animate-spin" /> {tp('subResumingBtn')}</> : <><RefreshCw size={13} /> {tp('subResumeBtn')}</>}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setCancelPremiumModal(true)} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#B71C1C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {tp('premiumCancel')}
                      </button>
                    )
                  )}
                  <button type="button" onClick={handleOpenPortal} disabled={portalLoading} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#1e3a8a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: portalLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: portalLoading ? 0.6 : 1 }}>
                    {portalLoading ? <><Loader2 size={13} className="animate-spin" /> {tp('portalOpening')}</> : tp('managePayment')}
                  </button>
                </div>
              </div>
            </div>

            {/* Collective addon subs */}
            {collectiveSubs.length > 0 && (
              <>
                <SecLabel onCard>{tp('activeSubs')}</SecLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {collectiveSubs.map(c => {
                    const isScheduled = c.subscription_status === 'scheduled_cancel';
                    const periodEnd   = c.subscription_period_end ? formatDate(c.subscription_period_end) : null;
                    return (
                      <div key={c.collective_id} style={{ background: '#F9F8F5', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Building2 size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#5A5F68' }}>
                            {isScheduled
                              ? (periodEnd ? tp('subActiveUntil', { date: periodEnd }) : tp('subActiveUntilPeriod'))
                              : (periodEnd ? tp('subNextRenewal', { date: periodEnd }) : tp('subRenewsMonthly'))}
                          </div>
                        </div>
                        <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 11, fontWeight: 700, background: isScheduled ? '#FFF4E5' : '#E7F4EC', color: isScheduled ? '#6B3A00' : '#14532D', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {isScheduled ? tp('subCancels') : tp('subActive')}
                        </span>
                        {isScheduled ? (
                          <button type="button" onClick={() => setResumeCollectiveModal({ collectiveId: c.collective_id, name: c.name, creem_subscription_id: c.creem_subscription_id, periodEnd: c.subscription_period_end })} disabled={resumingCollectiveId === c.collective_id} style={{ height: 34, padding: '0 12px', border: 0, borderRadius: 17, background: '#14532D', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, opacity: resumingCollectiveId === c.collective_id ? 0.7 : 1 }}>
                            {resumingCollectiveId === c.collective_id ? tk('resumingLabel') : tk('resumeConfirmLabel')}
                          </button>
                        ) : (
                          <button type="button" onClick={() => setCancelCollectiveModal({ collective_id: c.collective_id, name: c.name, creem_subscription_id: c.creem_subscription_id })} style={{ height: 34, padding: '0 12px', border: 0, borderRadius: 17, background: '#B71C1C', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                            {tp('cancelSubscriptionBtn')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Payment history — collapsible */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '8px 0 4px', borderTop: '1px solid #EDEBE5', marginTop: 4 }}
              role="button"
              tabIndex={0}
              onClick={() => setHistoryOpen(o => !o)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setHistoryOpen(o => !o); }}
            >
              <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98' }}>{tp('historyTitle')}</span>
              <ChevronDown size={15} color="#8A8F98" aria-hidden="true" style={{ flexShrink: 0, transform: historyOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s ease' }} />
            </div>
            {historyOpen && (
              <div style={{ paddingTop: 10 }}>
                {subHistoryLoading
                  ? <span style={{ fontSize: 13, color: '#8A8F98' }}>{tp('subLoadingDetails')}</span>
                  : <HistoryList events={subHistory} tp={tp} />
                }
              </div>
            )}
          </section>
        )}

        {/* Section 2: General tiers */}
        <SectionHeader>{t('sectionTiers')}</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PLANS.filter(p => p.key !== 'collective').map(plan => {
            const isCurrent = (plan.key === 'basic' && !effectivePremium) || (plan.key === 'premium' && isPremium);
            return (
              <PlanCard
                key={plan.key}
                plan={plan}
                isCurrent={isCurrent}
                isLoading={loadingPlan === plan.key}
                onAction={() => !isCurrent && handleCheckout(plan)}
                lockedBanner={null}
                t={t}
              />
            );
          })}
        </div>

        {/* Section 3: Collective cards */}
        <SectionHeader>{tk('collectiveCardSectionTitle')}</SectionHeader>
        {!effectivePremium && (
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lock size={16} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{t('collectiveLockedBanner')}</span>
            <Link href="/elofizetes" onClick={() => handleCheckout(PLANS.find(p => p.key === 'premium'))} style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: '#fff', color: '#0E1116', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0, cursor: 'pointer' }}>
              <Zap size={13} /> {t('upgradeButton')}
            </Link>
          </div>
        )}
        {effectivePremium && (() => {
          const ownedCollectives = (appCollectives || []).filter(c => c.role === 'owner');
          if (ownedCollectives.length === 0) return (
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
              <Users size={32} color="rgba(255,255,255,0.3)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>{tk('emptyTitle')}</div>
            </div>
          );
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ownedCollectives.map(col => {
                const isInclusive   = col.is_inclusive ?? false;
                const colStatus     = col.status ?? 'active';
                const isNotAct      = colStatus === 'not_activated';
                const isFrozen      = colStatus === 'frozen';
                const tier          = TIER_DISPLAY?.[col.collective_tier] ?? null;
                const subData       = collectiveSubs.find(s => s.collective_id === col.collective_id);
                const isScheduled   = subData?.subscription_status === 'scheduled_cancel';
                const periodEnd     = subData?.subscription_period_end ? formatDate(subData.subscription_period_end) : null;
                const STATUS_BADGE  = { not_activated: { bg: '#FFF4CD', color: '#B45309', label: tk('statusNotActivated') }, frozen: { bg: '#FDECEC', color: '#B71C1C', label: tk('statusFrozen') }, active: { bg: '#E7F4EC', color: '#14532D', label: tk('statusActive') } };
                const badge         = STATUS_BADGE[colStatus] || STATUS_BADGE.active;
                return (
                  <div key={col.collective_id} className="dk-card" ref={searchParams?.get('activate') === col.collective_id ? activateCardRef : null} style={{ padding: '16px 20px', border: searchParams?.get('activate') === col.collective_id ? '2px solid #FFF4CD' : '2px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isInclusive ? <Star size={20} color="#B45309" /> : <Building2 size={20} color="#2563eb" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, color: '#0E1116' }}>{col.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          {isInclusive && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FFF7ED', color: '#B45309' }}>{tk('includedInPremium')}</span>}
                          {isScheduled && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FFF4E5', color: '#6B3A00' }}>{periodEnd ? tp('subActiveUntil', { date: periodEnd }) : tp('subActiveUntilPeriod')}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#5A5F68', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {tier && <span>{col.collective_tier?.toUpperCase()} — {tier.seats} {tk('seatsLabel')}</span>}
                          {!isInclusive && tier?.price && <span style={{ fontWeight: 700, color: '#0E1116' }}>{tier.price} + ÁFA{tk('perMonthVat')}</span>}
                        </div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {isNotAct && (
                          <button type="button" onClick={() => { setActivateModal({ id: col.collective_id, name: col.name }); setActivateTier(null); }} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#B45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Rocket size={13} /> {tk('activateBtn')}
                          </button>
                        )}
                        {isFrozen && !isInclusive && (
                          <button type="button" onClick={handleOpenPortal} disabled={portalLoading} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#B71C1C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {tk('resumeSubscription')}
                          </button>
                        )}
                        {!isNotAct && !isFrozen && !isInclusive && isScheduled && (
                          <button type="button" onClick={() => setResumeCollectiveModal({ collectiveId: col.collective_id, name: col.name, creem_subscription_id: subData?.creem_subscription_id, periodEnd: subData?.subscription_period_end })} disabled={resumingCollectiveId === col.collective_id} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#14532D', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: resumingCollectiveId === col.collective_id ? 0.7 : 1 }}>
                            {resumingCollectiveId === col.collective_id ? tk('resumingLabel') : tk('resumeConfirmLabel')}
                          </button>
                        )}
                        {!isNotAct && !isFrozen && !isInclusive && !isScheduled && (
                          <>
                            <button type="button" onClick={() => { setChangePlanModal({ id: col.collective_id, name: col.name, tier: col.collective_tier }); setChangePlanTier(col.collective_tier || 's'); setChangePlanError(''); }} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#1e3a8a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                              {tk('menuChangePlan')}
                            </button>
                            <button type="button" onClick={() => setCancelCollectiveModal({ collective_id: col.collective_id, name: col.name, creem_subscription_id: subData?.creem_subscription_id })} style={{ height: 38, padding: '0 16px', border: 0, borderRadius: 19, background: '#B71C1C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                              {tk('menuCancelSub')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Contact */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {t('contactQuestion')}{' '}
          <a href="mailto:info@okosszaki.hu" style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>info@okosszaki.hu</a>
        </p>

      </div>

      {/* ── Collective checkout iframe ──────────────────────────────────────── */}
      <Modal isOpen={!!collectiveCheckoutUrl} onClose={closeCollectiveCheckout} title={tk('activateTitle')} maxWidth="860px" maxHeight="92vh" persistent>
        <div style={{ margin: '0 -1.5rem -1.5rem', height: 'calc(88vh - 90px)', borderTop: '1px solid var(--border-subtle)', overflow: 'hidden', borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)' }}>
          <iframe src={collectiveCheckoutUrl || ''} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title={tk('activateTitle')} allow="payment" />
        </div>
      </Modal>

      {/* ── Activation modal (tier picker) ──────────────────────────────────── */}
      <Modal isOpen={!!activateModal} onClose={() => !activatingCollective && setActivateModal(null)} title={tk('activateTitle')}>
        {activateModal && (() => {
          const TIERS = [
            { code: 's', label: tk('tierS'), price: '4.500 Ft', seats: 3, total: '12.490 Ft' },
            { code: 'm', label: tk('tierM'), price: '9.000 Ft', seats: 6, total: '16.990 Ft' },
            { code: 'l', label: tk('tierL'), price: '13.500 Ft', seats: 9, total: '21.490 Ft' },
            { code: 'xl', label: tk('tierXl'), price: null, seats: null, total: null },
          ];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}><strong>{activateModal.name}</strong> — {tk('activateSubtitle')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TIERS.map(tier => {
                  const isXl = tier.code === 'xl';
                  const isSelected = activateTier === tier.code;
                  return (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => !isXl && setActivateTier(tier.code)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 16, border: `2px solid ${isSelected ? '#B45309' : '#EDEBE5'}`, background: isSelected ? '#FFF7ED' : '#fff', cursor: isXl ? 'default' : 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', marginBottom: 2 }}>{tier.label}</div>
                        {tier.price && (
                          <div style={{ fontSize: 13, color: '#5A5F68' }}>
                            {tier.price} + ÁFA{tk('perMonthVat')} · {tier.total} + ÁFA {tk('totalWithPremium')}
                          </div>
                        )}
                        {isXl && (
                          <a href="mailto:info@okosszaki.hu" style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{tk('xlContactLink')}</a>
                        )}
                      </div>
                      {isSelected && <Check size={18} color="#B45309" />}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="dk-btn dk-btn-l" onClick={() => setActivateModal(null)} disabled={activatingCollective} style={{ height: 44, fontSize: 15 }}>{tk('cancel')}</button>
                <button
                  type="button"
                  className="dk-btn dk-btn-dark"
                  disabled={!activateTier || activateTier === 'xl' || activatingCollective}
                  onClick={() => handleActivateCollective(activateModal.id, activateTier)}
                  style={{ height: 44, fontSize: 15, opacity: (!activateTier || activateTier === 'xl') ? 0.4 : 1 }}
                >
                  {activatingCollective ? <><Loader2 size={15} className="animate-spin" /> {tk('loadingCheckout')}</> : tk('proceedToPayment')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Change plan modal ───────────────────────────────────────────────── */}
      <Modal isOpen={!!changePlanModal} onClose={() => !changingPlan && setChangePlanModal(null)} title={tk('changePlanTitle')}>
        {changePlanModal && (() => {
          const TIERS = [
            { code: 's', label: tk('tierS'), price: '4.500 Ft', seats: 3 },
            { code: 'm', label: tk('tierM'), price: '9.000 Ft', seats: 6 },
            { code: 'l', label: tk('tierL'), price: '13.500 Ft', seats: 9 },
          ];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}><strong>{changePlanModal.name}</strong></p>
              {changePlanError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--danger-text)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{changePlanError}{' '}
                    <Link href="/kollektivak" style={{ color: 'var(--accent)', fontWeight: 700 }}>{tk('changePlanManageMembers')}</Link>
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TIERS.map(tier => {
                  const isSelected = changePlanTier === tier.code;
                  const isCurrent  = changePlanModal.tier === tier.code;
                  return (
                    <button
                      key={tier.code}
                      type="button"
                      onClick={() => { setChangePlanTier(tier.code); setChangePlanError(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 16, border: `2px solid ${isSelected ? '#2563eb' : '#EDEBE5'}`, background: isSelected ? '#EFF6FF' : '#fff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#0E1116', display: 'flex', gap: 8, alignItems: 'center' }}>
                          {tier.label}
                          {isCurrent && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#E7F4EC', color: '#14532D' }}>{t('currentPlan')}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#5A5F68' }}>{tier.price} + ÁFA{tk('perMonthVat')}</div>
                      </div>
                      {isSelected && <Check size={18} color="#2563eb" />}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="dk-btn dk-btn-l" onClick={() => setChangePlanModal(null)} disabled={changingPlan} style={{ height: 44, fontSize: 15 }}>{tk('cancel')}</button>
                <button
                  type="button"
                  className="dk-btn dk-btn-dark"
                  disabled={!changePlanTier || changePlanTier === changePlanModal.tier || changingPlan}
                  onClick={() => handleChangePlan(changePlanModal.id, changePlanTier)}
                  style={{ height: 44, fontSize: 15 }}
                >
                  {changingPlan ? <><Loader2 size={15} className="animate-spin" /> {tk('menuChecking')}</> : tk('upgradeConfirmLabel')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Checkout iframe modal ───────────────────────────────────────────── */}
      <Modal isOpen={!!checkoutIframeUrl} onClose={closeCheckoutIframe} title={t('securePayment')} maxWidth="860px" maxHeight="92vh" persistent>
        <div style={{ margin: '0 -1.5rem -1.5rem', height: 'calc(88vh - 90px)', borderTop: '1px solid var(--border-subtle)', overflow: 'hidden', borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)' }}>
          <iframe src={checkoutIframeUrl || ''} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title={t('securePayment')} allow="payment" />
        </div>
      </Modal>

      {/* ── Cancel premium modal ────────────────────────────────────────────── */}
      <Modal isOpen={cancelPremiumModal} onClose={() => !cancelingPremium && setCancelPremiumModal(false)} title={tp('premiumCancelTitle')}>
        {(() => {
          const ownedNames = (currentUser?.collectives || []).filter(c => c.role === 'owner').map(c => c.name);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ownedNames.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 12, padding: '12px 14px' }}>
                  <AlertTriangle size={18} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 14, color: 'var(--warning-text)', lineHeight: 1.5 }}>
                    <strong>{tp('premiumCancelOwnedWarning', { count: ownedNames.length })}</strong>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>{ownedNames.map(n => <li key={n}>{n}</li>)}</ul>
                    <div style={{ marginTop: 6 }}>{tp('premiumCancelFreezeNote')}</div>
                  </div>
                </div>
              )}
              {premiumRenewalAt && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#9A3412', display: 'block', marginBottom: 4 }}>
                    {tp('premiumCancelContentDate', { date: formatDate(premiumRenewalAt) })}
                  </span>
                  <span style={{ fontSize: 13, color: '#9A3412', lineHeight: 1.5 }}>{tp('premiumCanceledDataNote')}</span>
                </div>
              )}
              {!premiumRenewalAt && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {tp('premiumCancelContent')}
                </p>
              )}
              <p style={{ fontSize: 13, color: '#5A5F68', margin: 0 }}>{tp('premiumCanceledResumeHint')}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="dk-btn dk-btn-l" onClick={() => setCancelPremiumModal(false)} disabled={cancelingPremium} style={{ height: 44, fontSize: 15 }}>
                  {tp('keepSubscriptionBtn')}
                </button>
                <button type="button" onClick={handleCancelPremium} disabled={cancelingPremium} style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: 'var(--danger)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: cancelingPremium ? 0.7 : 1 }}>
                  {cancelingPremium ? <><Loader2 size={15} className="animate-spin" /> {tp('cancelingBtn')}</> : tp('cancelSubscriptionBtn')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Cancel collective modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!cancelCollectiveModal} onClose={() => !cancelingCollective && setCancelCollectiveModal(null)} title={tp('cancelCollectiveTitle')}>
        {cancelCollectiveModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px' }}>
              <AlertTriangle size={18} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 14, color: '#7C2D12', lineHeight: 1.55 }}>{tp('cancelCollectiveWarning')}</div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {tp('cancelCollectiveConfirmText', { name: cancelCollectiveModal.name })}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="dk-btn dk-btn-l" onClick={() => setCancelCollectiveModal(null)} disabled={cancelingCollective} style={{ height: 44, fontSize: 15 }}>
                {tp('keepSubscriptionBtn')}
              </button>
              <button type="button" onClick={handleCancelCollective} disabled={cancelingCollective} style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: 'var(--danger)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: cancelingCollective ? 0.7 : 1 }}>
                {cancelingCollective ? <><Loader2 size={15} className="animate-spin" /> {tp('cancelingBtn')}</> : tp('cancelSubscriptionBtn')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel success modal ────────────────────────────────────────────── */}
      <Modal isOpen={!!cancelSuccessModal} onClose={() => setCancelSuccessModal(null)} title={tp('cancelSuccessModalTitle')}>
        {cancelSuccessModal && (() => {
          const fmt = iso => iso ? new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
          const premiumDate = fmt(cancelSuccessModal.premiumPeriodEnd);
          const cols = cancelSuccessModal.canceledCollectives || [];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: '#E7F4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={24} color="#14532D" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, color: '#0E1116', marginBottom: 4 }}>{tp('premiumCanceledTitle')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {premiumDate ? tp('premiumActiveUntilDate', { date: premiumDate }) : tp('premiumActiveUntilPeriod')}
                  </div>
                </div>
              </div>
              {cols.length > 0 && (
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{tp('canceledCollectivesTitle')}</div>
                  {cols.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: i < cols.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmt(c.period_end) ? tp('activeUntilDateLabel', { date: fmt(c.period_end) }) : tp('activeUntilPeriodLabel')}</span>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{tp('canRestoreAnytime')}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="dk-btn dk-btn-dark" onClick={() => setCancelSuccessModal(null)} style={{ height: 44, fontSize: 15 }}>{tp('ok')}</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Resume collective confirmation modal ───────────────────────────── */}
      <Modal isOpen={!!resumeCollectiveModal} onClose={() => !resumingCollectiveId && setResumeCollectiveModal(null)} title={tk('resumeMenuTitle')}>
        {resumeCollectiveModal && (() => {
          const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
          const endDate  = fmtDate(resumeCollectiveModal.periodEnd);
          const isResuming = resumingCollectiveId === resumeCollectiveModal.collectiveId;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                <strong>{resumeCollectiveModal.name}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F9F8F5', borderRadius: 14, padding: '14px 16px' }}>
                {endDate && (
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {tk('resumeModalCurrentEnd', { date: endDate })}
                  </div>
                )}
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {endDate
                    ? tk('resumeModalNextPayment', { date: endDate })
                    : tk('resumeMenuConfirmMsg', { name: resumeCollectiveModal.name })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="dk-btn dk-btn-l" onClick={() => setResumeCollectiveModal(null)} disabled={isResuming} style={{ height: 44, fontSize: 15 }}>
                  {tk('cancel')}
                </button>
                <button type="button" className="dk-btn dk-btn-dark" onClick={handleResumeCollective} disabled={isResuming} style={{ height: 44, fontSize: 15, opacity: isResuming ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isResuming ? <><Loader2 size={15} className="animate-spin" /> {tk('resumingLabel')}</> : tk('resumeConfirmLabel')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        variant={alertModal?.variant ?? 'success'}
        title={alertModal?.title}
        message={alertModal?.message}
      />
    </div>
  );
}
