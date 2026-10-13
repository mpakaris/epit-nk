'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import EntitySelector from '@/components/EntitySelector';
import {
  ArrowLeft, MapPin, Calendar, User, Check, Loader2, Plus, Trash2, Edit3,
  Camera, Play, X, ChevronLeft, ChevronRight,
  FileText, AlertCircle, Home, Ruler, LayoutPanelLeft,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import { convertIfHeif } from '@/lib/imageUtils';

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
        {isVideo ? <video src={cur.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} />
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

function InlineUpload({ surveyId, entryId, mediaType, label = 'Fotók' }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(convertIfHeif));
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

function InlineUploadZone({ surveyId, entryId }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const files = await Promise.all(raw.map(convertIfHeif));
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

function MediaGrid({ media, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media || media.length === 0) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.35rem', marginTop: '0.5rem' }}>
        {media.map((item, i) => {
          const isVideo = item.mime_type?.startsWith('video/');
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setLightbox(i)}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
                {isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}><Play size={20} color="#fff" /></div>
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
      {lightbox !== null && <Lightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

function EntryForm({ initial, surveyId, onSave, onCancel }) {
  const { uploadSurveyMedia, deleteSurveyEntry } = useApp();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [sizeM2, setSizeM2] = useState(initial?.size_m2 != null ? String(initial.size_m2) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const converted = await Promise.all(raw.map(convertIfHeif));
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
      const entry = await onSave({ name: name.trim(), description: description.trim() || null, size_m2: sizeM2 ? Number(sizeM2) : null });
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
      <div className="grid-2col">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-size">Alapterület (m²)</label>
          <input id="entry-size" type="number" min="0" step="0.1" className="form-control" value={sizeM2} onChange={e => setSizeM2(e.target.value)} placeholder="pl. 12.5" />
        </div>
        <div />
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
          {saving ? (selectedFiles.length > 0 && !initial ? 'Feltöltés...' : 'Mentés...') : (initial ? 'Módosítás' : 'Helyiség hozzáadása')}
        </button>
      </div>
    </form>
  );
}

// ── Edit page ─────────────────────────────────────────────────────────────────
export default function SurveyEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    loading, dataReady, surveys, clients, users,
    isAdmin, currentUser, effectiveEntityId, effectiveMemberships,
    updateSurvey, deleteSurveyMedia,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey,
    fetchSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
  } = useApp();

  const [entityId, setEntityId] = useState(null);

  const [detailLoading, setDetailLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  // Header form state (local — saved explicitly via "Mentés")
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [clientId, setClientId] = useState('');

  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  useEffect(() => {
    if (initialized) return;
    const survey = surveys.find(s => s.id === id);
    if (!survey) return;
    setTitle(survey.title || '');
    setDate(survey.date || '');
    setLocation(survey.location || '');
    setNotes(survey.notes || '');
    setClientId(survey.client_id || '');
    setEntityId(survey.entity_id || null);
    setInitialized(true);
  }, [surveys, id, initialized]);

  if (loading || !dataReady || !initialized) return <PageSpinner />;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href="/felmeres" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const isSharedMember = (survey.shared_with || []).includes(currentUser?.id);
  const canEdit = isAdmin || isSharedMember;
  if (!canEdit) { router.replace(`/felmeres/${id}`); return null; }

  const layouts = surveyLayoutsBySurvey[id] || [];
  const entries = surveyEntriesBySurvey[id] || [];

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
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.name}" helyiséget? A hozzá tartozó fotók is törlődnek.`,
      onConfirm: async () => {
        try { await deleteSurveyEntry(id, entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const saveHeader = async () => {
    if (!title.trim()) { setSaveError('A felmérés neve kötelező!'); return false; }
    setSaveError('');
    await updateSurvey(id, {
      title: title.trim(),
      date: date || null,
      location: location.trim(),
      notes: notes.trim(),
      client_id: clientId || null,
      ...(entityId ? { entity_id: entityId } : {}),
    });
    return true;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (await saveHeader()) router.push(`/felmeres/${id}`);
    } catch (err) {
      setSaveError(err.message || 'Hiba a mentésekor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOffer = async () => {
    setIsSaving(true);
    try {
      if (!(await saveHeader())) return;
      const toQuoteParams = new URLSearchParams();
      toQuoteParams.set('from_survey', id);
      if (survey.entity_id) toQuoteParams.set('entity_id', survey.entity_id);
      if (title.trim()) toQuoteParams.set('title', title.trim());
      if (clientId) toQuoteParams.set('client_id', clientId);
      if (location.trim()) toQuoteParams.set('location', location.trim());
      if (notes.trim()) toQuoteParams.set('description', notes.trim());
      router.push(`/ajanlatok/uj?${toQuoteParams.toString()}`);
    } catch (err) {
      setSaveError(err.message || 'Hiba a mentésekor');
      setIsSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/felmeres/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a megtekintéshez
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="page-title">Felmérés szerkesztése</h1>
        <p className="page-subtitle" style={{ wordBreak: 'break-word' }}>{survey.title}</p>
      </div>

      {saveError && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{saveError}</span>
        </div>
      )}

      {/* Header fields — inline editing (admin only for header, shared members can still edit rooms) */}
      {isAdmin && (
        <>
        <EntitySelector value={entityId || effectiveEntityId} onChange={setEntityId} memberships={effectiveMemberships} />
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alapadatok</div>

          <div className="form-group">
            <label className="form-label" htmlFor="sv-title">Felmérés neve *</label>
            <input id="sv-title" type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felmérés" />
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
            <label className="form-label" htmlFor="sv-notes">Megjegyzések</label>
            <textarea id="sv-notes" rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felmérési megjegyzések, részletek…" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="sv-client">Ügyfél</label>
            <select id="sv-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        </>
      )}

      {/* Layouts */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutPanelLeft size={15} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Alaprajzok ({layouts.length})
            </span>
          </div>
          {!detailLoading && <InlineUpload surveyId={id} entryId={null} mediaType="layout" label="Alaprajz hozzáadása" />}
        </div>
        {detailLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Betöltés...</div>
        ) : layouts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.75rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            Nincs alaprajz feltöltve. (Opcionális)
          </div>
        ) : (
          <MediaGrid media={layouts} onDelete={handleDeleteMedia} />
        )}
      </div>

      {/* Rooms */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={15} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Helyiségek ({entries.length})</h2>
          </div>
          <button type="button" onClick={() => { setShowAddEntry(true); setEditingEntry(null); }} className="btn btn-primary btn-sm">
            <Plus size={14} /> Helyiség hozzáadása
          </button>
        </div>

        {showAddEntry && !editingEntry && (
          <div className="card mb-3" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)' }}>
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
            <p style={{ marginBottom: '1rem' }}>Még nincsenek helyiségek.</p>
            <button type="button" onClick={() => setShowAddEntry(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Helyiség hozzáadása
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map(entry => (
            <div key={entry.id}>
              {editingEntry?.id === entry.id ? (
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
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: (entry.description || entry.size_m2 || entry.media?.length) ? '0.65rem' : 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{entry.name}</span>
                        {entry.size_m2 != null && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Ruler size={11} />{entry.size_m2} m²
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => { setEditingEntry(entry); setShowAddEntry(false); }} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Edit3 size={13} /></button>
                      <button type="button" onClick={() => handleDeleteEntry(entry)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    {entry.media?.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{entry.media.length} fotó / videó</span>
                          <InlineUpload surveyId={id} entryId={entry.id} mediaType="photo" label="Hozzáadás" />
                        </div>
                        <MediaGrid media={entry.media} onDelete={handleDeleteMedia} />
                      </>
                    ) : (
                      <InlineUploadZone surveyId={id} entryId={entry.id} />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <Link href={`/felmeres/${id}`} className="btn btn-secondary" style={{ pointerEvents: isSaving ? 'none' : 'auto' }}>
          Vissza
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={handleCreateOffer}>
            {isSaving ? <><Loader2 size={15} className="animate-spin" />Mentés…</> : <><FileText size={15} />Ajánlat létrehozása</>}
          </button>
          <button type="button" className="btn btn-primary" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <><Loader2 size={15} className="animate-spin" />Mentés…</> : <><Check size={15} />Felmérés mentése</>}
          </button>
        </div>
      </div>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
