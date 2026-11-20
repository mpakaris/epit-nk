'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { Check, Zap, Star, Building2, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { MenuSheet } from '@/components/mobile/pods/Sheets';

const HEADER  = '#B45309';
const DEEP    = '#120A00';
const CARD_SH = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';

const ChevL = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

function PlanCard({ plan, isCurrent, isOpen, onToggle, isLoading, onAction, lockedBanner, t }) {
  const Icon = plan.icon;
  const colorAlpha = plan.color.startsWith('#') ? `${plan.color}22` : 'rgba(37,99,235,0.1)';
  const resolvedColor = plan.color.startsWith('var(') ? '#2563eb' : plan.color;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 26,
      boxShadow: CARD_SH,
      overflow: 'hidden',
      border: `2px solid ${isCurrent ? resolvedColor : 'transparent'}`,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ height: 5, background: resolvedColor }} />

      {/* ── Tap header — always visible ── */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', border: 0, background: 'transparent', cursor: 'pointer',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
          background: colorAlpha,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={19} color={resolvedColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#0E1116' }}>{plan.name}</span>
            {isCurrent && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 999,
                background: resolvedColor, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {t('currentPlan')}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#5A5F68', marginTop: 1 }}>
            <span style={{ fontWeight: 800, color: '#0E1116' }}>{plan.price}</span>
            <span style={{ marginLeft: 4 }}>{plan.priceNote}</span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={isOpen ? resolvedColor : '#8A8F98'} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform 0.22s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div style={{ padding: '0 16px 18px' }}>
          {plan.note && (
            <p style={{ fontSize: 12, color: '#5A5F68', margin: '0 0 12px' }}>{plan.note}</p>
          )}

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.features.map(f => {
              const text = typeof f === 'string' ? f : f.text;
              const hi   = typeof f === 'object' && f.highlight;
              return (
                <li key={text} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14,
                  ...(hi ? {
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 10, padding: '6px 10px', color: '#15803d', fontWeight: 600,
                  } : { color: '#3A3F47' }),
                }}>
                  <Check size={14} color={hi ? '#16a34a' : '#14532D'} style={{ flexShrink: 0, marginTop: 2 }} />
                  {text}
                </li>
              );
            })}
          </ul>

          {lockedBanner && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 14,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              marginBottom: plan.cta ? 10 : 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', lineHeight: 1.45 }}>{lockedBanner}</span>
            </div>
          )}
          {plan.cta && !lockedBanner && (
            <button
              type="button"
              disabled={isCurrent || isLoading}
              onClick={onAction}
              style={{
                width: '100%', height: 52, border: 0, borderRadius: 26,
                fontWeight: 700, fontSize: 15,
                cursor: isCurrent || isLoading ? 'default' : 'pointer',
                background: isCurrent ? '#F1F1F3' : resolvedColor,
                color: isCurrent ? '#8A8F98' : '#fff',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isCurrent ? t('currentPlan') : isLoading ? t('redirecting') : plan.cta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ElofizetesPageMobile() {
  const { currentUser, refreshSupabaseData, refreshCurrentUser, logout } = useApp();
  const router = useRouter();
  const t = useTranslations('subscription');

  const [loadingPlan,       setLoadingPlan]       = useState(null);
  const [checkoutError,     setCheckoutError]     = useState('');
  const [activationBanner,  setActivationBanner]  = useState(null);
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [checkoutIframeUrl, setCheckoutIframeUrl] = useState(null);
  const [openPlan,          setOpenPlan]          = useState(null);
  const checkoutPollRef    = useRef(null); // polls localStorage (checkout-popup-success path)
  const webhookPollRef     = useRef(null); // polls profile API (webhook path)

  const PLANS = [
    {
      key: 'basic',
      name: t('basic'),
      price: t('free'),
      priceNote: t('forever'),
      icon: Zap,
      color: '#6B7280',
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
      color: HEADER,
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('creem_elofizetes_result');
    if (stored) {
      try { setActivationBanner(JSON.parse(stored).status); } catch {}
      sessionStorage.removeItem('creem_elofizetes_result');
      refreshCurrentUser?.().then(() => refreshSupabaseData?.());
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

  const isPremium       = currentUser?.is_subscription_premium ?? false;
  const isOnTrial       = !isPremium && currentUser?.subscription_tier === 'trial' && currentUser?.trial_ends_at && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const daysLeft        = isOnTrial ? Math.max(0, Math.ceil((new Date(currentUser.trial_ends_at) - new Date()) / 86400000)) : 0;

  // Open the active plan by default once user data is available
  useEffect(() => {
    if (!currentUser || openPlan !== null) return;
    setOpenPlan(isPremium ? 'premium' : 'basic');
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCheckout(plan) {
    if (!plan.productId) {
      if (plan.href) router.push(plan.href);
      return;
    }
    setLoadingPlan(plan.key);
    setCheckoutError('');
    try {
      const res  = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: plan.productId, successUrl: '/checkout-popup-success?checkout_type=elofizetes_premium' }),
      });
      const data = await res.json();
      if (!data.checkoutUrl) {
        setCheckoutError(data.error || t('checkoutError'));
        setLoadingPlan(null);
        return;
      }

      const activate = async (payload) => {
        clearInterval(checkoutPollRef.current);
        checkoutPollRef.current = null;
        clearInterval(webhookPollRef.current);
        webhookPollRef.current = null;
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('message', onMessage);
        setCheckoutIframeUrl(null);
        localStorage.removeItem('creem_checkout_done');
        if (payload._fromWebhook) {
          // Webhook already updated the DB — just sync React state
          await refreshCurrentUser();
          refreshSupabaseData?.();
          setActivationBanner('success');
        } else {
          try {
            const r = await fetch('/api/checkout/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionId: payload.subscriptionId, customerId: payload.customerId }),
            });
            setActivationBanner(r.ok ? 'success' : 'error');
            if (r.ok) {
              await refreshCurrentUser();
              refreshSupabaseData?.();
            }
          } catch {
            setActivationBanner('error');
          }
        }
        setLoadingPlan(null);
      };

      const onStorage = (e) => {
        if (e.key !== 'creem_checkout_done') return;
        let d; try { d = JSON.parse(e.newValue); } catch { return; }
        if (d?.checkoutType !== 'elofizetes_premium') return;
        activate(d);
      };
      const onMessage = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type !== 'creem_checkout_success') return;
        if (e.data?.checkoutType !== 'elofizetes_premium') return;
        activate(e.data);
      };

      checkoutPollRef.current = setInterval(() => {
        const stored = localStorage.getItem('creem_checkout_done');
        if (!stored) return;
        let d; try { d = JSON.parse(stored); } catch { return; }
        if (d?.checkoutType !== 'elofizetes_premium') return;
        activate(d);
      }, 400);

      window.addEventListener('storage', onStorage);
      window.addEventListener('message', onMessage);
      setCheckoutIframeUrl(data.checkoutUrl);

      // Secondary: poll the profile every 3 s to detect webhook-delivered activation.
      // This fires even when checkout-popup-success never loads (Creem blocks top-frame nav).
      webhookPollRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/auth/profile?real=1', { cache: 'no-store' });
          if (!r.ok) return;
          const { profile } = await r.json();
          if (profile?.is_subscription_premium) {
            activate({ subscriptionId: null, customerId: null, _fromWebhook: true });
          }
        } catch {}
      }, 3000);
    } catch {
      setCheckoutError(t('checkoutError'));
      setLoadingPlan(null);
    }
  }

  async function closeCheckoutIframe() {
    clearInterval(checkoutPollRef.current);
    checkoutPollRef.current = null;
    clearInterval(webhookPollRef.current);
    webhookPollRef.current = null;

    // Case 1: checkout-popup-success wrote to localStorage (iframe navigated our success page)
    const stored = localStorage.getItem('creem_checkout_done');
    if (stored) {
      try {
        const d = JSON.parse(stored);
        if (d?.checkoutType === 'elofizetes_premium' && d?.subscriptionId) {
          setCheckoutIframeUrl(null);
          localStorage.removeItem('creem_checkout_done');
          fetch('/api/checkout/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: d.subscriptionId, customerId: d.customerId }),
          }).then(async r => {
            setActivationBanner(r.ok ? 'success' : 'error');
            if (r.ok) { await refreshCurrentUser(); refreshSupabaseData?.(); }
          }).catch(() => setActivationBanner('error'));
          setLoadingPlan(null);
          return;
        }
      } catch {}
    }

    // Case 2: webhook already updated the DB (e.g. on production) — re-fetch profile
    // If the user is now premium, reflect it immediately without requiring them to reload
    setCheckoutIframeUrl(null);
    localStorage.removeItem('creem_checkout_done');
    setLoadingPlan(null);
    const wasAlreadyPremium = currentUser?.is_subscription_premium;
    await refreshCurrentUser();
    // refreshCurrentUser updates the state; if they're now premium show success banner
    if (!wasAlreadyPremium) {
      // let the useEffect on isPremium flip handle UI — no extra banner needed
    }
  }

  return (
    <div style={{ background: DEEP, minHeight: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'relative', overflow: 'hidden',
        background: HEADER,
        borderRadius: '0 0 32px 32px',
        boxSizing: 'border-box',
        padding: `max(18px, env(safe-area-inset-top)) 16px 24px`,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Decorative circle */}
        <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

        {/* Top row: back | plan pill | spacer */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Vissza"
            style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevL />
          </button>

          <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isOnTrial
              ? <><Clock size={12} color="#fff" /> {t('trialActive')} · {daysLeft}n</>
              : isPremium
                ? <><Star size={12} color="#FDE047" fill="#FDE047" /> {t('premium')}</>
                : <><Zap size={12} color="rgba(255,255,255,0.8)" /> {t('basic')}</>
            }
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Műveletek"
            style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h.01M12 12h.01M19 12h.01" />
            </svg>
          </button>
        </div>

        {/* Kicker */}
        <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
          {t('pageTitle')}
        </span>

        {/* Title */}
        <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {t('subtitle')}
        </h1>

        {/* Meta — trial countdown */}
        {isOnTrial && (
          <span style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
            {t('trialDaysLeftBanner', { days: daysLeft })}
          </span>
        )}
      </header>

      {/* ── Menu sheet (same as dashboard hamburger) ── */}
      {menuOpen && (
        <>
          <button onClick={() => setMenuOpen(false)} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,.55)', cursor: 'pointer' }} />
          <MenuSheet
            profile={currentUser}
            subscriptionLabel={isPremium ? t('premium') : isOnTrial ? t('trialActive') : t('basic')}
            onLogout={logout}
            onClose={() => setMenuOpen(false)}
          />
        </>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Activation banner */}
        {activationBanner === 'success' && (
          <div style={{ background: 'var(--m-ok-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="var(--m-ok)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-ok)' }}>{t('activateSuccess')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-ok)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        )}
        {activationBanner === 'error' && (
          <div style={{ background: 'var(--m-danger-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="var(--m-danger)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--m-danger)' }}>{t('activateError')}</span>
            <button type="button" onClick={() => setActivationBanner(null)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-danger)', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        )}
        {checkoutError && (
          <div style={{ background: 'var(--m-danger-bg)', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={16} color="var(--m-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 14, color: 'var(--m-danger)' }}>{checkoutError}</span>
          </div>
        )}

        {/* Plan cards — accordion: tap header to expand/collapse */}
        {PLANS.map(plan => {
          const isCurrent    = (plan.key === 'basic' && !effectivePremium) || (plan.key === 'premium' && isPremium);
          const lockedBanner = plan.key === 'collective' && !effectivePremium ? t('collectiveLockedBanner') : null;
          return (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={isCurrent}
              isOpen={openPlan === plan.key}
              onToggle={() => setOpenPlan(prev => prev === plan.key ? null : plan.key)}
              isLoading={loadingPlan === plan.key}
              onAction={() => !isCurrent && handleCheckout(plan)}
              lockedBanner={lockedBanner}
              t={t}
            />
          );
        })}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
          {t('contactQuestion')}{' '}
          <a href="mailto:info@okosszaki.hu" style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
            info@okosszaki.hu
          </a>
        </p>
      </div>

      {/* ── Checkout iframe bottom sheet ─────────────────────────────────── */}
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
    </div>
  );
}
