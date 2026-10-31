'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Play, X, Lock, Eye, Loader2, Check } from 'lucide-react';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import { processMediaFile } from '@/lib/mediaGate';
import { WORK_TYPES } from './WorkTypeSelector';
import { MAX_DIARY_PHOTOS } from '@/lib/constants';

export default function EditDiaryEntryModal({ isOpen, onClose, entry, onSave, onAddPhotos, onDeletePhoto, rooms = [] }) {
  const [title,         setTitle]         = useState('');
  const [entryDate,     setEntryDate]     = useState('');
  const [workType,      setWorkType]      = useState('');
  const [body,          setBody]          = useState('');
  const [internalNote,  setInternalNote]  = useState('');
  const [clientNote,    setClientNote]    = useState('');
  const [isPublic,      setIsPublic]      = useState(false);
  const [roomId,        setRoomId]        = useState('');
  const [error,         setError]         = useState('');
  const [saveStatus,    setSaveStatus]    = useState('idle');
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const galleryRef = useRef(null);
  const cameraRef  = useRef(null);
  const videoRef   = useRef(null);
  const savedRef   = useRef(null);
  const timerRef   = useRef(null);
  const savedTimer = useRef(null);

  const snap = (t, d, wt, b, n, cn, pub, rm) => JSON.stringify({ t, d, wt, b, n, cn, pub, rm });

  useEffect(() => {
    if (entry && isOpen) {
      setTitle(entry.title || '');
      setEntryDate(entry.entry_date || '');
      setWorkType(entry.work_type || '');
      setBody(entry.body || '');
      setInternalNote(entry.internal_note || '');
      setClientNote(entry.client_note || '');
      setIsPublic(Boolean(entry.is_public));
      setRoomId(entry.room_id || '');
      setError(''); setSaveStatus('idle');
      savedRef.current = snap(entry.title || '', entry.entry_date || '', entry.work_type || '', entry.body || '', entry.internal_note || '', entry.client_note || '', Boolean(entry.is_public), entry.room_id || '');
    }
  }, [entry?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !entry || savedRef.current === null) return;
    const current = snap(title, entryDate, workType, body, internalNote, clientNote, isPublic, roomId);
    if (current === savedRef.current) return;
    if (!title.trim()) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(entry.id, { title: title.trim(), body: body.trim() || null, work_type: workType.trim() || null, internal_note: internalNote.trim() || null, client_note: clientNote.trim() || null, entry_date: entryDate || undefined, is_public: isPublic, room_id: roomId || null });
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || 'Hiba a mentésnél');
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [title, entryDate, workType, body, internalNote, clientNote, isPublic, roomId]);

  if (!isOpen || !entry) return null;

  const existingPhotos = entry.photos || [];

  const addFiles = async (files) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_DIARY_PHOTOS - existingPhotos.length;
    if (remaining <= 0) return;
    const toAdd = await Promise.all(Array.from(files).slice(0, remaining).map(processMediaFile));
    setUploadingPhotos(true);
    try { await onAddPhotos(toAdd); }
    catch (err) { setError(err.message || 'Hiba a fotó feltöltésekor'); }
    finally { setUploadingPhotos(false); }
  };

  const handleDeleteExisting = async (photoId) => {
    setDeletingPhotoId(photoId);
    try { await onDeletePhoto(photoId); }
    catch (err) { setError(err.message || 'Hiba a fotó törlésekor'); }
    finally { setDeletingPhotoId(null); }
  };

  const SaveIndicator = () => {
    if (saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> Mentés...
      </span>
    );
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> Mentve</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bejegyzés szerkesztése">
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <div>
        <div className="form-group">
          <label className="form-label">Cím</label>
          <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Dátum</label>
            <input type="date" className="form-control" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Munka típusa</label>
            <input type="text" className="form-control" list="edit-work-types" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Gipszkarton" />
            <datalist id="edit-work-types">{WORK_TYPES.map(t => <option key={t} value={t} />)}</datalist>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Szekció</label>
            <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">– Általános –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Leírás</label>
          <textarea rows={3} className="form-control" value={body} onChange={e => setBody(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={12} color="var(--text-muted)" /> Belső megjegyzés
          </label>
          <textarea rows={2} className="form-control" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Csak a csapat látja…" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Eye size={12} color="var(--accent)" /> Üzenet az ügyfélnek
          </label>
          <textarea rows={2} className="form-control" value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Látható az ügyfél portálján…" />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <button type="button" onClick={() => setIsPublic(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: isPublic ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${isPublic ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublic ? 'var(--success-text)' : 'var(--text-primary)' }}>
                {isPublic ? 'Nyilvános — látható az ügyfélnek' : 'Privát — csak a csapat látja'}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                {isPublic ? 'Megjelenik a projekt nyilvános oldalán' : 'Az ügyfél nem látja ezt a bejegyzést'}
              </div>
            </div>
          </button>
        </div>

        {/* Photos */}
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Camera size={14} color="var(--accent)" /> Fotók & Videók
              {uploadingPhotos && <Loader2 size={12} className="animate-spin" color="var(--accent)" />}
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{existingPhotos.length}/{MAX_DIARY_PHOTOS}</span>
          </div>

          {existingPhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {existingPhotos.map(photo => {
                const isVideo   = photo.mime_type?.startsWith('video/');
                const isDeleting = deletingPhotoId === photo.id;
                return (
                  <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', opacity: isDeleting ? 0.4 : 1 }}>
                    {isVideo
                      ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div>
                      : <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <button type="button" disabled={isDeleting} onClick={() => handleDeleteExisting(photo.id)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {existingPhotos.length < MAX_DIARY_PHOTOS && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={uploadingPhotos} onClick={() => cameraRef.current?.click()}><Camera size={13} /> Kamera</button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={uploadingPhotos} onClick={() => galleryRef.current?.click()}><Plus size={13} /> Kép</button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={uploadingPhotos} onClick={() => videoRef.current?.click()}><Play size={13} /> Videó</button>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex' }}>
          <SaveIndicator />
        </div>
      </div>
    </Modal>
  );
}
