'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import WorkTypeSelector from './WorkTypeSelector';

export default function RoomModal({ isOpen, onClose, room, onSave, onDelete, canEdit = true }) {
  const [name,        setName]        = useState('');
  const [sizeM2,      setSizeM2]      = useState('');
  const [workTypes,   setWorkTypes]   = useState([]);
  const [description, setDescription] = useState('');
  const [error,       setError]       = useState('');
  const [saveStatus,  setSaveStatus]  = useState('idle');

  const isEdit = !!room;

  const savedRef    = useRef(null);
  const timerRef    = useRef(null);
  const savedTimer  = useRef(null);
  const creatingRef = useRef(false);

  const snap = (n, s, wt, d) => JSON.stringify({ n, s, wt: [...wt].sort(), d });

  useEffect(() => {
    if (isOpen) {
      setName(room?.name || '');
      setSizeM2(room?.size_m2 != null ? String(room.size_m2) : '');
      setWorkTypes(room?.work_types || []);
      setDescription(room?.description || '');
      setError(''); setSaveStatus('idle');
      creatingRef.current = false;
      savedRef.current = isEdit
        ? snap(room.name || '', String(room.size_m2 ?? ''), room.work_types || [], room.description || '')
        : null;
    }
  }, [isOpen, room?.id]);

  const buildPayload = () => ({
    name: name.trim(),
    size_m2: sizeM2 !== '' ? Number(sizeM2) : null,
    work_types: workTypes,
    description: description.trim() || null,
  });

  // Auto-save for edits; auto-create for new rooms
  useEffect(() => {
    if (!canEdit) return;

    if (!isEdit) {
      // Create mode: auto-create when name is typed
      if (!name.trim() || creatingRef.current) return;
      clearTimeout(timerRef.current);
      setSaveStatus('pending');
      timerRef.current = setTimeout(async () => {
        if (creatingRef.current) return;
        creatingRef.current = true;
        setSaveStatus('saving');
        try {
          await onSave(buildPayload());
          onClose();
        } catch (err) { setError(err.message || 'Hiba a mentésnél'); setSaveStatus('idle'); creatingRef.current = false; }
      }, 800);
      return () => clearTimeout(timerRef.current);
    }

    // Edit mode
    if (savedRef.current === null) return;
    const current = snap(name, sizeM2, workTypes, description);
    if (current === savedRef.current) return;
    if (!name.trim()) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(buildPayload());
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || 'Hiba a mentésnél');
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [name, sizeM2, workTypes, description]);

  // Close handler: if in create mode with a name typed, flush immediately
  const handleClose = async () => {
    if (!isEdit && canEdit && name.trim() && !creatingRef.current) {
      clearTimeout(timerRef.current);
      creatingRef.current = true;
      try { await onSave(buildPayload()); } catch { /* swallow */ }
    }
    onClose();
  };

  if (!isOpen) return null;

  const title = canEdit ? (isEdit ? 'Szekció szerkesztése' : 'Új szekció') : 'Szekció részletei';

  const SaveIndicator = () => {
    if (!canEdit || saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> Mentés...
      </span>
    );
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> Mentve</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <div>
        <div className="form-group">
          <label className="form-label">Szekció neve</label>
          <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)}
            placeholder="pl. Konyha, Garázs, Kert..." disabled={!canEdit} />
        </div>
        <div className="form-group">
          <label className="form-label">Terület (m²)</label>
          <input type="number" min="0" step="0.1" className="form-control" value={sizeM2}
            onChange={e => setSizeM2(e.target.value)} placeholder="pl. 18.5" disabled={!canEdit} />
        </div>
        <div className="form-group">
          <label className="form-label">Munkák típusai</label>
          <WorkTypeSelector selected={workTypes} onChange={canEdit ? setWorkTypes : () => {}} disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: isEdit && canEdit && onDelete ? '1.25rem' : 0 }}>
          <label className="form-label">Leírás / Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} disabled={!canEdit} />
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ marginRight: 'auto' }}><SaveIndicator /></span>
          {isEdit && canEdit && onDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
              <Trash2 size={13} /> Törlés
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
