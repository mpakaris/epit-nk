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
    saveBtn:  'Save & Continue',
    saving:   'Saving…',
  },
};

const LANGUAGES  = [
  { code: 'hu', label: 'Magyar'  },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const CURRENCIES = [
  { code: 'HUF', label: 'HUF', sub: 'Forint' },
  { code: 'EUR', label: 'EUR', sub: 'Euro'    },
  { code: 'GBP', label: 'GBP', sub: 'Pound'  },
  { code: 'USD', label: 'USD', sub: 'Dollar'  },
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

  return (
    <Modal isOpen={true} onClose={() => {}} persistent hideClose maxWidth="440px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="dk-ic" style={{ background: '#1F2A3C', color: '#fff', flexShrink: 0 }}>
            <Languages size={18} aria-hidden="true" />
          </div>
          <span>{T.title}</span>
        </div>
      }
    >
      <p style={{ fontSize: 14, color: '#5A5F68', margin: '0 0 20px', lineHeight: 1.6, fontWeight: 500 }}>
        {T.subtitle}
      </p>

      {/* Language */}
      <div style={{ marginBottom: 20 }}>
        <span className="dk-kick" style={{ display: 'block', marginBottom: 10, color: '#5A5F68' }}>
          {T.langLabel}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLocale(lang.code)}
              className="dk-btn"
              style={{
                flex: 1,
                height: 44,
                justifyContent: 'center',
                background: locale === lang.code ? '#1F2A3C' : '#F1F1F3',
                color: locale === lang.code ? '#fff' : '#0E1116',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div style={{ marginBottom: 20 }}>
        <span className="dk-kick" style={{ display: 'block', marginBottom: 10, color: '#5A5F68' }}>
          {T.currLabel}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {CURRENCIES.map(cur => (
            <button
              key={cur.code}
              type="button"
              onClick={() => setCurrency(cur.code)}
              className="dk-btn"
              style={{
                flex: 1,
                height: 52,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                background: currency === cur.code ? '#1F2A3C' : '#F1F1F3',
                color: currency === cur.code ? '#fff' : '#0E1116',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800 }}>{cur.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}>{cur.sub}</span>
            </button>
          ))}
        </div>

        {/* Lock warning */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 10, padding: '10px 12px',
          background: '#FFF7E6', borderRadius: 12,
        }}>
          <Lock size={13} color="#92400E" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600, lineHeight: 1.4 }}>
            {T.currNote}
          </span>
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#B71C1C', marginBottom: 12, fontWeight: 600 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="dk-btn"
        style={{ width: '100%', height: 52, fontSize: 16, gap: 8, justifyContent: 'center', background: '#1F2A3C', color: '#fff', opacity: saving ? 0.6 : 1 }}
      >
        {saving
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {T.saving}</>
          : <>{T.saveBtn} <ArrowRight size={16} /></>
        }
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Modal>
  );
}
