'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, ShieldCheck, Upload, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

export default function SuperadminAboutPhotoPage() {
  const { isSuperAdmin, loading: appLoading } = useApp();
  const [photoUrl, setPhotoUrl]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState(null); // { type: 'success'|'error', text }
  const fileRef = useRef(null);

  useEffect(() => {
    if (!appLoading && isSuperAdmin) {
      fetch('/api/superadmin/about-photo')
        .then(r => r.json())
        .then(d => { if (d.url) setPhotoUrl(d.url); });
    }
  }, [appLoading, isSuperAdmin]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/superadmin/about-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUrl(data.url + '?t=' + Date.now());
      setMsg({ type: 'success', text: 'Fotó feltöltve és WebP-vé alakítva.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (appLoading) return null;
  if (!isSuperAdmin) return <div className="container" style={{ paddingTop: '3rem' }}><h2 style={{ color: 'var(--danger)' }}>Access Denied</h2></div>;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
          <ShieldCheck size={15} /> Superadmin
        </div>
        <h1 className="page-title">About Me – portréfotó</h1>
        <p className="page-subtitle">A feltöltött kép a <a href="/about" target="_blank" style={{ color: 'var(--accent)' }}>/about oldalon <ExternalLink size={12} style={{ verticalAlign: 'middle' }} /></a> jelenik meg.</p>
      </div>

      {/* Current photo preview */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Preview */}
          <div style={{ width: 160, height: 200, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            {photoUrl
              ? <img src={photoUrl} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>Még nincs feltöltött fotó</div>
            }
          </div>

          {/* Controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Portréfotó cseréje</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                JPEG, PNG vagy WebP formátum. Max. 20 MB.<br />
                Feltöltés után automatikusan WebP-vé alakul, max. 1200px.
              </div>
            </div>

            <div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {uploading
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Feltöltés…</>
                  : <><Upload size={15} /> {photoUrl ? 'Fotó cseréje' : 'Fotó feltöltése'}</>
                }
              </button>
            </div>

            {msg && (
              <div style={{
                padding: '0.6rem 0.85rem', borderRadius: 8, fontSize: '0.825rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color:      msg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                border:     `1px solid ${msg.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
              }}>
                {msg.type === 'success' && <CheckCircle2 size={15} />}
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* URL display */}
      {photoUrl && (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Kép URL</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderRadius: 6, padding: '0.5rem 0.75rem', wordBreak: 'break-all', marginBottom: '0.65rem' }}>
            {photoUrl.split('?')[0]}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigator.clipboard.writeText(photoUrl.split('?')[0]).then(() => setMsg({ type: 'success', text: 'URL vágólapra másolva.' }))}
          >
            URL másolása
          </button>
        </div>
      )}
    </div>
  );
}
