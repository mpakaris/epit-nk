'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  Upload, Trash2, Loader2, ImageIcon, Filter, Check, AlertCircle, Star,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import Lightbox from '@/components/Lightbox';

const ORIENTATIONS = [
  { value: 'horizontal', label: 'Horizontal (hero)' },
  { value: 'vertical',   label: 'Vertical (portrait)' },
];

function ImageGrid({ title, images, aspect, cols, deleting, onDelete, onOpen, onSetHero, settingHero }) {
  if (images.length === 0) return null;
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title} — {images.length}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0.75rem' }}>
        {images.map((img, idx) => (
          <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: img.is_platform_hero ? '2px solid #f59e0b' : '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <img src={img.url} alt={img.alt_text || ''} onClick={() => onOpen(idx)}
              style={{ width: '100%', aspectRatio: aspect, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} loading="lazy" />
            <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text-muted)' }}>General</p>
              <button type="button" onClick={() => onSetHero(img)} disabled={settingHero === img.id}
                title={img.is_platform_hero ? 'Hero eltávolítása' : 'Beállítás platform heroként'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: settingHero === img.id ? 0.5 : 1 }}>
                <Star size={14} color={img.is_platform_hero ? '#f59e0b' : '#94a3b8'} fill={img.is_platform_hero ? '#f59e0b' : 'none'} />
              </button>
            </div>
            <button type="button" onClick={() => onDelete(img.id)} disabled={deleting === img.id}
              style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {deleting === img.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImageLibraryPage() {
  const { isSuperAdmin, dataReady } = useApp();
  const router = useRouter();

  const [images, setImages] = useState([]);
  const [filterOrientation, setFilterOrientation] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploadInfo, setUploadInfo] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [settingHero, setSettingHero] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const [form, setForm] = useState({ orientation: 'horizontal', alt_text: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!dataReady) return;
    if (!isSuperAdmin) { router.replace('/projektek'); return; }
    loadImages();
  }, [dataReady, isSuperAdmin]);

  const loadImages = async () => {
    setLoading(true);
    const r = await fetch('/api/superadmin/image-library');
    const d = await r.json();
    setImages(d.images || []);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    setUploadInfo('');
    try {
      const fd = new FormData();
      fd.append('orientation', form.orientation);
      if (form.alt_text) fd.append('alt_text', form.alt_text);
      files.slice(0, 50).forEach(f => fd.append('files', f));

      const r = await fetch('/api/superadmin/image-library', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Upload failed'); return; }

      const uploaded = d.images?.length || 0;
      const skipped  = d.skipped || 0;
      if (skipped > 0) setUploadInfo(`${uploaded} kép feltöltve, ${skipped} már létezett (átugorva)`);
      else if (uploaded > 0) setUploadInfo(`${uploaded} kép sikeresen feltöltve`);

      await loadImages();
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setUploadErr('Network error');
    } finally {
      setUploading(false);
    }
  };

  const handleSetHero = async (img) => {
    setSettingHero(img.id);
    try {
      const next = !img.is_platform_hero;
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
    } catch { /* ignore */ }
    finally { setSettingHero(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this image?')) return;
    setDeleting(id);
    try {
      const r = await fetch('/api/superadmin/image-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (r.ok) setImages(prev => prev.filter(img => img.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  if (!dataReady) return <PageSpinner />;
  if (!isSuperAdmin) return null;

  const displayed = filterOrientation
    ? images.filter(i => i.orientation === filterOrientation)
    : images;
  const horiz = displayed.filter(i => i.orientation === 'horizontal');
  const vert  = displayed.filter(i => i.orientation === 'vertical');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImageIcon size={20} /> Image Library
        </h1>
        <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Hero background images for user websites — auto-converted to WebP on upload
        </p>
      </div>

      {/* Upload panel */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Upload images</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Orientation</label>
            <select className="form-control" value={form.orientation} onChange={e => setForm(f => ({ ...f, orientation: e.target.value }))}>
              {ORIENTATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Alt text (optional)</label>
            <input type="text" className="form-control" value={form.alt_text} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))} placeholder="e.g. Painter at work" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input type="file" ref={fileRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {uploading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
              : <><Upload size={14} /> Select images</>
            }
          </button>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP, HEIC · max 30 MB · up to 50 at once</span>
        </div>
        {uploadErr && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.825rem', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertCircle size={13} /> {uploadErr}
          </p>
        )}
        {uploadInfo && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.825rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Check size={13} /> {uploadInfo}
          </p>
        )}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {[
            { value: '', label: `All (${images.length})` },
            { value: 'horizontal', label: `Horizontal (${images.filter(i => i.orientation === 'horizontal').length})` },
            { value: 'vertical',   label: `Vertical (${images.filter(i => i.orientation === 'vertical').length})` },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => setFilterOrientation(opt.value)}
              style={{
                padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                background: filterOrientation === opt.value ? 'var(--primary)' : 'var(--bg-subtle)',
                color: filterOrientation === opt.value ? 'white' : 'var(--text-muted)',
                fontWeight: filterOrientation === opt.value ? 700 : 400,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
          <ImageIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.35 }} />
          <p style={{ margin: 0 }}>No images uploaded yet</p>
        </div>
      ) : (
        <>
          {lightbox && (
            <Lightbox
              media={lightbox.images}
              startIndex={lightbox.index}
              onClose={() => setLightbox(null)}
            />
          )}
          <ImageGrid title="Horizontal (hero)" images={horiz} aspect="16/9" cols="repeat(auto-fill, minmax(220px, 1fr))"
            deleting={deleting} onDelete={handleDelete} onOpen={idx => setLightbox({ images: horiz, index: idx })}
            onSetHero={handleSetHero} settingHero={settingHero} />
          <ImageGrid title="Vertical (portrait)" images={vert} aspect="3/4" cols="repeat(auto-fill, minmax(140px, 1fr))"
            deleting={deleting} onDelete={handleDelete} onOpen={idx => setLightbox({ images: vert, index: idx })}
            onSetHero={handleSetHero} settingHero={settingHero} />
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
