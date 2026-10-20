'use client';

import { useEffect, useState } from 'react';

export default function CheckoutPopupSuccessPage() {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      checkoutType: params.get('checkout_type') || 'premium',
      subscriptionId: params.get('subscription_id'),
      productId: params.get('product_id'),
      customerId: params.get('customer_id'),
    };

    const inIframe = window.parent !== window;
    const inPopup = !inIframe && window.opener && !window.opener.closed;
    const inTab = !inIframe && !inPopup;

    if (inTab) {
      // Normal new-tab fallback — redirect to the right page with params
      setStatus('redirect');
      const dest = payload.checkoutType === 'kollektiva'
        ? `/kollektivak?kollektiva_upgraded=1&${params.toString()}`
        : `/profil?upgraded=1&${params.toString()}`;
      window.location.replace(dest);
      return;
    }

    setStatus('done');

    // Primary: write to localStorage — parent detects via 'storage' event
    // This works reliably across iframe/popup boundaries on the same origin.
    localStorage.setItem('creem_checkout_done', JSON.stringify(payload));

    // Secondary: also try postMessage for faster response
    try {
      const target = inIframe ? window.parent : window.opener;
      target.postMessage({ type: 'creem_checkout_success', ...payload }, window.location.origin);
    } catch {}

    // Popup: close self after short delay
    if (inPopup) {
      setTimeout(() => window.close(), 800);
    }
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      fontFamily: 'var(--font-main, sans-serif)',
      background: '#f8fafc', gap: '1rem', padding: '2rem', textAlign: 'center',
    }}>
      {status === 'processing' && (
        <>
          <div style={{ fontSize: '2.5rem' }}>⏳</div>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>Feldolgozás…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <div style={{ fontSize: '3rem' }}>✅</div>
          <p style={{ fontSize: '1.1rem', color: '#16a34a', fontWeight: 700, margin: 0 }}>Sikeres fizetés!</p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Bezárás folyamatban…</p>
        </>
      )}
      {status === 'redirect' && (
        <>
          <div style={{ fontSize: '2.5rem' }}>↩️</div>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>Visszairányítás…</p>
        </>
      )}
    </div>
  );
}
