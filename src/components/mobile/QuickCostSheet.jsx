'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { INVOICE_CATEGORIES } from '@/lib/constants';
import {
  Camera, Image as ImageIcon, X, Check, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Home,
} from 'lucide-react';

const CAT_ICONS = {
  'Anyag':            '📦',
  'Munka':            '👷',
  'Szerszám/Eszköz':  '🔧',
  'Szállítás':        '🚚',
  'Engedély/Hatóság': '📋',
  'Egyéb':            '•',
};

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

export default function QuickCostSheet({ isOpen, onClose, projectId, onSuccess }) {
  const { createInvoice, uploadInvoiceImage, projectRooms } = useApp();
  const t     = useTranslations('mobile.quickCost');
  const rooms = (projectRooms || []).filter(r => r.project_id === projectId);

  const [step, setStep] = useState(1);

  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState('');
  const [scanning,  setScanning]  = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ocrValue,  setOcrValue]  = useState(null);
  const [aiItems,   setAiItems]   = useState(null);
  const [aiTotal,   setAiTotal]   = useState(null);
  const [aiCurr,    setAiCurr]    = useState('HUF');
  const [category,  setCategory]  = useState('Anyag');
  const [amount,    setAmount]    = useState('');
  const [invDesc,   setInvDesc]   = useState('');
  const [invRoom,   setInvRoom]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useScrollLock(isOpen);

  const totalSteps = rooms.length > 0 ? 4 : 3;
  const isLast     = step === totalSteps;
  const stepLabels = rooms.length > 0
    ? [t('stepPhoto'), t('stepCategory'), t('stepAmount'), t('stepSection')]
    : [t('stepPhoto'), t('stepCategory'), t('stepAmount')];

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setFile(null); setPreview(''); setScanning(false); setAiLoading(false);
    setOcrValue(null); setAiItems(null); setAiTotal(null); setAiCurr('HUF');
    setCategory('Anyag'); setAmount(''); setInvDesc(''); setInvRoom('');
    setSubmitting(false); setError('');
  }, [isOpen]);

  const processFile = async (raw) => {
    if (!raw) return;
    const f = await processMediaFile(raw);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOcrValue(null); setAiItems(null); setAiTotal(null); setAiCurr('HUF');
    setScanning(true); setAiLoading(true); setError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      const [ocrRes, aiRes] = await Promise.all([
        fetch('/api/ocr',        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: dataUrl }) }).then(r => r.json()).catch(() => null),
        fetch('/api/invoice-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: dataUrl }) }).then(r => r.json()).catch(() => null),
      ]);

      if (ocrRes?.suggestedValue > 0) {
        setOcrValue(ocrRes.suggestedValue);
        setAmount(ocrRes.suggestedValue.toString());
      }
      setScanning(false);

      if (aiRes?.lineItems) {
        const curr = aiRes.currency || 'HUF';
        setAiCurr(curr);
        setAiItems(aiRes.lineItems);
        const tot = aiRes.grandTotal || aiRes.lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
        setAiTotal(tot);
        if (tot > 0 && curr === 'HUF') setAmount(Math.round(tot).toString());
        setInvDesc(prev => {
          if (prev) return prev;
          const names = aiRes.lineItems.map(i => i.name).filter(Boolean);
          if (!names.length) return prev;
          const joined = names.slice(0, 4).join(', ');
          return names.length > 4 ? joined + ', …' : joined;
        });
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
    setFile(null); setPreview(''); setOcrValue(null);
    setAiItems(null); setAiTotal(null); setAmount('');
  };

  const updateAiItem = (idx, field, val) => {
    setAiItems(prev => {
      const next = prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: field === 'name' ? val : (Number(val) || 0) };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Math.round((parseFloat(field === 'quantity' ? val : item.quantity) || 0) * (parseFloat(field === 'unitPrice' ? val : item.unitPrice) || 0));
        }
        return updated;
      });
      const newTotal = Math.round(next.reduce((s, i) => s + (Number(i.total) || 0), 0));
      setAiTotal(newTotal);
      setAmount(String(newTotal));
      return next;
    });
  };

  const removeAiItem = (idx) => {
    setAiItems(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const newTotal = Math.round(next.reduce((s, i) => s + (Number(i.total) || 0), 0));
      setAiTotal(newTotal);
      setAmount(String(newTotal));
      return next;
    });
  };

  const validate = () => {
    if (step === 3 && !(parseInt(amount, 10) > 0)) return t('amountRequired');
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    if (!isLast) { setStep(s => s + 1); return; }

    setSubmitting(true);
    try {
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
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message || t('errorSaving'));
      setSubmitting(false);
    }
  };

  const StepPhoto = () => (
    <>
      <h2 style={S.heading}>{t('photoHeading')}</h2>
      <p style={S.sub}>{t('photoSub')}</p>

      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />

      {!preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => cameraRef.current?.click()} style={S.photoPrimary}>
            <Camera size={26} color="#fff" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t('cameraButton')}</span>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()} style={S.photoSecondary}>
            <ImageIcon size={20} color="#475569" />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>{t('fileButton')}</span>
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
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{t('processing')}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={() => cameraRef.current?.click()}  style={S.photoRetake}><Camera    size={15} /> {t('retakePhoto')}</button>
            <button type="button" onClick={() => galleryRef.current?.click()} style={S.photoRetake}><ImageIcon size={15} /> {t('changeFile')}</button>
          </div>
        </>
      )}
    </>
  );

  const StepCategory = () => (
    <>
      <h2 style={S.heading}>{t('catHeading')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {INVOICE_CATEGORIES.map(c => {
          const active = category === c.id;
          return (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{ padding: '16px 10px', borderRadius: 16, border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`, background: active ? '#0f172a' : '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 26 }}>{CAT_ICONS[c.id] || '•'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#334155', textAlign: 'center', lineHeight: 1.3 }}>{c.label}</span>
              {c.desc && <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 }}>{c.desc}</span>}
            </button>
          );
        })}
      </div>
    </>
  );

  const StepAmount = () => (
    <>
      <h2 style={S.heading}>{t('amountHeading')}</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>{t('amountLabel')}</label>
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
      </div>

      {!aiLoading && aiItems && aiItems.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('itemsLabel')}{aiCurr !== 'HUF' && <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>{aiCurr}</span>}
          </div>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 76px 28px', gap: 4, padding: '5px 8px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              {[t('nameHeader'), t('qtyHeader'), t('totalHeader'), ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {aiItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 76px 28px', gap: 4, padding: '5px 8px', borderBottom: i < aiItems.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: '#fff', alignItems: 'center' }}>
                  <input type="text" value={item.name || ''} onChange={e => updateAiItem(i, 'name', e.target.value)} placeholder={t('namePh')}
                    style={{ fontSize: 12, padding: '3px 5px', border: '1px solid var(--border-subtle)', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', minWidth: 0 }} />
                  <input type="number" value={item.quantity ?? 1} onChange={e => updateAiItem(i, 'quantity', e.target.value)} min="0" step="0.01"
                    style={{ fontSize: 12, padding: '3px 4px', border: '1px solid var(--border-subtle)', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
                  <input type="number" value={item.total ?? 0} onChange={e => updateAiItem(i, 'total', e.target.value)} min="0"
                    style={{ fontSize: 12, padding: '3px 4px', border: '1px solid var(--border-subtle)', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700 }} />
                  <button type="button" onClick={() => removeAiItem(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--bg-subtle)', borderTop: '2px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('grandTotal')}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {Number(aiTotal || 0).toLocaleString('hu-HU')} {aiCurr}
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label style={S.label}>{t('descLabel')}</label>
        <div style={{ position: 'relative' }}>
          <input type="text" className="form-control" placeholder={t('descPh')} value={invDesc} onChange={e => setInvDesc(e.target.value)} style={{ paddingRight: invDesc ? '2rem' : undefined }} />
          {invDesc && (
            <button type="button" onClick={() => setInvDesc('')}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  const StepSection = () => (
    <>
      <h2 style={S.heading}>{t('sectionHeading')}</h2>
      <p style={S.sub}>{t('sectionSub')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ id: '', name: t('generalSection'), sub: t('noSection') }, ...rooms.map(r => ({ id: r.id, name: r.name, sub: r.size_m2 ? `${r.size_m2} m²` : null }))].map(r => {
          const active = invRoom === r.id;
          return (
            <button key={r.id} type="button" onClick={() => setInvRoom(r.id)} style={{ ...S.roomBtn, ...(active ? S.roomBtnActive : {}) }}>
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

  const renderStep = () => {
    if (step === 1) return StepPhoto();
    if (step === 2) return StepCategory();
    if (step === 3) return StepAmount();
    if (step === 4) return StepSection();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }} aria-hidden="true" />
      <div
        role="dialog" aria-modal="true" aria-label={t('ariaLabel')}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 201, maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 12px', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ flex: 1, fontWeight: 800, fontSize: 17, color: '#0f172a' }}>{t('sheetTitle')}</span>
          <button type="button" onClick={onClose} disabled={submitting} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
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
                {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#0f172a' : '#e2e8f0', borderRadius: 1, marginTop: 13, transition: 'background 0.2s' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 48 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: curr || done ? '#0f172a' : '#f1f5f9', border: `2px solid ${curr || done ? '#0f172a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    {done ? <Check size={14} color="#fff" strokeWidth={2.5} /> : <span style={{ fontSize: 12, fontWeight: 800, color: curr ? '#fff' : '#94a3b8' }}>{idx}</span>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: curr ? 700 : 500, color: curr ? '#0f172a' : done ? '#475569' : '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px', WebkitOverflowScrolling: 'touch' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 10, fontSize: 13, display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span>
            </div>
          )}
          {renderStep()}
          <div style={{ height: 8 }} />
        </div>

        <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', flexShrink: 0, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(s => s - 1); }} disabled={submitting}
              style={{ width: 52, height: 54, borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <button type="button" onClick={handleNext} disabled={submitting}
            style={{ flex: 1, height: 54, borderRadius: 14, border: 'none', background: isLast ? '#16a34a' : '#0f172a', color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.75 : 1, transition: 'background 0.2s' }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> {t('savingBtn')}</>
              : isLast
                ? <><Check size={18} /> {t('saveExpenseBtn')}</>
                : <>{t('nextBtn')} <ChevronRight size={18} /></>}
          </button>
        </div>
      </div>
    </>
  );
}
