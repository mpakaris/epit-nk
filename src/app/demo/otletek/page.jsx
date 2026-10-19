'use client';

import { Lightbulb } from 'lucide-react';

export default function DemoOtletekPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <Lightbulb size={22} />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Ötletek</h1>
      </div>
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Lightbulb size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
        <p style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Demo módban nem elérhető</p>
        <p style={{ fontSize: '0.875rem' }}>Az ötletek funkció valós fiókhoz kötött. Regisztrálj ingyenesen az összes funkció eléréséhez!</p>
      </div>
    </div>
  );
}
