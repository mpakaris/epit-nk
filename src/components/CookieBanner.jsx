'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'okosszaki_cookie_notice_dismissed';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      background: '#0f172a', color: '#f8fafc',
      padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: '0.75rem',
      fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: '0.82rem', lineHeight: 1.55,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, color: '#cbd5e1', maxWidth: 680 }}>
        Ez a weboldal kizárólag a működéshez szükséges sütiket használ (munkamenet-azonosítás).
        Harmadik feles nyomkövető vagy hirdetési sütiket nem alkalmazunk.{' '}
        <a
          href="/adatkezeles"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#93c5fd', fontWeight: 600, textDecoration: 'underline' }}
        >
          Adatkezelési Tájékoztató
        </a>
      </p>
      <button
        onClick={dismiss}
        style={{
          flexShrink: 0,
          background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '0.5rem 1.25rem',
          fontWeight: 700, fontSize: '0.82rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Értettem
      </button>
    </div>
  );
}
