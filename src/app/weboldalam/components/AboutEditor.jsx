'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Trash2 } from 'lucide-react';

export default function AboutEditor({ content, onChange, tradeId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('type', 'about');
      fd.append('files', file);
      const r = await fetch('/api/website/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || 'Feltöltési hiba'); return; }
      onChange({ ...content, photo_r2_key: d.files[0].r2_key, photo_url: d.files[0].url });
    } catch {
      setUploadErr('Hálózati hiba');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    if (content.photo_r2_key) {
      await fetch('/api/website/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2_key: content.photo_r2_key }),
      }).catch(() => {});
    }
    onChange({ ...content, photo_r2_key: null, photo_url: null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Bemutatkozó szöveg <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 600 karakter)</span></label>
        <textarea
          className="form-control" rows={5} maxLength={600}
          value={content.text || ''}
          onChange={e => onChange({ ...content, text: e.target.value })}
          placeholder="Mesélj magadról, tapasztalataidról, miért érdemes téged választani…"
          style={{ resize: 'vertical' }}
        />
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          {(content.text || '').length}/600
        </p>
      </div>

      {/* Photo upload — premium feature */}
      <div>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Camera size={13} /> Profilkép
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 99, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}>PRÉMIUM</span>
        </label>
        {content.photo_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={content.photo_url} alt="Profilkép" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
            <button type="button" className="btn btn-danger btn-sm" onClick={removePhoto} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Trash2 size={13} /> Törlés
            </button>
          </div>
        ) : (
          <div>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            <button
              type="button" className="btn btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {uploading ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Feltöltés…</> : <><Upload size={13} /> Kép feltöltése</>}
            </button>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPG, PNG, WebP · max 5 MB · Automatikusan WebP-vé konvertálva</p>
          </div>
        )}
        {uploadErr && <p style={{ margin: '0.3rem 0 0', fontSize: '0.775rem', color: 'var(--danger)' }}>{uploadErr}</p>}
      </div>

    </div>
  );
}
