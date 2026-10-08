'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import {
  ArrowLeft, AlertCircle, Check, Plus, Trash2, Edit3,
  Home, Ruler, UserCheck, BookUser, CalendarDays, ChevronUp,
  Download, X, Loader2
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

const today = () => new Date().toISOString().split('T')[0];
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

function WorkTypeSelector({ selected, onChange }) {
  const [custom, setCustom] = useState('');
  const toggle = (type) => onChange(selected.includes(type) ? selected.filter(t => t !== type) : [...selected, type]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v || selected.includes(v)) { setCustom(''); return; }
    onChange([...selected, v]);
    setCustom('');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
        {WORK_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            style={{
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-pill)',
              border: selected.includes(type) ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
              background: selected.includes(type) ? 'var(--accent-light)' : 'var(--bg-subtle)',
              color: selected.includes(type) ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: selected.includes(type) ? 700 : 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            {type}
          </button>
        ))}
      </div>
      {selected.filter(t => !WORK_TYPES.includes(t)).map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>
          {t}
          <button type="button" onClick={() => onChange(selected.filter(x => x !== t))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}><X size={11} /></button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Egyéni típus..."
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          style={{ flex: 1, fontSize: '0.82rem' }}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom} disabled={!custom.trim()}>Hozzáad</button>
      </div>
    </div>
  );
}

function RoomModal({ isOpen, onClose, room, onSave, projectId }) {
  const [name, setName] = useState('');
  const [sizeM2, setSizeM2] = useState('');
  const [workTypes, setWorkTypes] = useState([]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(room?.name || '');
      setSizeM2(room?.size_m2 != null ? String(room.size_m2) : '');
      setWorkTypes(room?.work_types || []);
      setDescription(room?.description || '');
      setError('');
    }
  }, [isOpen, room?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('A helyiség neve kötelező'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        size_m2: sizeM2 !== '' ? Number(sizeM2) : null,
        work_types: workTypes,
        description: description.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={room ? 'Helyiség szerkesztése' : 'Új helyiség'}>
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Helyiség neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="pl. Nappali, Fürdőszoba..." />
        </div>
        <div className="form-group">
          <label className="form-label">Terület (m²)</label>
          <input type="number" min="0" step="0.1" className="form-control" value={sizeM2} onChange={e => setSizeM2(e.target.value)} placeholder="pl. 18.5" />
        </div>
        <div className="form-group">
          <label className="form-label">Munkák típusai</label>
          <WorkTypeSelector selected={workTypes} onChange={setWorkTypes} />
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Leírás / Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    projects, clients: visibleClients, users: visibleUsers,
    updateProject, updateProjectMembers, createClient,
    projectRooms, createProjectRoom, updateProjectRoom, deleteProjectRoom, syncRoomsFromQuote,
    quotes, quoteSections,
    isAdmin, currentUser,
  } = useApp();

  const project = (projects || []).find(p => p.id === id);
  const rooms = (projectRooms || []).filter(r => r.project_id === id).sort((a, b) => a.sort_order - b.sort_order || a.created_at?.localeCompare(b.created_at || '') || 0);

  // Project metadata state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [memberIds, setMemberIds] = useState([]);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [metaSuccess, setMetaSuccess] = useState('');

  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Room modal state
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setMemberIds(project.members || []);
    }
  }, [project?.id]);

  if (!isAdmin || !currentUser) {
    return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nincs jogosultsága.</div>;
  }

  if (!project) {
    return <PageSpinner />;
  }

  const linkedQuote = (quotes || []).find(q => q.project_id === id);
  const unimportedSections = linkedQuote
    ? (quoteSections || []).filter(s => s.quote_id === linkedQuote.id && !rooms.some(r => r.source_section_id === s.id))
    : [];

  const toggleMember = (uid) =>
    setMemberIds(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const handleMetaSave = async (e) => {
    e.preventDefault();
    setMetaError('');
    setMetaSaving(true);
    try {
      await updateProject(id, {
        name: name.trim(),
        description: desc.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        client_id: clientId || null,
      });
      await updateProjectMembers(id, memberIds);
      setMetaSuccess('Projekt adatok mentve.');
      setTimeout(() => setMetaSuccess(''), 3000);
    } catch (err) {
      setMetaError(err.message || 'Hiba a mentésnél');
    } finally {
      setMetaSaving(false);
    }
  };

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

  const handleSaveRoom = async (fields) => {
    if (editingRoom) {
      await updateProjectRoom(id, editingRoom.id, fields);
    } else {
      await createProjectRoom(id, { ...fields, sort_order: rooms.length });
    }
  };

  const handleDeleteRoom = (room) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) "${room.name}" helyiséget? A hozzárendelt számlák és munkabejegyzések megmaradnak, de elveszítik a helyiség hozzárendelést.`,
      onConfirm: async () => {
        try {
          await deleteProjectRoom(id, room.id);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncRoomsFromQuote(id);
      if (result.created === 0) {
        setAlertModal({ message: result.message || 'Minden ajánlat szekció már importálva van.' });
      }
    } catch (err) {
      setAlertModal({ message: err.message || 'Szinkronizálási hiba' });
    } finally {
      setSyncing(false);
    }
  };

  const selectedClient = visibleClients.find(c => c.id === clientId);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`/projektek/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a projekthez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1.25rem' }}>
        <h1 className="page-title">{project.name} – Szerkesztés</h1>
      </div>

      {/* ── Project metadata ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          <BookUser size={13} /> Projekt adatok
        </div>

        {metaError && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{metaError}</span>
          </div>
        )}
        {metaSuccess && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
            <Check size={15} /><span>{metaSuccess}</span>
          </div>
        )}

        <form onSubmit={handleMetaSave}>
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
                {visibleClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} /></div>
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
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.3rem' }}>
              {visibleUsers.filter(u => u.entity_id === project.entity_id).map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={metaSaving}>{metaSaving ? 'Mentés...' : 'Adatok mentése'}</button>
          </div>
        </form>
      </div>

      {/* ── Rooms ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <Home size={13} /> Helyiségek / Területek ({rooms.length})
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {linkedQuote && unimportedSections.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSync}
                disabled={syncing}
                title={`${unimportedSections.length} szekció importálható az ajánlatból`}
              >
                {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                Import ajánlatból ({unimportedSections.length})
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingRoom(null); setRoomModalOpen(true); }}>
              <Plus size={14} /> Új helyiség
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
            <Home size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>Még nincsenek helyiségek</div>
            <div style={{ marginTop: '0.25rem' }}>Adjon hozzá helyiségeket kézzel, vagy importálja az ajánlatból.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rooms.map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{room.name}</span>
                    {room.size_m2 != null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <Ruler size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{room.size_m2} m²
                      </span>
                    )}
                    {room.source_section_id && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-border)' }}>Ajánlatból</span>
                    )}
                  </div>
                  {room.work_types && room.work_types.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.25rem' }}>
                      {room.work_types.map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {room.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{room.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditingRoom(room); setRoomModalOpen(true); }}>
                    <Edit3 size={13} />
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeleteRoom(room)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RoomModal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        room={editingRoom}
        onSave={handleSaveRoom}
        projectId={id}
      />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
