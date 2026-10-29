'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

const TRIGGER_TYPES = [
  { key: 'start',     label: 'Projekt kezdetén' },
  { key: 'end',       label: 'Projekt végén' },
  { key: 'milestone', label: 'Mérföldkőnél' },
  { key: 'date',      label: 'Dátumon' },
];

export const MILESTONE_SUGGESTIONS = [
  'Anyag helyszínen', 'Bontási munkák kész', 'Alapozási munkák kész',
  'Falszerkezet kész', 'Tetőfedés kész', 'Nyílászárók beépítve',
  'Gépészet kész', 'Vakolás kész', 'Burkolás kész', 'Festés kész',
  'Szerkezet kész', 'Épület átadva',
];

export const TRIGGER_DISPLAY = {
  start:     { label: 'Projekt kezdetén',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  end:       { label: 'Projekt végén',     bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  milestone: { label: 'Mérföldkőnél',     bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  date:      { label: 'Dátumon',           bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
};

export const STATUS_DISPLAY = {
  pending:   { label: 'Függőben',  bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  paid:      { label: 'Fizetve',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  cancelled: { label: 'Törölve',   bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

export default function PaymentPlanModal({ isOpen, onClose, onSave, editItem, itemCount }) {
  const [label, setLabel] = useState('');
  const [triggerType, setTriggerType] = useState('milestone');
  const [milestoneName, setMilestoneName] = useState('');
  const [amountHuf, setAmountHuf] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      setLabel(editItem.label || '');
      setTriggerType(editItem.trigger_type || 'milestone');
      setMilestoneName(editItem.milestone_name || '');
      setAmountHuf(editItem.amount_huf?.toString() || '');
      setDueDate(editItem.due_date || '');
      setNote(editItem.note || '');
    } else {
      setLabel(`Fizetés ${ROMAN[itemCount] ?? (itemCount + 1)}`);
      setTriggerType('milestone');
      setMilestoneName('');
      setAmountHuf('');
      setDueDate('');
      setNote('');
    }
    setErr('');
  }, [isOpen, editItem?.id, itemCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) { setErr('A megnevezés kötelező'); return; }
    const amt = Math.round(Number(amountHuf.replace(/\s/g, '').replace(',', '.')));
    if (!amt || amt <= 0) { setErr('Az összeg kötelező és nullánál nagyobb kell legyen'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({ label: label.trim(), trigger_type: triggerType, milestone_name: triggerType === 'milestone' ? milestoneName.trim() || null : null, amount_huf: amt, due_date: dueDate || null, note: note.trim() || null });
      onClose();
    } catch (error) {
      setErr(error.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editItem ? 'Fizetési tétel szerkesztése' : 'Új fizetési tétel'}>
      {err && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{err}</span></div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Megnevezés *</label>
          <input type="text" required className="form-control" value={label} onChange={e => setLabel(e.target.value)} placeholder="pl. Fizetés I" />
        </div>
        <div className="form-group">
          <label className="form-label">Esedékesség</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {TRIGGER_TYPES.map(t => (
              <button key={t.key} type="button" onClick={() => setTriggerType(t.key)}
                style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', border: triggerType === t.key ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', background: triggerType === t.key ? 'var(--accent)' : 'var(--bg-subtle)', color: triggerType === t.key ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {triggerType === 'milestone' && (
          <div className="form-group">
            <label className="form-label">Mérföldkő neve</label>
            <input type="text" className="form-control" list="milestone-suggestions" value={milestoneName} onChange={e => setMilestoneName(e.target.value)} placeholder="pl. Anyag helyszínen" />
            <datalist id="milestone-suggestions">{MILESTONE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
          </div>
        )}
        {triggerType === 'date' && (
          <div className="form-group">
            <label className="form-label">Határidő</label>
            <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Összeg (Ft) *</label>
          <div style={{ position: 'relative' }}>
            <input type="number" required min="1" className="form-control text-mono" value={amountHuf} onChange={e => setAmountHuf(e.target.value)} placeholder="pl. 450000" style={{ paddingRight: '2.5rem' }} />
            <span style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>Ft</span>
          </div>
          {Number(amountHuf) > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{Number(amountHuf).toLocaleString('hu-HU')} Ft</div>}
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés</label>
          <textarea rows={2} className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcionális belső megjegyzés..." />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" />{editItem ? 'Módosítás' : 'Hozzáadás'}</> : (editItem ? 'Módosítás' : 'Hozzáadás')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
