'use client';

import { Lock } from 'lucide-react';

export default function ContactPremiumField({ label, isPremium, children }) {
  return (
    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {label}
        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>PRÉMIUM</span>
      </label>
      <div style={{ position: 'relative' }}>
        {children}
        {!isPremium && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', borderRadius: 6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={14} style={{ color: 'var(--text-muted)' }} /></div>}
      </div>
    </div>
  );
}
