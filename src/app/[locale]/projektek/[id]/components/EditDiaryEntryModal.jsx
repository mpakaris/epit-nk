'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Play, X, Lock, Eye, Loader2, Check, Trash2, Image as ImageIcon } from 'lucide-react';
import Lightbox from '@/components/Lightbox';
import { useTranslations } from 'next-intl';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import useMobile from '@/hooks/useMobile';
import { processMediaFile } from '@/lib/mediaGate';
import { WORK_TYPES } from './WorkTypeSelector';
import { MAX_DIARY_PHOTOS } from '@/lib/constants';

export default function EditDiaryEntryModal({
  isOpen, onClose, entry, rooms = [],
  canEdit = true,
  onSave, onAddPhotos, onDeletePhoto, onDelete,
}) {
  const t        = useTranslations('projectDetail');
  const isMobile = useMobile();

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
  const [lightboxIndex,   setLightboxIndex]   = useState(null);

  const mediaRef = useRef(null);
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
      savedRef.current = snap(
        entry.title || '', entry.entry_date || '', entry.work_type || '',
        entry.body || '', entry.internal_note || '', entry.client_note || '',
        Boolean(entry.is_public), entry.room_id || '',
      );
    }
  }, [entry?.id, isOpen]);

  // Auto-save (edit mode only)
  useEffect(() => {
    if (!canEdit || !isOpen || !entry || savedRef.current === null) return;
    const current = snap(title, entryDate, workType, body, internalNote, clientNote, isPublic, roomId);
    if (current === savedRef.current) return;
    if (!title.trim()) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(entry.id, {
          title: title.trim(), body: body.trim() || null,
          work_type: workType.trim() || null, internal_note: internalNote.trim() || null,
          client_note: clientNote.trim() || null, entry_date: entryDate || undefined,
          is_public: isPublic, room_id: roomId || null,
        });
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || t('saveError'));
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [title, entryDate, workType, body, internalNote, clientNote, isPublic, roomId]);

  if (!isOpen || !entry) return null;

  const existingPhotos = entry.photos || [];

  const addFiles = async (files) => {
    if (!files || files.length === 0 || !canEdit) return;
    const remaining = MAX_DIARY_PHOTOS - existingPhotos.length;
    if (remaining <= 0) return;
    const toAdd = await Promise.all(Array.from(files).slice(0, remaining).map(processMediaFile));
    setUploadingPhotos(true);
    try { await onAddPhotos(toAdd); }
    catch (err) { setError(err.message || t('photoUploadError')); }
    finally { setUploadingPhotos(false); }
  };

  const handleDeleteExisting = async (photoId) => {
    if (!canEdit) return;
    setDeletingPhotoId(photoId);
    try { await onDeletePhoto(photoId); }
    catch (err) { setError(err.message || t('photoDeleteError')); }
    finally { setDeletingPhotoId(null); }
  };

  // Desktop design tokens
  const dkLabel = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6 };
  const inputCls = isMobile ? 'form-control' : 'dk-input';
  const labelStyle = isMobile ? undefined : dkLabel;
  const fgStyle = isMobile ? undefined : { marginBottom: '1rem' };

  const SaveIndicator = () => {
    if (saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> {t('savingText')}
      </span>
    );
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> {t('savedText')}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={canEdit ? t('diaryEditTitle') : (entry.title || t('diaryEditTitle'))}>
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0 : 4 }}>

        {/* Title — hidden on read-only desktop (already in modal header) */}
        {(isMobile || canEdit) && (
          <div className={isMobile ? 'form-group' : undefined} style={fgStyle}>
            <label className={isMobile ? 'form-label' : undefined} style={labelStyle}>{t('titleLabel')}</label>
            <input type="text" className={inputCls} value={title} readOnly={!canEdit}
              onChange={e => setTitle(e.target.value)}
              style={isMobile ? undefined : { width: '100%' }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: isMobile ? undefined : '1rem' }}>
          <div className={isMobile ? 'form-group' : undefined} style={isMobile ? { margin: 0 } : undefined}>
            <label className={isMobile ? 'form-label' : undefined} style={labelStyle}>{t('dateLabel')}</label>
            <input type="date" className={inputCls} value={entryDate} readOnly={!canEdit}
              onChange={e => setEntryDate(e.target.value)}
              style={isMobile ? undefined : { width: '100%' }} />
          </div>
          <div className={isMobile ? 'form-group' : undefined} style={isMobile ? { margin: 0 } : undefined}>
            <label className={isMobile ? 'form-label' : undefined} style={labelStyle}>{t('workTypeLabel')}</label>
            <input type="text" className={inputCls} list="edit-work-types" value={workType}
              readOnly={!canEdit} onChange={e => setWorkType(e.target.value)}
              placeholder={t('workTypePh')}
              style={isMobile ? undefined : { width: '100%' }} />
            <datalist id="edit-work-types">{WORK_TYPES.map(wt => <option key={wt} value={wt} />)}</datalist>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className={isMobile ? 'form-group' : undefined} style={isMobile ? { marginTop: '0.75rem' } : fgStyle}>
            <label className={isMobile ? 'form-label' : undefined} style={labelStyle}>{t('sectionLabel')}</label>
            <select className={isMobile ? 'form-control' : 'dk-input'} value={roomId} disabled={!canEdit}
              onChange={e => setRoomId(e.target.value)}
              style={isMobile ? undefined : { width: '100%' }}>
              <option value="">{t('generalSectionOption')}</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}

        <div className={isMobile ? 'form-group' : undefined} style={isMobile ? { marginTop: '0.75rem' } : fgStyle}>
          <label className={isMobile ? 'form-label' : undefined} style={labelStyle}>{t('descriptionLabel')}</label>
          <textarea rows={3} className="form-control" value={body} readOnly={!canEdit}
            onChange={e => setBody(e.target.value)}
            style={isMobile ? undefined : { borderRadius: 12, fontSize: 14 }} />
        </div>

        <div className={isMobile ? 'form-group' : undefined} style={fgStyle}>
          <label className={isMobile ? 'form-label' : undefined} style={{ ...(labelStyle || {}), display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={12} color="var(--text-muted)" /> {t('internalNoteLabel')}
          </label>
          <textarea rows={2} className="form-control" value={internalNote} readOnly={!canEdit}
            onChange={e => setInternalNote(e.target.value)} placeholder={canEdit ? t('internalNotePh2') : ''}
            style={isMobile ? undefined : { borderRadius: 12, fontSize: 14 }} />
        </div>

        <div className={isMobile ? 'form-group' : undefined} style={fgStyle}>
          <label className={isMobile ? 'form-label' : undefined} style={{ ...(labelStyle || {}), display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Eye size={12} color="var(--accent)" /> {t('clientNoteLabel')}
          </label>
          <textarea rows={2} className="form-control" value={clientNote} readOnly={!canEdit}
            onChange={e => setClientNote(e.target.value)} placeholder={canEdit ? t('clientNotePh') : ''}
            style={isMobile ? undefined : { borderRadius: 12, fontSize: 14 }} />
        </div>

        {/* Visibility toggle */}
        <div className={isMobile ? 'form-group' : undefined} style={isMobile ? { marginBottom: 0 } : { marginBottom: '1rem' }}>
          <button type="button" onClick={() => canEdit && setIsPublic(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: isPublic ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${isPublic ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: isMobile ? 'var(--radius-md)' : 12, padding: '0.65rem 0.85rem', cursor: canEdit ? 'pointer' : 'default', textAlign: 'left' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublic ? 'var(--success-text)' : 'var(--text-primary)' }}>
                {isPublic ? t('publicToggle') : t('privateToggle')}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                {isPublic ? t('publicToggleSub') : t('privateToggleSub')}
              </div>
            </div>
          </button>
        </div>

        {/* Photos */}
        <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <label className={isMobile ? 'form-label' : undefined} style={{ ...(labelStyle || {}), margin: 0 }}>
              {t('photosLabel')}
              {uploadingPhotos && <Loader2 size={12} className="animate-spin" color="var(--accent)" style={{ marginLeft: 6 }} />}
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{existingPhotos.length}/{MAX_DIARY_PHOTOS}</span>
          </div>

          {existingPhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {existingPhotos.map((photo, idx) => {
                const isVideo    = photo.mime_type?.startsWith('video/');
                const isDeleting = deletingPhotoId === photo.id;
                return (
                  <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', opacity: isDeleting ? 0.4 : 1 }}>
                    <button type="button" onClick={() => setLightboxIndex(idx)}
                      style={{ width: '100%', height: '100%', border: 'none', padding: 0, cursor: 'zoom-in', display: 'block', background: 'none' }}>
                      {isVideo
                        ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div>
                        : <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </button>
                    {canEdit && (
                      <button type="button" disabled={isDeleting} onClick={() => handleDeleteExisting(photo.id)}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canEdit && existingPhotos.length < MAX_DIARY_PHOTOS && (
            <>
              <button type="button" disabled={uploadingPhotos} onClick={() => mediaRef.current?.click()}
                style={{ width: '100%', height: isMobile ? 44 : 40, borderRadius: isMobile ? 12 : 'var(--radius-md)', border: 'none', background: '#263248', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: uploadingPhotos ? 0.65 : 1 }}>
                <ImageIcon size={15} /> {t('addMediaBtn')}
              </button>
              <input ref={mediaRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SaveIndicator />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {canEdit && onDelete && (
              <button type="button" className={isMobile ? 'btn btn-danger btn-sm' : 'dk-btn'} style={isMobile ? undefined : { background: 'var(--danger)', color: '#fff' }} onClick={onDelete}>
                <Trash2 size={13} /> {t('deleteLabel')}
              </button>
            )}
            <button type="button" className={isMobile ? 'btn btn-primary btn-sm' : 'dk-btn'} style={isMobile ? undefined : { background: '#263248', color: '#fff' }} onClick={onClose}>
              <Check size={13} /> {t('saveEntryBtn')}
            </button>
          </div>
        </div>
      </div>
      {lightboxIndex !== null && existingPhotos.length > 0 && (
        <Lightbox
          media={existingPhotos.map(p => ({ ...p, url: p.cdn_url || p.drive_view_url }))}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </Modal>
  );
}
