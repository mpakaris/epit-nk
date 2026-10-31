'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { INVOICE_CATEGORIES, formatHUF } from '@/lib/constants';
import {
  Camera, Image as ImageIcon, X, Check, Loader2, AlertCircle,
  Receipt, Hammer, ChevronLeft, ChevronRight, Sparkles, Home,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_ICONS = {
  'Anyag':            '📦',
  'Szerszám/Eszköz':  '🔧',
  'Szállítás':        '🚚',
  'Engedély/Hatóság': '📋',
  'Egyéb':            '•',
};

const LABOUR_UNITS = ['h', 'nap', 'm²', 'm³', 'm', 'fm', 'db', 'l', 'kg'];
const today = () => new Date().toISOString().slice(0, 10);

// ─── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  heading:       { fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.25 },
  sub:           { fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 },
  label:         { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  photoPrimary:  { width: '100%', height: 80, borderRadius: 16, border: 'none', background: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
  photoSecondary:{ width: '100%', height: 56, borderRadius: 16, border: '2px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  photoRetake:   { flex: 1, height: 40, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' },
  roomBtn:       { width: '100%', padding: '12px 14px', borderRadius: 14, border: '2px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', transition: 'all 0.15s' },
  roomBtnActive: { border: '2px solid #0f172a', background: '#f1f5f9' },
};

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * Stepper bottom sheet for adding invoices or labour entries.
 * Invoice: 1 Photo → 2 Category → 3 Amount & desc → [4 Section]
 * Labour:  1 Type & date → 2 Quantity & rate → [3 Section]
 * Section step only shown when project has rooms.
 */
export default function QuickCostSheet({ isOpen, onClose, projectId, onSuccess }) {
  const { createInvoice, uploadInvoiceImage, createLabourEntry, projectRooms } = useApp();
  const rooms = (projectRooms || []).filter(r => r.project_id === projectId);

  // ── Navigation state ──
  const [mode, setMode] = useState('invoice');
  const [step, setStep] = useState(1);

  // ── Invoice state ──
  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState('');
  const [scanning,  setScanning]  = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrValue,  setOcrValue]  = useState(null);
  const [aiItems,   setAiItems]   = useState(null);
  const [aiTotal,   setAiTotal]   = useState(null);
  const [aiCurr,    setAiCurr]    = useState('HUF');
  const [category,  setCategory]  = useState('Anyag');
  const [amount,    setAmount]    = useState('');
  const [invDesc,   setInvDesc]   = useState('');
  const [invRoom,   setInvRoom]   = useState('');

  // ── Labour state ──
  const [labType,  setLabType]  = useState('');
  const [labDate,  setLabDate]  = useState(today());
  const [labHours, setLabHours] = useState('');
  const [labUnit,  setLabUnit]  = useState('h');
  const [labRate,  setLabRate]  = useState('');
  const [labDesc,  setLabDesc]  = useState('');
  const [labRoom,  setLabRoom]  = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useScrollLock(isOpen);

  // Step counts depend on whether the project has sections
  const invSteps   = rooms.length > 0 ? 4 : 3;
  const labSteps   = rooms.length > 0 ? 3 : 2;
  const totalSteps = mode === 'invoice' ? invSteps : labSteps;
  const isLast     = step === totalSteps;

  const invLabels = rooms.length > 0
    ? ['Fotó', 'Kategória', 'Összeg', 'Szekció']
    : ['Fotó', 'Kategória', 'Összeg'];
  const labLabels = rooms.length > 0
    ? ['Munkavégzés', 'Díjazás', 'Szekció']
    : ['Munkavégzés', 'Díjazás'];
  const stepLabels = mode === 'invoice' ? invLabels : labLabels;

  // Reset everything when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    setMode('invoice'); setStep(1);
    setFile(null); setPreview(''); setScanning(false); setAiLoading(false);
    setOcrStatus(''); setOcrValue(null); setAiItems(null); setAiTotal(null); setAiCurr('HUF');
    setCategory('Anyag'); setAmount(''); setInvDesc(''); setInvRoom('');
    setLabType(''); setLabDate(today()); setLabHours(''); setLabUnit('h');
    setLabRate(''); setLabDesc(''); setLabRoom('');
    setSubmitting(false); setError('');
  }, [isOpen]);

  const switchMode = (m) => { setMode(m); setStep(1); setError(''); };

  // ── File handling + OCR + AI ──────────────────────────────────────────────────

  const processFile = async (raw) => {
    if (!raw) return;
    const f = await processMediaFile(raw);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOcrValue(null); setAiItems(null); setAiTotal(null); setAiCurr('HUF');
    setOcrStatus('Összeg leolvasása...'); setScanning(true); setAiLoading(true); setError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      const [ocrRes, aiRes] = await Promise.all([
        fetch('/api/ocr',        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl:     dataUrl }) }).then(r => r.json()).catch(() => null),
        fetch('/api/invoice-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: dataUrl }) }).then(r => r.json()).catch(() => null),
      ]);

      if (ocrRes?.suggestedValue > 0) {
        setOcrValue(ocrRes.suggestedValue);
        setAmount(ocrRes.suggestedValue.toString());
        setOcrStatus(`OCR: ${formatHUF(ocrRes.suggestedValue)}`);
      } else {
        setOcrStatus('');
      }
      setScanning(false);

      if (aiRes?.lineItems) {
        const curr = aiRes.currency || 'HUF';
        setAiCurr(curr);
        setAiItems(aiRes.lineItems);
        const tot = aiRes.grandTotal || aiRes.lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
        setAiTotal(tot);
        if (tot > 0 && curr === 'HUF') setAmount(Math.round(tot).toString());
      } else {
        setAiItems([]);
      }
      setAiLoading(false);
    };
    reader.readAsDataURL(f);
  };

  const handleFileChange = async (e) => {
    const raw = e.target.files?.[0];
    if (raw) await processFile(raw);
    e.target.value = '';
  };

  const clearPhoto = () => {
    setFile(null); setPreview(''); setOcrStatus(''); setOcrValue(null);
    setAiItems(null); setAiTotal(null); setAmount('');
  };

  // ── Validation + navigation ───────────────────────────────────────────────────

  const validate = () => {
    if (mode === 'invoice' && step === 3 && !(parseInt(amount, 10) > 0))
      return 'Adja meg a számla összegét!';
    if (mode === 'labour') {
      if (step === 1 && !labType.trim()) return 'Adja meg a munkavégzés típusát!';
      if (step === 2 && !(parseFloat(labHours) > 0)) return 'Adja meg a mennyiséget!';
      if (step === 2 && !(parseInt(labRate, 10) > 0)) return 'Adja meg az egységdíjat!';
    }
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (!isLast) { setStep(s => s + 1); return; }

    setSubmitting(true);
    try {
      if (mode === 'invoice') {
        let imageUrl = null, storagePath = null;
        if (file) ({ imageUrl, storagePath } = await uploadInvoiceImage(file));
        await createInvoice({
          projectId,
          valueHuf:          parseInt(amount, 10),
          ocrSuggestedValue: ocrValue,
          category,
          description:       invDesc.trim(),
          imageUrl, storagePath,
          roomId:            invRoom || null,
          aiLineItems:       aiItems?.length ? aiItems.map(i => ({ ...i, currency: aiCurr })) : null,
          aiTotal:           aiTotal || null,
        });
      } else {
        await createLabourEntry({
          projectId,
          date:        labDate,
          labourType:  labType.trim(),
          hours:       parseFloat(labHours),
          hourlyRate:  parseInt(labRate, 10),
          description: labDesc.trim(),
          roomId:      labRoom || null,
          unit:        labUnit,
        });
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message || 'Hiba történt');
      setSubmitting(false);
    }
  };

  // ── Step renderers ────────────────────────────────────────────────────────────

  const StepPhoto = () => (
    <>
      <h2 style={S.heading}>Bizonylat fotója</h2>
      <p style={S.sub}>Fotózd le a számlát — az összeg automatikusan felismerésre kerül. Kihagyható.</p>

      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

      {!preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => cameraRef.current?.click()} style={S.photoPrimary}>
            <Camera size={26} color="#fff" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Fotó készítése kamerával</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} style={S.photoSecondary}>
            <ImageIcon size={20} color="#475569" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Kiválasztás galériából</span>
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 200 }}>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={clearPhoto} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={16} />
            </button>
            {(scanning || aiLoading) && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'rgba(37,99,235,0.88)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} color="#fff" className="animate-spin" />
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                  {scanning ? 'Összeg felismerése...' : 'AI elemzés folyamatban...'}
                </span>
              </div>
            )}
            {!scanning && !aiLoading && ocrStatus && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '7px 12px', background: 'rgba(22,163,74,0.88)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} color="#fff" />
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{ocrStatus}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => cameraRef.current?.click()}  style={S.photoRetake}><Camera    size={15} /> Újrafotó</button>
            <button type="button" onClick={() => galleryRef.current?.click()} style={S.photoRetake}><ImageIcon size={15} /> Más kép</button>
          </div>
        </>
      )}
    </>
  );

  const StepCategory = () => (
    <>
      <h2 style={S.heading}>Milyen típusú kiadás?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {INVOICE_CATEGORIES.map(c => {
          const active = category === c.id;
          return (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{ padding: '16px 10px', borderRadius: 16, border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, background: active ? '#0f172a' : '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 26 }}>{CAT_ICONS[c.id] || '•'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#334155', textAlign: 'center', lineHeight: 1.3 }}>{c.label}</span>
              {c.desc && <span style={{ fontSize: 11, color: active ? '#94a3b8' : '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>{c.desc}</span>}
            </button>
          );
        })}
      </div>
    </>
  );

  const StepAmount = () => {
    const numVal = parseInt(amount, 10) || 0;
    return (
      <>
        <h2 style={S.heading}>Összeg és leírás</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Fizetett összeg (HUF) *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number" inputMode="numeric" min="1"
              className="form-control text-mono"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 30, fontWeight: 800, height: 68, paddingRight: '3.2rem', letterSpacing: '-0.02em' }}
            />
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Ft</span>
          </div>

          {(scanning || aiLoading) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              <Loader2 size={13} className="animate-spin" />
              {scanning ? 'OCR feldolgozás...' : 'AI elemzés...'}
            </div>
          )}
          {!scanning && !aiLoading && ocrStatus && numVal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--success-text)', fontWeight: 600 }}>
              <Sparkles size={13} /> {ocrStatus} — automatikusan kitöltve
            </div>
          )}
        </div>

        {/* AI summary — compact, read-only */}
        {!aiLoading && aiItems && aiItems.length > 0 && (
          <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={11} /> AI — {aiItems.length} tétel
              {aiCurr !== 'HUF' && <span style={{ background: '#0369a1', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{aiCurr}</span>}
            </div>
            {aiItems.slice(0, 3).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', padding: '2px 0' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{item.name || 'Tétel'}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{Number(item.total || 0).toLocaleString('hu-HU')}</span>
              </div>
            ))}
            {aiItems.length > 3 && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>+{aiItems.length - 3} további tétel</div>}
          </div>
        )}

        <div>
          <label style={S.label}>Leírás / megjegyzés</label>
          <input type="text" className="form-control" placeholder="pl. Tetőcsavarok, gipszkarton, festék" value={invDesc} onChange={e => setInvDesc(e.target.value)} />
        </div>
      </>
    );
  };

  const StepSection = ({ roomId, setRoomId }) => (
    <>
      <h2 style={S.heading}>Melyik szekcióhoz tartozik?</h2>
      <p style={S.sub}>Opcionális — ha nem számít, maradhat Általános.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ id: '', name: 'Általános', sub: 'Nincs szekcióhoz rendelve' }, ...rooms.map(r => ({ id: r.id, name: r.name, sub: r.size_m2 ? `${r.size_m2} m²` : null }))].map(r => {
          const active = roomId === r.id;
          return (
            <button key={r.id} type="button" onClick={() => setRoomId(r.id)} style={{ ...S.roomBtn, ...(active ? S.roomBtnActive : {}) }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: active ? '#0f172a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={18} color={active ? '#fff' : '#64748b'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#0f172a' : '#334155' }}>{r.name}</div>
                {r.sub && <div style={{ fontSize: 12, color: '#64748b' }}>{r.sub}</div>}
              </div>
              {active && <Check size={18} color="#0f172a" style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </>
  );

  const StepLabourType = () => (
    <>
      <h2 style={S.heading}>Milyen munkát végeztél?</h2>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Munkavégzés típusa *</label>
        <input type="text" className="form-control" placeholder="pl. Burkolás, Festés, Glettelés" value={labType} onChange={e => setLabType(e.target.value)} style={{ fontSize: 17, fontWeight: 600 }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Dátum</label>
        <input type="date" className="form-control" value={labDate} onChange={e => setLabDate(e.target.value)} />
      </div>
      <div>
        <label style={S.label}>Megjegyzés (opcionális)</label>
        <input type="text" className="form-control" placeholder="pl. Keleti fal, II. emelet" value={labDesc} onChange={e => setLabDesc(e.target.value)} />
      </div>
    </>
  );

  const labourValue = Math.round((parseFloat(labHours) || 0) * (parseInt(labRate, 10) || 0));

  const StepLabourRate = () => (
    <>
      <h2 style={S.heading}>Mennyi és mennyiért?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={S.label}>Egység</label>
          <select className="form-control" value={labUnit} onChange={e => setLabUnit(e.target.value)} style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', height: 48 }}>
            {LABOUR_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Mennyiség *</label>
          <input inputMode="decimal" type="number" min="0" step="0.5" className="form-control text-mono" placeholder="0" value={labHours} onChange={e => setLabHours(e.target.value)} style={{ fontSize: 22, fontWeight: 700, height: 48 }} />
        </div>
        <div>
          <label style={S.label}>Ft/{labUnit} *</label>
          <input inputMode="numeric" type="number" min="0" className="form-control text-mono" placeholder="0" value={labRate} onChange={e => setLabRate(e.target.value)} style={{ fontSize: 22, fontWeight: 700, height: 48 }} />
        </div>
      </div>
      {labourValue > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success-text)' }}>Munkadíj összesen</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 20, color: 'var(--success-text)' }}>{formatHUF(labourValue)}</span>
        </div>
      )}
    </>
  );

  const renderStep = () => {
    if (mode === 'invoice') {
      if (step === 1) return StepPhoto();
      if (step === 2) return StepCategory();
      if (step === 3) return StepAmount();
      if (step === 4) return StepSection({ roomId: invRoom, setRoomId: setInvRoom });
    } else {
      if (step === 1) return StepLabourType();
      if (step === 2) return StepLabourRate();
      if (step === 3) return StepSection({ roomId: labRoom, setRoomId: setLabRoom });
    }
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop — intentionally no onClick: accidental taps must not lose form data */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }} aria-hidden="true" />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bejegyzés hozzáadása"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {/* Header: mode toggle + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 12px', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
            {[
              { key: 'invoice', label: 'Számla',   icon: <Receipt size={14} /> },
              { key: 'labour',  label: 'Munkadíj', icon: <Hammer  size={14} /> },
            ].map(m => (
              <button key={m.key} type="button" onClick={() => switchMode(m.key)} style={{ height: 36, borderRadius: 9, border: 'none', background: mode === m.key ? '#fff' : 'transparent', color: mode === m.key ? '#0f172a' : '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: mode === m.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none', transition: 'all 0.15s' }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} disabled={submitting} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, padding: '14px 20px 10px', flexShrink: 0 }}>
          {stepLabels.map((label, i) => {
            const idx  = i + 1;
            const done = idx < step;
            const curr = idx === step;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{ flex: 1, height: 2, background: done ? '#0f172a' : '#e2e8f0', borderRadius: 1, marginTop: 13, transition: 'background 0.2s' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 48 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: curr || done ? '#0f172a' : '#f1f5f9', border: `2px solid ${curr || done ? '#0f172a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {done
                      ? <Check size={14} color="#fff" strokeWidth={2.5} />
                      : <span style={{ fontSize: 12, fontWeight: 800, color: curr ? '#fff' : '#94a3b8' }}>{idx}</span>
                    }
                  </div>
                  <span style={{ fontSize: 10, fontWeight: curr ? 700 : 500, color: curr ? '#0f172a' : done ? '#475569' : '#94a3b8', whiteSpace: 'nowrap', textAlign: 'center' }}>{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px', WebkitOverflowScrolling: 'touch' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13, display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          {renderStep()}
          {/* Bottom padding so content isn't hidden behind nav */}
          <div style={{ height: 8 }} />
        </div>

        {/* Navigation bar */}
        <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={submitting} style={{ width: 52, height: 54, borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            style={{ flex: 1, height: 54, borderRadius: 14, border: 'none', background: isLast ? '#16a34a' : '#0f172a', color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.75 : 1, transition: 'background 0.2s' }}
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Mentés...</>
              : isLast
                ? <><Check size={18} /> {mode === 'invoice' ? 'Számla mentése' : 'Munka mentése'}</>
                : <>Következő <ChevronRight size={18} /></>
            }
          </button>
        </div>
      </div>
    </>
  );
}
