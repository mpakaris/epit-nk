'use client';

import React, { useState } from 'react';
import { Languages, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';

const I18N = {
  hu: {
    title:    'Egy gyors beállítás',
    subtitle: 'Ezeket az értékeket most kell megadnod — a pénznem később nem módosítható.',
    langLabel:'Az alkalmazás nyelve',
    currLabel:'Munkában használt pénznem',
    currNote: 'A pénznem a fiókban később nem változtatható meg.',
    saveBtn:  'Mentés és tovább',
    saving:   'Mentés…',
  },
  de: {
    title:    'Eine kurze Einrichtung',
    subtitle: 'Diese Angaben sind jetzt erforderlich — die Währung kann später nicht geändert werden.',
    langLabel:'App-Sprache',
    currLabel:'Arbeitswährung',
    currNote: 'Die Währung kann im Konto nachträglich nicht geändert werden.',
    saveBtn:  'Speichern & weiter',
    saving:   'Speichern…',
  },
  en: {
    title:    'One quick setup',
    subtitle: 'These need to be set now — currency cannot be changed later.',
    langLabel:'App language',
    currLabel:'Working currency',
    currNote: 'Currency cannot be changed after saving.',
    saveBtn:  'Save & continue',
    saving:   'Saving…',
  },
};

const LANGUAGES  = [
  { code: 'hu', label: 'Magyar'  },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const CURRENCIES = [
  { code: 'HUF', label: 'HUF', sub: 'Forint'  },
  { code: 'EUR', label: 'EUR', sub: 'Euro'     },
  { code: 'GBP', label: 'GBP', sub: 'Pound'   },
  { code: 'USD', label: 'USD', sub: 'Dollar'   },
];

function detectInitialLocale() {
  if (typeof document === 'undefined') return 'hu';
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (m && ['hu', 'de', 'en'].includes(m[1])) return m[1];
  const lang = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('en')) return 'en';
  return 'hu';
}

export default function OnboardingModal() {
  const { completeOnboarding } = useApp();
  const [locale,   setLocale]   = useState(detectInitialLocale);
  const [currency, setCurrency] = useState('HUF');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const T = I18N[locale] || I18N.hu;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, currency }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Hiba történt.');
        return;
      }
      completeOnboarding(locale, currency);
    } catch {
      setError('Hálózati hiba. Kérjük próbáld újra.');
    } finally {
      setSaving(false);
    }
  };

  const pillBase = {
    flex: 1, padding: '0.65rem 0.5rem',
    border: '1.5px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    transition: 'all 0.15s', background: 'var(--bg-base)',
  };
  const pillActive = { border: '1.5px solid var(--accent)', background: 'var(--accent-bg, #eff6ff)' };

  return (
    <Modal isOpen={true} onClose={() => {}} persistent hideClose maxWidth="440px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Languages size={17} color="#fff" />
          </div>
          <span>{T.title}</span>
        </div>
      }
    >
      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
        {T.subtitle}
      </p>

      {/* Language */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
          {T.langLabel}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} type="button" onClick={() => setLocale(lang.code)}
              style={{ ...pillBase, ...(locale === lang.code ? pillActive : {}) }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: locale === lang.code ? 'var(--accent)' : 'var(--text-primary)' }}>
                {lang.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
          {T.currLabel}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {CURRENCIES.map(cur => (
            <button key={cur.code} type="button" onClick={() => setCurrency(cur.code)}
              style={{ ...pillBase, ...(currency === cur.code ? pillActive : {}) }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: currency === cur.code ? 'var(--accent)' : 'var(--text-primary)' }}>
                {cur.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{cur.sub}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.6rem', padding: '0.5rem 0.65rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-sm)' }}>
          <Lock size={11} color="#854d0e" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: '#854d0e', fontWeight: 600 }}>{T.currNote}</span>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginBottom: '0.75rem' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)',
          background: saving ? 'var(--bg-subtle)' : 'var(--accent)',
          color: saving ? 'var(--text-muted)' : '#fff',
          fontWeight: 800, fontSize: '0.95rem', border: 'none',
          cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          transition: 'background 0.15s',
        }}
      >
        {saving
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {T.saving}</>
          : <>{T.saveBtn} <ArrowRight size={15} /></>
        }
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Modal>
  );
}
