'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { MAX_DIARY_PHOTOS } from '@/lib/constants';
import {
  Camera, Image as ImageIcon, X, Check, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Lock, Eye, Home, Video,
} from 'lucide-react';

const S = {
  heading: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.25 },
  sub:     { fontSize: 14, color: '#64748b', margin: '0 0 18px', lineHeight: 1.5 },
  label:   { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  roomBtn:       { width: '100%', padding: '12px 14px', borderRadius: 14, border: '2px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', transition: 'all 0.15s' },
  roomBtnActive: { border: '2px solid #0f172a', background: '#f1f5f9' },
};

function PhotoGrid({ previews, onRemove, disabled }) {
  if (!previews.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 10 }}>
      {previews.map((p, i) => (
        <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
          {p.isVideo ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={24} color="#475569" />
            </div>
          ) : (
            <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <button type="button" onClick={() => onRemove(i)} disabled={disabled}
            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AddPhotoButtons({ count, onCamera, onGallery, disabled, tCamera, tGallery }) {
  if (count >= MAX_DIARY_PHOTOS) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <button type="button" onClick={onCamera} disabled={disabled}
        style={{ height: 48, borderRadius: 12, border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
        <Camera size={16} /> {tCamera}
      </button>
      <button type="button" onClick={onGallery} disabled={disabled}
        style={{ height: 48, borderRadius: 12, border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
        <ImageIcon size={16} /> {tGallery}
      </button>
    </div>
  );
}

export default function QuickDiarySheet({ isOpen, onClose, projectId, onSuccess }) {
  const { uploadDiaryPhotos, createDiaryEntry, projectRooms: ctxRooms } = useApp();
  const t     = useTranslations('mobile.quickDiary');
  const rooms = (ctxRooms || []).filter(r => r.project_id === projectId);

  const WORK_TYPES = t.raw('workTypes');

  const [step, setStep] = useState(1);
  const TOTAL = 3;

  const clientCamRef  = useRef(null);
  const clientGalRef  = useRef(null);
  const privCamRef    = useRef(null);
  const privGalRef    = useRef(null);
  const [clientFiles,    setClientFiles]    = useState([]);
  const [clientPreviews, setClientPreviews] = useState([]);
  const [privateFiles,   setPrivateFiles]   = useState([]);
  const [privatePreviews,setPrivatePreviews]= useState([]);

  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState('');
  const [workType, setWorkType] = useState('');

  const [roomId,       setRoomId]       = useState('');
  const [isPublic,     setIsPublic]     = useState(false);
  const [clientNote,   setClientNote]   = useState('');
  const [internalNote, setInternalNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useScrollLock(isOpen);

  const today = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setClientFiles([]); setClientPreviews([]);
    setPrivateFiles([]); setPrivatePreviews([]);
    setTitle(''); setDate(today()); setWorkType('');
    setRoomId(''); setIsPublic(false); setClientNote(''); setInternalNote('');
    setSubmitting(false); setError('');
  }, [isOpen]);

  const addFiles = (setFiles, setPreviews) => async (raw) => {
    if (!raw?.length) return;
    const converted = await Promise.all(Array.from(raw).map(processMediaFile));
    setFiles(prev => {
      const space = MAX_DIARY_PHOTOS - prev.length;
      return [...prev, ...converted.slice(0, space)].slice(0, MAX_DIARY_PHOTOS);
    });
    setPreviews(prev => {
      const space = MAX_DIARY_PHOTOS - prev.length;
      const newPrev = converted.slice(0, space).map(f => f.type.startsWith('video/')
        ? { url: null, name: f.name, isVideo: true }
        : { url: URL.createObjectURL(f), name: f.name, isVideo: false });
      return [...prev, ...newPrev].slice(0, MAX_DIARY_PHOTOS);
    });
  };
  const makeChange = (addFn) => async (e) => { await addFn(Array.from(e.target.files || [])); e.target.value = ''; };
  const removeClient  = (i) => { setClientFiles(p => p.filter((_,j)=>j!==i)); setClientPreviews(p => { const r=p[i]; if(r?.url) URL.revokeObjectURL(r.url); return p.filter((_,j)=>j!==i); }); };
  const removePrivate = (i) => { setPrivateFiles(p => p.filter((_,j)=>j!==i)); setPrivatePreviews(p => { const r=p[i]; if(r?.url) URL.revokeObjectURL(r.url); return p.filter((_,j)=>j!==i); }); };

  const validate = () => {
    if (step === 2 && !title.trim()) return t('titleRequired');
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (step < TOTAL) { setStep(s => s + 1); return; }

    setSubmitting(true);
    try {
      let photoIds = [];
      if (clientFiles.length || privateFiles.length) {
        const [clientPhotos, privatePhotos] = await Promise.all([
          clientFiles.length  ? uploadDiaryPhotos(projectId, clientFiles,  false) : Promise.resolve([]),
          privateFiles.length ? uploadDiaryPhotos(projectId, privateFiles, true)  : Promise.resolve([]),
        ]);
        photoIds = [...clientPhotos, ...privatePhotos].map(p => p.id);
      }
      await createDiaryEntry({
        projectId,
        title:        title.trim(),
        body:         clientNote.trim() || undefined,
        entryDate:    date,
        photoIds,
        workType:     workType.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        isPublic,
        roomId:       roomId || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || t('errorSaving'));
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepLabels = [t('stepPhotos'), t('stepEntry'), t('stepDetails')];
  const isLast = step === TOTAL;

  const StepPhotos = () => (
    <>
      <h2 style={S.heading}>{t('photosHeading')}</h2>
      <p style={S.sub}>{t('photosSub')}</p>

      <input ref={clientCamRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={makeChange(addFiles(setClientFiles, setClientPreviews))} style={{ display: 'none' }} />
      <input ref={clientGalRef} type="file" accept="image/*,video/*" multiple onChange={makeChange(addFiles(setClientFiles, setClientPreviews))} style={{ display: 'none' }} />
      <input ref={privCamRef}   type="file" accept="image/*,video/*" capture="environment" multiple onChange={makeChange(addFiles(setPrivateFiles, setPrivatePreviews))} style={{ display: 'none' }} />
      <input ref={privGalRef}   type="file" accept="image/*,video/*" multiple onChange={makeChange(addFiles(setPrivateFiles, setPrivatePreviews))} style={{ display: 'none' }} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Eye size={14} color="#2563eb" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{t('clientPhotosLabel')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{clientFiles.length}/{MAX_DIARY_PHOTOS}</span>
        </div>
        <PhotoGrid previews={clientPreviews} onRemove={removeClient} disabled={submitting} />
        <AddPhotoButtons count={clientFiles.length} onCamera={() => clientCamRef.current?.click()} onGallery={() => clientGalRef.current?.click()} disabled={submitting} tCamera={t('cameraButton')} tGallery={t('galleryButton')} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Lock size={14} color="#64748b" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{t('privatePhotosLabel')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#dc2626', borderRadius: 4, padding: '1px 6px', marginLeft: 4 }}>{t('onlyISeeIt')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{privateFiles.length}/{MAX_DIARY_PHOTOS}</span>
        </div>
        <PhotoGrid previews={privatePreviews} onRemove={removePrivate} disabled={submitting} />
        <AddPhotoButtons count={privateFiles.length} onCamera={() => privCamRef.current?.click()} onGallery={() => privGalRef.current?.click()} disabled={submitting} tCamera={t('cameraButton')} tGallery={t('galleryButton')} />
      </div>
    </>
  );

  const StepWhat = () => (
    <>
      <h2 style={S.heading}>{t('whatHeading')}</h2>
      <div style={{ marginBottom: 18 }}>
        <label style={S.label}>{t('titleLabel')}</label>
        <input
          type="text"
          className="form-control"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ fontSize: 18, fontWeight: 600 }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={S.label}>{t('dateLabel')}</label>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>{t('workTypeLabel')}</label>
          <input
            type="text"
            className="form-control"
            placeholder={t('workTypePlaceholder')}
            list="diary-work-types"
            value={workType}
            onChange={e => setWorkType(e.target.value)}
          />
          <datalist id="diary-work-types">
            {WORK_TYPES.map(wt => <option key={wt} value={wt} />)}
          </datalist>
        </div>
      </div>
    </>
  );

  const StepDetails = () => (
    <>
      <h2 style={S.heading}>{t('detailsHeading')}</h2>
      <p style={S.sub}>{t('detailsSub')}</p>

      {rooms.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>{t('sectionLabel')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ id: '', name: t('generalSection') }, ...rooms].map(r => {
              const active = roomId === r.id;
              return (
                <button key={r.id} type="button" onClick={() => setRoomId(r.id)} style={{ ...S.roomBtn, ...(active ? S.roomBtnActive : {}) }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? '#0f172a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Home size={16} color={active ? '#fff' : '#64748b'} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: active ? '#0f172a' : '#334155' }}>{r.name}</span>
                  {active && <Check size={16} color="#0f172a" style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={() => setIsPublic(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: isPublic ? 'var(--success-bg)' : '#f8fafc', border: `2px solid ${isPublic ? 'var(--success-border)' : '#e2e8f0'}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
          <div style={{ width: 40, height: 22, borderRadius: 11, background: isPublic ? 'var(--success)' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: isPublic ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isPublic ? 'var(--success-text)' : '#334155' }}>
              {isPublic ? t('publicToggleLabel') : t('privateToggleLabel')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {isPublic ? t('publicHint') : t('privateHint')}
            </div>
          </div>
        </button>
      </div>

      {isPublic && (
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>{t('clientMessageLabel')}</label>
          <textarea rows={3} className="form-control" placeholder={t('clientMessagePh')} value={clientNote} onChange={e => setClientNote(e.target.value)} style={{ resize: 'none' }} />
        </div>
      )}

      <div>
        <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Lock size={11} /> {t('privateNoteLabel')}
        </label>
        <textarea rows={2} className="form-control" placeholder={t('privateNotePh')} value={internalNote} onChange={e => setInternalNote(e.target.value)} style={{ resize: 'none' }} />
      </div>
    </>
  );

  const renderStep = () => {
    if (step === 1) return StepPhotos();
    if (step === 2) return StepWhat();
    if (step === 3) return StepDetails();
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label={t('ariaLabel')}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 12px', flexShrink: 0, borderBottom: '1px solid #f1f5f9', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{t('sheetTitle')}</span>
          <button type="button" onClick={onClose} disabled={submitting}
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14px 20px 10px', flexShrink: 0 }}>
          {stepLabels.map((label, i) => {
            const idx  = i + 1;
            const done = idx < step;
            const curr = idx === step;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#0f172a' : '#e2e8f0', borderRadius: 1, marginTop: 13, transition: 'background 0.2s' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 56 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: curr || done ? '#0f172a' : '#f1f5f9', border: `2px solid ${curr || done ? '#0f172a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {done ? <Check size={14} color="#fff" strokeWidth={2.5} /> : <span style={{ fontSize: 12, fontWeight: 800, color: curr ? '#fff' : '#94a3b8' }}>{idx}</span>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: curr ? 700 : 500, color: curr ? '#0f172a' : done ? '#475569' : '#94a3b8', whiteSpace: 'nowrap', textAlign: 'center' }}>{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px', WebkitOverflowScrolling: 'touch' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13, display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          {renderStep()}
          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={submitting}
              style={{ width: 52, height: 54, borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <button type="button" onClick={handleNext} disabled={submitting}
            style={{ flex: 1, height: 54, borderRadius: 14, border: 'none', background: isLast ? '#16a34a' : '#0f172a', color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.75 : 1, transition: 'background 0.2s' }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> {t('savingBtn')}</>
              : isLast
                ? <><Check size={18} /> {t('saveEntryBtn')}</>
                : <>{t('nextBtn')} <ChevronRight size={18} /></>
            }
          </button>
        </div>
      </div>
    </>
  );
}
