'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, MapPin, Calendar, User, Edit3, Trash2,
  Play, X, ChevronLeft, ChevronRight,
  FileText, FolderKanban, Home, Ruler, LayoutPanelLeft,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import DrawingsSection from '@/components/DrawingsSection';

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const cur = media[idx];
  const isVideo = cur?.mime_type?.startsWith('video/');
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [media.length, onClose]);
  if (!cur) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}><X size={20} /></button>
      {media.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>}
      {idx > 0 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={22} /></button>}
      {idx < media.length - 1 && <button type="button" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronRight size={22} /></button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo
          ? <video src={cur.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} />
          : <img src={cur.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />}
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}>
                {m.mime_type?.startsWith('video/') ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                  : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Read-only photo grid
function MediaGrid({ media }) {
  const [lightbox, setLightbox] = useState(null);
  if (!media || media.length === 0) return null;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.35rem', marginTop: '0.5rem' }}>
        {media.map((item, i) => {
          const isVideo = item.mime_type?.startsWith('video/');
          return (
            <button key={item.id} type="button" onClick={() => setLightbox(i)}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0, display: 'block' }}>
              {isVideo
                ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                    <Play size={20} color="#fff" /><span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Videó</span>
                  </div>
                : <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </button>
          );
        })}
      </div>
      {lightbox !== null && <Lightbox media={media} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const PILL = { fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' };

const WINDOW_M2 = 1.2 * 1.2;
const DOOR_M2   = 0.9 * 2.1;

function AreaSummary({ entry }) {
  const { size_m2, height_m, perimeter_m, window_count, door_count } = entry;
  const hasFloor = size_m2 != null;
  const hasWall  = height_m != null && perimeter_m != null;
  if (!hasFloor && !hasWall) return null;

  const windowArea = (window_count || 0) * WINDOW_M2;
  const doorArea   = (door_count   || 0) * DOOR_M2;
  const openings   = windowArea + doorArea;
  const grossWall  = hasWall ? perimeter_m * height_m : null;
  const netWall    = grossWall != null ? Math.max(0, grossWall - openings) : null;

  const fmt = v => Number(v).toFixed(2).replace('.', ',') + ' m²';
  const Row = ({ label, value, sub, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.78rem', color: sub ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: sub ? 400 : 600, paddingLeft: sub ? '0.75rem' : 0 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: bold ? 800 : 600, color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', marginTop: '0.65rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Területek</div>
      {hasFloor && <Row label="Padló / Mennyezet" value={fmt(size_m2)} />}
      {grossWall != null && <Row label="Falfelület (bruttó)" value={fmt(grossWall)} />}
      {openings > 0 && <Row label={`Kivonások (${window_count || 0} ablak + ${door_count || 0} ajtó)`} value={`− ${fmt(openings)}`} sub />}
      {netWall != null && <Row label="Falfelület (nettó)" value={fmt(netWall)} bold />}
      {!hasWall && openings > 0 && <Row label="Nyílások összesen" value={fmt(openings)} sub />}
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Ablak: 1,2×1,2 m · Ajtó: 0,9×2,1 m</div>
    </div>
  );
}

export default function SurveyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    loading, dataReady, surveys, quotes, projects, clients, users,
    isAdmin, currentUser,
    deleteSurvey,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey, surveyDrawingsBySurvey,
    fetchSurveyMedia,
  } = useApp();

  const [detailLoading, setDetailLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  if (loading || !dataReady) return <PageSpinner />;

  const survey = surveys.find(s => s.id === id);
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href="/felmeres" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client = clients.find(c => c.id === survey.client_id);
  const creator = users.find(u => u.id === survey.created_by);
  const layouts  = surveyLayoutsBySurvey[id]  || [];
  const entries  = surveyEntriesBySurvey[id]  || [];
  const drawings = surveyDrawingsBySurvey[id] || [];

  const isSharedMember = (survey.shared_with || []).includes(currentUser?.id);
  const canEdit = isAdmin || isSharedMember;
  const sharedMembers = (survey.shared_with || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);

  const linkedQuote = quotes.find(q => q.survey_id === id);
  const linkedProject = projects.find(p => p.survey_id === id);

  const toQuoteParams = new URLSearchParams();
  toQuoteParams.set('from_survey', id);
  if (survey.entity_id) toQuoteParams.set('entity_id', survey.entity_id);
  if (survey.title) toQuoteParams.set('title', survey.title);
  if (survey.client_id) toQuoteParams.set('client_id', survey.client_id);
  if (survey.location) toQuoteParams.set('location', survey.location);
  if (survey.notes) toQuoteParams.set('description', survey.notes);

  const handleDeleteSurvey = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést? Minden helyiség, fotó és videó is törlődik.`,
      onConfirm: async () => {
        try { await deleteSurvey(id); router.push('/felmeres'); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/felmeres" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a felmérésekhez
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{survey.title}</h1>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {canEdit && (
              <Link href={`/felmeres/${id}/szerkesztes`} className="btn btn-primary btn-sm">
                <Edit3 size={14} /> Szerkesztés
              </Link>
            )}
            {isAdmin && (
              <button type="button" onClick={handleDeleteSurvey} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Törlés
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="var(--accent)" />
              <Link href={`/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{client.name}</Link>
            </div>
          )}
          {survey.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} color="var(--accent)" />{survey.location}</span>}
          {survey.date && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} color="var(--accent)" />{formatDate(survey.date)}</span>}
          {creator && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rögzítette: {creator.display_name}</span>}
        </div>
        {sharedMembers.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Résztvevők:</span>
            {sharedMembers.map(u => (
              <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 700, color: u.id === currentUser?.id ? 'var(--accent)' : 'var(--text-secondary)', background: u.id === currentUser?.id ? 'var(--accent-light)' : 'var(--bg-subtle)', border: `1px solid ${u.id === currentUser?.id ? 'var(--accent-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-pill)', padding: '0.15rem 0.5rem' }}>
                {u.display_name}{u.id === currentUser?.id ? ' (Ön)' : ''}
              </span>
            ))}
          </div>
        )}
        {survey.notes && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {survey.notes}
          </div>
        )}
      </div>

      {/* Layouts */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <LayoutPanelLeft size={15} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Alaprajzok ({layouts.length})
          </span>
        </div>
        {detailLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Betöltés...</div>
        ) : layouts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.75rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            Nincs alaprajz feltöltve.
          </div>
        ) : (
          <MediaGrid media={layouts} />
        )}
      </div>

      {/* Survey-level drawings */}
      {drawings.filter(d => !d.entry_id).length > 0 && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <DrawingsSection
            drawings={drawings.filter(d => !d.entry_id)}
            onSave={() => {}}
            onDelete={() => {}}
            canEdit={false}
          />
        </div>
      )}

      {/* Rooms — read only */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Home size={15} color="var(--accent)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Helyiségek ({entries.length})</h2>
        </div>

        {!detailLoading && entries.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Home size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ marginBottom: canEdit ? '1rem' : 0 }}>Még nincsenek helyiségek.</p>
            {canEdit && (
              <Link href={`/felmeres/${id}/szerkesztes`} className="btn btn-primary btn-sm">
                <Edit3 size={14} /> Szerkesztés megnyitása
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map(entry => (
            <div key={entry.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: (entry.description || entry.media?.length) ? '0.65rem' : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{entry.name}</span>
                    {entry.size_m2   != null && <span style={PILL}><Ruler size={11} />{entry.size_m2} m²</span>}
                    {entry.height_m  != null && <span style={PILL}>{entry.height_m} m mag.</span>}
                    {entry.window_count > 0  && <span style={PILL}>{entry.window_count} ablak</span>}
                    {entry.door_count   > 0  && <span style={PILL}>{entry.door_count} ajtó</span>}
                    {entry.created_by_name && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: entry.created_by === currentUser?.id ? 'var(--accent-light)' : 'var(--bg-subtle)', border: `1px solid ${entry.created_by === currentUser?.id ? 'var(--accent-border)' : 'var(--border-subtle)'}`, color: entry.created_by === currentUser?.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {entry.created_by_name}
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
                  )}
                  <AreaSummary entry={entry} />
                </div>
              </div>
              {entry.media?.length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{entry.media.length} fotó / videó</span>
                  <MediaGrid media={entry.media} />
                </div>
              )}
              {drawings.filter(d => d.entry_id === entry.id).length > 0 && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  <DrawingsSection
                    drawings={drawings.filter(d => d.entry_id === entry.id)}
                    onSave={() => {}}
                    onDelete={() => {}}
                    canEdit={false}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Linked offer */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Kapcsolódó ajánlat
        </div>
        {linkedProject && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: linkedQuote ? '0.5rem' : 0 }}>
            <FolderKanban size={15} color="var(--success)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--success-text)' }}>
              Projekt: <Link href={`/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)' }}>{linkedProject.name}</Link>
            </span>
          </div>
        )}
        {linkedQuote ? (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} color="var(--warning-text)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--warning-text)' }}>
              Ajánlat: <Link href={`/ajanlatok/${linkedQuote.id}`} style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{linkedQuote.title}</Link>
            </span>
          </div>
        ) : (
          !linkedProject && canEdit && (
            <Link href={`/ajanlatok/uj?${toQuoteParams.toString()}`} className="btn btn-secondary btn-sm">
              <FileText size={14} /> Ajánlat létrehozása ebből a felmérésből
            </Link>
          )
        )}
      </div>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
