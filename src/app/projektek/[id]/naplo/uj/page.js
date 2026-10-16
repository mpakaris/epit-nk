'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Camera, X, Upload, CheckCircle2, Lock, Eye,
  HardHat, Video, Image, Loader2
} from 'lucide-react';

const MAX_PHOTOS = 10;
const today = () => new Date().toISOString().split('T')[0];

const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

function MediaPreviewGrid({ previews, onRemove, disabled }) {
  if (previews.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {previews.map((p, i) => (
        <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          {p.isVideo ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem' }}>
              <Video size={26} color="var(--accent)" />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.name}</span>
            </div>
          ) : p.url ? (
            <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem' }}>
              <Image size={26} color="var(--text-muted)" />
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={disabled}
            style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function MediaButtons({ disabled, count, onCamera, onGallery }) {
  if (count >= MAX_PHOTOS) return null;
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

export default function NewDiaryEntryPage() {
  const { id: projectId } = useParams();
  const router = useRouter();
  const { projects, uploadDiaryPhotos, createDiaryEntry, projectRooms: ctxProjectRooms } = useApp();

  const [entryDate, setEntryDate] = useState(today());
  const [workType, setWorkType] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [roomId, setRoomId] = useState('');

  // Client media
  const [clientFiles, setClientFiles] = useState([]);
  const [clientPreviews, setClientPreviews] = useState([]);
  const clientCameraRef = useRef(null);
  const clientGalleryRef = useRef(null);

  // Private media
  const [privateFiles, setPrivateFiles] = useState([]);
  const [privatePreviews, setPrivatePreviews] = useState([]);
  const privateCameraRef = useRef(null);
  const privateGalleryRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const project = projects.find(p => p.id === projectId);

  const makeAddFiles = (files, setFiles, previews, setPreviews) => async (raw) => {
    if (!raw || raw.length === 0) return;
    const converted = await Promise.all(Array.from(raw).map(processMediaFile));
    const remaining = MAX_PHOTOS - files.length;
    const toAdd = converted.slice(0, remaining);
    setFiles(prev => [...prev, ...toAdd].slice(0, MAX_PHOTOS));
    const newPreviews = toAdd.map(file => {
      const isVideo = file.type.startsWith('video/');
      return isVideo
        ? { url: null, name: file.name, isVideo: true }
        : { url: URL.createObjectURL(file), name: file.name, isVideo: false };
    });
    setPreviews(prev => [...prev, ...newPreviews].slice(0, MAX_PHOTOS));
  };

  const addClientFiles = makeAddFiles(clientFiles, setClientFiles, clientPreviews, setClientPreviews);
  const addPrivateFiles = makeAddFiles(privateFiles, setPrivateFiles, privatePreviews, setPrivatePreviews);

  const removeClientFile = (index) => {
    setClientFiles(prev => prev.filter((_, i) => i !== index));
    setClientPreviews(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removePrivateFile = (index) => {
    setPrivateFiles(prev => prev.filter((_, i) => i !== index));
    setPrivatePreviews(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const makeHandleChange = (addFn) => async (e) => {
    await addFn(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setAlertModal({ message: 'A cím megadása kötelező!' }); return; }

    let photoIds = [];

    if (clientFiles.length > 0 || privateFiles.length > 0) {
      setUploading(true);
      try {
        const [clientPhotos, privatePhotos] = await Promise.all([
          clientFiles.length > 0 ? uploadDiaryPhotos(projectId, clientFiles, false) : Promise.resolve([]),
          privateFiles.length > 0 ? uploadDiaryPhotos(projectId, privateFiles, true) : Promise.resolve([]),
        ]);
        photoIds = [...clientPhotos, ...privatePhotos].map(p => p.id);
      } catch (err) {
        setAlertModal({ message: err.message || 'Hiba a médiafájlok feltöltésekor' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    try {
      await createDiaryEntry({
        projectId,
        title: title.trim(),
        body: body.trim() || undefined,
        entryDate,
        photoIds,
        workType: workType.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        isPublic,
        roomId: roomId || undefined,
      });
      router.push(`/projektek/${projectId}?tab=naplo`);
    } catch (err) {
      setAlertModal({ message: err.message || 'Hiba a bejegyzés létrehozásakor' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>A projekt nem található</h2>
        <Link href="/projektek" className="btn btn-secondary btn-sm"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const projectRooms = (ctxProjectRooms || []).filter(r => r.project_id === projectId);
  const isProcessing = uploading || submitting;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/projektek/${projectId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a projekthez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <h1 className="page-title">Új napló bejegyzés</h1>
        <p className="page-subtitle">{project.name}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── Card 1: Alapadatok ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <HardHat size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Alapadatok</h3>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="entry-title">Cím *</label>
            <input id="entry-title" type="text" required className="form-control" placeholder="pl. Alapozás befejezve" value={title} onChange={e => setTitle(e.target.value)} />
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

        {/* ── Card 2: Ügyfélnek ── */}
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

          <div style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <Camera size={13} color="var(--accent)" /> Fotók / videók az ügyfélnek
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{clientFiles.length}/{MAX_PHOTOS}</span>
            </label>
            <MediaPreviewGrid previews={clientPreviews} onRemove={removeClientFile} disabled={isProcessing} />
            <MediaButtons
              disabled={isProcessing}
              count={clientFiles.length}
              onCamera={() => clientCameraRef.current?.click()}
              onGallery={() => clientGalleryRef.current?.click()}
            />
            <input ref={clientCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={makeHandleChange(addClientFiles)} />
            <input ref={clientGalleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={makeHandleChange(addClientFiles)} />
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
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
                  {isPublic ? 'A fenti tartalom megjelenik a projekt nyilvános oldalán' : 'Kapcsold be, ha az ügyfél is láthatja ezt a bejegyzést'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Card 3: Saját feljegyzés (PRIVÁT) ── */}
        <div className="card" style={{ padding: '1.15rem', borderColor: 'var(--border-subtle)' }}>
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

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
              <Camera size={13} color="var(--text-muted)" /> Privát fotók / videók
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{privateFiles.length}/{MAX_PHOTOS}</span>
            </label>
            <MediaPreviewGrid previews={privatePreviews} onRemove={removePrivateFile} disabled={isProcessing} />
            <MediaButtons
              disabled={isProcessing}
              count={privateFiles.length}
              onCamera={() => privateCameraRef.current?.click()}
              onGallery={() => privateGalleryRef.current?.click()}
            />
            <input ref={privateCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={makeHandleChange(addPrivateFiles)} />
            <input ref={privateGalleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={makeHandleChange(addPrivateFiles)} />
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', gap: '0.5rem' }} disabled={isProcessing}>
            {submitting ? <><Loader2 size={16} className="animate-spin" />Mentés…</> : uploading ? <><Loader2 size={16} className="animate-spin" />Feltöltés…</> : <><CheckCircle2 size={16} /> Bejegyzés mentése</>}
          </button>
          <Link href={`/projektek/${projectId}`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            Mégse
          </Link>
        </div>
      </form>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
