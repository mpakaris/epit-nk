'use client';

import React, { useState, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Calendar, Flag, Play, Square } from 'lucide-react';
import { formatHUF } from '@/lib/constants';

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

const TRIGGER_TYPES = [
  { key: 'start',     label: 'Projekt kezdetén', icon: Play,     desc: 'Az első részlet az induláskor esedékes' },
  { key: 'milestone', label: 'Mérföldkőnél',     icon: Flag,     desc: 'Egy meghatározott fázis teljesítésekor' },
  { key: 'date',      label: 'Dátumon',           icon: Calendar, desc: 'Megadott határidőn' },
  { key: 'end',       label: 'Projekt végén',     icon: Square,   desc: 'A munka teljes befejezésekor' },
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

const S = {
  heading: { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.25 },
  sub:     { fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 },
  label:   { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
};

export default function PaymentPlanModal({ isOpen, onClose, onSave, editItem, itemCount }) {
  const [step, setStep] = useState(1);
  const TOTAL = 3;

  const [amountHuf,     setAmountHuf]     = useState('');
  const [triggerType,   setTriggerType]   = useState('milestone');
  const [milestoneName, setMilestoneName] = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [label,         setLabel]         = useState('');
  const [note,          setNote]          = useState('');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1); setError(''); setSaving(false);
    if (editItem) {
      setAmountHuf(editItem.amount_huf?.toString() || '');
      setTriggerType(editItem.trigger_type || 'milestone');
      setMilestoneName(editItem.milestone_name || '');
      setDueDate(editItem.due_date || '');
      setLabel(editItem.label || '');
      setNote(editItem.note || '');
    } else {
      setAmountHuf('');
      setTriggerType('milestone');
      setMilestoneName('');
      setDueDate('');
      setLabel(`Fizetés ${ROMAN[itemCount] ?? (itemCount + 1)}`);
      setNote('');
    }
  }, [isOpen, editItem?.id, itemCount]);

  const validate = () => {
    if (step === 1) {
      const amt = Math.round(Number(amountHuf));
      if (!amt || amt <= 0) return 'Az összeg kötelező és nullánál nagyobb kell legyen';
    }
    if (step === 3 && !label.trim()) return 'A megnevezés kötelező';
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (step < TOTAL) { setStep(s => s + 1); return; }
    setSaving(true);
    try {
      const amt = Math.round(Number(amountHuf));
      await onSave({
        label:          label.trim(),
        trigger_type:   triggerType,
        milestone_name: triggerType === 'milestone' ? milestoneName.trim() || null : null,
        amount_huf:     amt,
        due_date:       dueDate || null,
        note:           note.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e.message || 'Hiba a mentésnél');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isLast = step === TOTAL;
  const stepLabels = ['Összeg', 'Mikor?', 'Részletek'];
  const numVal = Math.round(Number(amountHuf)) || 0;

  // ── Step renderers (called as functions to avoid remount/focus loss) ──

  const StepAmount = () => (
    <>
      <h2 style={S.heading}>Mekkora az összeg?</h2>
      <p style={S.sub}>Add meg, mennyit kell fizetni ennél a részletnél.</p>
      <label style={S.label}>Összeg (HUF) *</label>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          type="number" inputMode="numeric" min="1"
          className="form-control text-mono"
          placeholder="0"
          value={amountHuf}
          onChange={e => setAmountHuf(e.target.value)}
          style={{ fontSize: 30, fontWeight: 800, height: 68, paddingRight: '3.2rem', letterSpacing: '-0.02em' }}
        />
        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Ft</span>
      </div>
      {numVal > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          {numVal.toLocaleString('hu-HU')} Ft
        </div>
      )}
    </>
  );

  const StepTrigger = () => (
    <>
      <h2 style={S.heading}>Mikor esedékes?</h2>
      <p style={S.sub}>Mikor kell az ügyfélnek fizetnie ezt a részletet?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {TRIGGER_TYPES.map(t => {
          const active = triggerType === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" onClick={() => setTriggerType(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14, border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, background: active ? '#0f172a' : '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: active ? 'rgba(255,255,255,0.15)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={active ? '#fff' : '#64748b'} strokeWidth={1.75} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#fff' : '#334155' }}>{t.label}</div>
                <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.65)' : '#94a3b8', marginTop: 1 }}>{t.desc}</div>
              </div>
              {active && <Check size={18} color="#fff" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      {triggerType === 'milestone' && (
        <div>
          <label style={S.label}>Mérföldkő neve</label>
          <input type="text" className="form-control" list="milestone-sugg" value={milestoneName} onChange={e => setMilestoneName(e.target.value)} placeholder="pl. Anyag helyszínen" style={{ fontSize: 16 }} />
          <datalist id="milestone-sugg">{MILESTONE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
        </div>
      )}
      {triggerType === 'date' && (
        <div>
          <label style={S.label}>Határidő</label>
          <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      )}
    </>
  );

  const StepDetails = () => (
    <>
      <h2 style={S.heading}>Megnevezés</h2>
      <p style={S.sub}>Adj nevet a fizetési tételnek és adj hozzá opcionális megjegyzést.</p>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Megnevezés *</label>
        <input type="text" className="form-control" value={label} onChange={e => setLabel(e.target.value)} placeholder="pl. Fizetés I" style={{ fontSize: 17, fontWeight: 600 }} />
      </div>
      <div>
        <label style={S.label}>Megjegyzés (opcionális)</label>
        <textarea rows={3} className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="Belső megjegyzés az ügyfélnek vagy a csapatnak…" style={{ resize: 'none' }} />
      </div>
    </>
  );

  const renderStep = () => {
    if (step === 1) return StepAmount();
    if (step === 2) return StepTrigger();
    if (step === 3) return StepDetails();
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={editItem ? 'Fizetési tétel szerkesztése' : 'Új fizetési tétel'}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '6px 20px 12px', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {editItem ? 'Fizetési tétel szerkesztése' : 'Új fizetési tétel'}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14px 20px 10px', flexShrink: 0 }}>
          {stepLabels.map((lbl, i) => {
            const idx = i + 1;
            const done = idx < step;
            const curr = idx === step;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#0f172a' : '#e2e8f0', borderRadius: 1, marginTop: 13, transition: 'background 0.2s' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 56 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: curr || done ? '#0f172a' : '#f1f5f9', border: `2px solid ${curr || done ? '#0f172a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {done ? <Check size={14} color="#fff" strokeWidth={2.5} /> : <span style={{ fontSize: 12, fontWeight: 800, color: curr ? '#fff' : '#94a3b8' }}>{idx}</span>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: curr ? 700 : 500, color: curr ? '#0f172a' : done ? '#475569' : '#94a3b8', whiteSpace: 'nowrap', textAlign: 'center' }}>{lbl}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px', WebkitOverflowScrolling: 'touch' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13, display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          {renderStep()}
          <div style={{ height: 8 }} />
        </div>

        {/* Navigation */}
        <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={saving}
              style={{ width: 52, height: 54, borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <button type="button" onClick={handleNext} disabled={saving}
            style={{ flex: 1, height: 54, borderRadius: 14, border: 'none', background: isLast ? '#16a34a' : '#0f172a', color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.75 : 1, transition: 'background 0.2s' }}>
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Mentés...</>
              : isLast
                ? <><Check size={18} /> {editItem ? 'Módosítás mentése' : 'Tétel hozzáadása'}</>
                : <>Következő <ChevronRight size={18} /></>
            }
          </button>
        </div>
      </div>
    </>
  );
}
