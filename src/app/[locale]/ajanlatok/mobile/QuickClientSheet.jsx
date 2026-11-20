'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function QuickClientSheet({ onCreated, onClose, onBack, accentColor = 'var(--m-offer, #6D3FD1)', createClient, zIndex = 50 }) {
  const t = useTranslations('quotes');
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [gdpr,    setGdpr]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const canSave = name.trim() && email.trim() && gdpr;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setError('');
    try {
      const client = await createClient({ name: name.trim(), email: email.trim(), gdprConsent: true });
      onCreated(client);
    } catch (err) {
      setError(err.message || t('saveError'));
      setLoading(false);
    }
  };

  const INPUT = { width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)', outline: 0 };

  return (
    <div role="dialog" aria-label={t('newClientTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={onBack || onClose} aria-label={t('back')} style={{ width: 44, height: 44, flexShrink: 0, border: 0, borderRadius: 22, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('newClientTitle')}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5, padding: '0 2px' }}>{t('clientQuickCreateHint')}</span>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('newClientNameLabel')}</span>
        <input type="text" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" style={INPUT} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-ink)' }}>{t('newClientEmailLabel')}</span>
        <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={INPUT} />
      </label>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, background: gdpr ? '#E7F4EC' : '#fff', border: '1.5px solid #E0E0E0', cursor: 'pointer' }}>
        <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor, width: 18, height: 18 }} />
        <span style={{ fontSize: 14, color: 'var(--m-ink)', lineHeight: 1.45 }}>
          {t('newClientGdprText')} <span style={{ color: '#B71C1C', fontWeight: 700 }}>*</span>
        </span>
      </label>
      {error && <span style={{ fontSize: 13, fontWeight: 600, color: '#B71C1C' }}>{error}</span>}
      <button type="button" onClick={handleSave} disabled={loading || !canSave} style={{ height: 60, border: 0, borderRadius: 30, background: canSave && !loading ? accentColor : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave && !loading ? 'pointer' : 'default' }}>
        {loading ? '…' : t('clientQuickCreateBtn')}
      </button>
    </div>
  );
}
