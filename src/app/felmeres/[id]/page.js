'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { ConfirmModal, AlertModal } from '@/components/Modal';
import LockedDocumentModal from '@/components/LockedDocumentModal';
import CollectiveBanner from '@/components/CollectiveBanner';
import DrawingsSection from '@/components/DrawingsSection';
import {
  ArrowLeft, MapPin, Calendar, Clock, User, Edit3, Trash2,
  ChevronDown, Check, Loader2,
  FileText, FolderKanban, Home, Ruler, LayoutPanelLeft,
  Camera, Plus, AlertCircle, List,
  MoreHorizontal,
  CheckCircle2, RefreshCw, Send, Mic, PenLine, Sparkles,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import { processMediaFile } from '@/lib/mediaGate';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import useMobile from '@/hooks/useMobile';
import UploadProgressBadge from '@/components/mobile/UploadProgressBadge';
import AudioRecorder from '@/components/AudioRecorder';
import BottomSheet from '@/components/mobile/BottomSheet';
import Lightbox from '@/components/Lightbox';
import MediaGrid from './components/MediaGrid';
import InlineUpload, { InlineUploadZone } from './components/InlineUpload';
import AreaSummary from './components/AreaSummary';
import TételekSection from './components/TételekSection';
import SurveyEntryCard from './components/SurveyEntryCard';
import PropertyInfoSection from './components/PropertyInfoSection';
import LayoutAnalysisModal from './components/LayoutAnalysisModal';

// ── Room/entry form ────────────────────────────────────────────────────────────
function EntryForm({ initial, surveyId, onSave, onCancel }) {
  const { uploadSurveyMedia, deleteSurveyEntry } = useApp();
  const [name, setName]               = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [widthM, setWidthM]           = useState(initial?.width_m  != null ? String(initial.width_m)  : '');
  const [lengthM, setLengthM]         = useState(initial?.length_m != null ? String(initial.length_m) : '');
  const [heightM, setHeightM]         = useState(initial?.height_m != null ? String(initial.height_m) : '');
  const [windowCount, setWindowCount] = useState(initial?.window_count != null ? String(initial.window_count) : '');
  const [doorCount, setDoorCount]     = useState(initial?.door_count   != null ? String(initial.door_count)   : '');
  const [wallM2, setWallM2]           = useState('');
  const [wallAuto, setWallAuto]       = useState(true);

  const w = parseFloat(widthM);
  const l = parseFloat(lengthM);
  const computedArea      = w > 0 && l > 0 ? w * l : null;
  const computedPerimeter = w > 0 && l > 0 ? 2 * (w + l) : null;

  useEffect(() => {
    if (!wallAuto) return;
    const h   = parseFloat(heightM);
    const ded = (parseInt(windowCount) || 0) * WINDOW_M2 + (parseInt(doorCount) || 0) * DOOR_M2;
    const net = computedPerimeter && h > 0 ? Math.max(0, computedPerimeter * h - ded) : null;
    setWallM2(net != null ? net.toFixed(2) : '');
  }, [widthM, lengthM, heightM, windowCount, doorCount, wallAuto]);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saved | error
  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews]           = useState([]);

  const valuesRef = useRef({});
  valuesRef.current = { name, description, widthM, lengthM, heightM, windowCount, doorCount };

  const handleBlurSave = async () => {
    if (!initial) return;
    const v = valuesRef.current;
    if (!v.name.trim()) { setError('A hely neve kötelező!'); return; }
    setError(''); setSaving(true);
    try {
      await onSave({
        name:         v.name.trim(),
        description:  v.description.trim() || null,
        width_m:      parseFloat(v.widthM)      || null,
        length_m:     parseFloat(v.lengthM)     || null,
        height_m:     parseFloat(v.heightM)     || null,
        window_count: parseInt(v.windowCount)   || 0,
        door_count:   parseInt(v.doorCount)     || 0,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch (err) {
      setError(err.message || 'Hiba');
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  const addFiles = async (e) => {
    const raw = Array.from(e.target.files || []);
    e.target.value = '';
    if (!raw.length) return;
    const converted = await Promise.all(raw.map(processMediaFile));
    setSelectedFiles(prev => [...prev, ...converted]);
    setPreviews(prev => [...prev, ...converted.map(f => ({ key: `${f.name}-${f.size}`, isVideo: f.type.startsWith('video/'), url: f.type.startsWith('video/') ? null : URL.createObjectURL(f) }))]);
  };
  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('A hely neve kötelező!'); return; }
    setSaving(true);
    try {
      const h = parseFloat(heightM) || 0;
      const entry = await onSave({
        name: name.trim(),
        description: description.trim() || null,
        width_m:      parseFloat(widthM)  || null,
        length_m:     parseFloat(lengthM) || null,
        height_m:     h || null,
        window_count: parseInt(windowCount) || 0,
        door_count:   parseInt(doorCount)   || 0,
      });
      if (!initial && selectedFiles.length && entry?.id) {
        try { await uploadSurveyMedia(surveyId, selectedFiles, { entryId: entry.id, mediaType: 'photo' }); }
        catch (uploadErr) {
          try { await deleteSurveyEntry(surveyId, entry.id); } catch {}
          throw uploadErr;
        }
      }
      onCancel();
    } catch (err) {
      setError(err.message || 'Hiba a mentéskor');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="entry-name">Helyiség neve *</label>
        <input id="entry-name" type="text" className="form-control" autoFocus={!initial} value={name} onChange={e => setName(e.target.value)} onBlur={handleBlurSave} placeholder="pl. Fürdőszoba, Konyha, Nappali" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-width">Szél. (m)</label>
          <input id="entry-width" type="number" min="0" step="0.1" className="form-control" value={widthM} onChange={e => setWidthM(e.target.value)} onBlur={handleBlurSave} placeholder="pl. 3.5" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-length">Hossz. (m)</label>
          <input id="entry-length" type="number" min="0" step="0.1" className="form-control" value={lengthM} onChange={e => setLengthM(e.target.value)} onBlur={handleBlurSave} placeholder="pl. 4.2" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-height">Magass. (m)</label>
          <input id="entry-height" type="number" min="0" step="0.05" className="form-control" value={heightM} onChange={e => setHeightM(e.target.value)} onBlur={handleBlurSave} placeholder="pl. 2.6" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-windows">Ablak (db)</label>
          <input id="entry-windows" type="number" min="0" step="1" className="form-control" value={windowCount} onChange={e => setWindowCount(e.target.value)} onBlur={handleBlurSave} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-doors">Ajtó (db)</label>
          <input id="entry-doors" type="number" min="0" step="1" className="form-control" value={doorCount} onChange={e => setDoorCount(e.target.value)} onBlur={handleBlurSave} placeholder="0" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="entry-wall">Falfel. (m²)</label>
          <input id="entry-wall" type="number" min="0" step="0.01" className="form-control" value={wallM2}
            onChange={e => { setWallAuto(false); setWallM2(e.target.value); }}
            onBlur={handleBlurSave}
            placeholder="m²" />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem' }}>
        <label className="form-label" htmlFor="entry-desc">Megjegyzés</label>
        <textarea id="entry-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} onBlur={handleBlurSave} placeholder="Állapot, munkák, megjegyzések…" />
      </div>
      {!initial && (
        <div style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Fotók / videók (opcionális)</label>
          <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" multiple onChange={addFiles} style={{ display: 'none' }} />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={addFiles} style={{ display: 'none' }} />
          {previews.length === 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Camera size={14} /> Kamera</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Camera size={14} /> Galéria</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {previews.map((p, i) => (
                  <div key={p.key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    {p.isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}><Play size={18} color="#fff" /></div>
                      : <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={10} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Plus size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        {initial ? (
          <>
            {saving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Loader2 size={12} className="animate-spin" />Mentés…</span>}
            {saveStatus === 'saved' && !saving && <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Check size={12} />Mentve</span>}
            <button type="button" className="btn btn-primary btn-sm" onClick={async () => { await handleBlurSave(); onCancel(); }} disabled={saving}>
              Kész
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <><Loader2 size={13} className="animate-spin" />{selectedFiles.length > 0 ? 'Feltöltés' : 'Mentés'}</> : 'Helyiség hozzáadása'}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

// ── Meta edit drawer (bottom sheet) ───────────────────────────────────────────
function MetaDrawer({ survey, clients, isOpen, onClose, onSave }) {
  const [title, setTitle]       = useState('');
  const [date, setDate]         = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes]       = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [formatting, setFormatting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(survey.title || '');
    setDate(survey.date || '');
    setLocation(survey.location || '');
    setNotes(survey.notes || '');
    setClientId(survey.client_id || '');
    setError('');
    setSaving(false);
  }, [isOpen, survey]);

  const handleClose = async () => {
    if (!title.trim()) { setError('A felmérés neve kötelező!'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        date: date || null,
        location: location.trim(),
        notes: notes.trim(),
        client_id: clientId || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentéskor');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflow: 'auto', padding: '1.25rem 1.25rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>Alapadatok szerkesztése</span>
          <button type="button" onClick={handleClose} disabled={saving}
            style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="sv-title">Felmérés neve *</label>
          <input id="sv-title" type="text" className="form-control" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felmérés" />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="sv-date">Dátum</label>
            <input id="sv-date" type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="sv-location">Helyszín</label>
            <input id="sv-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. 8600 Siófok, Fő u. 12." />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label" htmlFor="sv-client">Ügyfél</label>
          <select id="sv-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">– Ügyfél nélkül –</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
            <label className="form-label" htmlFor="sv-notes" style={{ margin: 0 }}>Megjegyzések</label>
            <AudioRecorder
              size="sm"
              disabled={formatting}
              hasContent={!!notes.trim()}
              onTranscript={async (text) => {
                setFormatting(true);
                try {
                  const res = await fetch('/api/format-notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transcript: text }),
                  });
                  const data = await res.json();
                  const formatted = res.ok ? (data.formatted || text) : text;
                  setNotes(n => n.trim() ? n.trim() + '\n\n' + formatted : formatted);
                } catch {
                  setNotes(n => n.trim() ? n.trim() + '\n\n' + text : text);
                } finally {
                  setFormatting(false);
                }
              }}
              onError={() => {}}
            />
            {formatting && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <textarea id="sv-notes" rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felmérési megjegyzések, részletek…" />
        </div>
      </div>
    </>
  );
}

// ── Area calc constants (used by EntryForm) ────────────────────────────────────
const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;



// ── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    loading, dataReady, surveys, quotes, projects, clients, users,
    isAdmin, currentUser, collectives,
    cacheSurvey, deleteSurvey, updateSurvey, deleteSurveyMedia,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey, surveyDrawingsBySurvey,
    fetchSurveyMedia, uploadSurveyMedia,
    createSurveyEntry, updateSurveyEntry, deleteSurveyEntry,
    createSurveyDrawing, deleteSurveyDrawing,
    isDemoMode,
  } = useApp();

  const isMobile = useMobile();

  // Background upload queue — photos appear as local previews instantly
  const uploadFn = useCallback(async (rawFile, { surveyId, entryId, mediaType }) => {
    const uploaded = await uploadSurveyMedia(surveyId, [rawFile], { entryId, mediaType });
    if (mediaType === 'layout' && uploaded?.length) {
      setPendingAnalysisLayout(uploaded[0]);
    }
  }, [uploadSurveyMedia]);

  const { enqueue, queue, retryAll, totalPending, totalUploading, totalError } = useUploadQueue({ uploadFn });

  const getPendingForEntry = useCallback(
    (entryId) => queue.filter(i => i.meta.entryId === entryId && i.status !== 'done'),
    [queue]
  );
  // surveyItemsBySurvey, createSurveyItem, updateSurveyItem, deleteSurveyItem, generateSurveyEntryItems
  // are used inside TételekSection via useApp() directly

  const navPrefix = isDemoMode ? '/demo' : '';

  const [detailLoading, setDetailLoading] = useState(true);
  const [confirmModal, setConfirmModal]   = useState(null);
  const [alertModal, setAlertModal]       = useState(null);
  const [lockedModalOpen, setLockedModalOpen]       = useState(false);
  const [transferAttemptCount, setTransferAttemptCount] = useState(0);
  const [showMetaDrawer, setShowMetaDrawer] = useState(false);
  const [showAddEntry, setShowAddEntry]   = useState(false);
  const [editingEntry, setEditingEntry]   = useState(null);
  const [statusSaving, setStatusSaving]   = useState(false);
  const [surveyCtxOpen, setSurveyCtxOpen] = useState(false);
  const [surveyDrawingTrigger, setSurveyDrawingTrigger] = useState(0);
  const [propertyNotesTrigger, setPropertyNotesTrigger] = useState(0);
  const [pendingAnalysisLayout, setPendingAnalysisLayout] = useState(null);
  const [analyzeLayout, setAnalyzeLayout] = useState(null);
  const layoutInputRef = useRef(null);
  // Fallback: fetch directly when survey is not in the active context
  const [directSurvey,   setDirectSurvey]   = useState(null);
  const [directFetching, setDirectFetching] = useState(false);

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMedia(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  useEffect(() => {
    if (!dataReady) return;
    if (surveys.find(s => s.id === id)) return;
    // Survey not in active context — try a direct API fetch (e.g. context mismatch)
    setDirectFetching(true);
    fetch(`/api/surveys/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.survey) { setDirectSurvey(d.survey); cacheSurvey(d.survey); } })
      .catch(() => {})
      .finally(() => setDirectFetching(false));
  }, [id, dataReady, surveys]);

  // Auto-open locked modal + count attempts
  useEffect(() => {
    const s = surveys.find(sv => sv.id === id) || directSurvey;
    if (s?.locked_reason) {
      setLockedModalOpen(true);
      if (!isDemoMode) {
        fetch('/api/transfer-requests?outgoing=true')
          .then(r => r.ok ? r.json() : { requests: [] })
          .then(d => {
            const count = (d.requests || []).filter(t => t.document_id === id && (t.status === 'rejected' || t.status === 'transfer_expired')).length;
            setTransferAttemptCount(count);
          }).catch(() => {});
      }
    }
  }, [id, surveys, directSurvey, isDemoMode]);

  if (loading || !dataReady || directFetching) return <PageSpinner />;

  const survey = surveys.find(s => s.id === id) || directSurvey;
  if (!survey) return (
    <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
      <h2>A felmérés nem található</h2>
      <Link href={`${navPrefix}/felmeres`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
    </div>
  );

  const client   = clients.find(c => c.id === survey.client_id);
  const creator  = users.find(u => u.id === survey.created_by);
  const layouts  = surveyLayoutsBySurvey[id]  || [];
  const entries  = surveyEntriesBySurvey[id]  || [];
  const drawings = surveyDrawingsBySurvey[id] || [];

  const isOwner          = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
  const isSharedMember   = (survey.shared_with || []).includes(currentUser?.id);
  const myCollectiveRole = collectives?.find(c => c.collective_id === survey.collective_id)?.role;
  const isKollektivOwner = myCollectiveRole === 'owner' || myCollectiveRole === 'admin';
  const isCollMember     = !!myCollectiveRole;
  // Any member can add entries/upload; only creator or collective owner can edit/delete specific entries
  const isDocLocked  = !!survey.locked_reason;
  const canAdd       = !isDocLocked && (isOwner || isSharedMember || isCollMember);
  const canEditMeta  = !isDocLocked && (isKollektivOwner || isOwner);
  // General property info (Ingatlan adatok) is open to all participants — any member can enrich it
  const canEditPropertyInfo = !isDocLocked && (isKollektivOwner || isOwner || isCollMember || isSharedMember);
  const canDrawings  = !isDocLocked && (isKollektivOwner || isOwner || isCollMember || isSharedMember);
  const canEditEntry = (entry) => !isDocLocked && (isKollektivOwner || entry.created_by === currentUser?.id);
  // Owner/admin sees X on all files; members only on files they uploaded
  const canDeleteMediaItem = (item) => canEditMeta || item.uploaded_by === currentUser?.id;

  const sharedMembers = (survey.shared_with || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);

  const linkedQuote   = quotes.find(q => q.survey_id === id);
  const linkedProject = projects.find(p => p.survey_id === id);

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      const body = { status: newStatus };
      if (newStatus === 'reopened') body.reopened_at = new Date().toISOString();
      if (newStatus === 'done')     body.done_at     = new Date().toISOString();
      await fetch(`/api/surveys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await updateSurvey?.(id, body);
    } catch (e) {
      setAlertModal({ message: 'Állapot mentése sikertelen.' });
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteSurvey = () => {
    const entryCount   = entries.length;
    const mediaCount   = [
      ...layouts,
      ...(surveyMediaBySurvey[id] || []),
      ...entries.flatMap(e => e.media || []),
    ].length;
    const drawingCount = drawings.length;

    const parts = [];
    if (entryCount)   parts.push(`${entryCount} helyiség`);
    if (mediaCount)   parts.push(`${mediaCount} fotó / videó`);
    if (drawingCount) parts.push(`${drawingCount} vázlat`);

    const detail = parts.length
      ? ` Véglegesen törlődik: ${parts.join(', ')}. Ez nem vonható vissza.`
      : ' Ez nem vonható vissza.';

    setConfirmModal({
      message: `Biztosan törölni kívánja „${survey.title}" felmérést?${detail}`,
      onConfirm: async () => {
        try { await deleteSurvey(id); router.push(`${navPrefix}/felmeres`); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleDeleteMedia = (item) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a fájlt?',
      onConfirm: async () => {
        try { await deleteSurveyMedia(item.id, id, item.entry_id, item.media_type); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  const handleDeleteEntry = (entry) => {
    const mediaCount    = entry.media?.length || 0;
    const drawingCount  = drawings.filter(d => d.entry_id === entry.id).length;
    const parts = [];
    if (mediaCount)   parts.push(`${mediaCount} fotó / videó`);
    if (drawingCount) parts.push(`${drawingCount} vázlat`);
    const detail = parts.length
      ? ` Ezzel együtt törlődik: ${parts.join(', ')}.`
      : '';
    setConfirmModal({
      message: `Biztosan törölni kívánja „${entry.name}" helyiséget?${detail}`,
      onConfirm: async () => {
        try { await deleteSurveyEntry(id, entry.id); }
        catch (err) { setAlertModal({ message: err.message }); }
      },
    });
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`${navPrefix}/felmeres`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a felmérésekhez
        </Link>
      </div>

      <CollectiveBanner documentCollectiveId={survey.collective_id ?? null} />
      {isDocLocked && !lockedModalOpen && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)', fontWeight: 600, flex: 1 }}>
              🔒 Ez a felmérés csak olvasható.
            </span>
            {!isMobile && (
              <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                Lehetőségeim →
              </button>
            )}
          </div>
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setLockedModalOpen(true)} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Lehetőségeim →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{survey.title}</h1>
              {survey.status === 'done' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
                  <CheckCircle2 size={12} /> Lezárt
                </span>
              )}
              {survey.status === 'reopened' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }}>
                  <RefreshCw size={12} /> Újranyitva
                </span>
              )}
            </div>
            {survey.status === 'done' && survey.done_at && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Lezárva: {new Date(survey.done_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Desktop action buttons */}
          {canEditMeta && (
            <div className="hide-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              {survey.status === 'done' && (
                <button type="button" onClick={() => handleStatusChange('reopened')} disabled={statusSaving} className="btn btn-secondary btn-sm">
                  <RefreshCw size={13} /> Újranyitás
                </button>
              )}
              {(survey.status === 'active' || survey.status === 'reopened') && (
                <button type="button" onClick={() => handleStatusChange('done')} disabled={statusSaving} className="btn btn-secondary btn-sm">
                  <CheckCircle2 size={13} /> Lezárás
                </button>
              )}
              <button type="button" onClick={handleDeleteSurvey} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Törlés
              </button>
            </div>
          )}

          {/* Mobile: single ⋮ context menu — visible to anyone who can do at least one action */}
          {(canEditMeta || canAdd || canDrawings) && (
            <button type="button" onClick={() => setSurveyCtxOpen(true)}
              className="show-mobile btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.55rem', flexShrink: 0 }}>
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Meta card */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
            {client && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={15} color="var(--accent)" />
                <Link href={`${navPrefix}/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{client.name}</Link>
              </div>
            )}
            {survey.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} color="var(--accent)" />{survey.location}</span>}
            {survey.date && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} color="var(--accent)" />{formatDate(survey.date)}</span>}
            {creator && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}><User size={13} />Rögzítette: {creator.display_name}</span>}
            {survey.created_at && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}><Clock size={13} />{new Date(survey.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
          {canEditMeta && !isMobile && (
            <button type="button" onClick={() => setShowMetaDrawer(true)} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.5rem', flexShrink: 0 }}>
              <Edit3 size={13} />
            </button>
          )}
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

      {/* Layouts — desktop only (mobile sees them inside Ingatlan adatok card) */}
      {(!isMobile) && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LayoutPanelLeft size={15} color="var(--accent)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Alaprajzok ({layouts.length})
              </span>
            </div>
            {canAdd && !detailLoading && (
              <span className="hide-mobile">
                <InlineUpload surveyId={id} entryId={null} mediaType="layout" label="Alaprajz hozzáadása" enqueue={enqueue} />
              </span>
            )}
          </div>
          {detailLoading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Betöltés...</div>
          ) : layouts.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.75rem', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              {canAdd ? 'Nincs alaprajz feltöltve. (Opcionális)' : 'Nincs alaprajz feltöltve.'}
            </div>
          ) : (
            <MediaGrid media={layouts} onDelete={(canEditMeta || isCollMember || isSharedMember) ? handleDeleteMedia : undefined} canDeleteItem={canDeleteMediaItem} />
          )}
        </div>
      )}

      {/* Property / utility info */}
      <PropertyInfoSection
        survey={survey}
        surveyId={id}
        canEdit={canEditPropertyInfo}
        enqueue={canAdd ? enqueue : undefined}
        triggerNotesAudio={propertyNotesTrigger}
        layouts={layouts}
        canAdd={canAdd}
        surveyDrawings={drawings.filter(d => !d.entry_id)}
        canDrawings={canDrawings}
        onSaveDrawing={svg => createSurveyDrawing(id, { svg_data: svg })}
        onDeleteDrawing={drawingId => deleteSurveyDrawing(id, drawingId)}
        drawingTrigger={surveyDrawingTrigger}
        onDeleteMedia={(canEditMeta || isCollMember || isSharedMember) ? handleDeleteMedia : undefined}
        canDeleteMediaItem={canDeleteMediaItem}
      />

      {/* Hidden layout upload input for mobile context menu */}
      <input
        ref={layoutInputRef}
        type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => {
          const raw = Array.from(e.target.files || []);
          e.target.value = '';
          if (raw.length && enqueue) enqueue(raw, { surveyId: id, entryId: null, mediaType: 'layout' });
        }}
      />

      {/* Mobile survey-level context menu */}
      <BottomSheet
        isOpen={surveyCtxOpen}
        onClose={() => setSurveyCtxOpen(false)}
        title={survey.title}
        actions={[
          ...(canEditMeta ? [
            { icon: Edit3,       label: 'Általános szerkesztése',       onClick: () => setShowMetaDrawer(true) },
            { icon: Mic,         label: 'Ingatlan megjegyzés diktálása', onClick: () => { setPropertyNotesTrigger(n => n + 1); } },
            ...(survey.status === 'done'
              ? [{ icon: RefreshCw,    label: 'Újranyitás', onClick: () => handleStatusChange('reopened') }]
              : [{ icon: CheckCircle2, label: 'Lezárás',    onClick: () => handleStatusChange('done') }]
            ),
          ] : []),
          ...(canAdd      ? [{ icon: LayoutPanelLeft, label: 'Alaprajz hozzáadása', onClick: () => layoutInputRef.current?.click() }] : []),
          ...(canDrawings ? [{ icon: PenLine,          label: 'Általános vázlat',    onClick: () => setSurveyDrawingTrigger(n => n + 1) }] : []),
          ...(canEditMeta ? [{ icon: Trash2, label: 'Törlés', danger: true, dividerBefore: true, onClick: handleDeleteSurvey }] : []),
        ]}
      />

      {/* Survey-level drawings — desktop only (mobile sees them inside Ingatlan adatok card) */}
      {(() => {
        const surveyDrawings = drawings.filter(d => !d.entry_id);
        if (isMobile) return null;
        return (
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <DrawingsSection
              drawings={surveyDrawings}
              onSave={canDrawings ? (svg => createSurveyDrawing(id, { svg_data: svg })) : undefined}
              onDelete={canDrawings ? (drawingId => deleteSurveyDrawing(id, drawingId)) : undefined}
              canEdit={canDrawings}
              triggerCount={surveyDrawingTrigger}
            />
          </div>
        );
      })()}

      {/* Rooms */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={15} color="var(--accent)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Helyiségek ({entries.length})</h2>
          </div>
          {canAdd && entries.length < 30 && (
            <>
              {/* Desktop: labeled button */}
              <button type="button" onClick={() => { setShowAddEntry(true); setEditingEntry(null); }} className="btn btn-primary btn-sm hide-mobile">
                <Plus size={14} /> Helyiség hozzáadása
              </button>
              {/* Mobile: icon-only */}
              <button
                type="button"
                onClick={() => { setShowAddEntry(true); setEditingEntry(null); }}
                className="show-mobile"
                aria-label="Helyiség hozzáadása"
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#0f172a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={16} color="#fff" strokeWidth={2} aria-hidden="true" />
              </button>
            </>
          )}
          {canAdd && entries.length >= 30 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Maximum 30 helyiség</span>
          )}
        </div>

        {canAdd && showAddEntry && !editingEntry && (
          <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Új helyiség</div>
            <EntryForm
              surveyId={id}
              onSave={(fields) => createSurveyEntry(id, fields)}
              onCancel={() => setShowAddEntry(false)}
            />
          </div>
        )}

        {!detailLoading && entries.length === 0 && !showAddEntry && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Home size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ marginBottom: canAdd ? '1rem' : 0 }}>Még nincsenek helyiségek.</p>
            {canAdd && entries.length < 30 && (
              <button type="button" onClick={() => setShowAddEntry(true)} className="btn btn-primary btn-sm">
                <Plus size={14} /> Helyiség hozzáadása
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entries.map(entry => {
            const isNewEntry = survey.status === 'reopened'
              && survey.done_at
              && entry.created_at
              && new Date(entry.created_at) > new Date(survey.done_at);

            return (
              <div key={entry.id}>
                {/* New-entry banner for reopened surveys */}
                {isNewEntry && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderBottom: 'none', fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-text)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <RefreshCw size={11} /> Új szekció — újranyitás után hozzáadva
                    </span>
                    {linkedQuote && (
                      <button
                        type="button"
                        onClick={() => router.push(`${navPrefix}/ajanlatok/${linkedQuote.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--warning-text)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Send size={10} /> Küldés árajánlatba
                      </button>
                    )}
                  </div>
                )}
                {canEditEntry(entry) && editingEntry?.id === entry.id ? (
                  <div className="card" style={{ padding: '1rem', border: '2px solid var(--accent-border)', background: 'var(--accent-light)', ...(isNewEntry ? { borderRadius: '0 0 var(--radius-md) var(--radius-md)' } : {}) }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Szerkesztés: {entry.name}</div>
                    <EntryForm
                      initial={entry}
                      surveyId={id}
                      onSave={(fields) => updateSurveyEntry(id, entry.id, fields)}
                      onCancel={() => setEditingEntry(null)}
                    />
                  </div>
                ) : (
                  <SurveyEntryCard
                    entry={entry}
                    surveyId={id}
                    canEditEntry={canEditEntry(entry)}
                    canAdd={canAdd}
                    canEditAll={isKollektivOwner || isOwner}
                    onEdit={() => { setEditingEntry(entry); setShowAddEntry(false); }}
                    onDelete={() => handleDeleteEntry(entry)}
                    handleDeleteMedia={handleDeleteMedia}
                    canDeleteMediaItem={canDeleteMediaItem}
                    drawings={drawings}
                    createSurveyDrawing={createSurveyDrawing}
                    deleteSurveyDrawing={deleteSurveyDrawing}
                    canDrawings={canDrawings}
                    currentUser={currentUser}
                    pendingUploads={getPendingForEntry(entry.id)}
                    enqueue={canAdd ? enqueue : undefined}
                    style={isNewEntry ? { borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: '2px solid var(--warning-border)' } : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Linked offer / project — only shown when something is linked */}
      {(linkedQuote || linkedProject) && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Kapcsolódó
          </div>
          {linkedProject && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: linkedQuote ? '0.5rem' : 0 }}>
              <FolderKanban size={15} color="var(--success)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--success-text)' }}>
                Projekt: <Link href={`${navPrefix}/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)' }}>{linkedProject.name}</Link>
              </span>
            </div>
          )}
          {linkedQuote && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={15} color="var(--warning-text)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--warning-text)' }}>
                Ajánlat: <Link href={`${navPrefix}/ajanlatok/${linkedQuote.id}`} style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{linkedQuote.title}</Link>
              </span>
            </div>
          )}
        </div>
      )}


      <MetaDrawer
        survey={survey}
        clients={clients}
        isOpen={showMetaDrawer}
        onClose={() => setShowMetaDrawer(false)}
        onSave={(fields) => updateSurvey(id, fields)}
      />

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <ConfirmModal
        isOpen={!!pendingAnalysisLayout}
        onClose={() => setPendingAnalysisLayout(null)}
        onConfirm={() => { setAnalyzeLayout(pendingAnalysisLayout); setPendingAnalysisLayout(null); }}
        title="Alaprajz elemzése"
        message="Elemezzük az alaprajzot AI-val és azonosítsuk a helyiségeket, méreteket és nyílásokat?"
        confirmLabel="Igen, elemzés"
        cancelLabel="Kihagyás"
      />

      {analyzeLayout && (
        <LayoutAnalysisModal
          surveyId={id}
          layout={analyzeLayout}
          existingEntries={entries}
          onClose={() => setAnalyzeLayout(null)}
          onCreated={() => setAnalyzeLayout(null)}
          createSurveyEntry={createSurveyEntry}
        />
      )}
      <LockedDocumentModal
        isOpen={lockedModalOpen}
        documentType="survey"
        documentId={id}
        lockedReason={survey.locked_reason}
        transferAttempts={transferAttemptCount}
        onDelete={async () => { await deleteSurvey(id); router.push(`${navPrefix}/felmeres`); }}
        onUnlocked={() => setLockedModalOpen(false)}
        onKeepReadOnly={() => setLockedModalOpen(false)}
      />
    </div>
  );
}
