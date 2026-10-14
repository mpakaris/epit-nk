'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  Upload, Trash2, X, Loader2, ImageIcon, Filter, Check, AlertCircle,
  ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

const ORIENTATIONS = [
  { value: 'horizontal', label: 'Horizontal (hero)' },
  { value: 'vertical',   label: 'Vertical (portrait)' },
];

function Lightbox({ images, index, onClose, onNav }) {
  const img = images[index];
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNav]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      {/* Prev */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onNav(-1); }}
          style={{ position: 'absolute', left: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image */}
      <img
        src={img.url} alt={img.alt_text || ''}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onNav(1); }}
          style={{ position: 'absolute', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Close */}
      <button
        type="button" onClick={onClose}
        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={18} />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <p style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

function ImageGrid({ title, images, aspect, cols, tradeName, deleting, onDelete, onOpen, onSetHero, settingHero, onAssignFeature, pickingSlot }) {
  if (images.length === 0) return null;
  return (
    <div style={{ marginBottom: '2rem' }}>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title} — {images.length}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0.75rem' }}>
        {images.map((img, idx) => (
          <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: img.is_platform_hero ? '2px solid #f59e0b' : pickingSlot !== null ? '2px solid var(--accent-border)' : '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <img
              src={img.url} alt={img.alt_text || ''}
              onClick={() => pickingSlot !== null ? onAssignFeature?.(img) : onOpen(idx)}
              style={{ width: '100%', aspectRatio: aspect, objectFit: 'cover', display: 'block', cursor: pickingSlot !== null ? 'pointer' : 'zoom-in' }}
              loading="lazy"
            />
            <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{tradeName(img.trade_id)}</p>
              <button
                type="button"
                onClick={() => onSetHero(img)}
                disabled={settingHero === img.id}
                title={img.is_platform_hero ? 'Hero eltávolítása' : 'Beállítás platform heroként'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: settingHero === img.id ? 0.5 : 1 }}
              >
                <Star size={14} color={img.is_platform_hero ? '#f59e0b' : '#94a3b8'} fill={img.is_platform_hero ? '#f59e0b' : 'none'} />
              </button>
            </div>
            <button
              type="button" onClick={() => onDelete(img.id)} disabled={deleting === img.id}
              style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
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

  const FEATURE_NAMES = ['Felmérés','Árajánlat','Projektköltségek','Alvállalkozók','Ügyfélportál','Ügyfélkezelés','Saját weboldal'];

  const [trades, setTrades] = useState([]);
  const [images, setImages] = useState([]);
  const [filterTrade, setFilterTrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [settingHero, setSettingHero] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  // Feature image slots (0-6)
  const [featureSlots, setFeatureSlots] = useState(Array(7).fill(null));
  const [pickingSlot, setPickingSlot] = useState(null); // null | 0-6
  const [savingSlot, setSavingSlot] = useState(null);
  const featureFileRefs = useRef(Array.from({ length: 7 }, () => React.createRef()));

  const [form, setForm] = useState({ trade_id: '', orientation: 'horizontal', alt_text: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!dataReady) return;
    if (!isSuperAdmin) { router.replace('/projektek'); return; }
    fetch('/api/platform/features').then(r => r.json()).then(d => {
      const slots = Array(7).fill(null);
      (d.slots || []).forEach(s => { slots[s.slot_index] = s; });
      setFeatureSlots(slots);
    }).catch(() => {});
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
    loadImages();
  }, [dataReady, isSuperAdmin]);

  const loadImages = async (tradeId = '') => {
    setLoading(true);
    const url = tradeId ? `/api/superadmin/image-library?trade_id=${tradeId}` : '/api/superadmin/image-library';
    const r = await fetch(url);
    const d = await r.json();
    setImages(d.images || []);
    setLoading(false);
  };

  // When showing all, count generic (no trade) images locally
  const genericCount = images.filter(img => !img.trade_id).length;

  const handleFilterChange = (val) => {
    setFilterTrade(val);
    loadImages(val);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      if (form.trade_id) fd.append('trade_id', form.trade_id);
      fd.append('orientation', form.orientation);
      if (form.alt_text) fd.append('alt_text', form.alt_text);
      files.slice(0, 10).forEach(f => fd.append('files', f));

      const r = await fetch('/api/superadmin/image-library', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Upload failed'); return; }

      await loadImages(filterTrade);
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

  const handleAssignFeature = async (img) => {
    if (pickingSlot === null) return;
    setSavingSlot(pickingSlot);
    try {
      const res = await fetch('/api/platform/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_index: pickingSlot, image_id: img.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeatureSlots(prev => prev.map((s, i) => i === pickingSlot ? { ...s, ...data.slot } : s));
      setPickingSlot(null);
    } catch { /* ignore */ }
    finally { setSavingSlot(null); }
  };

  const handleFeatureUpload = async (slotIndex, files) => {
    if (!files?.length) return;
    setSavingSlot(slotIndex);
    try {
      const fd = new FormData();
      fd.append('files', files[0]);
      fd.append('orientation', 'horizontal');
      fd.append('is_platform_only', 'true');
      const uploadRes = await fetch('/api/superadmin/image-library', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);
      const img = uploadData.images?.[0];
      if (!img) throw new Error('Upload failed');
      // Assign to slot
      const res = await fetch('/api/platform/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_index: slotIndex, image_id: img.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeatureSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, ...data.slot } : s));
      setPickingSlot(null);
    } catch (err) { alert(err.message); }
    finally { setSavingSlot(null); }
  };

  const handleClearFeature = async (slotIndex) => {
    setSavingSlot(slotIndex);
    try {
      await fetch('/api/platform/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_index: slotIndex, image_id: null }),
      });
      setFeatureSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, image_url: null, image_id: null } : s));
    } catch { /* ignore */ }
    finally { setSavingSlot(null); }
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

  const tradeName = (id) => trades.find(t => t.id === id)?.name_hu || 'General';

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Trade</label>
            <select className="form-control" value={form.trade_id} onChange={e => setForm(f => ({ ...f, trade_id: e.target.value }))}>
              <option value="">General (all trades)</option>
              {trades.map(t => <option key={t.id} value={t.id}>{t.name_hu}</option>)}
            </select>
          </div>
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
          <button
            type="button" className="btn btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {uploading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
              : <><Upload size={14} /> Select images</>
            }
          </button>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP, HEIC · max 30 MB · up to 10 at once</span>
        </div>
        {uploadErr && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.825rem', color: 'var(--danger)', display: 'flex', gap: '0.35rem' }}>
            <AlertCircle size={13} /> {uploadErr}
          </p>
        )}
      </div>

      {/* Feature image slots */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Funkció képek</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>7 szekció a főoldalon — kattints egy slotra, majd válassz képet alulról</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px,100%), 1fr))', gap: '0.6rem' }}>
          {FEATURE_NAMES.map((name, i) => {
            const slot = featureSlots[i];
            const isActive = pickingSlot === i;
            const isSaving = savingSlot === i;
            return (
              <div key={i} style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden', opacity: isSaving ? 0.6 : 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={featureFileRefs.current[i]}
                  style={{ display: 'none' }}
                  onChange={e => { handleFeatureUpload(i, e.target.files); e.target.value = ''; }}
                />
                <div
                  onClick={() => featureFileRefs.current[i].current?.click()}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Kattints a kép feltöltéséhez"
                >
                  {slot?.image_url ? (
                    <img src={slot.image_url} alt={name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      {isSaving ? <Loader2 size={18} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={18} color="var(--text-muted)" style={{ opacity: 0.5 }} />}
                      {!isSaving && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>Feltöltés</span>}
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.3rem 0.5rem', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(i + 1).padStart(2, '0')} {name}
                  </span>
                  {slot?.image_url && (
                    <button type="button" onClick={() => handleClearFeature(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: 0, display: 'flex', flexShrink: 0 }} title="Törlés">
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => handleFilterChange('')}
            style={{
              padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.8rem', cursor: 'pointer',
              background: !filterTrade ? 'var(--primary)' : 'var(--bg-subtle)',
              color: !filterTrade ? 'white' : 'var(--text-muted)',
              border: 'none', fontWeight: !filterTrade ? 700 : 400,
            }}
          >
            All ({images.length})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('generic')}
            style={{
              padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.8rem', cursor: 'pointer',
              background: filterTrade === 'generic' ? 'var(--primary)' : 'var(--bg-subtle)',
              color: filterTrade === 'generic' ? 'white' : 'var(--text-muted)',
              border: 'none', fontWeight: filterTrade === 'generic' ? 700 : 400,
            }}
          >
            Általános ({filterTrade === 'generic' ? images.length : genericCount})
          </button>
          {trades.map(t => {
            const count = images.filter(img => img.trade_id === t.id).length;
            if (count === 0 && filterTrade !== t.id) return null;
            return (
              <button
                key={t.id} type="button"
                onClick={() => handleFilterChange(t.id)}
                style={{
                  padding: '0.25rem 0.65rem', borderRadius: 99, fontSize: '0.8rem', cursor: 'pointer',
                  background: filterTrade === t.id ? 'var(--primary)' : 'var(--bg-subtle)',
                  color: filterTrade === t.id ? 'white' : 'var(--text-muted)',
                  border: 'none', fontWeight: filterTrade === t.id ? 700 : 400,
                }}
              >
                {t.name_hu} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Image grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
          <ImageIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.35 }} />
          <p style={{ margin: 0 }}>No images uploaded yet</p>
        </div>
      ) : (
        <>
          {lightbox && (
            <Lightbox
              images={lightbox.images}
              index={lightbox.index}
              onClose={() => setLightbox(null)}
              onNav={dir => setLightbox(lb => ({ ...lb, index: (lb.index + dir + lb.images.length) % lb.images.length }))}
            />
          )}
          {(() => {
            const horiz = images.filter(i => i.orientation === 'horizontal');
            const vert  = images.filter(i => i.orientation === 'vertical');
            return (
              <>
                <ImageGrid title="Horizontal (hero)" images={horiz} aspect="16/9" cols="repeat(auto-fill, minmax(220px, 1fr))" tradeName={tradeName} deleting={deleting} onDelete={handleDelete} onOpen={idx => setLightbox({ images: horiz, index: idx })} onSetHero={handleSetHero} settingHero={settingHero} onAssignFeature={handleAssignFeature} pickingSlot={pickingSlot} />
                <ImageGrid title="Vertical (portrait)" images={vert} aspect="3/4" cols="repeat(auto-fill, minmax(140px, 1fr))" tradeName={tradeName} deleting={deleting} onDelete={handleDelete} onOpen={idx => setLightbox({ images: vert, index: idx })} onSetHero={handleSetHero} settingHero={settingHero} onAssignFeature={handleAssignFeature} pickingSlot={pickingSlot} />
              </>
            );
          })()}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
