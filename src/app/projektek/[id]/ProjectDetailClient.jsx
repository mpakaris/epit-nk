'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import StatCard from '@/components/StatCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Plus, Receipt, Coins, Users, TrendingUp, TrendingDown,
  CheckCircle2, Camera, ArrowRight, Hammer, Clock, Trash2, Wallet, BookOpen,
  Edit3, UserCheck, CalendarDays, BookUser, BarChart3, ShieldCheck,
  Phone, Mail, MapPin, ChevronUp, Link2, Copy, Check, AlertCircle, Lock, Eye,
  ChevronLeft, ChevronRight, X, Play, ZoomIn
} from 'lucide-react';

function MediaLightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = React.useState(startIndex);
  const current = media[idx];
  const isVideo = current?.mime_type?.startsWith('video/');

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [media.length, onClose]);

  if (!current) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}
      >
        <X size={20} />
      </button>

      {/* Counter */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
        {idx + 1} / {media.length}
      </div>

      {/* Prev */}
      {idx > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next */}
      {idx < media.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Content */}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo ? (
          <video
            src={current.drive_view_url}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }}
          />
        ) : (
          <img
            src={current.drive_view_url}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
          />
        )}
        {/* Thumbnail strip */}
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setIdx(i)}
                style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}
              >
                {m.mime_type?.startsWith('video/') ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                ) : (
                  <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryMediaGrid({ photos }) {
  const [lightbox, setLightbox] = React.useState(null);
  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.4rem', marginTop: '0.5rem' }}>
        {photos.map((photo, i) => {
          const isVideo = photo.mime_type?.startsWith('video/');
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(i)}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0 }}
            >
              {isVideo ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                  <Play size={22} color="#fff" />
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Videó</span>
                </div>
              ) : (
                <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0'; }}
              >
                {isVideo ? <Play size={24} color="#fff" /> : <ZoomIn size={20} color="#fff" />}
              </div>
            </button>
          );
        })}
      </div>

      {lightbox !== null && (
        <MediaLightbox
          media={photos}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

const today = () => new Date().toISOString().split('T')[0];
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function EditProjectModal({ isOpen, onClose, project, clients, users, updateProject, updateProjectMembers, createClient, onSuccess }) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [memberIds, setMemberIds] = React.useState([]);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [showNewClientForm, setShowNewClientForm] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState('');
  const [newClientPhone, setNewClientPhone] = React.useState('');
  const [newClientEmail, setNewClientEmail] = React.useState('');
  const [newClientAddress, setNewClientAddress] = React.useState('');
  const [newClientError, setNewClientError] = React.useState('');
  const [creatingClient, setCreatingClient] = React.useState(false);

  React.useEffect(() => {
    if (project && isOpen) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setMemberIds(project.members || []);
      setError('');
      setShowNewClientForm(false);
    }
  }, [project?.id, isOpen]);

  if (!isOpen || !project) return null;

  const toggleMember = (uid) =>
    setMemberIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setNewClientError('');
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true);
    try {
      const newClient = await createClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddress.trim(), entityId: project.entity_id });
      setClientId(newClient.id);
      setShowNewClientForm(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await updateProject(project.id, { name: name.trim(), description: desc.trim() || null, start_date: startDate || null, end_date: endDate || null, client_id: clientId || null });
      await updateProjectMembers(project.id, memberIds);
      onSuccess('Projekt frissítve.');
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Szerkesztés: ${project.name}`}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Projekt neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <textarea rows={2} className="form-control" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kezdés</label>
            <input type="date" className="form-control" min={today()} value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Befejezés</label>
            <input type="date" className="form-control" min={startDate ? nextDay(startDate) : today()} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Megrendelő</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">– Ügyfél nélkül –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowNewClientForm(v => !v)}>
              {showNewClientForm ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showNewClientForm ? 'Bezár' : 'Új ügyfél'}
            </button>
          </div>
          {selectedClient && !showNewClientForm && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
            </div>
          )}
        </div>
        {showNewClientForm && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
            {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>{newClientError}</div>}
            <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Horváth Béla" /></div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" /></div>
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClientForm(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>{creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}</button>
            </div>
          </div>
        )}
        <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}><UserCheck size={14} /> Résztvevők</label>
          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.3rem' }}>
            {users.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                <span style={{ fontWeight: 600 }}>{u.display_name}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>{submitting ? 'Mentés...' : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

const MAX_PHOTOS = 10;

function EditDiaryEntryModal({ isOpen, onClose, entry, onSave, onDeletePhoto }) {
  const [title, setTitle] = React.useState('');
  const [entryDate, setEntryDate] = React.useState('');
  const [workType, setWorkType] = React.useState('');
  const [body, setBody] = React.useState('');
  const [internalNote, setInternalNote] = React.useState('');
  const [clientNote, setClientNote] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [deletingPhotoId, setDeletingPhotoId] = React.useState(null);

  // New media to attach
  const [pendingFiles, setPendingFiles] = React.useState([]);
  const [pendingPreviews, setPendingPreviews] = React.useState([]);
  const galleryRef = React.useRef(null);
  const cameraRef = React.useRef(null);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (entry && isOpen) {
      setTitle(entry.title || '');
      setEntryDate(entry.entry_date || '');
      setWorkType(entry.work_type || '');
      setBody(entry.body || '');
      setInternalNote(entry.internal_note || '');
      setClientNote(entry.client_note || '');
      setIsPublic(Boolean(entry.is_public));
      setError('');
      setPendingFiles([]);
      setPendingPreviews([]);
    }
  }, [entry?.id, isOpen]);

  if (!isOpen || !entry) return null;

  const existingPhotos = entry.photos || [];
  const totalCount = existingPhotos.length + pendingFiles.length;

  const addFiles = (files) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - totalCount;
    if (remaining <= 0) return;
    const toAdd = Array.from(files).slice(0, remaining);
    setPendingFiles(prev => [...prev, ...toAdd]);
    const newPreviews = toAdd.map(file => ({
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      isVideo: file.type.startsWith('video/'),
    }));
    setPendingPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePending = (i) => {
    setPendingFiles(prev => prev.filter((_, idx) => idx !== i));
    setPendingPreviews(prev => {
      const removed = prev[i];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleDeleteExisting = async (photoId) => {
    setDeletingPhotoId(photoId);
    try {
      await onDeletePhoto(photoId);
    } catch (err) {
      setError(err.message || 'Hiba a fotó törlésekor');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('A cím nem lehet üres'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(
        entry.id,
        { title: title.trim(), body: body.trim() || null, work_type: workType.trim() || null, internal_note: internalNote.trim() || null, client_note: clientNote.trim() || null, entry_date: entryDate || undefined, is_public: isPublic },
        pendingFiles,
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bejegyzés szerkesztése">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Date + Work type */}
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Dátum</label>
            <input type="date" className="form-control" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Munka típusa</label>
            <input type="text" className="form-control" list="edit-work-types" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Gipszkarton" />
            <datalist id="edit-work-types">{WORK_TYPES.map(t => <option key={t} value={t} />)}</datalist>
          </div>
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Cím *</label>
          <input type="text" required className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <textarea rows={3} className="form-control" value={body} onChange={e => setBody(e.target.value)} />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={12} color="var(--text-muted)" /> Belső megjegyzés</label>
          <textarea rows={2} className="form-control" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Csak a csapat látja…" />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Eye size={12} color="var(--accent)" /> Üzenet az ügyfélnek</label>
          <textarea rows={2} className="form-control" value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Látható az ügyfél nyilvános oldalán…" />
        </div>

        {/* Public toggle */}
        <div style={{ marginBottom: '0.75rem' }}>
          <button type="button" onClick={() => setIsPublic(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: isPublic ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${isPublic ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublic ? 'var(--success-text)' : 'var(--text-primary)' }}>{isPublic ? 'Nyilvános — látható az ügyfélnek' : 'Privát — csak a csapat látja'}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{isPublic ? 'Megjelenik a projekt nyilvános oldalán' : 'Az ügyfél nem látja ezt a bejegyzést'}</div>
            </div>
          </button>
        </div>

        {/* ── Media section ── */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Camera size={14} color="var(--accent)" /> Fotók & Videók
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalCount}/{MAX_PHOTOS}</span>
          </div>

          {/* Existing photos */}
          {existingPhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {existingPhotos.map(photo => {
                const isVideo = photo.mime_type?.startsWith('video/');
                const isDeleting = deletingPhotoId === photo.id;
                return (
                  <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                    {isVideo ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
                        <Play size={18} color="#fff" />
                      </div>
                    ) : (
                      <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <button
                      type="button"
                      disabled={isDeleting || saving}
                      onClick={() => handleDeleteExisting(photo.id)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending (new) previews */}
          {pendingPreviews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {pendingPreviews.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px dashed var(--accent-border)', background: 'var(--accent-light)' }}>
                  {p.isVideo ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                      <Play size={18} color="var(--accent)" />
                      <span style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: 700 }}>ÚJ</span>
                    </div>
                  ) : p.url ? (
                    <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={18} color="var(--accent)" />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 2, left: 2, background: 'var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>ÚJ</div>
                  <button type="button" disabled={saving} onClick={() => removePending(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add buttons */}
          {totalCount < MAX_PHOTOS && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => cameraRef.current?.click()}>
                <Camera size={13} /> Kamera
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => galleryRef.current?.click()}>
                <Plus size={13} /> Kép
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => videoRef.current?.click()}>
                <Play size={13} /> Videó
              </button>
            </div>
          )}

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !!deletingPhotoId}>
            {saving ? 'Mentés…' : 'Mentés'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectDetailClient({
  project,
  initialUsers,
  initialInvoices,
  initialLabourEntries,
  client,
  clients,
  currentUser,
  isAdmin,
  initialDiaryCount = 0,
}) {
  const router = useRouter();
  const {
    deleteInvoice: ctxDeleteInvoice,
    deleteLabourEntry: ctxDeleteLabourEntry,
    updateInvoice: ctxUpdateInvoice,
    updateProject: ctxUpdateProject,
    updateProjectMembers: ctxUpdateProjectMembers,
    createClient: ctxCreateClient,
    diaryEntriesByProject,
    fetchDiaryEntries,
    updateDiaryEntry: ctxUpdateDiaryEntry,
    deleteDiaryEntry: ctxDeleteDiaryEntry,
    deleteDiaryPhoto: ctxDeleteDiaryPhoto,
    uploadDiaryPhotos,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('invoices');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState('');
  const [editingDiaryEntry, setEditingDiaryEntry] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [shareTokens, setShareTokens] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  React.useEffect(() => {
    if (activeTab === 'naplo' && project && !diaryEntriesByProject[project.id]) {
      setDiaryLoading(true);
      fetchDiaryEntries(project.id).catch(() => {}).finally(() => setDiaryLoading(false));
    }
    if (isAdmin && activeTab === 'naplo' && project && shareTokens.length === 0 && !shareLoading) {
      setShareLoading(true);
      fetch(`/api/diary/share?project_id=${project.id}`)
        .then(r => r.json())
        .then(d => { if (d.tokens) setShareTokens(d.tokens); })
        .catch(() => {})
        .finally(() => setShareLoading(false));
    }
  }, [activeTab, project?.id]);

  const projectMemberUsers = React.useMemo(
    () => initialUsers.filter(u => (project.members || []).includes(u.id)),
    [initialUsers, project]
  );
  const fin = React.useMemo(
    () => calculateProjectFinancials(project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser?.id),
    [project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser]
  );

  const filteredInvoices = fin.projectInvoices.filter(inv => {
    if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
    if (uploaderFilter !== 'ALL' && inv.uploaded_by !== uploaderFilter) return false;
    return true;
  });

  const handleDeleteInvoice = (invId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a számlát?',
      onConfirm: async () => {
        try { await ctxDeleteInvoice(invId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleDeleteLabour = (entryId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a munkabejegyzést?',
      onConfirm: async () => {
        try { await ctxDeleteLabourEntry(entryId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleOpenEdit = (invoice) => {
    setEditingInvoice(invoice);
    setEditValue(invoice.value_huf.toString());
    setEditCategory(invoice.category);
    setEditDesc(invoice.description || '');
    setError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setError('');
    setIsSubmitting(true);
    try {
      await ctxUpdateInvoice(editingInvoice.id, { value_huf: Number(editValue), category: editCategory, description: editDesc });
      router.refresh();
      setSuccessMsg('Számla sikeresen frissítve!');
      setEditingInvoice(null);
    } catch (err) {
      setError(err.message || 'Hiba a számla módosításakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setTokenSaving(true);
    try {
      const res = await fetch('/api/diary/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: project.id, label: newTokenLabel.trim() || null, expires_at: newTokenExpiry || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      setShareTokens(prev => [data.token, ...prev]);
      setNewTokenLabel(''); setNewTokenExpiry('');
      setShowNewTokenModal(false);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setTokenSaving(false);
    }
  };

  const handleDeleteToken = (token) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) "${token.label || 'Névtelen link'}" megosztási linket?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/diary/share/${token.id}`, { method: 'DELETE' });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Hiba'); }
          setShareTokens(prev => prev.filter(t => t.id !== token.id));
        } catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/p/${token.token}`;
    navigator.clipboard.writeText(url).then(() => { setCopiedTokenId(token.id); setTimeout(() => setCopiedTokenId(null), 2000); });
  };

  const updateProject = async (projectId, fields) => {
    await ctxUpdateProject(projectId, fields);
    router.refresh();
  };

  const updateProjectMembers = async (projectId, memberIds) => {
    await ctxUpdateProjectMembers(projectId, memberIds);
    router.refresh();
  };

  const createClientFn = async (args) => {
    const newClient = await ctxCreateClient(args);
    router.refresh();
    return newClient;
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={currentUser?.role === 'superadmin' ? '/superadmin/projektek' : '/projektek'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                <ShieldCheck size={15} /> Adminisztrátori nézet
              </div>
            )}
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button type="button" onClick={() => setEditOpen(true)} className="btn btn-secondary btn-sm">
                <Edit3 size={14} /> Szerkesztés
              </button>
            )}
            <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary" style={{ gap: '0.45rem' }}>
              <Camera size={18} />
              <span>Bejegyzés hozzáadása</span>
            </Link>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Info row: client, members, dates — always rendered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <BookUser size={13} /> Megrendelő
          </div>
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.name}</div>
              {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Phone size={13} />{client.phone}</div>}
              {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Mail size={13} />{client.email}</div>}
              {client.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><MapPin size={13} />{client.address}</div>}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs megrendelő hozzárendelve</div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <Users size={13} /> Résztvevők
          </div>
          {projectMemberUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {projectMemberUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                    {u.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: u.id === currentUser?.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {u.display_name}{u.id === currentUser?.id ? ' (Ön)' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincsenek hozzárendelt tagok</div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <CalendarDays size={13} /> Adatok
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kezdés</span>
              <span style={{ fontWeight: 700, color: project.start_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.start_date) || '–'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Befejezés</span>
              <span style={{ fontWeight: 700, color: project.end_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.end_date) || '–'}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Számlák</span>
              <span style={{ fontWeight: 700 }}>{fin.projectInvoices.length} db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="stat-grid">
        <StatCard label="Összes kiadás" value={formatHUF(fin.totalCost)} sub={`${fin.projectInvoices.length} db számla`} icon={Coins} />
        <StatCard label="Munkadíj összesen" value={formatHUF(fin.totalLabourValue)} sub={`${fin.projectLabour.length} bejegyzés`} icon={Hammer} />
        <StatCard label="Általad kifizetve" value={formatHUF(fin.ownPaid)} sub="Az Ön számlái" icon={Receipt} />
        <div className={`stat-card ${fin.balance > 0 ? 'success' : fin.balance < 0 ? 'danger' : ''}`}>
          <div className="stat-label">Összesített egyenleg</div>
          <div className="stat-value" style={{ color: fin.balance > 0 ? 'var(--success-text)' : fin.balance < 0 ? 'var(--danger-text)' : 'var(--text-primary)' }}>
            {fin.balance > 0 ? `+${formatHUF(fin.balance)}` : formatHUF(fin.balance)}
          </div>
          <div className="stat-sub">{fin.balance > 0 ? 'A többiek tartoznak neked' : fin.balance < 0 ? 'Kiegyenlítendő tartozás' : 'Egyensúlyban'}</div>
        </div>
      </div>

      {/* Member breakdown */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Users size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Résztvevők elszámolása</h3>
        </div>
        <div className="table-container member-table-desktop">
          <table className="custom-table">
            <thead>
              <tr><th>Résztvevő</th><th>Kifizetve</th><th>Munkadíj</th><th>Rá eső rész</th><th>Egyenleg</th></tr>
            </thead>
            <tbody>
              {fin.memberBreakdown.map(member => (
                <tr key={member.userId}>
                  <td>
                    <span style={{ fontWeight: 700 }}>{member.displayName}</span>
                    {member.userId === currentUser?.id && <span style={{ marginLeft: '0.35rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
                  </td>
                  <td className="text-mono" style={{ fontWeight: 700 }}>{formatHUF(member.paid)}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success-text)' }}>+{formatHUF(member.labourValue)}</div>
                    {member.labourHours > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{member.labourHours} h</div>}
                  </td>
                  <td className="text-mono" style={{ color: 'var(--text-secondary)' }}>{formatHUF(fin.equalCostShare)}</td>
                  <td>
                    {member.balance > 0 ? <span className="balance-pill positive"><TrendingUp size={11} /> +{formatHUF(member.balance)}</span>
                      : member.balance < 0 ? <span className="balance-pill negative"><TrendingDown size={11} /> {formatHUF(member.balance)}</span>
                      : <span className="balance-pill neutral"><CheckCircle2 size={11} /> 0 Ft</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="member-cards-mobile">
          {fin.memberBreakdown.map(member => (
            <div key={member.userId} className="member-card-row">
              <div className="member-card-name">
                {member.displayName}
                {member.userId === currentUser?.id && <span style={{ marginLeft: '0.4rem', fontSize: '0.675rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
              </div>
              <div className="member-card-field"><span className="member-card-label">Kifizetve</span><span className="member-card-value">{formatHUF(member.paid)}</span></div>
              <div className="member-card-field"><span className="member-card-label">Munkadíj</span><span className="member-card-value" style={{ color: 'var(--success-text)' }}>+{formatHUF(member.labourValue)}</span></div>
              <div className="member-card-field"><span className="member-card-label">Rá eső rész</span><span className="member-card-value" style={{ color: 'var(--text-secondary)' }}>{formatHUF(fin.equalCostShare)}</span></div>
              <div className="member-card-field"><span className="member-card-label">Egyenleg</span>
                <span>{member.balance > 0 ? <span className="balance-pill positive"><TrendingUp size={11} /> +{formatHUF(member.balance)}</span>
                  : member.balance < 0 ? <span className="balance-pill negative"><TrendingDown size={11} /> {formatHUF(member.balance)}</span>
                  : <span className="balance-pill neutral"><CheckCircle2 size={11} /> 0 Ft</span>}</span>
              </div>
            </div>
          ))}
        </div>
        {fin.totalLabourValue > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Egyenleg = </strong>(Kifizetve − Kiadásrész) + (Munkadíj − Munkadíjrész) &nbsp;·&nbsp; Kiadásrész: {formatHUF(fin.equalCostShare)}, Munkadíjrész: {formatHUF(fin.equalLabourShare)}
          </div>
        )}
      </div>

      {/* Settlement */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <Wallet size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ki kinek tartozik?</h3>
        </div>
        {(fin.settlements ?? []).length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <CheckCircle2 size={18} /><span>Minden egyenlően el van osztva, nincs egyenlítendő tartozás.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {fin.settlements.map((s, i) => (
              <div key={i} className="settlement-row">
                <span style={{ fontWeight: 700, color: 'var(--danger-text)' }}>{s.from}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}><span>fizet</span><ArrowRight size={14} /></div>
                <span style={{ fontWeight: 700, color: 'var(--success-text)' }}>{s.to}</span>
                <span className="settlement-amount" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>{formatHUF(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: 0 }}>
        {[
          { key: 'invoices', label: `Számlák (${fin.projectInvoices.length})`, icon: Receipt },
          { key: 'labour', label: `Munka (${fin.projectLabour.length})`, icon: Hammer },
          { key: 'naplo', label: `Napló (${diaryEntriesByProject[project.id]?.length ?? initialDiaryCount})`, icon: BookOpen },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-2px', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab.key ? 800 : 600, color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.9rem', transition: 'all 0.15s ease' }}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          <div className="invoice-filters">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}>
              <option value="ALL">Minden kategória</option>
              {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={uploaderFilter} onChange={e => setUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs megjeleníthető számla</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Ehhez a szűréshez még nem rögzítettek számlát.</p>
              <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Számla hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredInvoices.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} isAdmin={isAdmin} onEdit={isAdmin ? handleOpenEdit : null} onDelete={isAdmin ? handleDeleteInvoice : null} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'labour' && (
        <>
          {fin.projectLabour.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Hammer size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs rögzített munka</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>A saját elvégzett munkák itt jelennek meg.</p>
              <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Munkabejegyzés hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {fin.projectLabour.map(entry => {
                const uploader = initialUsers.find(u => u.id === entry.uploaded_by);
                const canDelete = entry.uploaded_by === currentUser?.id || isAdmin;
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem' }}>
                    <div style={{ padding: '0.55rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                      <Hammer size={18} color="var(--success)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{entry.labour_type}</div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {entry.hours} h × {formatHUF(entry.hourly_rate)}</span>
                            <span>{formatDate(entry.date)}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</span>
                          </div>
                          {entry.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{entry.description}</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success-text)', fontFamily: 'var(--font-mono)' }}>+{formatHUF(entry.value_huf)}</span>
                          {canDelete && (
                            <button type="button" onClick={() => handleDeleteLabour(entry.id)} className="btn btn-danger btn-sm" title="Törlés"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'naplo' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const url = `${window.location.origin}/naplo/${project.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  setToast('Link másolva a vágólapra!');
                  setTimeout(() => setToast(''), 2500);
                });
              }}
            >
              <Copy size={14} /> Ügyfél link másolása
            </button>
            <Link href={`/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Új bejegyzés</Link>
          </div>
          {diaryLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>Betöltés...</div>
          ) : !diaryEntriesByProject[project.id] || diaryEntriesByProject[project.id].length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Még nincs bejegyzés ebben a naplóban</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Az első fotós bejegyzéssel kezd el dokumentálni a munkát.</p>
              <Link href={`/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Első bejegyzés</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(diaryEntriesByProject[project.id] || []).map(entry => {
                const entryDateStr = entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
                const author = initialUsers.find(u => u.id === entry.created_by);
                const canDelete = entry.created_by === currentUser?.id || isAdmin;
                return (
                  <div key={entry.id} className="card" style={{ padding: '1rem' }}>
                    {/* Header row: badges + actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {entryDateStr && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>{entryDateStr}</span>}
                        {entry.work_type && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)' }}>{entry.work_type}</span>}
                        {/* Public/private pill */}
                        {isAdmin || entry.created_by === currentUser?.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try { await ctxUpdateDiaryEntry(entry.id, { title: entry.title, body: entry.body, work_type: entry.work_type, internal_note: entry.internal_note, client_note: entry.client_note, entry_date: entry.entry_date, is_public: !entry.is_public }); }
                              catch (err) { setAlertModal({ message: err.message }); }
                            }}
                            style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        {isAdmin && (
                          <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setEditingDiaryEntry(entry)}>
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setConfirmModal({ message: 'Biztosan törölni kívánja ezt a naplóbejegyzést?', onConfirm: async () => { try { await ctxDeleteDiaryEntry(entry.id, project.id); } catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); } } })}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title + author */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{entry.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                        {(author?.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{author?.display_name || 'Ismeretlen'}</span>
                    </div>

                    {entry.body && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 0.65rem', whiteSpace: 'pre-wrap' }}>{entry.body}</p>}

                    {/* Internal note — team only */}
                    {entry.internal_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <Lock size={11} /> Belső megjegyzés
                        </div>
                        {entry.internal_note}
                      </div>
                    )}

                    {/* Client note */}
                    {entry.client_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                          <Eye size={11} /> Ügyfélnek szóló üzenet
                        </div>
                        {entry.client_note}
                      </div>
                    )}

                    <EntryMediaGrid photos={entry.photos} />
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}

      {/* Modals */}
      {isAdmin && (
        <Modal isOpen={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} title="Számla szerkesztése">
          {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
          <form onSubmit={handleSaveEdit}>
            <div className="form-group"><label className="form-label">Összeg (HUF) *</label><input type="number" required min="1" step="1" className="form-control text-mono" value={editValue} onChange={e => setEditValue(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Kategória *</label>
              <select className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label} – {c.desc}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}><label className="form-label">Leírás</label><textarea rows={3} className="form-control" value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingInvoice(null)}>Mégse</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Mentés...' : 'Mentés'}</button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <EditDiaryEntryModal
        isOpen={!!editingDiaryEntry}
        onClose={() => setEditingDiaryEntry(null)}
        entry={editingDiaryEntry
          ? (diaryEntriesByProject[project.id]?.find(e => e.id === editingDiaryEntry.id) ?? editingDiaryEntry)
          : null
        }
        onSave={async (id, fields, newFiles) => {
          let addPhotoIds = [];
          if (newFiles && newFiles.length > 0) {
            const uploaded = await uploadDiaryPhotos(project.id, newFiles);
            addPhotoIds = uploaded.map(p => p.id);
          }
          await ctxUpdateDiaryEntry(id, { ...fields, add_photo_ids: addPhotoIds });
          setSuccessMsg('Bejegyzés frissítve.');
        }}
        onDeletePhoto={async (photoId) => {
          await ctxDeleteDiaryPhoto(photoId, project.id);
        }}
      />

      {isAdmin && (
        <EditProjectModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          clients={clients || []}
          users={initialUsers}
          updateProject={updateProject}
          updateProjectMembers={updateProjectMembers}
          createClient={createClientFn}
          onSuccess={msg => setSuccessMsg(msg)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 'var(--radius-pill)',
          padding: '0.65rem 1.15rem', fontSize: '0.875rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 500,
          whiteSpace: 'nowrap', animation: 'fadeInUp 0.2s ease',
        }}>
          <CheckCircle2 size={16} color="#4ade80" /> {toast}
        </div>
      )}
    </div>
  );
}
