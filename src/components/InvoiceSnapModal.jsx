'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { INVOICE_CATEGORIES } from '@/lib/constants';
import {
  X, ChevronRight, Loader2, CheckCircle2,
  User, Users, DoorOpen, FileText,
} from 'lucide-react';

export default function InvoiceSnapModal({ file, onClose }) {
  const { projects, projectRooms, currentUser, effectiveCollectives, activeCollectiveId } = useApp();

  const workspaces = [
    { id: null, name: 'Személyes', type: 'personal' },
    ...(effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, type: 'collective' })),
  ];
  const multiWorkspace = workspaces.length > 1;
  const activeWs = workspaces.find(w => w.id === activeCollectiveId) ?? workspaces[0];

  // ── state ────────────────────────────────────────────────────────
  const [step, setStep]           = useState(multiWorkspace ? 'workspace' : 'project');
  const [workspace, setWorkspace] = useState(activeWs);
  const [project, setProject]     = useState(null);
  const [roomId, setRoomId]       = useState(undefined);   // undefined = not chosen yet
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('Anyag');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError]         = useState('');
  const amountRef = useRef(null);

  // Blob preview
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Lock body scroll while sheet is open (iOS-safe)
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

  // Upload file + OCR as soon as project is picked (fire-and-forget)
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const uploadDoneRef = useRef(false);

  const uploadAndOcr = async (proj) => {
    if (uploadDoneRef.current) return;
    uploadDoneRef.current = true;
    const fd = new FormData();
    fd.append('files', file);
    try {
      const up = await fetch('/api/diary/upload', { method: 'POST', body: fd });
      if (!up.ok) return;
      const { photos } = await up.json();
      const url = photos?.[0]?.url;
      if (url) {
        setUploadedUrl(url);
        // OCR only for images
        if (file.type?.startsWith('image/') && !amount) {
          setOcrLoading(true);
          try {
            const ocr = await fetch('/api/ocr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: url }),
            });
            const { suggestedValue } = await ocr.json();
            if (suggestedValue && !amount) setAmount(String(suggestedValue));
          } catch { /* OCR is best-effort */ }
          finally { setOcrLoading(false); }
        }
      }
    } catch { /* upload error handled at save time */ }
  };

  // Filtered projects for selected workspace
  const filteredProjects = (projects || []).filter(p => {
    if (p.closed_at) return false;
    return workspace.id
      ? p.collective_id === workspace.id
      : !p.collective_id && p.owner_id === currentUser?.id;
  });

  // Rooms for selected project
  const rooms = project ? (projectRooms || []).filter(r => r.project_id === project.id) : [];

  // ── navigation ───────────────────────────────────────────────────
  const pickWorkspace = (ws) => { setWorkspace(ws); setStep('project'); };

  const pickProject = (p) => {
    setProject(p);
    setRoomId(undefined);
    setStep('section');
    uploadAndOcr(p);
    // Focus amount field after a short delay
    setTimeout(() => amountRef.current?.focus(), 350);
  };

  // ── save ─────────────────────────────────────────────────────────
  const save = async () => {
    const val = Number(amount);
    if (!val || val <= 0) { setError('Kérjük add meg az összeget.'); return; }
    setStep('saving');
    setError('');
    try {
      // If file not uploaded yet, upload now
      let imageUrl = uploadedUrl;
      if (!imageUrl) {
        const fd = new FormData();
        fd.append('files', file);
        const up = await fetch('/api/diary/upload', { method: 'POST', body: fd });
        if (!up.ok) throw new Error('Feltöltési hiba');
        const { photos } = await up.json();
        imageUrl = photos?.[0]?.url;
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId:   project.id,
          valueHuf:    Math.round(val),
          category,
          description: '',
          imageUrl:    imageUrl || '',
          storagePath: '',
          roomId:      roomId || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Hiba');
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('section');
    }
  };

  // ── render ───────────────────────────────────────────────────────
  return (
    <div className="quicksnap-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="quicksnap-sheet">

        <div className="quicksnap-header">
          <div className="quicksnap-handle" />
          <button className="quicksnap-close" onClick={onClose} aria-label="Bezárás"><X size={18} /></button>
        </div>

        {file && (
          <div className="quicksnap-preview">
            {file.type === 'application/pdf' ? (
              <div className="invoice-pdf-preview">
                <FileText size={40} strokeWidth={1.4} color="var(--text-muted)" />
                <span className="invoice-pdf-label">PDF</span>
                <span className="invoice-pdf-name">{file.name}</span>
              </div>
            ) : (
              previewUrl && <img src={previewUrl} alt="Számla előnézet" />
            )}
          </div>
        )}

        {/* Breadcrumb */}
        {!['saving', 'done', 'workspace'].includes(step) && (
          <div className="quicksnap-crumbs">
            <span className={step === 'project' ? 'crumb active' : step === 'section' ? 'crumb done' : 'crumb'}>Projekt</span>
            <span className="crumb-sep">›</span>
            <span className={step === 'section' ? 'crumb active' : 'crumb'}>Összeg &amp; szekció</span>
          </div>
        )}

        {/* ── workspace ── */}
        {step === 'workspace' && (
          <div className="quicksnap-body">
            <p className="quicksnap-heading">Melyik munkaterület?</p>
            <ul className="quicksnap-list">
              {workspaces.map(ws => (
                <li key={ws.id ?? 'personal'}>
                  <button className="quicksnap-list-item" onClick={() => pickWorkspace(ws)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {ws.type === 'personal'
                        ? <User size={18} color="var(--text-muted)" />
                        : <Users size={18} color="var(--accent)" />}
                      <span className="quicksnap-list-name">{ws.name}</span>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── project ── */}
        {step === 'project' && (
          <div className="quicksnap-body">
            {multiWorkspace && (
              <button className="quicksnap-back" onClick={() => setStep('workspace')}>← Vissza</button>
            )}
            <p className="quicksnap-heading">Melyik projekthez?</p>
            {filteredProjects.length === 0 ? (
              <p className="quicksnap-empty">Nincs aktív projekt ebben a munkaterületben.</p>
            ) : (
              <ul className="quicksnap-list">
                {filteredProjects.map(p => (
                  <li key={p.id}>
                    <button className="quicksnap-list-item" onClick={() => pickProject(p)}>
                      <span className="quicksnap-list-name">{p.name}</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── section (room + amount + category) ── */}
        {step === 'section' && (
          <div className="quicksnap-body">
            <button className="quicksnap-back" onClick={() => setStep('project')}>← Vissza</button>
            <p className="quicksnap-heading" style={{ marginBottom: '0.6rem' }}>{project?.name}</p>

            {/* Room picker */}
            {rooms.length > 0 && (
              <div style={{ marginBottom: '1.1rem' }}>
                <p className="quicksnap-section-label">Szoba <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcionális)</span></p>
                <div className="invoice-room-chips">
                  <button
                    className={`invoice-room-chip${roomId === null ? ' selected' : ''}`}
                    onClick={() => setRoomId(null)}
                  >
                    <DoorOpen size={13} /> Nincs
                  </button>
                  {rooms.map(r => (
                    <button
                      key={r.id}
                      className={`invoice-room-chip${roomId === r.id ? ' selected' : ''}`}
                      onClick={() => setRoomId(r.id)}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount */}
            <div style={{ marginBottom: '1rem' }}>
              <p className="quicksnap-section-label">
                Összeg {ocrLoading && <Loader2 size={12} className="animate-spin" style={{ display: 'inline', marginLeft: 4 }} />}
              </p>
              <div className="invoice-amount-row">
                <input
                  ref={amountRef}
                  type="number"
                  inputMode="numeric"
                  className="invoice-amount-input"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <span className="invoice-amount-currency">Ft</span>
              </div>
              {ocrLoading && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>OCR betöltés…</p>}
            </div>

            {/* Category */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p className="quicksnap-section-label">Kategória</p>
              <div className="invoice-cat-chips">
                {INVOICE_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    className={`invoice-room-chip${category === c.id ? ' selected' : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="quicksnap-error">{error}</p>}

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={save}
              disabled={!amount || Number(amount) <= 0}
            >
              Számla mentése
            </button>
          </div>
        )}

        {/* ── saving ── */}
        {step === 'saving' && (
          <div className="quicksnap-body quicksnap-center">
            <Loader2 size={36} className="animate-spin" color="var(--accent)" />
            <p style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Feltöltés…</p>
          </div>
        )}

        {/* ── done ── */}
        {step === 'done' && (
          <div className="quicksnap-body quicksnap-center">
            <CheckCircle2 size={48} color="var(--success)" />
            <p style={{ marginTop: '0.75rem', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Mentve!</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }} onClick={onClose}>Bezárás</button>
          </div>
        )}

      </div>
    </div>
  );
}
