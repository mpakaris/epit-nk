'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X, ChevronRight, Loader2, CheckCircle2,
  Ruler, FileText, FolderKanban, User, Users,
} from 'lucide-react';

// Steps: workspace → area → document → section → saving → done
// Workspace step is skipped when the user has no collectives.

const AREAS = [
  { id: 'felmeres', label: 'Felmérés',  desc: 'Szobafotó méréshez',        icon: Ruler },
  { id: 'ajanlat',  label: 'Ajánlat',   desc: 'Referencia ajánlathoz',     icon: FileText },
  { id: 'projekt',  label: 'Projekt',   desc: 'Napló bejegyzés',           icon: FolderKanban },
];

export default function QuickSnapModal({ file, onClose }) {
  const { surveys, quotes, projects, currentUser, effectiveCollectives, activeCollectiveId } = useApp();

  const workspaces = [
    { id: null, name: 'Személyes', type: 'personal' },
    ...(effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, type: 'collective' })),
  ];
  const multiWorkspace = workspaces.length > 1;
  const activeWs = workspaces.find(w => w.id === activeCollectiveId) ?? workspaces[0];

  // Step state
  const [step, setStep]             = useState(multiWorkspace ? 'workspace' : 'area');
  const [workspace, setWorkspace]   = useState(activeWs);
  const [area, setArea]             = useState(null);
  const [doc, setDoc]               = useState(null);
  const [rooms, setRooms]           = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [error, setError]           = useState('');

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

  // Documents filtered by workspace + area
  const documents = (() => {
    const byWs = item =>
      workspace.id
        ? item.collective_id === workspace.id
        : !item.collective_id && item.owner_id === currentUser?.id;
    if (area === 'felmeres') return (surveys  || []).filter(s => s.status !== 'done'    && byWs(s));
    if (area === 'ajanlat')  return (quotes   || []).filter(q => q.status !== 'deleted' && byWs(q));
    if (area === 'projekt')  return (projects || []).filter(p => !p.closed_at           && byWs(p));
    return [];
  })();

  // ── Navigation ──────────────────────────────────────────────────
  const pickWorkspace = (ws) => { setWorkspace(ws); setStep('area'); };

  const pickArea = (a) => {
    setArea(a);
    setDoc(null);
    setRooms([]);
    setError('');
    setStep('document');
  };

  const pickDocument = async (d) => {
    setDoc(d);
    setError('');
    if (area === 'felmeres') {
      setRoomsLoading(true);
      setStep('section');
      try {
        const res  = await fetch(`/api/surveys/${d.id}`);
        const data = await res.json();
        setRooms(data.entries || []);
      } catch { setError('A szobák betöltése nem sikerült.'); }
      finally   { setRoomsLoading(false); }
    } else {
      setStep('section');
    }
  };

  const backFrom = {
    area:     () => setStep(multiWorkspace ? 'workspace' : null),
    document: () => setStep('area'),
    section:  () => setStep('document'),
  };

  // ── Save ────────────────────────────────────────────────────────
  const save = async (room = null) => {
    setStep('saving');
    setError('');
    try {
      if (area === 'felmeres') {
        const fd = new FormData();
        fd.append('files', file);
        fd.append('survey_id', doc.id);
        if (room?.id) fd.append('entry_id', room.id);
        const res = await fetch('/api/surveys/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.json()).error || 'Hiba');
      } else {
        const fd = new FormData();
        fd.append('files', file);
        const up   = await fetch('/api/diary/upload', { method: 'POST', body: fd });
        if (!up.ok) throw new Error((await up.json()).error || 'Feltöltési hiba');
        const { photos } = await up.json();
        const photoId    = photos?.[0]?.id;

        if (area === 'projekt') {
          const today = new Date().toISOString().slice(0, 10);
          const er = await fetch('/api/diary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: doc.id,
              title: 'Gyors fotó',
              body: '',
              entry_date: today,
              photo_ids: photoId ? [photoId] : [],
              is_public: false,
            }),
          });
          if (!er.ok) throw new Error((await er.json()).error || 'Hiba');
        }
        // ajánlat: photo stored, photoId available for future linking
      }
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('section');
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="quicksnap-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="quicksnap-sheet">

        <div className="quicksnap-header">
          <div className="quicksnap-handle" />
          <button className="quicksnap-close" onClick={onClose} aria-label="Bezárás"><X size={18} /></button>
        </div>

        {previewUrl && (
          <div className="quicksnap-preview">
            <img src={previewUrl} alt="Fotó előnézet" />
          </div>
        )}

        {/* Breadcrumb strip */}
        {!['saving', 'done', 'workspace'].includes(step) && (
          <div className="quicksnap-crumbs">
            <span className={step === 'area'     ? 'crumb active' : 'crumb done'}>Terület</span>
            <span className="crumb-sep">›</span>
            <span className={step === 'document' ? 'crumb active' : step === 'section' ? 'crumb done' : 'crumb'}>Dokumentum</span>
            <span className="crumb-sep">›</span>
            <span className={step === 'section'  ? 'crumb active' : 'crumb'}>Szekció</span>
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

        {/* ── area ── */}
        {step === 'area' && (
          <div className="quicksnap-body">
            {multiWorkspace && (
              <button className="quicksnap-back" onClick={() => setStep('workspace')}>← Vissza</button>
            )}
            <p className="quicksnap-heading">Hova kerüljön?</p>
            <div className="quicksnap-area-list">
              {AREAS.map(a => (
                <button key={a.id} className="quicksnap-area-btn" onClick={() => pickArea(a.id)}>
                  <div className="quicksnap-area-icon"><a.icon size={22} strokeWidth={1.6} /></div>
                  <div className="quicksnap-area-text">
                    <span className="quicksnap-area-label">{a.label}</span>
                    <span className="quicksnap-area-desc">{a.desc}</span>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── document ── */}
        {step === 'document' && (
          <div className="quicksnap-body">
            <button className="quicksnap-back" onClick={backFrom.document}>← Vissza</button>
            <p className="quicksnap-heading">
              {area === 'felmeres' ? 'Melyik felmérés?' : area === 'ajanlat' ? 'Melyik ajánlat?' : 'Melyik projekt?'}
            </p>
            {documents.length === 0 ? (
              <p className="quicksnap-empty">Nincs elérhető elem ebben a munkaterületben.</p>
            ) : (
              <ul className="quicksnap-list">
                {documents.map(d => (
                  <li key={d.id}>
                    <button className="quicksnap-list-item" onClick={() => pickDocument(d)}>
                      <span className="quicksnap-list-name">{d.name}</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── section ── */}
        {step === 'section' && (
          <div className="quicksnap-body">
            <button className="quicksnap-back" onClick={backFrom.section}>← Vissza</button>

            {area === 'felmeres' && (
              <>
                <p className="quicksnap-heading">Melyik szoba?</p>
                {roomsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 size={24} className="animate-spin" color="var(--accent)" />
                  </div>
                ) : (
                  <ul className="quicksnap-list">
                    {rooms.map(room => (
                      <li key={room.id}>
                        <button className="quicksnap-list-item" onClick={() => save(room)}>
                          <span className="quicksnap-list-name">{room.name}</span>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </button>
                      </li>
                    ))}
                    <li>
                      <button className="quicksnap-list-item" onClick={() => save(null)}>
                        <span className="quicksnap-list-name" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Szoba nélkül
                        </span>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </button>
                    </li>
                  </ul>
                )}
                {error && <p className="quicksnap-error" style={{ marginTop: '0.5rem' }}>{error}</p>}
              </>
            )}

            {(area === 'projekt' || area === 'ajanlat') && (
              <>
                <p className="quicksnap-heading">{doc?.name}</p>
                <p className="quicksnap-note">
                  {area === 'projekt'
                    ? 'A fotó egy új naplóbejegyzésbe kerül, mai dátummal.'
                    : 'A fotó feltöltésre kerül és az ajánlathoz csatolható.'}
                </p>
                {error && <p className="quicksnap-error">{error}</p>}
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '1.25rem' }}
                  onClick={() => save()}
                >
                  Mentés
                </button>
              </>
            )}
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
