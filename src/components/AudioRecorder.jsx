'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import useMobile from '@/hooks/useMobile';

const MAX_MS    = 180_000; // 3 minutes
const WARN_AT_S = 10;      // warn when this many seconds remain

export default function AudioRecorder({ onTranscript, onError, disabled = false, size = 'md', externalTrigger = 0, hideTriggerButton = false, hint, hasContent = false }) {
  const [open, setOpen]     = useState(false);

  const prevTriggerRef = useRef(externalTrigger); // initialised to current value so remount doesn't fire
  useEffect(() => {
    if (externalTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = externalTrigger;
      if (externalTrigger > 0) setOpen(true);
    }
  }, [externalTrigger]);
  const [state, setState]   = useState('idle'); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const isMobile = useMobile();

  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const limitRef    = useRef(null);
  const secondsRef  = useRef(0);
  const stopOnStart = useRef(false); // hold released before getUserMedia resolved

  // Waveform visualiser
  const canvasRef   = useRef(null);
  const analyserRef = useRef(null);
  const animRef     = useRef(null);
  const audioCtxRef = useRef(null);

  const stopVisualiser = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    analyserRef.current = null;
    audioCtxRef.current = null;
    // Draw flat line on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'var(--border-subtle)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }, []);

  const startVisualiser = useCallback((stream) => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtxRef.current = new AC();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufLen = analyser.frequencyBinCount;
      const data   = new Uint8Array(bufLen);

      const draw = () => {
        animRef.current = requestAnimationFrame(draw);
        const canvas = canvasRef.current;
        if (!canvas) return;
        analyser.getByteTimeDomainData(data);

        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const step = W / (bufLen - 1);
        for (let i = 0; i < bufLen; i++) {
          const y = ((data[i] / 128) - 1) * (H * 0.45) + H / 2;
          i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
        }
        ctx.stroke();
      };
      draw();
    } catch {
      // Visualiser unavailable — recording still works
    }
  }, []);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(limitRef.current);
    stopVisualiser();
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
  }, [stopVisualiser]);

  useEffect(() => () => cleanup(), [cleanup]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      cleanup();
      setState('idle');
      setSeconds(0);
      secondsRef.current = 0;
      stopOnStart.current = false;
    } else {
      // Draw flat idle line once the canvas is mounted
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      });
    }
  }, [open, cleanup]);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      // If hold was already released before stream resolved, discard
      if (stopOnStart.current) {
        stopOnStart.current = false;
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRef.current = rec;

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        stopVisualiser();
        setState('processing');

        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1000) {
          // Too short — nothing recorded
          setState('idle');
          setSeconds(0);
          secondsRef.current = 0;
          return;
        }

        const fd = new FormData();
        const ext = blob.type.includes('mp4') || blob.type.includes('m4a') ? '.m4a'
          : blob.type.includes('ogg') ? '.ogg' : '.webm';
        fd.append('audio', blob, `recording${ext}`);

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Átírás sikertelen');
          setOpen(false);
          onTranscript?.(json.transcript);
        } catch (err) {
          onError?.(err.message || 'Hiba az átírásnál');
          setState('idle');
          setSeconds(0);
          secondsRef.current = 0;
        }
      };

      startVisualiser(stream);
      rec.start(250);
      secondsRef.current = 0;
      setState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
      limitRef.current = setTimeout(() => {
        if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
      }, MAX_MS);

    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.message?.includes('Permission');
      onError?.(denied ? 'Mikrofon-hozzáférés megtagadva' : 'Mikrofon nem elérhető');
      setOpen(false);
    }
  }, [state, onTranscript, onError, startVisualiser, stopVisualiser]);

  const stopRecording = useCallback(() => {
    clearTimeout(limitRef.current);
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
    } else {
      // Stream not started yet — flag to abort immediately when it does
      stopOnStart.current = true;
    }
  }, []);

  // ── Interaction handlers ──────────────────────────────────────────────────────

  // Mobile: hold to record
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    if (state !== 'idle') return;
    stopOnStart.current = false;
    startRecording();
  }, [state, startRecording]);

  const handlePointerUp = useCallback(() => {
    if (state === 'recording' || mediaRef.current?.state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      // Finger lifted while getUserMedia was still pending
      stopOnStart.current = true;
    }
  }, [state, stopRecording]);

  // Desktop: click toggle
  const handleDesktopClick = useCallback(() => {
    if (state === 'idle') startRecording();
    else if (state === 'recording') stopRecording();
  }, [state, startRecording, stopRecording]);

  const fmt      = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const maxSecs  = MAX_MS / 1000;
  const nearLimit = state === 'recording' && seconds >= maxSecs - WARN_AT_S;

  const sm = size === 'sm';
  const triggerSize = sm ? 36 : 44;
  const triggerIcon = sm ? 15 : 18;

  return (
    <>
      {/* ── Toolbar trigger (hidden when triggered externally on mobile) ── */}
      {!hideTriggerButton && (
        <button
          type="button"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
          style={{
            width: triggerSize, height: triggerSize, borderRadius: '50%', border: 'none', flexShrink: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: disabled ? 'var(--bg-subtle)' : 'var(--accent)',
          }}
          aria-label={hasContent ? 'Átírás hozzáadása' : 'Diktálás'}
        >
          <Mic size={triggerIcon} color={disabled ? 'var(--text-muted)' : '#fff'} />
        </button>
      )}

      {/* ── Modal / bottom sheet ── */}
      <Modal
        isOpen={open}
        onClose={() => { if (state !== 'recording' && state !== 'processing') setOpen(false); }}
        title={hasContent ? 'Átírás hozzáadása' : 'Diktálás'}
        maxWidth="380px"
        persistent={state === 'recording' || state === 'processing'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '0.5rem 0 0.75rem' }}>

          {/* Status line */}
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: state === 'recording' ? (nearLimit ? 'var(--warning-text)' : 'var(--danger-text)') : 'var(--text-secondary)', textAlign: 'center', minHeight: '1.4rem' }}>
            {state === 'idle'       && (isMobile ? 'Tartsd lenyomva a felvételhez' : 'Kattints a felvétel indításához')}
            {state === 'recording'  && !nearLimit && `Felvétel: ${fmt(seconds)}`}
            {state === 'recording'  && nearLimit  && `⚠ Még ${maxSecs - seconds}s — felvétel hamarosan megáll`}
            {state === 'processing' && 'Átírás folyamatban…'}
          </p>

          {/* Context hint */}
          {hint && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.55, padding: '0 0.25rem', whiteSpace: 'pre-line' }}>
              {hint}
            </p>
          )}

          {/* Append notice */}
          {hasContent && !hint && state === 'idle' && (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              A diktált szöveg a meglévő tartalom után kerül.
            </p>
          )}

          {/* Waveform canvas */}
          <canvas
            ref={canvasRef}
            width={300}
            height={48}
            style={{
              width: '100%', height: 48,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-subtle)',
              opacity: state === 'recording' ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
          />

          {/* Big mic button */}
          <button
            type="button"
            {...(isMobile ? {
              onPointerDown: handlePointerDown,
              onPointerUp:   handlePointerUp,
              onPointerLeave: handlePointerUp,
              onPointerCancel: handlePointerUp,
              onContextMenu: e => e.preventDefault(),
            } : {
              onClick: handleDesktopClick,
            })}
            disabled={state === 'processing'}
            style={{
              width: 96, height: 96, borderRadius: '50%', border: 'none',
              cursor: state === 'processing' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: state === 'recording' ? (nearLimit ? 'var(--warning-text)' : 'var(--danger-text)') : 'var(--accent)',
              transition: 'background 0.15s',
              WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none',
              animation: state === 'recording' ? (nearLimit ? 'ar-pulse-warn 0.7s ease-in-out infinite' : 'ar-pulse 1.2s ease-in-out infinite') : 'none',
            }}
          >
            {state === 'processing'
              ? <Loader2 size={36} className="animate-spin" color="#fff" />
              : state === 'recording'
              ? <MicOff size={36} color="#fff" />
              : <Mic size={36} color="#fff" />}
          </button>

          {/* Hint */}
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {state === 'idle'       && 'Max. 3 perc'}
            {state === 'recording'  && !nearLimit && (isMobile ? 'Engedd el az ujjad a leállításhoz' : 'Kattints a leállításhoz')}
            {state === 'recording'  && nearLimit  && `Legfeljebb ${fmt(maxSecs)} — állítsd le most`}
            {state === 'processing' && 'Kérjük, várj…'}
          </p>
        </div>

        <style>{`
          @keyframes ar-pulse {
            0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.2); }
            50%       { box-shadow: 0 0 0 18px rgba(239,68,68,0.07); }
          }
          @keyframes ar-pulse-warn {
            0%, 100% { box-shadow: 0 0 0 8px rgba(245,158,11,0.3); }
            50%       { box-shadow: 0 0 0 18px rgba(245,158,11,0.1); }
          }
        `}</style>
      </Modal>
    </>
  );
}
