'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Camera, Image as ImageIcon, Check, Loader2, X, AlertCircle } from 'lucide-react';

export default function SurveyUploadPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, dataReady, surveys, isAdmin, uploadSurveyMedia } = useApp();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  if (loading || !dataReady) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;
  if (!isAdmin) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>Nincs jogosultsága.</div>;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href="/felmeres" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const addFiles = (files) => {
    const arr = Array.from(files);
    setSelectedFiles(prev => [...prev, ...arr]);
    const newPreviews = arr.map(file => ({
      name: file.name,
      isVideo: file.type.startsWith('video/'),
      url: file.type.startsWith('video/') ? null : URL.createObjectURL(file),
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
    setError('');
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) { setError('Válasszon ki legalább egy fájlt!'); return; }
    setIsUploading(true);
    setError('');
    try {
      await uploadSurveyMedia(id, selectedFiles);
      router.push(`/felmeres/${id}`);
    } catch (err) {
      setError(err.message || 'Hiba a feltöltés közben');
      setIsUploading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '580px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/felmeres/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Vissza: {survey.title}
        </Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.45rem' }}>Fotók feltöltése</h1>
        <p className="page-subtitle">Fotók és videók hozzáadása a felméréshez</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />

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

      {previews.length > 0 && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Kiválasztott fájlok ({previews.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.4rem' }}>
            {previews.map((p, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                {p.isVideo
                  ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>▶</span>
                      <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Videó</span>
                    </div>
                  : <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
                <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Link href={`/felmeres/${id}`} className="btn btn-secondary">Mégse</Link>
        <button type="button" onClick={handleUpload} disabled={!selectedFiles.length || isUploading} className="btn btn-primary">
          {isUploading ? <><Loader2 size={16} className="animate-spin" />Feltöltés...</> : <><Check size={16} />{selectedFiles.length} fájl feltöltése</>}
        </button>
      </div>
    </div>
  );
}
