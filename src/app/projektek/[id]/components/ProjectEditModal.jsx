'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Plus, ChevronUp, Check } from 'lucide-react';
import Modal from '@/components/Modal';

const nextDay  = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };
const todayStr = () => new Date().toISOString().split('T')[0];

export default function ProjectEditModal({ isOpen, onClose, project, clients, onSave, onCreateClient, collectives, activeCollectiveId, onMove }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [moveTarget, setMoveTarget] = useState('');
  const [moveConfirm, setMoveConfirm] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [moveDone, setMoveDone] = useState(null);

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setError('');
      setShowNewClient(false);
      setMoveTarget(''); setMoveConfirm(false); setMoveDone(null); setMoveError('');
    }
  }, [isOpen, project?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), description: desc.trim() || null, start_date: startDate || null, end_date: endDate || null, client_id: clientId || null });
      onClose();
    } catch (err) { setError(err.message || 'Hiba a mentésnél'); }
    finally { setSaving(false); }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true); setNewClientError('');
    try {
      const c = await onCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddress.trim() });
      setClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) { setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor'); }
    finally { setCreatingClient(false); }
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    setMoving(true); setMoveError('');
    try {
      await onMove(moveTarget);
      const moveName = collectives.find(c => c.collective_id === moveTarget)?.name || 'Kollektíva';
      setMoveDone({ collectiveId: moveTarget, name: moveName });
      setMoveConfirm(false);
    } catch (err) { setMoveError(err.message || 'Hiba az áthelyezéskor'); }
    finally { setMoving(false); }
  };

  const selectedClient  = (clients || []).find(c => c.id === clientId);
  const showMoveCard    = !activeCollectiveId && !project?.collective_id && collectives?.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Projekt szerkesztése">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
      <form onSubmit={handleSave}>
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
            <input type="date" className="form-control" min={startDate ? nextDay(startDate) : todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Megrendelő</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">– Ügyfél nélkül –</option>
              {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowNewClient(v => !v)}>
              {showNewClient ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showNewClient ? 'Bezár' : 'Új ügyfél'}
            </button>
          </div>
          {selectedClient && !showNewClient && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
            </div>
          )}
        </div>
        {showNewClient && (
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>{creatingClient ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Ügyfél létrehozása'}</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Adatok mentése'}</button>
        </div>
      </form>

      {showMoveCard && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Projekt áthelyezése kollektívába</div>
          {moveDone ? (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Check size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Áthelyezve: <strong>{moveDone.name}</strong>
            </div>
          ) : (
            <>
              <select className="form-control" value={moveTarget} onChange={e => { setMoveTarget(e.target.value); setMoveConfirm(false); }} style={{ marginBottom: '0.65rem' }}>
                <option value="">– Válassz kollektívát –</option>
                {collectives.map(c => <option key={c.collective_id} value={c.collective_id}>{c.name}</option>)}
              </select>
              {moveTarget && !moveConfirm && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMoveConfirm(true)}>Áthelyezés</button>}
              {moveConfirm && (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--warning-text)', fontSize: '0.875rem' }}>Figyelem!</div>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.65rem', color: 'var(--text-primary)' }}>A projekt adatai az összes kollektíva tag számára láthatóvá válnak. <strong>Ez a lépés nem vonható vissza.</strong></p>
                  {moveError && <div style={{ color: 'var(--danger-text)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{moveError}</div>}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMoveConfirm(false)} disabled={moving}>Mégse</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleMove} disabled={moving}>{moving ? 'Áthelyezés...' : 'Igen, áthelyezem'}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
