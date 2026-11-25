'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const I18N = {
  hu: {
    title:    'Üdvözlünk az OkosSzaki-ben!',
    greeting: (name) => `Örülünk, hogy itt vagy${name ? `, ${name}` : ''}!`,
    trialBadge: '14 napos ingyenes Próbaidőszak',
    bullets: [
      'Korlátlan projektek, árajánlatok és felmérések',
      'Kollektíva funkciók teljes hozzáféréssel',
      'Saját weboldal építő',
      'Nincs szükség bankkártyára',
    ],
    trialEnd: (date) => `A próbaidőszak ${date}-ig tart. Utána automatikusan az ingyenes Basic csomagra kerülsz — semmi meglepetés.`,
    cta: 'Kezdjük el! 🚀',
  },
  de: {
    title:    'Willkommen bei OkosSzaki!',
    greeting: (name) => `Schön, dass du da bist${name ? `, ${name}` : ''}!`,
    trialBadge: '14-tägige kostenlose Testphase',
    bullets: [
      'Unbegrenzte Projekte, Angebote und Aufmaße',
      'Kollektiv-Funktionen mit vollem Zugriff',
      'Eigener Website-Baukasten',
      'Keine Kreditkarte erforderlich',
    ],
    trialEnd: (date) => `Die Testphase läuft bis ${date}. Danach wechselst du automatisch zum kostenlosen Basic-Paket — keine Überraschungen.`,
    cta: 'Los geht\'s! 🚀',
  },
  en: {
    title:    'Welcome to OkosSzaki!',
    greeting: (name) => `We're glad you're here${name ? `, ${name}` : ''}!`,
    trialBadge: '14-day free Trial',
    bullets: [
      'Unlimited projects, quotes and surveys',
      'Full access to Collective features',
      'Your own website builder',
      'No credit card required',
    ],
    trialEnd: (date) => `Your trial runs until ${date}. After that you'll automatically switch to the free Basic plan — no surprises.`,
    cta: 'Let\'s go! 🚀',
  },
};

export default function WelcomeModal() {
  const { currentUser, dismissWelcome } = useApp();
  const firedRef = useRef(false);

  const locale = currentUser?.locale || 'hu';
  const T = I18N[locale] || I18N.hu;

  const firstName = currentUser?.display_name && currentUser.display_name !== currentUser.email
    ? currentUser.display_name.split(' ')[0]
    : null;

  const trialEnd = currentUser?.trial_ends_at
    ? new Date(currentUser.trial_ends_at).toLocaleDateString(
        locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-GB' : 'hu-HU',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    : null;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    confetti({ particleCount: 80, angle: 60,  spread: 70, origin: { x: 0, y: 0.7 }, colors: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6'] });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6'] });
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn .2s ease',
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{
        background: '#fff', borderRadius: 20, maxWidth: 460, width: '100%',
        padding: '2.25rem 2rem', textAlign: 'center', position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        animation: 'popIn .28s cubic-bezier(.32,1,.6,1)',
      }}>
        <button
          onClick={dismissWelcome}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={14} color="#64748b" />
        </button>

        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Sparkles size={30} color="#fff" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
          {T.title}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {T.greeting(firstName)}
        </p>

        <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <Sparkles size={16} color="#2563eb" />
            <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.9rem' }}>{T.trialBadge}</span>
          </div>
          {T.bullets.map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <CheckCircle2 size={14} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
          {trialEnd && (
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0, borderTop: '1px solid #c7d2fe', paddingTop: '0.65rem' }}>
              {T.trialEnd(trialEnd)}
            </p>
          )}
        </div>

        <button
          onClick={dismissWelcome}
          style={{ width: '100%', padding: '0.85rem', background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '0.95rem', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {T.cta}
        </button>
      </div>
    </div>
  );
}
