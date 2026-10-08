'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, Receipt, ShieldCheck, Coins, AlertCircle,
  CheckCircle2, Plus, Edit3, UserCheck, BookUser, CalendarDays, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, Users, FileText, BarChart3, BookOpen, Camera, Trash2, Link2, Copy, Check,
  Hammer, Clock, ChevronLeft, ChevronRight, X, Play, ZoomIn
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}><X size={20} /></button>
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>{idx + 1} / {media.length}</div>
      {idx > 0 && <button type="button" onClick={(e) => { e.stopPropagation(); setIdx(i => i - 1); }} style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronLeft size={22} /></button>}
      {idx < media.length - 1 && <button type="button" onClick={(e) => { e.stopPropagation(); setIdx(i => i + 1); }} style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><ChevronRight size={22} /></button>}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo ? <video src={current.drive_view_url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }} /> : <img src={current.drive_view_url} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />}
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setIdx(i)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}>
                {m.mime_type?.startsWith('video/') ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div> : <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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
            <button key={photo.id} type="button" onClick={() => setLightbox(i)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0 }}>
              {isVideo ? <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}><Play size={22} color="#fff" /><span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Videó</span></div>
              : <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </button>
          );
        })}
      </div>
      {lightbox !== null && <MediaLightbox media={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />}
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
    if (project) {
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
      const newClient = await createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        address: newClientAddress.trim(),
        entityId: project.entity_id,
      });
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
      await updateProject(project.id, {
        name: name.trim(),
        description: desc.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        client_id: clientId || null,
      });
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
            <input type="date" className="form-control" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
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
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setShowNewClientForm(v => !v)}
            >
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
            {newClientError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                {newClientError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Név *</label>
              <input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Horváth Béla" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Telefon</label>
                <input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+36 70 …" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">E-mail</label>
                <input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="email@…" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}>
              <label className="form-label">Cím</label>
              <input type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Irányítószám, Város, utca" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClientForm(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>
                {creatingClient ? 'Létrehozás...' : 'Ügyfél létrehozása'}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <UserCheck size={14} /> Résztvevők
          </label>
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

export default function AdminProjectDetailClient({
  project: initialProject,
  initialUsers,
  initialClients,
  initialInvoices,
  initialLabourEntries,
  initialDiaryEntries,
  currentUser,
}) {
  const router = useRouter();
  const {
    updateInvoice: ctxUpdateInvoice,
    deleteInvoice: ctxDeleteInvoice,
    updateProject: ctxUpdateProject,
    updateProjectMembers: ctxUpdateProjectMembers,
    createClient: ctxCreateClient,
    diaryEntriesByProject,
    fetchDiaryEntries,
    deleteDiaryEntry: ctxDeleteDiaryEntry,
  } = useApp();

  const project = initialProject;
  const clients = initialClients;
  const invoices = initialInvoices;
  const labourEntries = initialLabourEntries || [];
  const users = initialUsers;

  const memberUsers = React.useMemo(
    () => initialUsers.filter(u => (initialProject.members || []).includes(u.id)),
    [initialUsers, initialProject]
  );
  const fin = React.useMemo(
    () => calculateProjectFinancials(initialProject, initialInvoices, initialLabourEntries || [], memberUsers, currentUser?.id),
    [initialProject, initialInvoices, initialLabourEntries, memberUsers, currentUser]
  );

  const updateProject = async (projectId, fields) => {
    const updated = await ctxUpdateProject(projectId, fields);
    router.refresh();
    return updated;
  };

  const updateProjectMembers = async (projectId, memberIds) => {
    await ctxUpdateProjectMembers(projectId, memberIds);
    router.refresh();
  };

  const createClient = async (args) => {
    const newClient = await ctxCreateClient(args);
    router.refresh();
    return newClient;
  };

  const updateInvoice = async (invoiceId, fields) => {
    const updated = await ctxUpdateInvoice(invoiceId, fields);
    router.refresh();
    return updated;
  };

  const deleteInvoice = async (invoiceId) => {
    await ctxDeleteInvoice(invoiceId);
    router.refresh();
  };

  const deleteDiaryEntry = async (entryId, projectId) => {
    await ctxDeleteDiaryEntry(entryId, projectId);
    router.refresh();
  };

  const [activeTab, setActiveTab] = useState('invoices');

  const [shareTokens, setShareTokens] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  React.useEffect(() => {
    if (activeTab === 'naplo' && project && shareTokens.length === 0 && !shareLoading) {
      setShareLoading(true);
      fetch(`/api/diary/share?project_id=${project.id}`)
        .then(r => r.json())
        .then(d => { if (d.tokens) setShareTokens(d.tokens); })
        .catch(() => {})
        .finally(() => setShareLoading(false));
    }
  }, [activeTab, project?.id]);

  const diaryEntries = initialDiaryEntries ?? diaryEntriesByProject[project.id] ?? [];

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setTokenSaving(true);
    try {
      const res = await fetch('/api/diary/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, label: newTokenLabel.trim() || null, expires_at: newTokenExpiry || null }),
      });
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
        } catch (err) {
          setAlertModal({ message: err.message });
        }
      }
    });
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/p/${token.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTokenId(token.id);
      setTimeout(() => setCopiedTokenId(null), 2000);
    });
  };

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const client = clients.find(c => c.id === project.client_id);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

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
      await updateInvoice(editingInvoice.id, {
        value_huf: Number(editValue),
        category: editCategory,
        description: editDesc
      });
      setSuccessMsg('Számla sikeresen frissítve!');
      setEditingInvoice(null);
    } catch (err) {
      setError(err.message || 'Hiba a számla módosításakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (invoiceId) => {
    setConfirmModal({
      message: 'Biztosan törölni kívánja ezt a számlát?',
      onConfirm: async () => {
        try {
          await deleteInvoice(invoiceId);
          setSuccessMsg('Számla sikeresen törölve.');
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  const sectionLabel = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
      {icon}{text}
    </div>
  );

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/admin/projektek" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1.25rem' }}>
        <div className="page-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
              <ShieldCheck size={15} /> Adminisztrátori nézet
            </div>
            <h1 className="page-title">{project.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setEditOpen(true)} className="btn btn-secondary btn-sm">
              <Edit3 size={14} /> Szerkesztés
            </button>
            <Link href={`/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Számla feltöltése
            </Link>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <div className="card">
          {sectionLabel(<BookUser size={13} />, 'Megrendelő')}
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.name}</div>
              {client.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Phone size={13} />{client.phone}
                </div>
              )}
              {client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <Mail size={13} />{client.email}
                </div>
              )}
              {client.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} />{client.address}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs megrendelő hozzárendelve</div>
          )}
        </div>

        <div className="card">
          {sectionLabel(<Users size={13} />, 'Résztvevők')}
          {memberUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {memberUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                    {u.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.display_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincsenek hozzárendelt tagok</div>
          )}
        </div>

        <div className="card">
          {sectionLabel(<CalendarDays size={13} />, 'Adatok')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kezdés</span>
              <span style={{ fontWeight: 700, color: project.start_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {fmt(project.start_date) || '–'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Befejezés</span>
              <span style={{ fontWeight: 700, color: project.end_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {fmt(project.end_date) || '–'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Számlák</span>
              <span style={{ fontWeight: 700 }}>{fin.projectInvoices.length} db</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '0.85rem' }}>
        {sectionLabel(<FileText size={13} />, 'Leírás')}
        {project.description
          ? <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{project.description}</p>
          : <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Nincs megadott projekt leírás.</p>
        }
      </div>

      <div className="card" style={{ marginBottom: '0.85rem', background: 'var(--bg-subtle)' }}>
        {sectionLabel(<BarChart3 size={13} />, 'Pénzügyi összesítő')}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--accent)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <Coins size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Összes kiadás</div>
              <div className="text-mono" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatHUF(fin.totalCost)}</div>
            </div>
          </div>
          {fin.totalLabourValue > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--success)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <Hammer size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Munkadíj összesen</div>
                <div className="text-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-text)' }}>{formatHUF(fin.totalLabourValue)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: 0, overflowX: 'auto' }}>
        {[
          { key: 'invoices', label: `Számlák (${fin.projectInvoices.length})`, icon: Receipt },
          { key: 'labour', label: `Munka (${fin.projectLabour.length})`, icon: Hammer },
          { key: 'naplo', label: `Napló (${diaryEntries.length})`, icon: BookOpen },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.55rem 0.75rem', borderRadius: 0, border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 800 : 600,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.82rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          <div style={{ marginBottom: '0.65rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Adminisztrátorként szerkesztheti vagy törölheti a számlákat.</p>
          </div>
          {fin.projectInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincsenek még számlák rögzítve</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>A feltöltött számlák itt fognak megjelenni.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {fin.projectInvoices.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} isAdmin={true} onEdit={handleOpenEdit} onDelete={handleDelete} />
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Az elvégzett munkák itt fognak megjelenni.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {fin.projectLabour.map(entry => {
                const uploader = users.find(u => u.id === entry.uploaded_by);
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem' }}>
                    <div style={{ padding: '0.55rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                      <Hammer size={18} color="var(--success)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{entry.labour_type}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} /> {entry.hours} {entry.unit || 'h'} × {formatHUF(entry.hourly_rate)}
                        </span>
                        <span>{formatDate(entry.date)}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</span>
                      </div>
                      {entry.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{entry.description}</div>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success-text)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      +{formatHUF(entry.value_huf)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'naplo' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div />
            <Link href={`/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm">
              <Plus size={15} /> Új bejegyzés
            </Link>
          </div>

          {diaryEntries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Még nincs bejegyzés ebben a naplóban</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Az első fotós bejegyzéssel kezd el dokumentálni a munkát.</p>
              <Link href={`/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Első bejegyzés</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {diaryEntries.map(entry => {
                const entryDateStr = entry.entry_date
                  ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
                  : null;
                const author = users.find(u => u.id === entry.created_by);
                return (
                  <div key={entry.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        {entryDateStr && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)', marginBottom: '0.35rem', display: 'inline-block' }}>
                            {entryDateStr}
                          </span>
                        )}
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.25rem 0 0.15rem', color: 'var(--text-primary)' }}>{entry.title}</h4>
                        {author && <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{author.display_name}</div>}
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }}
                        onClick={() => setConfirmModal({
                          message: 'Biztosan törölni kívánja ezt a naplóbejegyzést?',
                          onConfirm: async () => {
                            try { await deleteDiaryEntry(entry.id, project.id); }
                            catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
                          }
                        })}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {entry.body && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.55 }}>{entry.body}</p>
                    )}
                    <EntryMediaGrid photos={entry.photos} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Link2 size={16} color="var(--accent)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Ügyfél megosztási linkek</h3>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setNewTokenLabel(''); setNewTokenExpiry(''); setShowNewTokenModal(true); }}>
                <Plus size={14} /> Új link
              </button>
            </div>

            {shareLoading ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>Betöltés...</div>
            ) : shareTokens.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--bg-subtle)' }}>
                <Link2 size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Még nincs megosztási link. Hozzon létre egyet az ügyfél számára.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {shareTokens.map(token => {
                  const expired = token.expires_at && new Date(token.expires_at) < new Date();
                  return (
                    <div key={token.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', opacity: expired ? 0.6 : 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{token.label || 'Névtelen link'}</div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {token.expires_at
                            ? <span style={{ color: expired ? 'var(--danger-text)' : 'var(--text-muted)' }}>
                                {expired ? 'Lejárt: ' : 'Lejár: '}
                                {new Date(token.expires_at).toLocaleDateString('hu-HU')}
                              </span>
                            : 'Lejárat nélkül'
                          }
                          {' · '}Létrehozva: {new Date(token.created_at).toLocaleDateString('hu-HU')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyLink(token)} title="Link másolása">
                          {copiedTokenId === token.id ? <><Check size={13} /> Másolva!</> : <><Copy size={13} /> Másolás</>}
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteToken(token)} style={{ padding: '0.25rem 0.5rem' }} title="Törlés">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={Boolean(editingInvoice)} onClose={() => setEditingInvoice(null)} title="Számla szerkesztése (Admin)">
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-amount">Összeg (HUF) *</label>
            <input id="edit-amount" type="number" required min="1" step="1" className="form-control text-mono" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat">Kategória *</label>
            <select id="edit-cat" className="form-control" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
              {INVOICE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label} – {c.desc}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="edit-desc">Leírás / Megjegyzés</label>
            <textarea id="edit-desc" rows={3} className="form-control" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingInvoice(null)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>{isSubmitting ? 'Mentés...' : 'Mentés'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewTokenModal} onClose={() => setShowNewTokenModal(false)} title="Új megosztási link">
        <form onSubmit={handleCreateToken}>
          <div className="form-group">
            <label className="form-label" htmlFor="token-label">Megnevezés (opcionális)</label>
            <input id="token-label" type="text" className="form-control" placeholder="pl. Ügyfél - János" value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="token-expiry">Lejárat (opcionális)</label>
            <input id="token-expiry" type="date" className="form-control" value={newTokenExpiry} onChange={e => setNewTokenExpiry(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewTokenModal(false)}>Mégse</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={tokenSaving}>{tokenSaving ? 'Létrehozás...' : 'Link létrehozása'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <EditProjectModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        clients={clients}
        users={users}
        updateProject={updateProject}
        updateProjectMembers={updateProjectMembers}
        createClient={createClient}
        onSuccess={msg => setSuccessMsg(msg)}
      />
    </div>
  );
}
