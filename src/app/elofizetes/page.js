'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Check, Zap, Star, Building2, Clock, ArrowLeft, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import WorkspaceBadge from '@/components/WorkspaceBadge';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

const PLANS = [
  {
    key: 'basic',
    name: 'Bázis',
    price: 'Ingyenes',
    priceNote: 'örökre',
    icon: Zap,
    color: 'var(--text-muted)',
    features: [
      'Max. 5 felmérés',
      'Max. 5 ajánlat',
      'Max. 1 projekt',
      'Személyes weboldal (szakember profil)',
      'Meghívható kollektívákba',
    ],
  },
  {
    key: 'premium',
    name: 'Prémium',
    price: '6 999 Ft',
    priceNote: '/ hó + ÁFA',
    icon: Star,
    color: '#b45309',
    highlight: true,
    productId: process.env.NEXT_PUBLIC_CREEM_PREMIUM_PRODUCT_ID,
    features: [
      'Korlátlan projektek',
      'Korlátlan felmérések és ajánlatok',
      { text: '1 Inkluzív Kollektíva (max. 3 fő) — ingyen', highlight: true },
      'Naptár és ügyféltár',
      'Teljes weboldal funkciók',
      'Korlátlan képfeltöltés',
    ],
    cta: 'Váltás Prémiumra',
  },
  {
    key: 'collective',
    name: 'Kollektíva',
    price: 'Prémium +',
    priceNote: 'csomagonként',
    icon: Building2,
    color: 'var(--accent)',
    features: [
      'Prémium előfizetés szükséges',
      'Kis csapat: 3 extra szék',
      'Közepes csapat: 6 extra szék',
      'Nagy csapat: 9 extra szék',
      'A tulajdonos fizet mindenki helyett',
    ],
    note: 'A kollektíva indítási folyamatnál választhatsz csomagot.',
    cta: 'Kollektíva indítása',
    href: '/kollektivak',
  },
];

function TrialBanner({ trialEndsAt }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / 86400000));
  return (
    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
      <Clock size={16} color="#854d0e" style={{ flexShrink: 0 }} />
      <div>
        <span style={{ fontWeight: 700, color: '#854d0e' }}>Ingyenes próba aktív</span>
        <span style={{ color: '#78350f', marginLeft: '0.4rem' }}>
          — még <strong>{daysLeft} nap</strong> van hátra. Utána a Bázis csomagra vált a fiókod.
        </span>
      </div>
    </div>
  );
}

export default function ElofizetesPage() {
  const { currentUser, refreshSupabaseData } = useApp();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [activationBanner, setActivationBanner] = useState(null); // 'success' | 'error'

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

  const isPremium = currentUser?.is_subscription_premium ?? false;
  const isOnTrial = !isPremium
    && currentUser?.subscription_tier === 'trial'
    && currentUser?.trial_ends_at
    && new Date(currentUser.trial_ends_at) > new Date();
  const effectivePremium = isEffectivePremium(currentUser ?? {});
  const currentTierKey = isPremium ? 'premium' : isOnTrial ? 'trial' : 'basic';

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
        setCheckoutError(data.error || 'Hiba történt a fizetési folyamat indításakor. Kérjük, próbáld újra.');
      }
    } catch {
      setCheckoutError('Hiba történt a fizetési folyamat indításakor. Kérjük, próbáld újra.');
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a dashboardra
        </Link>
      </div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              Előfizetés <WorkspaceBadge />
            </h1>
            <p className="page-subtitle">Válaszd ki a neked megfelelő csomagot</p>
          </div>
        </div>
      </div>

      {activationBanner === 'success' && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          Sikeres előfizetés! Prémium fiókod aktív.
          <button type="button" onClick={() => setActivationBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}><X size={15} /></button>
        </div>
      )}
      {activationBanner === 'error' && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          Az aktiválás nem sikerült — ha a fizetés megtörtént, kérjük vedd fel a kapcsolatot az üzemeltetővel.
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

      {!isOnTrial && (
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Jelenlegi csomagod:</span>
          <span style={{
            fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
            ...(isPremium
              ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }
              : { background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
            )
          }}>
            {isPremium ? '⭐ Prémium' : 'Bázis'}
          </span>
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
                  Jelenlegi csomag
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
                  {isCurrent ? 'Jelenlegi csomag' : isLoading ? 'Átirányítás...' : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        Kérdésed van? Írj nekünk: <a href="mailto:info@epitunk.hu" style={{ color: 'var(--accent)' }}>info@epitunk.hu</a>
      </p>
    </div>
  );
}
