'use client';

import { useApp } from '@/context/AppContext';
import { Check, Zap, Building2, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import WorkspaceBadge from '@/components/WorkspaceBadge';

const PLANS = [
  {
    key: 'basic',
    name: 'Bázis',
    price: 'Ingyenes',
    priceNote: 'örökre',
    icon: Zap,
    color: 'var(--text-muted)',
    features: [
      'Maximum 1 projekt',
      'Alapvető projektkövetés',
      'Számla- és munkanapló feltöltés',
      'Személyes munkaterület',
      'Meghívható kollektívákba',
    ],
    cta: 'Jelenlegi csomag',
    ctaDisabled: true,
  },
  {
    key: 'premium',
    name: 'Prémium',
    price: '5 000 Ft',
    priceNote: '/ hó',
    icon: Star,
    color: '#b45309',
    highlight: true,
    features: [
      'Korlátlan projektek',
      'Korlátlan feltöltés',
      'Kollektíva létrehozása',
      'Ajánlatok és felmérések',
      'Naptár és ügyféltár',
      'Személyes weboldal (szakember profil)',
    ],
    cta: 'Váltás Prémiumra',
    ctaDisabled: false,
  },
  {
    key: 'collective',
    name: 'Kollektíva',
    price: '8 000 Ft',
    priceNote: '/ hó + 2 000 Ft/fő',
    icon: Building2,
    color: 'var(--accent)',
    features: [
      'Minden Prémium funkció',
      'Megosztott munkaterület',
      'Csapattagok meghívása (ingyenes nekik)',
      'Közös projektek és ajánlatok',
      'Szerepkör-alapú hozzáférés',
    ],
    cta: 'Kollektíva indítása',
    ctaDisabled: false,
    note: 'Prémium előfizetés szükséges',
  },
];

export default function ElofizetesPage() {
  const { currentUser, isSuperAdmin } = useApp();
  const isPremium = currentUser?.is_subscription_premium ?? false;

  return (
    <div className="container" style={{ maxWidth: 900 }}>
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

      {/* Current plan banner */}
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

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%), 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = plan.key === (isPremium ? 'premium' : 'basic');
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
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="var(--success-text)" style={{ flexShrink: 0, marginTop: 2 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={plan.ctaDisabled || isCurrent}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: '0.875rem', cursor: plan.ctaDisabled || isCurrent ? 'default' : 'pointer',
                  border: 'none',
                  background: isCurrent ? 'var(--bg-subtle)' : plan.highlight ? plan.color : 'var(--accent)',
                  color: isCurrent ? 'var(--text-muted)' : 'white',
                  opacity: isCurrent ? 0.7 : 1,
                }}
              >
                {isCurrent ? 'Jelenlegi csomag' : plan.cta}
              </button>
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
