'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import {
  ArrowLeft, ShieldCheck, Upload, Trash2, Star, CheckCircle2,
  Loader2, Image as ImageIcon, X,
} from 'lucide-react';

export default function SuperadminImageLibraryPage() {
  const { isSuperAdmin, loading: appLoading } = useApp();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tradeFilter, setTradeFilter] = useState('');
  const [trades, setTrades] = useState([]);
  const [alertModal, setAlertModal] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const fileRef = useRef(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tradeFilter) params.set('trade_id', tradeFilter);
      const res = await fetch(`/api/superadmin/image-library?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(data.images);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, [tradeFilter]);

  useEffect(() => {
    if (!appLoading && isSuperAdmin) {
      fetchImages();
      fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
    }
  }, [appLoading, isSuperAdmin, fetchImages]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      if (tradeFilter) fd.append('trade_id', tradeFilter);
      fd.append('orientation', 'horizontal');
      const res = await fetch('/api/superadmin/image-library', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(prev => [...data.images, ...prev]);
      setSuccessMsg(`${data.images.length} kép feltöltve.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSetHero = async (img) => {
    const next = !img.is_platform_hero;
    try {
      const res = await fetch('/api/superadmin/image-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id, is_platform_hero: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(prev => prev.map(i => ({
        ...i,
        is_platform_hero: i.id === img.id ? next : (next ? false : i.is_platform_hero),
      })));
      setSuccessMsg(next ? 'Hero kép beállítva.' : 'Hero kép eltávolítva.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setAlertModal({ message: err.message });
    }
  };

  const handleDelete = async (img) => {
    if (!confirm(`Biztosan törli ezt a képet?`)) return;
    try {
      const res = await fetch('/api/superadmin/image-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setImages(prev => prev.filter(i => i.id !== img.id));
    } catch (err) {
      setAlertModal({ message: err.message });
    }
  };

  if (appLoading) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!isSuperAdmin) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}><h2 style={{ color: 'var(--danger)' }}>Access Denied</h2></div>;

  const heroImage = images.find(i => i.is_platform_hero);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/superadmin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Superadmin
            </div>
            <h1 className="page-title">Képkönyvtár</h1>
            <p className="page-subtitle">{images.length} kép · {heroImage ? '1 hero beállítva' : 'Nincs hero kép'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Feltöltés…</> : <><Upload size={14} /> Feltöltés</>}
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Current hero banner */}
      {heroImage && (
        <div style={{ marginBottom: '1.25rem', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', border: '2px solid #f59e0b' }}>
          <img src={heroImage.url} alt="Hero" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Star size={11} fill="white" /> Hero kép
          </div>
        </div>
      )}

      {/* Trade filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" onClick={() => setTradeFilter('')} className={`btn btn-sm ${!tradeFilter ? 'btn-primary' : 'btn-secondary'}`}>Összes</button>
        <button type="button" onClick={() => setTradeFilter('generic')} className={`btn btn-sm ${tradeFilter === 'generic' ? 'btn-primary' : 'btn-secondary'}`}>Általános</button>
        {trades.slice(0, 8).map(t => (
          <button key={t.id} type="button" onClick={() => setTradeFilter(t.id)} className={`btn btn-sm ${tradeFilter === t.id ? 'btn-primary' : 'btn-secondary'}`}>{t.name_hu}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : images.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <ImageIcon size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Nincs kép</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Tölts fel képeket a gombbal.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '0.75rem' }}>
          {images.map(img => (
            <div key={img.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: img.is_platform_hero ? '2.5px solid #f59e0b' : '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
              <div style={{ position: 'relative' }}>
                <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} loading="lazy" />
                {img.is_platform_hero && (
                  <div style={{ position: 'absolute', top: 6, left: 6, background: '#f59e0b', color: '#fff', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Star size={10} fill="white" /> Aktív hero
                  </div>
                )}
              </div>

              <div style={{ padding: '0.5rem 0.6rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderTop: '1px solid var(--border-subtle)' }}>
                {img.trade?.name_hu && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.trade.name_hu}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleSetHero(img)}
                    className="btn btn-sm"
                    style={img.is_platform_hero
                      ? { background: '#f59e0b', color: '#fff', border: 'none', gap: '0.3rem' }
                      : { gap: '0.3rem' }}
                  >
                    <Star size={12} fill={img.is_platform_hero ? 'white' : 'none'} />
                    {img.is_platform_hero ? 'Hero' : 'Set Hero'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(img)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
