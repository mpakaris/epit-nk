'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import { formatHUF } from '@/lib/constants';

const LABOUR_UNITS = ['h', 'nap', 'm²', 'm³', 'm', 'fm', 'db', 'l', 'kg'];

export default function LabourEditModal({ entry, onClose, onSave, onDelete, rooms = [], canEdit = true }) {
  const [labourType,  setLabourType]  = useState('');
  const [date,        setDate]        = useState('');
  const [hours,       setHours]       = useState('');
  const [unit,        setUnit]        = useState('h');
  const [hourlyRate,  setHourlyRate]  = useState('');
  const [description, setDescription] = useState('');
  const [roomId,      setRoomId]      = useState('');
  const [error,       setError]       = useState('');
  const [saveStatus,  setSaveStatus]  = useState('idle');

  const savedRef   = useRef(null);
  const timerRef   = useRef(null);
  const savedTimer = useRef(null);

  const snap = (lt, d, h, u, r, desc, rm) => JSON.stringify({ lt, d, h, u, r, desc, rm });

  useEffect(() => {
    if (!entry) return;
    setLabourType(entry.labour_type || '');
    setDate(entry.date || '');
    setHours(entry.hours != null ? String(entry.hours) : '');
    setUnit(entry.unit || 'h');
    setHourlyRate(entry.hourly_rate != null ? String(entry.hourly_rate) : '');
    setDescription(entry.description || '');
    setRoomId(entry.room_id || '');
    setError(''); setSaveStatus('idle');
    savedRef.current = snap(entry.labour_type || '', entry.date || '', String(entry.hours ?? ''), entry.unit || 'h', String(entry.hourly_rate ?? ''), entry.description || '', entry.room_id || '');
  }, [entry?.id]);

  // Auto-save (only when canEdit)
  useEffect(() => {
    if (!canEdit || savedRef.current === null) return;
    const current = snap(labourType, date, hours, unit, hourlyRate, description, roomId);
    if (current === savedRef.current) return;
    if (!labourType.trim() || !(parseFloat(hours) > 0) || !(parseInt(hourlyRate, 10) > 0)) return;

    clearTimeout(timerRef.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');

    timerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave({ labour_type: labourType.trim(), date, hours: parseFloat(hours), hourly_rate: parseInt(hourlyRate, 10), unit, description: description.trim() || null, room_id: roomId || null });
        savedRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || 'Hiba a mentésnél');
        setSaveStatus('idle');
      }
    }, 700);

    return () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); };
  }, [labourType, date, hours, unit, hourlyRate, description, roomId]);

  const preview = Math.round((parseFloat(hours) || 0) * (parseInt(hourlyRate, 10) || 0));

  const SaveIndicator = () => {
    if (!canEdit || saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> Mentés...
      </span>
    );
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> Mentve</span>;
  };

  const title = canEdit ? 'Munkabejegyzés szerkesztése' : 'Munkabejegyzés részletei';

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <div>
        <div className="form-group">
          <label className="form-label">Típus</label>
          <input type="text" className="form-control" value={labourType} onChange={e => setLabourType(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="form-group">
          <label className="form-label">Dátum</label>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="form-group">
          <label className="form-label">Mértékegység</label>
          <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)} disabled={!canEdit} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {LABOUR_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mennyiség ({unit})</label>
            <input type="number" min="0.01" step="0.01" className="form-control text-mono" value={hours} onChange={e => setHours(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Egységár (Ft/{unit})</label>
            <input type="number" min="1" className="form-control text-mono" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        {preview > 0 && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.825rem', fontWeight: 700 }}>
            Munkadíj: {hours} {unit} × {formatHUF(parseInt(hourlyRate, 10) || 0)} = {formatHUF(preview)}
          </div>
        )}
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <label className="form-label">Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} disabled={!canEdit} />
        </div>
        {rooms.length > 0 && (
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">Szekció</label>
            <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)} disabled={!canEdit}>
              <option value="">– Általános –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ marginRight: 'auto' }}><SaveIndicator /></span>
          {canEdit && onDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
              <Trash2 size={13} /> Törlés
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
