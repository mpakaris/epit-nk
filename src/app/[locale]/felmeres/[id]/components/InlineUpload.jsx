'use client';

import { useState, useRef } from 'react';
import { Camera, Plus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { isEffectivePremium } from '@/lib/subscriptionLimits';

/** Compact inline upload button used inside survey entry cards. */
export default function InlineUpload({ surveyId, entryId, mediaType, label = 'Fotók', enqueue, iconOnly, photoCount }) {
  const { uploadSurveyMedia, currentUser } = useApp();
  const t = useTranslations('surveys');
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const isPremium  = isEffectivePremium(currentUser || {});
  const maxPhotos  = isPremium ? 20 : 3;
  const atLimit    = mediaType === 'photo' && typeof photoCount === 'number' && photoCount >= maxPhotos;
  const acceptAttr = isPremium ? 'image/*,video/*' : 'image/*';

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    if (enqueue) {
      enqueue(raw, { surveyId, entryId, mediaType });
    } else {
      const files = await Promise.all(raw.map(processMediaFile));
      setUploading(true); setError('');
      try { await uploadSurveyMedia(surveyId, files, { entryId, mediaType }); }
      catch (err) { setError(err.message || 'Feltöltési hiba'); }
      finally { setUploading(false); }
    }
  };

  if (iconOnly) {
    return (
      <>
        <input ref={inputRef} type="file" accept={acceptAttr} multiple onChange={handleFiles} style={{ display: 'none' }} />
        <button
          type="button"
          onClick={() => !atLimit && inputRef.current?.click()}
          disabled={uploading || atLimit}
          aria-label={atLimit ? t('desktop.photoAtLimit', { limit: maxPhotos }) : label}
          title={atLimit ? t('desktop.photoAtLimit', { limit: maxPhotos }) : undefined}
          style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: atLimit ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: atLimit ? 0.45 : 1 }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" color="#475569" /> : <Plus size={16} color="#475569" strokeWidth={1.75} />}
        </button>
      </>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <input ref={inputRef} type="file" accept={acceptAttr} multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => !atLimit && inputRef.current?.click()} disabled={uploading || atLimit}
        className="btn btn-secondary btn-sm"
        style={{ fontSize: '0.75rem', opacity: atLimit ? 0.55 : 1, cursor: atLimit ? 'default' : 'pointer' }}>
        {uploading ? <><Loader2 size={13} className="animate-spin" />Feltöltés...</> : <><Camera size={13} />{label}</>}
      </button>
      {atLimit && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('desktop.photoAtLimit', { limit: maxPhotos })}</span>}
      {!atLimit && error && <span style={{ fontSize: '0.7rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
}

/** Drop-zone variant for empty states. */
export function InlineUploadZone({ surveyId, entryId, enqueue }) {
  const { uploadSurveyMedia } = useApp();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    if (enqueue) {
      enqueue(raw, { surveyId, entryId, mediaType: 'photo' });
    } else {
      const files = await Promise.all(raw.map(processMediaFile));
      setUploading(true); setError('');
      try { await uploadSurveyMedia(surveyId, files, { entryId, mediaType: 'photo' }); }
      catch (err) { setError(err.message || 'Feltöltési hiba'); }
      finally { setUploading(false); }
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading && !enqueue}
        style={{ width: '100%', padding: '1.25rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: (uploading && !enqueue) ? 'var(--bg-subtle)' : '#fff', cursor: (uploading && !enqueue) ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        {uploading && !enqueue
          ? <><Loader2 size={22} color="var(--accent)" className="animate-spin" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>Feltöltés...</span></>
          : <><Camera size={22} color="var(--text-muted)" /><span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fotók / videók feltöltése</span><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Koppintson a galériához vagy kamerához</span></>}
      </button>
      {error && <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--danger-text)', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}
