'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import WorkTypeSelector from './WorkTypeSelector';

export default function RoomModal({ isOpen, onClose, room, onSave }) {
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
    if (!name.trim()) { setError('A szekció neve kötelező'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), size_m2: sizeM2 !== '' ? Number(sizeM2) : null, work_types: workTypes, description: description.trim() || null });
      onClose();
    } catch (err) { setError(err.message || 'Hiba a mentésnél'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={room ? 'Szekció szerkesztése' : 'Új szekció'}>
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Szekció neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="pl. Konyha, Garázs, Kert..." autoFocus />
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
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}
