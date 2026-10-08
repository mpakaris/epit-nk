'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, MapPin, Calendar, User, Edit3, Trash2, Plus,
  Camera, Play, X, ChevronLeft, ChevronRight,
  FileText, FolderKanban, AlertCircle, Loader2, Check,
  Maximize2, LayoutPanelLeft, Home, Ruler
} from 'lucide-react';

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
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
        }
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}>
                {m.mime_type?.startsWith('video/')
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                  : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline upload button ──────────────────────────────────────────────────────
function InlineUpload({ surveyId, entryId, mediaType, label = 'Fotók' }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      await uploadSurveyMedia(surveyId, files, { entryId, mediaType });
    } catch (err) {
      setError(err.message || 'Feltöltési hiba');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="btn btn-secondary btn-sm"
        style={{ fontSize: '0.75rem' }}
      >
        {uploading
          ? <><Loader2 size={13} className="animate-spin" />Feltöltés...</>
          : <><Camera size={13} />{label}</>
        }
      </button>
      {error && <span style={{ fontSize: '0.7rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
}

// ── Full-width upload zone (shown when an entry has no photos yet) ────────────
function InlineUploadZone({ surveyId, entryId }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      await uploadSurveyMedia(surveyId, files, { entryId, mediaType: 'photo' });
    } catch (err) {
      setError(err.message || 'Feltöltési hiba');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%', padding: '1.25rem', border: '2px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-md)', background: uploading ? 'var(--bg-subtle)' : '#fff',
          cursor: uploading ? 'default' : 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
      >
        {uploading
          ? <><Loader2 size={22} color="var(--accent)" className="animate-spin" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>Feltöltés...</span></>
          : <><Camera size={22} color="var(--text-muted)" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fotók / videók feltöltése</span><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Koppintson a galériához vagy kamerához</span></>
        }
      </button>
      {error && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}

// ── Media grid ────────────────────────────────────────────────────────────────
function MediaGrid({ media, isAdmin, onDelete }) {
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
                {isVideo
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                      <Play size={20} color="#fff" />
                      <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Videó</span>
                    </div>
                  : <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </button>
              {isAdmin && (
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

// ── Entry form (isolated — its own state won't re-render the parent) ──────────
function EntryForm({ initial, surveyId, onSave, onCancel }) {
  const { uploadSurveyMedia } = useApp();

  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [sizeM2, setSizeM2] = useState(initial?.size_m2 != null ? String(initial.size_m2) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Photo picker — only for new entries (edit only changes metadata)
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const addFiles = (e) => {
    const arr = Array.from(e.target.files || []);
    if (!arr.length) return;
    setSelectedFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => ({
      key: `${f.name}-${f.size}`,
      isVideo: f.type.startsWith('video/'),
      url: f.type.startsWith('video/') ? null : URL.createObjectURL(f),
    }))]);
    e.target.value = '';
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
        await uploadSurveyMedia(surveyId, selectedFiles, { entryId: entry.id, mediaType: 'photo' });
      }
      onCancel();
    } catch (err) {
      setError(err.message || 'Hiba a mentéskor');
      setSaving(false);
    }
  };

  const isNew = !initial;

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

      {/* Photo section — only for new entries */}
      {isNew && (
        <div style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Fotók / videók (opcionális)</label>
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={addFiles} style={{ display: 'none' }} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />

          {previews.length === 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Camera size={14} /> Kamera
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Camera size={14} /> Galéria
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {previews.map((p, i) => (
                  <div key={p.key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    {p.isVideo
                      ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div>
                      : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    }
                    <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving
            ? (selectedFiles.length > 0 && !initial ? 'Feltöltés...' : 'Mentés...')
            : (initial ? 'Módosítás' : 'Helyiség hozzáadása')
          }
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    loading, dataReady, surveys, quotes, projects, clients, users,
    isAdmin,
    updateSurvey, deleteSurvey,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey,
    fetchSurveyMedia, deleteSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
    createClient, effectiveEntityId,
  } = useApp();

  const [detailLoading, setDetailLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  if (loading || !dataReady) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href="/felmeres" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client = clients.find(c => c.id === survey.client_id);
  const creator = users.find(u => u.id === survey.created_by);
  const photos = surveyMediaBySurvey[id] || [];
  const layouts = surveyLayoutsBySurvey[id] || [];
  const entries = surveyEntriesBySurvey[id] || [];
  const linkedQuote = quotes.find(q => q.survey_id === id);
  const linkedProject = projects.find(p => p.survey_id === id);

  const openEdit = () => {
    setEditForm({ title: survey.title, date: survey.date || '', location: survey.location || '', notes: survey.notes || '', client_id: survey.client_id || '' });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title?.trim()) { setEditError('A cím kötelező!'); return; }
    setIsSaving(true);
    try {
      await updateSurvey(id, { title: editForm.title.trim(), date: editForm.date || null, location: editForm.location.trim(), notes: editForm.notes.trim(), client_id: editForm.client_id || null });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err.message || 'Hiba a mentésekor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSurvey = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést? Minden helyiség, fotó és videó is törlődik.`,
      onConfirm: async () => {
        try { await deleteSurvey(id); router.push('/felmeres'); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const handleDeleteMedia = (item) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a fájlt?',
      onConfirm: async () => {
        try { await deleteSurveyMedia(item.id, id, item.entry_id, item.media_type); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const handleDeleteEntry = (entry) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.name}" helyiséget? A hozzá tartozó fotók is törlődnek.`,
      onConfirm: async () => {
        try { await deleteSurveyEntry(id, entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const toQuoteParams = new URLSearchParams();
  toQuoteParams.set('from_survey', id);
  if (survey.title) toQuoteParams.set('title', survey.title);
  if (survey.client_id) toQuoteParams.set('client_id', survey.client_id);
  if (survey.location) toQuoteParams.set('location', survey.location);
  if (survey.notes) toQuoteParams.set('description', survey.notes);

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/felmeres" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a felmérésekhez
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{survey.title}</h1>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={openEdit} className="btn btn-secondary btn-sm"><Edit3 size={14} /> Szerkesztés</button>
              <button type="button" onClick={handleDeleteSurvey} className="btn btn-danger btn-sm"><Trash2 size={14} /> Törlés</button>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="var(--accent)" />
              <Link href={`/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{client.name}</Link>
            </div>
          )}
          {survey.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} color="var(--accent)" />{survey.location}</span>}
          {survey.date && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} color="var(--accent)" />{formatDate(survey.date)}</span>}
          {creator && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rögzítette: {creator.display_name}</span>}
        </div>
        {survey.notes && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {survey.notes}
          </div>
        )}
      </div>

      {/* ── Alaprajzok (Layouts) ─────────────────────────────────────────── */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutPanelLeft size={15} color="var(--accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Alaprajzok ({layouts.length})
            </span>
          </div>
          {isAdmin && !detailLoading && (
            <InlineUpload surveyId={id} entryId={null} mediaType="layout" label="Alaprajz hozzáadása" />
          )}
        </div>
        {detailLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Betöltés...</div>
        ) : layouts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.75rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            Nincs alaprajz feltöltve. (Opcionális)
          </div>
        ) : (
          <MediaGrid media={layouts} isAdmin={isAdmin} onDelete={handleDeleteMedia} />
        )}
      </div>

      {/* ── Helyiségek (Entries) ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={15} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Helyiségek ({entries.length})</h2>
          </div>
          {isAdmin && (
            <button type="button" onClick={() => { setShowAddEntry(true); setEditingEntry(null); }} className="btn btn-primary btn-sm">
              <Plus size={14} /> Helyiség hozzáadása
            </button>
          )}
        </div>

        {/* Add entry inline form */}
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
            <p style={{ marginBottom: '1rem' }}>Még nincsenek helyiségek. Adja hozzá az első helyiséget!</p>
            {isAdmin && (
              <button type="button" onClick={() => setShowAddEntry(true)} className="btn btn-primary btn-sm">
                <Plus size={14} /> Helyiség hozzáadása
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map(entry => (
            <div key={entry.id}>
              {/* Edit form inline */}
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
                  {/* Entry header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: entry.description || entry.size_m2 ? '0.65rem' : (entry.media?.length ? '0.65rem' : 0) }}>
                    <div>
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
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                        <button type="button" onClick={() => { setEditingEntry(entry); setShowAddEntry(false); }} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Edit3 size={13} /></button>
                        <button type="button" onClick={() => handleDeleteEntry(entry)} className="btn btn-danger btn-sm" style={{ padding: '0.3rem 0.5rem' }}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Entry media */}
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    {entry.media?.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {entry.media.length} fotó / videó
                          </span>
                          {isAdmin && (
                            <InlineUpload surveyId={id} entryId={entry.id} mediaType="photo" label="Hozzáadás" />
                          )}
                        </div>
                        <MediaGrid media={entry.media} isAdmin={isAdmin} onDelete={handleDeleteMedia} />
                      </>
                    ) : (
                      isAdmin
                        ? <InlineUploadZone surveyId={id} entryId={entry.id} />
                        : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Nincs fotó feltöltve.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Kapcsolódó ajánlat ───────────────────────────────────────────── */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Kapcsolódó ajánlat
        </div>
        {linkedProject ? (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: linkedQuote ? '0.5rem' : 0 }}>
            <FolderKanban size={15} color="var(--success)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--success-text)' }}>
              Projekt: <Link href={`/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)' }}>{linkedProject.name}</Link>
            </span>
          </div>
        ) : null}
        {linkedQuote ? (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} color="var(--warning-text)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--warning-text)' }}>
              Ajánlat: <Link href={`/ajanlatok/${linkedQuote.id}`} style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{linkedQuote.title}</Link>
            </span>
          </div>
        ) : (
          isAdmin && !linkedProject && (
            <Link href={`/ajanlatok/uj?${toQuoteParams.toString()}`} className="btn btn-secondary btn-sm">
              <FileText size={14} /> Ajánlat létrehozása ebből a felmérésből
            </Link>
          )
        )}
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Felmérés szerkesztése">
        {editError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{editError}</span>
          </div>
        )}
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label">Felmérés neve *</label>
            <input type="text" className="form-control" required value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Dátum</label>
              <input type="date" className="form-control" value={editForm.date || ''} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Helyszín</label>
              <input type="text" className="form-control" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Megjegyzések</label>
            <textarea rows={3} className="form-control" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Ügyfél</label>
            <select className="form-control" value={editForm.client_id || ''} onChange={e => setEditForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
              {isSaving ? 'Mentés...' : 'Módosítás mentése'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
