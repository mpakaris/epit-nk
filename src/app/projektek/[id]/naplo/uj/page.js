'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Camera, X, Upload, CheckCircle2, Lock, Eye,
  HardHat, FileText, MessageSquare, Video, Image
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

export default function NewDiaryEntryPage() {
  const { id: projectId } = useParams();
  const router = useRouter();
  const { projects, uploadDiaryPhotos, createDiaryEntry } = useApp();

  const [entryDate, setEntryDate] = useState(today());
  const [workType, setWorkType] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);

  const project = projects.find(p => p.id === projectId);

  const addFiles = (files) => {
    if (!files || files.length === 0) return;
    const newFiles = [...selectedFiles, ...files].slice(0, MAX_PHOTOS);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    const remaining = MAX_PHOTOS - previews.length;
    Array.from(files).slice(0, remaining).forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        newPreviews.push({ url: URL.createObjectURL(file), name: file.name, isVideo: false });
      } else {
        newPreviews.push({ url: null, name: file.name, isVideo });
      }
    });
    setPreviews(newPreviews.slice(0, MAX_PHOTOS));
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setAlertModal({ message: 'A cím megadása kötelező!' }); return; }

    let photoIds = [];

    if (selectedFiles.length > 0) {
      setUploading(true);
      try {
        const photos = await uploadDiaryPhotos(projectId, selectedFiles);
        photoIds = photos.map(p => p.id);
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
        clientNote: clientNote.trim() || undefined,
        isPublic,
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

  const isProcessing = uploading || submitting;
  const canAddMore = selectedFiles.length < MAX_PHOTOS;

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

        {/* ── Card 1: Date & Work type ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <HardHat size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Alapadatok</h3>
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
        </div>

        {/* ── Card 2: Title + Description ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <FileText size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Bejegyzés</h3>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="entry-title">Cím *</label>
            <input id="entry-title" type="text" required className="form-control" placeholder="pl. Alapozás befejezve" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="entry-body">Leírás</label>
            <textarea id="entry-body" rows={4} className="form-control" placeholder="A nap munkálatainak részletes leírása…" value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>

        {/* ── Card 3: Notes ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <MessageSquare size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Megjegyzések</h3>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={13} color="var(--text-muted)" /> Belső megjegyzés
            </label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Csak a csapat látja — nem kerül ki az ügyfélnek…"
              value={internalNote}
              onChange={e => setInternalNote(e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lock size={11} /> Nem látható az ügyfél számára
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Eye size={13} color="var(--accent)" /> Üzenet az ügyfélnek
            </label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Ez a szöveg megjelenik az ügyfél oldalán…"
              value={clientNote}
              onChange={e => setClientNote(e.target.value)}
            />
          </div>

          {/* Public toggle */}
          <div style={{ marginBottom: 0 }}>
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
                  {isPublic ? 'Nyilvános — látható az ügyfélnek' : 'Privát — csak a csapat látja'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isPublic ? 'Megjelenik a projekt nyilvános oldalán' : 'Az ügyfél nem látja ezt a bejegyzést'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Card 4: Photos & Videos ── */}
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Camera size={16} color="var(--accent)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>Fotók & Videók</h3>
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 600 }}>{selectedFiles.length}/{MAX_PHOTOS}</span>
          </div>

          <MediaPreviewGrid previews={previews} onRemove={removeFile} disabled={isProcessing} />

          {canAddMore && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center', gap: '0.4rem' }} disabled={isProcessing} onClick={() => cameraRef.current?.click()}>
                <Camera size={15} /> Fényképezés
              </button>
              <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center', gap: '0.4rem' }} disabled={isProcessing} onClick={() => galleryRef.current?.click()}>
                <Upload size={15} /> Galéria / Fájl
              </button>
            </div>
          )}

          {/* Video upload separate button */}
          {canAddMore && (
            <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }} disabled={isProcessing} onClick={() => videoRef.current?.click()}>
              <Video size={15} /> Videó hozzáadása
            </button>
          )}

          {/* Hidden inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />

          {uploading && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
              <Upload size={15} /> Feltöltés folyamatban… ({selectedFiles.length} fájl)
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '2rem' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }} disabled={isProcessing}>
            {submitting ? 'Mentés…' : uploading ? <><Upload size={16} /> Feltöltés folyamatban…</> : <><CheckCircle2 size={16} /> Bejegyzés mentése</>}
          </button>
          <Link href={`/projektek/${projectId}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            Mégse
          </Link>
        </div>
      </form>

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
