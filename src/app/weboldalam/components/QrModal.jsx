'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Download } from 'lucide-react';

export default function QrModal({ url, onClose }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    import('qrcode').then(({ default: QRCode }) => {
      QRCode.toDataURL(url, {
        width: 280, margin: 2,
        color: { dark: '#0d1520', light: '#ffffff' },
      }).then(setDataUrl);
    });
  }, [url]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{ position: 'relative', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>QR kód</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: '1rem', display: 'inline-block', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
          {dataUrl
            ? <img src={dataUrl} alt="QR kód" style={{ width: 200, height: 200, display: 'block' }} />
            : <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} /></div>
          }
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.775rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{url}</p>

        {dataUrl && (
          <a
            href={dataUrl}
            download="weboldam-qr.png"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={13} /> QR letöltése (PNG)
          </a>
        )}
      </div>
    </div>
  );
}
