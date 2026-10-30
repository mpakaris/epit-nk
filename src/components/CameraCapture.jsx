'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';

export default function CameraCapture({ surveyId, surveyEntryId, onClose }) {
  const { uploadSurveyMedia } = useApp();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const counterRef = useRef(0);
  const [facingMode, setFacingMode] = useState('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [captures, setCaptures] = useState([]);

  // Start / restart camera
  useEffect(() => {
    let active = true;
    setReady(false);
    setError('');

    async function start() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (active) setReady(true);
      } catch {
        if (active) setError('A kamera nem érhető el. Ellenőrizd az alkalmazásengedélyeket a beállításokban.');
      }
    }

    start();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Lock body scroll (iOS-safe)
  useEffect(() => {
    const y = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${y}px`;
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, y);
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const id = ++counterRef.current;

    // Full-res canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Square thumbnail (center-crop)
    const thumbCanvas = document.createElement('canvas');
    const T = 72;
    thumbCanvas.width = T;
    thumbCanvas.height = T;
    const tc = thumbCanvas.getContext('2d');
    const vw = video.videoWidth, vh = video.videoHeight;
    if (vw > vh) {
      const sx = (vw - vh) / 2;
      tc.drawImage(video, sx, 0, vh, vh, 0, 0, T, T);
    } else {
      const sy = (vh - vw) / 2;
      tc.drawImage(video, 0, sy, vw, vw, 0, 0, T, T);
    }
    const thumb = thumbCanvas.toDataURL('image/jpeg', 0.6);

    setCaptures(prev => [...prev, { id, status: 'uploading', thumb }]);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'error' } : c));
        return;
      }
      try {
        const raw = new File([blob], `foto-${id}.webp`, { type: 'image/webp' });
        const compressed = await processMediaFile(raw);
        await uploadSurveyMedia(surveyId, [compressed], { entryId: surveyEntryId, mediaType: 'photo' });
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'done' } : c));
      } catch {
        setCaptures(prev => prev.map(c => c.id === id ? { ...c, status: 'error' } : c));
      }
    }, 'image/webp', 0.92);
  }, [ready, surveyId, surveyEntryId, uploadSurveyMedia]);

  const flipCamera = () => setFacingMode(m => m === 'environment' ? 'user' : 'environment');

  const pendingCount = captures.filter(c => c.status === 'uploading').length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {!ready && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', gap: '0.75rem' }}>
            <AlertCircle size={36} color="#f87171" />
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>{error}</p>
          </div>
        )}

        {/* Thumbnail strip — bottom-left */}
        {captures.length > 0 && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 5, flexDirection: 'row-reverse', alignItems: 'flex-end' }}>
            {captures.slice(-5).reverse().map((c, i) => (
              <div key={c.id} style={{
                position: 'relative',
                width: i === 0 ? 60 : 48,
                height: i === 0 ? 60 : 48,
                borderRadius: 8,
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.6)',
                flexShrink: 0,
                opacity: i === 0 ? 1 : 0.75,
              }}>
                <img src={c.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {c.status === 'uploading' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={14} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                {c.status === 'done' && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                    <CheckCircle2 size={14} color="#4ade80" fill="rgba(0,0,0,0.5)" />
                  </div>
                )}
                {c.status === 'error' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={16} color="#fff" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Photo count badge */}
        {captures.length > 0 && (
          <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '3px 10px', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
            {captures.length} fotó{pendingCount > 0 ? ` · ${pendingCount} feltölt…` : ''}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        background: '#111',
        padding: '1.1rem 2rem',
        paddingBottom: 'calc(1.1rem + env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Close / Done */}
        <button
          onClick={onClose}
          style={{
            width: 50, height: 50, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.35)',
            background: 'transparent',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {captures.length > 0 ? 'Kész' : <X size={22} />}
        </button>

        {/* Shutter button */}
        <button
          onClick={capture}
          disabled={!ready || !!error}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.9)',
            background: 'transparent',
            cursor: ready && !error ? 'pointer' : 'not-allowed',
            opacity: ready && !error ? 1 : 0.35,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff' }} />
        </button>

        {/* Flip camera */}
        <button
          onClick={flipCamera}
          disabled={!ready}
          style={{
            width: 50, height: 50, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.35)',
            background: 'transparent',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: ready ? 'pointer' : 'default',
            opacity: ready ? 1 : 0.35,
            flexShrink: 0,
          }}
          aria-label="Kamera váltás"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
