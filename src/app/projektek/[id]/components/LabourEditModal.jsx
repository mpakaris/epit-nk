'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { formatHUF } from '@/lib/constants';

const LABOUR_UNITS = ['h', 'nap', 'm²', 'm³', 'm', 'fm', 'db', 'l', 'kg'];

export default function LabourEditModal({ entry, onClose, onSave, rooms = [] }) {
  const [labourType, setLabourType] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [unit, setUnit] = useState('h');
  const [hourlyRate, setHourlyRate] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (entry) {
      setLabourType(entry.labour_type || '');
      setDate(entry.date || '');
      setHours(entry.hours != null ? String(entry.hours) : '');
      setUnit(entry.unit || 'h');
      setHourlyRate(entry.hourly_rate != null ? String(entry.hourly_rate) : '');
      setDescription(entry.description || '');
      setRoomId(entry.room_id || '');
      setErr('');
    }
  }, [entry?.id]);

  const preview = Math.round((parseFloat(hours) || 0) * (parseInt(hourlyRate, 10) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!labourType.trim()) { setErr('A típus megadása kötelező'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({ labour_type: labourType.trim(), date, hours: parseFloat(hours), hourly_rate: parseInt(hourlyRate, 10), unit, description: description.trim() || null, room_id: roomId || null });
    } catch (error) {
      setErr(error.message || 'Hiba a mentésnél');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Munkabejegyzés szerkesztése">
      {err && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{err}</span></div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Típus *</label>
          <input type="text" required className="form-control" value={labourType} onChange={e => setLabourType(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Dátum</label>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mértékegység</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {LABOUR_UNITS.map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                style={{ padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-md)', border: unit === u ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', background: unit === u ? 'var(--accent)' : 'var(--bg-subtle)', color: unit === u ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mennyiség ({unit}) *</label>
            <input type="number" required min="0.01" step="0.01" className="form-control text-mono" value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Egységár (Ft/{unit}) *</label>
            <input type="number" required min="1" className="form-control text-mono" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
          </div>
        </div>
        {preview > 0 && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.825rem', fontWeight: 700 }}>
            Munkadíj: {hours} {unit} × {formatHUF(parseInt(hourlyRate, 10) || 0)} = {formatHUF(preview)}
          </div>
        )}
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <label className="form-label">Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {rooms.length > 0 && (
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">Szekció (opcionális)</label>
            <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">– Általános (szekció nélkül) –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}
