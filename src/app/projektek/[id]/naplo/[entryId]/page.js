'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Camera, X, Upload, CheckCircle2, Lock, Eye,
  HardHat, Video, Image, Loader2, Trash2
} from 'lucide-react';

const MAX_PHOTOS = 10;

const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

function PhotoGrid({ photos, onDelete, deletingId, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {photos.map(photo => {
        const isVideo = photo.mime_type?.startsWith('video/');
        const isDeleting = deletingId === photo.id;
        return (
          <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.15s' }}>
            {isVideo
              ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={26} color="var(--accent)" /></div>
              : <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <button type="button" disabled={isDeleting || disabled} onClick={() => onDelete(photo.id)}
              style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NewPhotoGrid({ previews, onRemove, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {previews.map((p, i) => (
        <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px dashed var(--accent-border)', background: 'var(--accent-light)' }}>
          {p.isVideo
            ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={26} color="var(--accent)" /></div>
            : p.url
              ? <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={26} color="var(--accent)" /></div>}
          <div style={{ position: 'absolute', top: 2, left: 2, background: 'var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>ÚJ</div>
          <button type="button" disabled={disabled} onClick={() => onRemove(i)}
            style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function MediaButtons({ disabled, count, existing, onCamera, onGallery }) {
  if (count + existing >= MAX_PHOTOS) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="button" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }} disabled={disabled} onClick={onCamera}>
        <Camera size={14} /> Fényképezés
      </button>
      <button type="button" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }} disabled={disabled} onClick={onGallery}>
        <Upload size={14} /> Galéria
      </button>
    </div>
  );
}

export default function EditDiaryEntryPage() {
  const { id: projectId, entryId } = useParams();
  const router = useRouter();
  const {
    projects, diaryEntriesByProject, projectRooms: ctxProjectRooms,
    uploadDiaryPhotos, updateDiaryEntry, deleteDiaryPhoto,
  } = useApp();

  const project = projects.find(p => p.id === projectId);
  const entry = (diaryEntriesByProject[projectId] || []).find(e => e.id === entryId);

  const [entryDate, setEntryDate] = useState('');
  const [workType, setWorkType] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [roomId, setRoomId] = useState('');

  const [newClientFiles, setNewClientFiles] = useState([]);
  const [newClientPreviews, setNewClientPreviews] = useState([]);
  const [newPrivateFiles, setNewPrivateFiles] = useState([]);
  const [newPrivatePreviews, setNewPrivatePreviews] = useState([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  const clientCameraRef = useRef(null);
  const clientGalleryRef = useRef(null);
  const privateCameraRef = useRef(null);
  const privateGalleryRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title || '');
    setEntryDate(entry.entry_date || '');
    setWorkType(entry.work_type || '');
    setBody(entry.body || '');
    setInternalNote(entry.internal_note || '');
    setIsPublic(Boolean(entry.is_public));
    setRoomId(entry.room_id || '');
  }, [entry?.id]);

  const makeAddFiles = (setFiles, setPreviews, currentFiles) => async (raw) => {
    if (!raw || raw.length === 0) return;
    const existing = (entry?.photos || []).length;
    const remaining = MAX_PHOTOS - existing - currentFiles.length;
    if (remaining <= 0) return;
    const converted = await Promise.all(Array.from(raw).slice(0, remaining).map(processMediaFile));
    setFiles(prev => [...prev, ...converted]);
    setPreviews(prev => [
      ...prev,
      ...converted.map(f => ({
        url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        name: f.name,
        isVideo: f.type.startsWith('video/'),
      })),
    ]);
  };

  const makeRemoveFile = (setFiles, setPreviews) => (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => {
      const removed = prev[i];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const addClientFiles = makeAddFiles(setNewClientFiles, setNewClientPreviews, newClientFiles);
  const addPrivateFiles = makeAddFiles(setNewPrivateFiles, setNewPrivatePreviews, newPrivateFiles);
  const removeClientFile = makeRemoveFile(setNewClientFiles, setNewClientPreviews);
  const removePrivateFile = makeRemoveFile(setNewPrivateFiles, setNewPrivatePreviews);

  const handleDeleteExisting = async (photoId) => {
    setDeletingPhotoId(photoId);
    try {
      await deleteDiaryPhoto(photoId, projectId);
    } catch (err) {
      setAlertModal({ message: err.message || 'Hiba a fotó törlésekor' });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setAlertModal({ message: 'A cím megadása kötelező!' }); return; }

    let addPhotoIds = [];
    if (newClientFiles.length > 0 || newPrivateFiles.length > 0) {
      setUploading(true);
      try {
        const [clientPhotos, privatePhotos] = await Promise.all([
          newClientFiles.length > 0 ? uploadDiaryPhotos(projectId, newClientFiles, false) : Promise.resolve([]),
          newPrivateFiles.length > 0 ? uploadDiaryPhotos(projectId, newPrivateFiles, true) : Promise.resolve([]),
        ]);
        addPhotoIds = [...clientPhotos, ...privatePhotos].map(p => p.id);
      } catch (err) {
        setAlertModal({ message: err.message || 'Hiba a médiafájlok feltöltésekor' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    try {
      await updateDiaryEntry(entryId, {
        title: title.trim(),
        body: body.trim() || null,
        entry_date: entryDate || undefined,
        work_type: workType.trim() || null,
        internal_note: internalNote.trim() || null,
        is_public: isPublic,
        room_id: roomId || null,
        add_photo_ids: addPhotoIds.length > 0 ? addPhotoIds : undefined,
      });
      router.push(`/projektek/${projectId}?tab=naplo`);
    } catch (err) {
      setAlertModal({ message: err.message || 'Hiba a mentésnél' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!project || !entry) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>A bejegyzés nem található</h2>
        <Link href={`/projektek/${projectId}?tab=naplo`} className="btn btn-secondary btn-sm"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const projectRooms = (ctxProjectRooms || []).filter(r => r.project_id === projectId);
  const existingPhotos = entry.photos || [];
  const isProcessing = uploading || submitting;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/projektek/${projectId}?tab=naplo`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a naplóhoz
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <h1 className="page-title">Bejegyzés szerkesztése</h1>
        <p className="page-subtitle">{project.name}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── Alapadatok ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <HardHat size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Alapadatok</h3>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="entry-title">Cím *</label>
            <input id="entry-title" type="text" required className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid-2col">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="entry-date">Dátum *</label>
              <input id="entry-date" type="date" required className="form-control" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="work-type">Munka típusa</label>
              <input
                id="work-type"
                type="text"
                className="form-control"
                placeholder="pl. Gipszkarton"
                list="work-type-list"
                value={workType}
                onChange={e => setWorkType(e.target.value)}
              />
              <datalist id="work-type-list">
                {WORK_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          {projectRooms.length > 0 && (
            <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <label className="form-label">Szekció (opcionális)</label>
              <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)}>
                <option value="">– Általános (szekció nélkül) –</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Ügyfélnek ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <Eye size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Ügyfélnek</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Leírás / üzenet az ügyfélnek</label>
            <textarea
              rows={4}
              className="form-control"
              placeholder="Ez a szöveg megjelenik az ügyfél oldalán…"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
          </div>

          {/* Existing client photos */}
          {existingPhotos.filter(p => !p.is_private).length > 0 && (
            <PhotoGrid photos={existingPhotos.filter(p => !p.is_private)} onDelete={handleDeleteExisting} deletingId={deletingPhotoId} disabled={isProcessing} />
          )}
          {/* New client photos */}
          {newClientPreviews.length > 0 && (
            <NewPhotoGrid previews={newClientPreviews} onRemove={removeClientFile} disabled={isProcessing} />
          )}
          <MediaButtons
            disabled={isProcessing}
            count={newClientFiles.length}
            existing={existingPhotos.filter(p => !p.is_private).length}
            onCamera={() => clientCameraRef.current?.click()}
            onGallery={() => clientGalleryRef.current?.click()}
          />
          <input ref={clientCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { await addClientFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
          <input ref={clientGalleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => { await addClientFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.85rem' }}>
            <button
              type="button"
              onClick={() => setIsPublic(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: isPublic ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${isPublic ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublic ? 'var(--success-text)' : 'var(--text-primary)' }}>
                  {isPublic ? 'Nyilvános — az ügyfél látja' : 'Privát — még nem jelenik meg az ügyfélnek'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isPublic ? 'A tartalom megjelenik a projekt nyilvános oldalán' : 'Kapcsold be, ha az ügyfél is láthatja ezt a bejegyzést'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Saját feljegyzés ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={16} color="var(--text-muted)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Saját feljegyzés</h3>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: '#dc2626', borderRadius: '4px', padding: '2px 7px' }}>PRIVÁT</span>
          </div>
          <div className="form-group">
            <textarea
              rows={3}
              className="form-control"
              placeholder="Csak én látom — soha nem jelenik meg az ügyfélnek…"
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
            />
          </div>
          {/* Existing private photos */}
          {existingPhotos.filter(p => p.is_private).length > 0 && (
            <PhotoGrid photos={existingPhotos.filter(p => p.is_private)} onDelete={handleDeleteExisting} deletingId={deletingPhotoId} disabled={isProcessing} />
          )}
          {/* New private photos */}
          {newPrivatePreviews.length > 0 && (
            <NewPhotoGrid previews={newPrivatePreviews} onRemove={removePrivateFile} disabled={isProcessing} />
          )}
          <MediaButtons
            disabled={isProcessing}
            count={newPrivateFiles.length}
            existing={existingPhotos.filter(p => p.is_private).length}
            onCamera={() => privateCameraRef.current?.click()}
            onGallery={() => privateGalleryRef.current?.click()}
          />
          <input ref={privateCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { await addPrivateFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
          <input ref={privateGalleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => { await addPrivateFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', gap: '0.5rem' }} disabled={isProcessing}>
            {submitting ? <><Loader2 size={16} className="animate-spin" />Mentés…</> : uploading ? <><Loader2 size={16} className="animate-spin" />Feltöltés…</> : <><CheckCircle2 size={16} /> Mentés</>}
          </button>
          <Link href={`/projektek/${projectId}?tab=naplo`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            Mégse
          </Link>
        </div>
      </form>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
