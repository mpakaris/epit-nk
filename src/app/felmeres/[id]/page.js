'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import CollectiveBanner from '@/components/CollectiveBanner';
import DrawingsSection from '@/components/DrawingsSection';
import {
  ArrowLeft, MapPin, Calendar, Clock, User, Edit3, Trash2,
  Play, X, ChevronLeft, ChevronRight, ChevronDown, Check, Loader2,
  FileText, FolderKanban, Home, Ruler, LayoutPanelLeft,
  Camera, Plus, AlertCircle,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import { processMediaFile } from '@/lib/mediaGate';

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const cur = media[idx];
  const isVideo = cur?.mime_type?.startsWith('video/');
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [media.length, onClose]);
  if (!cur) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}><X size={20} /></button>
      {media.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>}
      {idx > 0 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={22} /></button>}
      {idx < media.length - 1 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronRight size={22} /></button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo
          ? <video src={cur.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} />
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />}
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}>
                {m.mime_type?.startsWith('video/') ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                  : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media grid (read-only or with delete) ─────────────────────────────────────
function MediaGrid({ media, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media || media.length === 0) return null;
  const sorted = [...media].sort((a, b) => {
    const aVid = a.mime_type?.startsWith('video/') ? 1 : 0;
    const bVid = b.mime_type?.startsWith('video/') ? 1 : 0;
    return aVid - bVid;
  });
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.35rem', marginTop: '0.5rem' }}>
        {sorted.map((item, i) => {
          const isVideo = item.mime_type?.startsWith('video/');
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setLightbox(i)}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
                {isVideo
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                      <Play size={20} color="#fff" /><span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Videó</span>
                    </div>
                  : <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </button>
              {onDelete && (
                <button type="button" onClick={() => onDelete(item)}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {lightbox !== null && <Lightbox media={sorted} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Inline upload button ───────────────────────────────────────────────────────
function InlineUpload({ surveyId, entryId, mediaType, label = 'Fotók' }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(processMediaFile));
    setUploading(true); setError('');
    try { await uploadSurveyMedia(surveyId, files, { entryId, mediaType }); }
    catch (err) { setError(err.message || 'Feltöltési hiba'); }
    finally { setUploading(false); }
  };
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
        {uploading ? <><Loader2 size={13} className="animate-spin" />Feltöltés...</> : <><Camera size={13} />{label}</>}
      </button>
      {error && <span style={{ fontSize: '0.7rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
}

// ── Upload drop zone (empty state) ────────────────────────────────────────────
function InlineUploadZone({ surveyId, entryId }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(processMediaFile));
    setUploading(true); setError('');
    try { await uploadSurveyMedia(surveyId, files, { entryId, mediaType: 'photo' }); }
    catch (err) { setError(err.message || 'Feltöltési hiba'); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ width: '100%', padding: '1.25rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: uploading ? 'var(--bg-subtle)' : '#fff', cursor: uploading ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        {uploading
          ? <><Loader2 size={22} color="var(--accent)" className="animate-spin" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>Feltöltés...</span></>
          : <><Camera size={22} color="var(--text-muted)" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fotók / videók feltöltése</span><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Koppintson a galériához vagy kamerához</span></>}
      </button>
      {error && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

// ── Room/entry form ────────────────────────────────────────────────────────────
function EntryForm({ initial, surveyId, onSave, onCancel }) {
  const { uploadSurveyMedia, deleteSurveyEntry } = useApp();
  const [name, setName]               = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [widthM, setWidthM]           = useState(initial?.width_m  != null ? String(initial.width_m)  : '');
  const [lengthM, setLengthM]         = useState(initial?.length_m != null ? String(initial.length_m) : '');
  const [heightM, setHeightM]         = useState(initial?.height_m != null ? String(initial.height_m) : '');
  const [windowCount, setWindowCount] = useState(initial?.window_count != null ? String(initial.window_count) : '');
  const [doorCount, setDoorCount]     = useState(initial?.door_count   != null ? String(initial.door_count)   : '');
  const [wallM2, setWallM2]           = useState('');
  const [wallAuto, setWallAuto]       = useState(true);

  const w = parseFloat(widthM);
  const l = parseFloat(lengthM);
  const computedArea      = w > 0 && l > 0 ? w * l : null;
  const computedPerimeter = w > 0 && l > 0 ? 2 * (w + l) : null;

  useEffect(() => {
    if (!wallAuto) return;
    const h   = parseFloat(heightM);
    const ded = (parseInt(windowCount) || 0) * WINDOW_M2 + (parseInt(doorCount) || 0) * DOOR_M2;
    const net = computedPerimeter && h > 0 ? Math.max(0, computedPerimeter * h - ded) : null;
    setWallM2(net != null ? net.toFixed(2) : '');
  }, [widthM, lengthM, heightM, windowCount, doorCount, wallAuto]);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews]           = useState([]);

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const converted = await Promise.all(raw.map(processMediaFile));
    setSelectedFiles(prev => [...prev, ...converted]);
    setPreviews(prev => [...prev, ...converted.map(f => ({ key: `${f.name}-${f.size}`, isVideo: f.type.startsWith('video/'), url: f.type.startsWith('video/') ? null : URL.createObjectURL(f) }))]);
  };
  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('A hely neve kötelező!'); return; }
    setSaving(true);
    try {
      const h = parseFloat(heightM) || 0;
      const entry = await onSave({
        name: name.trim(),
        description: description.trim() || null,
        width_m:      parseFloat(widthM)  || null,
        length_m:     parseFloat(lengthM) || null,
        height_m:     h || null,
        window_count: parseInt(windowCount) || 0,
        door_count:   parseInt(doorCount)   || 0,
      });
      if (!initial && selectedFiles.length && entry?.id) {
        try { await uploadSurveyMedia(surveyId, selectedFiles, { entryId: entry.id, mediaType: 'photo' }); }
        catch (uploadErr) {
          try { await deleteSurveyEntry(surveyId, entry.id); } catch {}
          throw uploadErr;
        }
      }
      onCancel();
    } catch (err) {
      setError(err.message || 'Hiba a mentéskor');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="entry-name">Helyiség neve *</label>
        <input id="entry-name" type="text" className="form-control" autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="pl. Fürdőszoba, Konyha, Nappali" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-width">Szél. (m)</label>
          <input id="entry-width" type="number" min="0" step="0.1" className="form-control" value={widthM} onChange={e => setWidthM(e.target.value)} placeholder="pl. 3.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-length">Hossz. (m)</label>
          <input id="entry-length" type="number" min="0" step="0.1" className="form-control" value={lengthM} onChange={e => setLengthM(e.target.value)} placeholder="pl. 4.2" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-height">Magass. (m)</label>
          <input id="entry-height" type="number" min="0" step="0.05" className="form-control" value={heightM} onChange={e => setHeightM(e.target.value)} placeholder="pl. 2.6" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-windows">Ablak (db)</label>
          <input id="entry-windows" type="number" min="0" step="1" className="form-control" value={windowCount} onChange={e => setWindowCount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-doors">Ajtó (db)</label>
          <input id="entry-doors" type="number" min="0" step="1" className="form-control" value={doorCount} onChange={e => setDoorCount(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-wall">Falfel. (m²)</label>
          <input id="entry-wall" type="number" min="0" step="0.01" className="form-control" value={wallM2}
            onChange={e => { setWallAuto(false); setWallM2(e.target.value); }}
            placeholder="m²" />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem' }}>
        <label className="form-label" htmlFor="entry-desc">Megjegyzés</label>
        <textarea id="entry-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Állapot, munkák, megjegyzések…" />
      </div>
      {!initial && (
        <div style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Fotók / videók (opcionális)</label>
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={addFiles} style={{ display: 'none' }} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
          {previews.length === 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Camera size={14} /> Kamera</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Camera size={14} /> Galéria</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {previews.map((p, i) => (
                  <div key={p.key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    {p.isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div>
                      : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={10} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Plus size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" />{initial ? 'Módosítás' : selectedFiles.length > 0 ? 'Feltöltés' : 'Mentés'}</> : (initial ? 'Módosítás' : 'Helyiség hozzáadása')}
        </button>
      </div>
    </form>
  );
}

// ── Meta edit drawer (bottom sheet) ───────────────────────────────────────────
function MetaDrawer({ survey, clients, isOpen, onClose, onSave }) {
  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes]       = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(survey.title || '');
    setDate(survey.date || '');
    setLocation(survey.location || '');
    setNotes(survey.notes || '');
    setClientId(survey.client_id || '');
    setError('');
    setSaving(false);
  }, [isOpen, survey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('A felmérés neve kötelező!'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        date: date || null,
        location: location.trim(),
        notes: notes.trim(),
        client_id: clientId || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentéskor');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'auto', padding: '1.25rem 1.25rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>Alapadatok szerkesztése</span>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="sv-title">Felmérés neve *</label>
            <input id="sv-title" type="text" className="form-control" autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felmérés" />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="sv-date">Dátum</label>
              <input id="sv-date" type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="sv-location">Helyszín</label>
              <input id="sv-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. 8600 Siófok, Fő u. 12." />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="sv-client">Ügyfél</label>
            <select id="sv-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="sv-notes">Megjegyzések</label>
            <textarea id="sv-notes" rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felmérési megjegyzések, részletek…" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Mégse</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={15} className="animate-spin" />Mentés…</> : <><Check size={15} />Mentés</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Area summary ──────────────────────────────────────────────────────────────
const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

function AreaSummary({ entry }) {
  const { width_m, length_m, size_m2, height_m, window_count, door_count } = entry;
  const w = Number(width_m), l = Number(length_m);
  const floorArea = w > 0 && l > 0 ? w * l : (size_m2 != null ? Number(size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const hasFloor = floorArea != null;
  const hasWall  = height_m != null && perimeter != null;
  if (!hasFloor && !hasWall) return null;

  const windowArea = (window_count || 0) * WINDOW_M2;
  const doorArea   = (door_count   || 0) * DOOR_M2;
  const openings   = windowArea + doorArea;
  const grossWall  = hasWall ? perimeter * height_m : null;
  const netWall    = grossWall != null ? Math.max(0, grossWall - openings) : null;

  const fmt = v => Number(v).toFixed(2).replace('.', ',') + ' m²';
  const Row = ({ label, value, sub, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: sub ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: sub ? 400 : 600, paddingLeft: sub ? '0.75rem' : 0 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: bold ? 800 : 600, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginTop: '0.65rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Területek</div>
      {hasFloor && <Row label="Padló / Mennyezet" value={fmt(floorArea)} />}
      {grossWall != null && <Row label="Falfelület (bruttó)" value={fmt(grossWall)} />}
      {openings > 0 && <Row label={`Kivonások (${window_count || 0} ablak + ${door_count || 0} ajtó)`} value={`− ${fmt(openings)}`} sub />}
      {netWall != null && <Row label="Falfelület (nettó)" value={fmt(netWall)} bold />}
      {!hasWall && openings > 0 && <Row label="Nyílások összesen" value={fmt(openings)} sub />}
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Ablak: ~1,5 m² · Ajtó: ~2,0 m² (standard becslés)</div>
    </div>
  );
}

const PILL      = { fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };
const PILL_DARK = { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };

// ── Survey entry card (collapsible, offers-style dark header) ─────────────────
function SurveyEntryCard({ entry, surveyId, canEditEntry, canAdd, onEdit, onDelete, handleDeleteMedia, drawings, createSurveyDrawing, deleteSurveyDrawing, canDrawings, currentUser }) {
  const hasContent = !!(entry.description || entry.media?.length || drawings.filter(d => d.entry_id === entry.id).length);
  const [collapsed, setCollapsed] = useState(!hasContent);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #cbd5e1' }}>
      {/* Dark header — click to collapse */}
      <div
        style={{ background: '#1e3a5f', padding: '0.85rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <ChevronDown size={16} color="rgba(255,255,255,0.6)" style={{ transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{entry.name}</span>
          {entry.size_m2   != null && <span style={PILL_DARK}><Ruler size={10} />{Number(entry.size_m2).toFixed(1).replace('.', ',')} m²</span>}
          {entry.height_m  != null && <span style={PILL_DARK}>{entry.height_m} m mag.</span>}
          {entry.window_count > 0   && <span style={PILL_DARK}>{entry.window_count} ablak</span>}
          {entry.door_count   > 0   && <span style={PILL_DARK}>{entry.door_count} ajtó</span>}
          {entry.media?.length > 0  && <span style={PILL_DARK}>{entry.media.length} fotó</span>}
        </div>
        {canEditEntry && (
          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={onEdit} style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Edit3 size={13} /></button>
            <button type="button" onClick={onDelete} style={{ padding: '0.3rem 0.5rem', background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.45)', color: '#fca5a5', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}><Trash2 size={13} /></button>
          </div>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div style={{ padding: '1rem' }}>
          {entry.description && (
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
          )}

          <AreaSummary entry={entry} />

          <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            {entry.media?.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{entry.media.length} fotó / videó</span>
                  {canAdd && <InlineUpload surveyId={surveyId} entryId={entry.id} mediaType="photo" label="Hozzáadás" />}
                </div>
                <MediaGrid media={entry.media} onDelete={canEditEntry ? handleDeleteMedia : undefined} />
              </>
            ) : canAdd ? (
              <InlineUploadZone surveyId={surveyId} entryId={entry.id} />
            ) : null}
          </div>

          <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <DrawingsSection
              drawings={drawings.filter(d => d.entry_id === entry.id)}
              onSave={canDrawings ? (svg => createSurveyDrawing(surveyId, { svg_data: svg, entry_id: entry.id })) : undefined}
              onDelete={canDrawings ? (drawingId => deleteSurveyDrawing(surveyId, drawingId)) : undefined}
              canEdit={canDrawings}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    loading, dataReady, surveys, quotes, projects, clients, users,
    isAdmin, currentUser, collectives,
    deleteSurvey, updateSurvey, deleteSurveyMedia,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey, surveyDrawingsBySurvey,
    fetchSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
    createSurveyDrawing, deleteSurveyDrawing,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

  const [detailLoading, setDetailLoading] = useState(true);
  const [confirmModal, setConfirmModal]   = useState(null);
  const [alertModal, setAlertModal]       = useState(null);
  const [showMetaDrawer, setShowMetaDrawer] = useState(false);
  const [showAddEntry, setShowAddEntry]   = useState(false);
  const [editingEntry, setEditingEntry]   = useState(null);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  if (loading || !dataReady) return <PageSpinner />;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href={`${navPrefix}/felmeres`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client   = clients.find(c => c.id === survey.client_id);
  const creator  = users.find(u => u.id === survey.created_by);
  const layouts  = surveyLayoutsBySurvey[id]  || [];
  const entries  = surveyEntriesBySurvey[id]  || [];
  const drawings = surveyDrawingsBySurvey[id] || [];

  const isOwner          = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
  const isSharedMember   = (survey.shared_with || []).includes(currentUser?.id);
  const myCollectiveRole = collectives?.find(c => c.collective_id === survey.collective_id)?.role;
  const isKollektivOwner = myCollectiveRole === 'owner' || myCollectiveRole === 'admin';
  const isCollMember     = !!myCollectiveRole;
  // Any member can add entries/upload; only creator or collective owner can edit/delete specific entries
  const canAdd       = isAdmin || isOwner || isSharedMember || isCollMember;
  const canEditMeta  = isAdmin || isKollektivOwner || isOwner;
  const canDrawings  = isAdmin || isKollektivOwner || isOwner;
  const canEditEntry = (entry) => isAdmin || isKollektivOwner || entry.created_by === currentUser?.id;

  const sharedMembers = (survey.shared_with || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);

  const linkedQuote   = quotes.find(q => q.survey_id === id);
  const linkedProject = projects.find(p => p.survey_id === id);

  const handleDeleteSurvey = () => {
    const entryCount   = entries.length;
    const mediaCount   = [
      ...layouts,
      ...(surveyMediaBySurvey[id] || []),
      ...entries.flatMap(e => e.media || []),
    ].length;
    const drawingCount = drawings.length;

    const parts = [];
    if (entryCount)   parts.push(`${entryCount} helyiség`);
    if (mediaCount)   parts.push(`${mediaCount} fotó / videó`);
    if (drawingCount) parts.push(`${drawingCount} vázlat`);

    const detail = parts.length
      ? ` Véglegesen törlődik: ${parts.join(', ')}. Ez nem vonható vissza.`
      : ' Ez nem vonható vissza.';

    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést?${detail}`,
      onConfirm: async () => {
        try { await deleteSurvey(id); router.push(`${navPrefix}/felmeres`); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleDeleteMedia = (item) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a fájlt?',
      onConfirm: async () => {
        try { await deleteSurveyMedia(item.id, id, item.entry_id, item.media_type); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleDeleteEntry = (entry) => {
    const mediaCount    = entry.media?.length || 0;
    const drawingCount  = drawings.filter(d => d.entry_id === entry.id).length;
    const parts = [];
    if (mediaCount)   parts.push(`${mediaCount} fotó / videó`);
    if (drawingCount) parts.push(`${drawingCount} vázlat`);
    const detail = parts.length
      ? ` Ezzel együtt törlődik: ${parts.join(', ')}.`
      : '';
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.name}" helyiséget?${detail}`,
      onConfirm: async () => {
        try { await deleteSurveyEntry(id, entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`${navPrefix}/felmeres`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a felmérésekhez
        </Link>
      </div>

      <CollectiveBanner />

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{survey.title}</h1>
          {canEditMeta && (
            <button type="button" onClick={handleDeleteSurvey} className="btn btn-danger btn-sm">
              <Trash2 size={14} /> Törlés
            </button>
          )}
        </div>
      </div>

      {/* Meta card */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
            {client && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={15} color="var(--accent)" />
                <Link href={`${navPrefix}/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{client.name}</Link>
              </div>
            )}
            {survey.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} color="var(--accent)" />{survey.location}</span>}
            {survey.date && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} color="var(--accent)" />{formatDate(survey.date)}</span>}
            {creator && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}><User size={13} />Rögzítette: {creator.display_name}</span>}
            {survey.created_at && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}><Clock size={13} />{new Date(survey.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          {canEditMeta && (
            <button type="button" onClick={() => setShowMetaDrawer(true)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem', flexShrink: 0 }}>
              <Edit3 size={13} />
            </button>
          )}
        </div>

        {sharedMembers.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Résztvevők:</span>
            {sharedMembers.map(u => (
              <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 700, color: u.id === currentUser?.id ? 'var(--accent)' : 'var(--text-secondary)', background: u.id === currentUser?.id ? 'var(--accent-light)' : 'var(--bg-subtle)', border: `1px solid ${u.id === currentUser?.id ? 'var(--accent-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-pill)', padding: '0.15rem 0.5rem' }}>
                {u.display_name}{u.id === currentUser?.id ? ' (Ön)' : ''}
              </span>
            ))}
          </div>
        )}
        {survey.notes && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {survey.notes}
          </div>
        )}
      </div>

      {/* Layouts */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutPanelLeft size={15} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Alaprajzok ({layouts.length})
            </span>
          </div>
          {canAdd && !detailLoading && (
            <InlineUpload surveyId={id} entryId={null} mediaType="layout" label="Alaprajz hozzáadása" />
          )}
        </div>
        {detailLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Betöltés...</div>
        ) : layouts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.75rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            {canAdd ? 'Nincs alaprajz feltöltve. (Opcionális)' : 'Nincs alaprajz feltöltve.'}
          </div>
        ) : (
          <MediaGrid media={layouts} onDelete={canEditMeta ? handleDeleteMedia : undefined} />
        )}
      </div>

      {/* Survey-level drawings */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <DrawingsSection
          drawings={drawings.filter(d => !d.entry_id)}
          onSave={canDrawings ? (svg => createSurveyDrawing(id, { svg_data: svg })) : undefined}
          onDelete={canDrawings ? (drawingId => deleteSurveyDrawing(id, drawingId)) : undefined}
          canEdit={canDrawings}
        />
      </div>

      {/* Rooms */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={15} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Helyiségek ({entries.length})</h2>
          </div>
          {canAdd && entries.length < 30 && (
            <button type="button" onClick={() => { setShowAddEntry(true); setEditingEntry(null); }} className="btn btn-primary btn-sm">
              <Plus size={14} /> Helyiség hozzáadása
            </button>
          )}
          {canAdd && entries.length >= 30 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Maximum 30 helyiség</span>
          )}
        </div>

        {canAdd && showAddEntry && !editingEntry && (
          <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Új helyiség</div>
            <EntryForm
              surveyId={id}
              onSave={(fields) => createSurveyEntry(id, fields)}
              onCancel={() => setShowAddEntry(false)}
            />
          </div>
        )}

        {!detailLoading && entries.length === 0 && !showAddEntry && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Home size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ marginBottom: canAdd ? '1rem' : 0 }}>Még nincsenek helyiségek.</p>
            {canAdd && entries.length < 30 && (
              <button type="button" onClick={() => setShowAddEntry(true)} className="btn btn-primary btn-sm">
                <Plus size={14} /> Helyiség hozzáadása
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map(entry => (
            <div key={entry.id}>
              {canEditEntry(entry) && editingEntry?.id === entry.id ? (
                <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Szerkesztés: {entry.name}</div>
                  <EntryForm
                    initial={entry}
                    surveyId={id}
                    onSave={(fields) => updateSurveyEntry(id, entry.id, fields)}
                    onCancel={() => setEditingEntry(null)}
                  />
                </div>
              ) : (
                <SurveyEntryCard
                  entry={entry}
                  surveyId={id}
                  canEditEntry={canEditEntry(entry)}
                  canAdd={canAdd}
                  onEdit={() => { setEditingEntry(entry); setShowAddEntry(false); }}
                  onDelete={() => handleDeleteEntry(entry)}
                  handleDeleteMedia={handleDeleteMedia}
                  drawings={drawings}
                  createSurveyDrawing={createSurveyDrawing}
                  deleteSurveyDrawing={deleteSurveyDrawing}
                  canDrawings={canDrawings}
                  currentUser={currentUser}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Linked offer / project — only shown when something is linked */}
      {(linkedQuote || linkedProject) && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Kapcsolódó
          </div>
          {linkedProject && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: linkedQuote ? '0.5rem' : 0 }}>
              <FolderKanban size={15} color="var(--success)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--success-text)' }}>
                Projekt: <Link href={`${navPrefix}/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)' }}>{linkedProject.name}</Link>
              </span>
            </div>
          )}
          {linkedQuote && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={15} color="var(--warning-text)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--warning-text)' }}>
                Ajánlat: <Link href={`${navPrefix}/ajanlatok/${linkedQuote.id}`} style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{linkedQuote.title}</Link>
              </span>
            </div>
          )}
        </div>
      )}

      <MetaDrawer
        survey={survey}
        clients={clients}
        isOpen={showMetaDrawer}
        onClose={() => setShowMetaDrawer(false)}
        onSave={(fields) => updateSurvey(id, fields)}
      />

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
