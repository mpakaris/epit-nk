'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { Check, Zap, Star, Building2, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { formatDate } from '@/lib/constants';
import { MenuSheet } from '@/components/mobile/pods/Sheets';

const HEADER  = '#B45309';
const DEEP    = '#120A00';
const CARD_SH = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

const ChevL = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
const CheckSvg = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>;
const SpinSvg  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'epspin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-18 0"/></svg>;

function Sheet({ open, onClose, title, children, z = 40 }) {
  if (!open) return null;
  return (
    <>
      <button onClick={onClose} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: z, border: 0, padding: 0, background: 'rgba(14,17,22,.5)', cursor: 'pointer' }} />
      <div style={{ position: 'fixed', zIndex: z + 10, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px 32px', borderRadius: '32px 32px 0 0', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}>
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

function SecLabel({ children }) {
  return <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98', paddingTop: 4 }}>{children}</span>;
}

// ── Plan card (upgrade options) ──────────────────────────────────────────────
function PlanCard({ plan, isCurrent, isOpen, onToggle, isLoading, onAction, lockedBanner, t }) {
  const Icon = plan.icon;
  const colorAlpha = plan.color.startsWith('#') ? `${plan.color}22` : 'rgba(37,99,235,0.1)';
  const resolvedColor = plan.color.startsWith('var(') ? '#2563eb' : plan.color;

  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: CARD_SH, overflow: 'hidden', border: `2px solid ${isCurrent ? resolvedColor : 'transparent'}`, transition: 'border-color 0.2s' }}>
      <div style={{ height: 5, background: resolvedColor }} />
      <button type="button" onClick={onToggle} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: colorAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={resolvedColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0E1116' }}>{plan.name}</span>
            {isCurrent && <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 999, background: resolvedColor, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('currentPlan')}</span>}
          </div>
          <div style={{ fontSize: 13, color: '#5A5F68', marginTop: 1 }}>
            <span style={{ fontWeight: 800, color: '#0E1116' }}>{plan.price}</span>
            <span style={{ marginLeft: 4 }}>{plan.priceNote}</span>
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isOpen ? resolvedColor : '#8A8F98'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.22s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 18px' }}>
          {plan.note && <p style={{ fontSize: 12, color: '#5A5F68', margin: '0 0 12px' }}>{plan.note}</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.features.map(f => {
              const text = typeof f === 'string' ? f : f.text;
              const hi   = typeof f === 'object' && f.highlight;
              return (
                <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, ...(hi ? { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '6px 10px', color: '#15803d', fontWeight: 600 } : { color: '#3A3F47' }) }}>
                  <Check size={14} color={hi ? '#16a34a' : '#14532D'} style={{ flexShrink: 0, marginTop: 2 }} />{text}
                </li>
              );
            })}
          </ul>
          {lockedBanner && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: plan.cta ? 10 : 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', lineHeight: 1.45 }}>{lockedBanner}</span>
            </div>
          )}
          {plan.cta && !lockedBanner && (
            <button type="button" disabled={isCurrent || isLoading} onClick={onAction} style={{ width: '100%', height: 52, border: 0, borderRadius: 26, fontWeight: 700, fontSize: 15, cursor: isCurrent || isLoading ? 'default' : 'pointer', background: isCurrent ? '#F1F1F3' : resolvedColor, color: isCurrent ? '#8A8F98' : '#fff', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
              {isCurrent ? t('currentPlan') : isLoading ? t('redirecting') : plan.cta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ElofizetesPageMobile() {
  const { currentUser, refreshSupabaseData, refreshCurrentUser, logout, isDemoMode } = useApp();
  const router = useRouter();
  const t  = useTranslations('subscription');
  const tp = useTranslations('profile');
  const tc = useTranslations('common');

  // ── Checkout state ────────────────────────────────────────────────────────
  const [loadingPlan,       setLoadingPlan]       = useState(null);
  const [checkoutError,     setCheckoutError]     = useState('');
  const [activationBanner,  setActivationBanner]  = useState(null);
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);
  const [openPlan,          setOpenPlan]          = useState('my_subscription'); // My Subscription open by default
  const checkoutPollRef = useRef(null);
  const webhookPollRef  = useRef(null);

  // ── Subscription management state (single source of truth) ───────────────
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
  const [subSheet,                 setSubSheet]                 = useState(null);
  const [subOkData,                setSubOkData]                = useState(null);
  const [subBusy,                  setSubBusy]                  = useState(false);
  const [subAlertMsg,              setSubAlertMsg]              = useState('');
  const [subReloadKey,             setSubReloadKey]             = useState(0);

  const PLANS = [
    { key: 'basic', name: t('basic'), price: t('free'), priceNote: t('forever'), icon: Zap, color: '#6B7280', features: [t('basicFeature1'), t('basicFeature2'), t('basicFeature3'), t('basicFeature4'), t('basicFeature5')] },
    { key: 'premium', name: t('premium'), price: t('premiumPrice'), priceNote: t('perMonthVat'), icon: Star, color: HEADER, highlight: true, productId: process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID, features: [t('premiumFeature1'), t('premiumFeature2'), { text: t('premiumFeature3'), highlight: true }, t('premiumFeature4'), t('premiumFeature5'), t('premiumFeature6')], cta: t('upgradeButton') },
    { key: 'collective', name: t('collective'), price: t('collectivePriceLabel'), priceNote: t('perPackage'), icon: Building2, color: 'var(--accent)', features: [t('collectiveFeature1'), t('collectiveFeature2'), t('collectiveFeature3'), t('collectiveFeature4'), t('collectiveFeature5')], note: t('collectiveNote'), cta: t('startCollective'), href: '/kollektivak' },
  ];

  // ── Load subscription data on mount ──────────────────────────────────────
  useEffect(() => {
    if (!currentUser || isDemoMode) return;

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

    setSubHistoryLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetch('/api/subscriptions/history')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setSubHistory(d.events ?? []))
      .catch(() => setSubHistory([]))
      .finally(() => setSubHistoryLoading(false));
  }, [currentUser?.id, subReloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Creem checkout redirect handler ──────────────────────────────────────
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const isPremium      = currentUser?.is_subscription_premium ?? false;
  const isOnTrial      = !isPremium && currentUser?.subscription_tier === 'trial' && currentUser?.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const daysLeft       = isOnTrial ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000)) : 0;
  const subBadge       = premiumIsScheduledCancel
    ? { label: tp('subCancels'), bg: '#FFF4E5', fg: '#6B3A00' }
    : { label: tp('subActive'),  bg: '#E7F4EC', fg: '#14532D' };
  const subNote = premiumIsScheduledCancel
    ? (premiumCancelAt ? tp('subActiveUntil', { date: formatDate(premiumCancelAt) }) : tp('subActiveUntilPeriod'))
    : (premiumRenewalAt ? tp('subNextRenewal', { date: formatDate(premiumRenewalAt) }) : tp('subRenewsMonthly'));

  // ── Subscription handlers ─────────────────────────────────────────────────
  const handleCancelPremium = async () => {
    if (!premiumSubId) { setSubAlertMsg(tp('subscriptionIdMissing')); return; }
    setSubBusy(true);
    try {
      const res  = await fetch('/api/subscriptions/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      const data = await res.json();
      if (res.ok) {
        const endDate = data.subscription_period_end ?? null;
        setPremiumIsScheduledCancel(true); setPremiumCancelAt(endDate); setPremiumRenewalAt(null);
        setSubSheet(null);
        setSubOkData({ title: tp('premiumCanceledTitle'), text: endDate ? tp('premiumActiveUntilDate', { date: formatDate(endDate) }) : tp('premiumActiveUntilPeriod'), notes: [tp('premiumCanceledDataNote'), tp('premiumCanceledResumeHint')] });
        setSubSheet('ok');
      } else { setSubAlertMsg(data.error || tp('cancelErrorMsg')); }
    } catch { setSubAlertMsg(tp('cancelErrorMsg')); }
    finally { setSubBusy(false); }
  };

  const handleResumePremium = async () => {
    if (!premiumSubId) { setSubAlertMsg(tp('subscriptionIdMissing')); return; }
    setSubBusy(true);
    try {
      const res = await fetch('/api/subscriptions/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: premiumSubId }) });
      if (res.ok) {
        setPremiumIsScheduledCancel(false); setPremiumCancelAt(null);
        setSubSheet(null);
        setSubOkData({ title: tp('resumeSuccessTitle'), text: tp('resumeSuccessText') });
        setSubSheet('ok');
        await refreshCurrentUser();
      } else { const d = await res.json(); setSubAlertMsg(d.error || tp('resumeErrorMsg')); }
    } catch { setSubAlertMsg(tp('resumeErrorMsg')); }
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
      } else { setSubAlertMsg(data.error || tp('cancelErrorMsg')); }
    } catch { setSubAlertMsg(tp('cancelErrorMsg')); }
    finally { setSubBusy(false); }
  };

  // ── Checkout handlers ─────────────────────────────────────────────────────
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
          await refreshCurrentUser(); refreshSupabaseData?.();
          setActivationBanner('success');
          setSubReloadKey(k => k + 1);
        } else {
          try {
            const r = await fetch('/api/checkout/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: payload.subscriptionId, customerId: payload.customerId }) });
            setActivationBanner(r.ok ? 'success' : 'error');
            if (r.ok) { await refreshCurrentUser(); refreshSupabaseData?.(); setSubReloadKey(k => k + 1); }
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
            .then(async r => { setActivationBanner(r.ok ? 'success' : 'error'); if (r.ok) { await refreshCurrentUser(); refreshSupabaseData?.(); setSubReloadKey(k => k + 1); } })
            .catch(() => setActivationBanner('error'));
          setLoadingPlan(null); return;
        }
      } catch {}
    }
    setCheckoutIframeUrl(null); localStorage.removeItem('creem_checkout_done'); setLoadingPlan(null);
    await refreshCurrentUser();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: DEEP, minHeight: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      <style>{`@keyframes epspin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', overflow: 'hidden', background: HEADER, borderRadius: '0 0 32px 32px', boxSizing: 'border-box', padding: `max(18px, env(safe-area-inset-top)) 16px 24px`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => router.back()} aria-label="Vissza" style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevL />
          </button>
          <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isOnTrial ? <><Clock size={12} color="#fff" /> {t('trialActive')} · {daysLeft}n</> : isPremium ? <><Star size={12} color="#FDE047" fill="#FDE047" /> {t('premium')}</> : <><Zap size={12} color="rgba(255,255,255,0.8)" /> {t('basic')}</>}
          </span>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Műveletek" style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
          </button>
        </div>
        <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>{t('pageTitle')}</span>
        <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{t('subtitle')}</h1>
        {isOnTrial && <span style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>{t('trialDaysLeftBanner', { days: daysLeft })}</span>}
      </header>

      {/* ── Menu sheet ─────────────────────────────────────────────────────── */}
      {menuOpen && (
        <>
          <button onClick={() => setMenuOpen(false)} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,.55)', cursor: 'pointer' }} />
          <MenuSheet profile={currentUser} subscriptionLabel={isPremium ? t('premium') : isOnTrial ? t('trialActive') : t('basic')} onLogout={logout} onClose={() => setMenuOpen(false)} />
        </>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Activation banners */}
        {activationBanner === 'success' && (
          <div style={{ background: 'var(--m-ok-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--m-ok)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-ok)' }}>{t('activateSuccess')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-ok)', display: 'flex' }}><X size={16} /></button>
          </div>
        )}
        {activationBanner === 'error' && (
          <div style={{ background: 'var(--m-danger-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="var(--m-danger)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-danger)' }}>{t('activateError')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-danger)', display: 'flex' }}><X size={16} /></button>
          </div>
        )}
        {checkoutError && (
          <div style={{ background: 'var(--m-danger-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={16} color="var(--m-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14, color: 'var(--m-danger)' }}>{checkoutError}</span>
          </div>
        )}

        {/* ── Pod 0: My Subscription ─────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: CARD_SH, overflow: 'hidden', border: `2px solid ${isPremium ? HEADER : '#6B7280'}`, transition: 'border-color 0.2s' }}>
          <div style={{ height: 5, background: isPremium ? HEADER : '#6B7280' }} />
          <button type="button" onClick={() => setOpenPlan(prev => prev === 'my_subscription' ? null : 'my_subscription')} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: isPremium ? `${HEADER}22` : '#6B728022', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPremium ? <Star size={19} color={HEADER} /> : <Zap size={19} color="#6B7280" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0E1116' }}>{t('mySubscriptionTitle')}</div>
              <div style={{ fontSize: 13, color: '#5A5F68', marginTop: 1 }}>
                {isPremium ? (premiumIsScheduledCancel ? tp('scheduledCancelNoDate') : (premiumRenewalAt ? tp('subNextRenewal', { date: formatDate(premiumRenewalAt) }) : tp('subRenewsMonthly'))) : (isOnTrial ? t('trialActive') : t('planFree'))}
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={openPlan === 'my_subscription' ? HEADER : '#8A8F98'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: 'transform 0.22s', transform: openPlan === 'my_subscription' ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {openPlan === 'my_subscription' && (
            <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Trial banner */}
              {isOnTrial && (
                <div style={{ padding: 12, borderRadius: 14, background: '#FFF4E5', color: '#6B3A00', fontSize: 14, fontWeight: 700 }}>
                  {tp('trialBannerText', { days: daysLeft })}
                </div>
              )}

              {/* Plan info card */}
              {isPremium && (
                <div style={{ background: '#F9F8F5', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 15, color: '#0E1116' }}>{t('premium')}</b>
                    <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 11, fontWeight: 700, background: subBadge.bg, color: subBadge.fg, display: 'inline-flex', alignItems: 'center' }}>{subBadge.label}</span>
                  </div>
                  {subDetailLoading && <span style={{ fontSize: 12, color: '#8A8F98' }}>{tp('subLoadingDetails')}</span>}
                  {premiumSubStarted && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#5A5F68' }}>{tp('subStartedLabel')}</span><span style={{ fontWeight: 700 }}>{formatDate(premiumSubStarted)}</span></div>}
                  {premiumRenewalAt && !premiumIsScheduledCancel && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#5A5F68' }}>{tp('subNextRenewalLabel')}</span><span style={{ fontWeight: 700 }}>{formatDate(premiumRenewalAt)}</span></div>}
                  {premiumIsScheduledCancel && premiumCancelAt && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#5A5F68' }}>{tp('subActiveUntilLabel')}</span><span style={{ fontWeight: 700, color: '#B71C1C' }}>{formatDate(premiumCancelAt)}</span></div>}
                  {premiumBillingCycles != null && premiumBillingCycles > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#5A5F68' }}>{tp('subBillingCyclesLabel')}</span><span style={{ fontWeight: 700 }}>{premiumBillingCycles}×</span></div>}
                </div>
              )}

              {/* Cancel / Resume button */}
              {isPremium && premiumSubId && (
                <button onClick={() => premiumIsScheduledCancel ? handleResumePremium() : setSubSheet('cancelPrem')} disabled={subBusy} style={{ width: '100%', height: 48, border: 0, borderRadius: 24, fontSize: 14, fontWeight: 700, cursor: subBusy ? 'default' : 'pointer', background: premiumIsScheduledCancel ? '#14532D' : '#FDECEC', color: premiumIsScheduledCancel ? '#fff' : '#B71C1C', opacity: subBusy ? 0.7 : 1 }}>
                  {subBusy ? (premiumIsScheduledCancel ? tp('subResumingBtn') : tp('cancelingBtn')) : (premiumIsScheduledCancel ? tp('subResumeBtn') : tp('premiumCancel'))}
                </button>
              )}

              {/* Collective subs */}
              {collectiveSubs.length > 0 && (
                <>
                  <SecLabel>{tp('activeSubs')}</SecLabel>
                  {collectiveSubs.map(c => (
                    <div key={c.collective_id} style={{ background: '#F9F8F5', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#5A5F68' }}>{c.members_count <= 3 ? tp('collectiveSmall') : c.members_count <= 7 ? tp('collectiveMedium') : tp('collectiveLarge')}</div>
                      </div>
                      {c.subscription_status !== 'scheduled_cancel' && (
                        <button onClick={() => setSubSheet({ type: 'cancelCol', collective: c })} style={{ height: 36, padding: '0 12px', border: 0, borderRadius: 18, background: '#FDECEC', color: '#B71C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {tp('cancelSubscriptionBtn')}
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* History */}
              <SecLabel>{tp('historyTitle')}</SecLabel>
              {subHistoryLoading && <span style={{ fontSize: 12, color: '#8A8F98' }}>{tp('subLoadingDetails')}</span>}
              {!subHistoryLoading && subHistory?.length === 0 && <span style={{ fontSize: 12, color: '#8A8F98' }}>{tp('historyEmpty')}</span>}
              {!subHistoryLoading && subHistory?.length > 0 && (
                <div className="scroll-y-hidden" style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280 }}>
                  {subHistory.slice(0, 10).map((ev, i) => {
                    const isLast = i === Math.min(subHistory.length, 10) - 1;
                    const isPayment = ev.source === 'creem';
                    const { icon, label, color } = (() => {
                      if (isPayment) return { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>, label: tp('historyPayment'), color: '#14532D' };
                      if (ev.type === 'activated') return { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>, label: tp('historyActivated'), color: '#14532D' };
                      if (ev.type === 'cancelled') return { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>, label: tp('historyCancelled'), color: '#B45309' };
                      if (ev.type === 'resumed') return { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 1 0 21 12"/></svg>, label: tp('historyResumed'), color: '#1D4ED8' };
                      return { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>, label: ev.action?.includes('admin') ? tp('historyAdminChange') : tp('historyDeactivated'), color: '#5A5F68' };
                    })();
                    const amountStr = isPayment && ev.amount ? ` · ${(ev.amount / 100).toLocaleString('hu-HU')} ${ev.currency}` : '';
                    return (
                      <div key={ev.id ?? i} style={{ display: 'flex', gap: 10, paddingBottom: isLast ? 0 : 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 26 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 13, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                          {!isLast && <div style={{ width: 1.5, flex: 1, background: '#E8E5DF', marginTop: 3 }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{label}{amountStr}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8F98', marginTop: 1 }}>{ev.date ? new Date(ev.date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Plan cards (upgrade options) ───────────────────────────────── */}
        {PLANS.map(plan => {
          const isCurrent    = (plan.key === 'basic' && !effectivePremium) || (plan.key === 'premium' && isPremium);
          const lockedBanner = plan.key === 'collective' && !effectivePremium ? t('collectiveLockedBanner') : null;
          return (
            <PlanCard key={plan.key} plan={plan} isCurrent={isCurrent} isOpen={openPlan === plan.key} onToggle={() => setOpenPlan(prev => prev === plan.key ? null : plan.key)} isLoading={loadingPlan === plan.key} onAction={() => !isCurrent && handleCheckout(plan)} lockedBanner={lockedBanner} t={t} />
          );
        })}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
          {t('contactQuestion')}{' '}
          <a href="mailto:info@okosszaki.hu" style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>info@okosszaki.hu</a>
        </p>
      </div>

      {/* ── Checkout iframe ─────────────────────────────────────────────────── */}
      {checkoutIframeUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={closeCheckoutIframe} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '92vh', borderRadius: '16px 16px 0 0', overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem 0.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>{t('securePayment')}</span>
              <button type="button" onClick={closeCheckoutIframe} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <iframe src={checkoutIframeUrl} style={{ flex: 1, border: 'none', width: '100%' }} title={t('securePayment')} allow="payment" />
          </div>
        </div>
      )}

      {/* ── Subscription sub-sheets ─────────────────────────────────────────── */}
      <Sheet open={subSheet === 'cancelPrem'} onClose={() => setSubSheet(null)} title={tp('premiumCancelTitle')} z={60}>
        {premiumRenewalAt ? (
          <div style={{ padding: '12px 14px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#9A3412', display: 'block', marginBottom: 6 }}>{tp('premiumCancelContentDate', { date: formatDate(premiumRenewalAt) })}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#9A3412', lineHeight: 1.5 }}>{tp('premiumCanceledDataNote')}</span>
          </div>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{tp('premiumCancelContent')}</span>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>{tp('premiumCanceledResumeHint')}</span>
        <button onClick={handleCancelPremium} disabled={subBusy} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {subBusy ? <><SpinSvg />{tp('cancelingBtn')}</> : tp('cancelSubscriptionBtn')}
        </button>
        <button onClick={() => setSubSheet(null)} style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{tp('keepSubscriptionBtn')}</button>
      </Sheet>

      <Sheet open={subSheet?.type === 'cancelCol'} onClose={() => setSubSheet(null)} title={tp('cancelCollectiveTitle')} z={60}>
        {subSheet?.type === 'cancelCol' && (
          <>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{tp('cancelCollectiveConfirmText', { name: subSheet.collective.name })}</span>
            <button onClick={() => handleCancelCollective(subSheet.collective)} disabled={subBusy} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {subBusy ? tp('cancelingBtn') : tp('cancelSubscriptionBtn')}
            </button>
            <button onClick={() => setSubSheet(null)} style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{tp('keepSubscriptionBtn')}</button>
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
            <button onClick={() => setSubSheet(null)} style={{ height: 60, border: 0, borderRadius: 30, background: HEADER, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tp('ok')}</button>
          </>
        )}
      </Sheet>

      <Sheet open={!!subAlertMsg} onClose={() => setSubAlertMsg('')} title={tc('error')} z={80}>
        {subAlertMsg && (
          <>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45, color: '#0E1116' }}>{subAlertMsg}</span>
            <button onClick={() => setSubAlertMsg('')} style={{ height: 60, border: 0, borderRadius: 30, background: HEADER, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tc('ok')}</button>
          </>
        )}
      </Sheet>
    </div>
  );
}
