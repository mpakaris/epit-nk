'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import UploadProgressBadge from '@/components/mobile/UploadProgressBadge';
import { ArrowLeft, Camera, Image as ImageIcon, Play, X, AlertCircle, Loader2, Check } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

export default function SurveyUploadPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, dataReady, surveys, isAdmin, uploadSurveyMedia, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);

  const uploadFn = useCallback(async (rawFile, { surveyId, mediaType }) => {
    await uploadSurveyMedia(surveyId, [rawFile], { mediaType });
  }, [uploadSurveyMedia]);

  const { enqueue, queue, retryAll, totalPending, totalUploading, totalDone, totalError } = useUploadQueue({ uploadFn });

  const allDone = queue.length > 0 && totalPending === 0 && totalUploading === 0;

  // Auto-navigate back when all uploads succeed
  useEffect(() => {
    if (allDone && totalError === 0) {
      const t = setTimeout(() => router.push(`${navPrefix}/felmeres/${id}`), 1200);
      return () => clearTimeout(t);
    }
  }, [allDone, totalError, id, router, navPrefix]);

  const handleFiles = (files) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    enqueue(arr, { surveyId: id, mediaType: 'photo' });
  };

  if (loading || !dataReady) return <PageSpinner />;
  if (!isAdmin) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>Nincs jogosultsága.</div>;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href={`${navPrefix}/felmeres`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '580px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`${navPrefix}/felmeres/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Vissza: {survey.title}
        </Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.45rem' }}>Fotók feltöltése</h1>
        <p className="page-subtitle">Válasszon fotókat — feltöltés azonnal elkezdődik</p>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
      <input ref={fileInputRef}   type="file" accept="image/*,video/*" multiple onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />

      <div className="card mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
            <Camera size={20} /> Fotózás kamerával
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
            <ImageIcon size={20} /> Fájlok kiválasztása galériából
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Feltöltés ({queue.length} fájl)
            </div>
            <UploadProgressBadge
              pending={totalPending}
              uploading={totalUploading}
              done={totalDone}
              error={totalError}
              onRetry={totalError > 0 ? retryAll : undefined}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.4rem' }}>
            {queue.map(item => (
              <div key={item.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                {item.preview
                  ? <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.status === 'done' ? 1 : 0.65 }} />
                  : <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={18} color="#fff" />
                    </div>
                }
                {item.status === 'uploading' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <Loader2 size={18} color="#fff" className="animate-spin" />
                  </div>
                )}
                {item.status === 'done' && (
                  <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(22,163,74,0.9)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="#fff" />
                  </div>
                )}
                {item.status === 'error' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(220,38,38,0.6)', gap: 2 }}>
                    <AlertCircle size={16} color="#fff" />
                    <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>Hiba</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {allDone && totalError === 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={14} /> Feltöltés kész — visszatérés a felméréshez...
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Link href={`${navPrefix}/felmeres/${id}`} className="btn btn-secondary">
          {allDone && totalError === 0 ? 'Vissza' : 'Mégse'}
        </Link>
        {totalError > 0 && (
          <button type="button" onClick={retryAll} className="btn btn-primary">
            Hibás újra ({totalError})
          </button>
        )}
      </div>
    </div>
  );
}
