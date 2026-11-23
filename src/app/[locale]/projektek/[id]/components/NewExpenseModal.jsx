'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon, X, Loader2, Check,
  AlertCircle, ChevronLeft, ChevronRight, Home, Upload, PenLine,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { INVOICE_CATEGORIES } from '@/lib/constants';
import { processMediaFile } from '@/lib/mediaGate';
import Modal from '@/components/Modal';

const CAT_ICONS = {
  'material':  '📦',
  'labour':    '👷',
  'equipment': '🔧',
  'delivery':  '🚚',
  'parking':   '📋',
  'other':     '•',
};

const CAT_I18N = {
  'material':  { labelKey: 'catMaterial', descKey: 'catMaterialDesc' },
  'labour':    { labelKey: 'catLabour',   descKey: 'catLabourDesc'   },
  'equipment': { labelKey: 'catTools',    descKey: 'catToolsDesc'    },
  'delivery':  { labelKey: 'catDelivery', descKey: 'catDeliveryDesc' },
  'parking':   { labelKey: 'catParking',  descKey: 'catParkingDesc'  },
  'other':     { labelKey: 'catOther',    descKey: 'catOtherDesc'    },
};

const LABEL = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6,
};

export default function NewExpenseModal({ isOpen, onClose, projectId, rooms, onSuccess }) {
  const tQ = useTranslations('mobile.quickCost');
  const t  = useTranslations('projectDetail');
  const tP = useTranslations('projects');
  const { createInvoice, uploadInvoiceImage } = useApp();

  // mode: null = picker, 'media' = with upload, 'manual' = no upload
  const [mode,       setMode]       = useState(null);
  const [step,       setStep]       = useState(1);
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState('');
  const [scanning,   setScanning]   = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [ocrValue,   setOcrValue]   = useState(null);
  const [aiItems,    setAiItems]    = useState(null);
  const [aiTotal,    setAiTotal]    = useState(null);
  const [aiCurr,     setAiCurr]     = useState('HUF');
  const [category,   setCategory]   = useState('Anyag');
  const [amount,     setAmount]     = useState('');
  const [invDesc,    setInvDesc]    = useState('');
  const [invRoom,    setInvRoom]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const galleryRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(null); setStep(1); setFile(null); setPreview('');
    setScanning(false); setAiLoading(false);
    setOcrValue(null); setAiItems(null); setAiTotal(null); setAiCurr('HUF');
    setCategory('material'); setAmount(''); setInvDesc(''); setInvRoom('');
    setSubmitting(false); setError('');
  }, [isOpen]);

  // Steps for each mode
  const mediaSteps  = [t('expenseStepUpload'), tQ('stepCategory'), tQ('stepAmount'), tQ('stepSection')];
  const manualSteps = [tQ('stepCategory'), tQ('stepAmount'), tQ('stepSection')];

  const stepLabels = mode === 'media' ? mediaSteps : manualSteps;
  const totalSteps = stepLabels.length;
  const isLast     = step === totalSteps;

  // Which logical content does each step show?
  // media:  1=upload, 2=category, 3=amount, 4=section
  // manual: 1=category, 2=amount, 3=section
  const logicalStep = mode === 'media' ? step : step + 1;

  const processFile = async (raw) => {
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
      if (ocrRes?.suggestedValue > 0) { setOcrValue(ocrRes.suggestedValue); setAmount(ocrRes.suggestedValue.toString()); }
      setScanning(false);
      if (aiRes?.lineItems) {
        const curr = aiRes.currency || 'HUF';
        setAiCurr(curr); setAiItems(aiRes.lineItems);
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
      } else { setAiItems([]); }
      setAiLoading(false);
    };
    reader.readAsDataURL(f);
  };

  const handleFileChange = async (e) => {
    const raw = e.target.files?.[0];
    if (raw) await processFile(raw);
    e.target.value = '';
  };

  const validate = () => {
    if (logicalStep === 3 && !(parseInt(amount, 10) > 0)) return tQ('amountRequired');
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
      setError(e.message || tQ('errorSaving'));
      setSubmitting(false);
    }
  };

  // ── Step content ───────────────────────────────────────────────────────────

  const StepUpload = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading, "Bricolage Grotesque")', color: '#0E1116', marginBottom: 4 }}>{tQ('photoHeading')}</div>
        <div style={{ fontSize: 14, color: '#5A5F68' }}>{tQ('photoSub')}</div>
      </div>
      <input ref={galleryRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />

      {!preview ? (
        <button type="button" className="dk-btn dk-btn-dark" style={{ width: '100%', height: 72, justifyContent: 'center', fontSize: 15, borderRadius: 16 }} onClick={() => galleryRef.current?.click()}>
          <Upload size={20} /> {t('expenseAddFile')}
        </button>
      ) : (
        <div>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 200, background: '#F4F5F8' }}>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => { setFile(null); setPreview(''); }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={16} />
            </button>
            {(scanning || aiLoading) && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 14px', background: 'rgba(38,50,72,0.88)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} color="#fff" className="animate-spin" />
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{tQ('processing')}</span>
              </div>
            )}
          </div>
          <button type="button" className="dk-btn dk-btn-l" style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginTop: 10 }} onClick={() => galleryRef.current?.click()}>
            <ImageIcon size={14} /> {tQ('changeFile')}
          </button>
        </div>
      )}
    </div>
  );

  const StepCategory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading, "Bricolage Grotesque")', color: '#0E1116' }}>{tQ('catHeading')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {INVOICE_CATEGORIES.map(c => {
          const active = category === c.id;
          const i18n   = CAT_I18N[c.id];
          const label  = i18n ? tP(i18n.labelKey) : c.label;
          const desc   = i18n ? tP(i18n.descKey)  : c.desc;
          return (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{
              padding: '18px 12px', borderRadius: 16,
              border: `2px solid ${active ? '#263248' : '#EDEBE5'}`,
              background: active ? '#263248' : '#FBFAF7',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 28 }}>{CAT_ICONS[c.id] || '•'}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : '#0E1116', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
              <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.65)' : '#5A5F68', textAlign: 'center', lineHeight: 1.3 }}>{desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const StepAmount = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading, "Bricolage Grotesque")', color: '#0E1116' }}>{tQ('amountHeading')}</div>
      <div>
        <label style={LABEL}>{tQ('amountLabel')}</label>
        <div style={{ position: 'relative' }}>
          <input
            type="number" inputMode="numeric" min="1"
            className="dk-input"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ fontSize: 28, fontWeight: 800, height: 64, paddingRight: 48, letterSpacing: '-0.02em' }}
          />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#5A5F68', fontSize: 16, pointerEvents: 'none' }}>Ft</span>
        </div>
      </div>
      <div>
        <label style={LABEL}>{tQ('descLabel')}</label>
        <div style={{ position: 'relative' }}>
          <input type="text" className="dk-input" placeholder={tQ('descPh')} value={invDesc} onChange={e => setInvDesc(e.target.value)} style={{ paddingRight: invDesc ? 40 : 14 }} />
          {invDesc && (
            <button type="button" onClick={() => setInvDesc('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5A5F68', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const StepSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading, "Bricolage Grotesque")', color: '#0E1116', marginBottom: 4 }}>{tQ('sectionHeading')}</div>
        <div style={{ fontSize: 14, color: '#5A5F68' }}>{tQ('sectionSub')}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ id: '', name: tQ('generalSection'), sub: tQ('noSection') }, ...rooms.map(r => ({ id: r.id, name: r.name, sub: r.size_m2 ? `${r.size_m2} m²` : null }))].map(r => {
          const active = invRoom === r.id;
          return (
            <button key={r.id} type="button" onClick={() => setInvRoom(r.id)} style={{
              width: '100%', padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              border: `2px solid ${active ? '#263248' : '#EDEBE5'}`,
              background: active ? '#263248' : '#FBFAF7',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: active ? 'rgba(255,255,255,0.15)' : '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={18} color={active ? '#fff' : '#5A5F68'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#fff' : '#0E1116' }}>{r.name}</div>
                {r.sub && <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.65)' : '#5A5F68' }}>{r.sub}</div>}
              </div>
              {active && <Check size={18} color="#fff" style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep = () => {
    if (logicalStep === 1) return StepUpload();
    if (logicalStep === 2) return StepCategory();
    if (logicalStep === 3) return StepAmount();
    if (logicalStep === 4) return StepSection();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('expenseModalTitle')}>

      {/* ── Mode picker ─────────────────────────────────────────────────────── */}
      {mode === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#5A5F68', marginBottom: 4 }}>{t('expenseModeTitle')}</div>
          <button type="button" onClick={() => setMode('media')} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16,
            border: '2px solid #EDEBE5', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#263248', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116', marginBottom: 2 }}>{t('expenseModeMedia')}</div>
              <div style={{ fontSize: 13, color: '#5A5F68' }}>{t('expenseModeMediaDesc')}</div>
            </div>
          </button>
          <button type="button" onClick={() => { setMode('manual'); setStep(1); }} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16,
            border: '2px solid #EDEBE5', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0F0F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PenLine size={22} color="#5A5F68" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116', marginBottom: 2 }}>{t('expenseModeManual')}</div>
              <div style={{ fontSize: 13, color: '#5A5F68' }}>{t('expenseModeManualDesc')}</div>
            </div>
          </button>
        </div>
      ) : (
        <>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
            {stepLabels.map((label, i) => {
              const idx  = i + 1;
              const done = idx < step;
              const curr = idx === step;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#263248' : '#EDEBE5', borderRadius: 1, marginTop: 13 }} />}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 52 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: curr || done ? '#263248' : '#F0F0F2', border: `2px solid ${curr || done ? '#263248' : '#EDEBE5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? <Check size={13} color="#fff" strokeWidth={2.5} /> : <span style={{ fontSize: 12, fontWeight: 800, color: curr ? '#fff' : '#5A5F68' }}>{idx}</span>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: curr ? 700 : 500, color: curr ? '#0E1116' : done ? '#5A5F68' : '#9AA1AD', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Step content */}
          {renderStep()}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="button" className="dk-btn dk-btn-l"
              style={{ width: 48, padding: 0, justifyContent: 'center', flexShrink: 0 }}
              onClick={() => { setError(''); step > 1 ? setStep(s => s - 1) : setMode(null); }}
              disabled={submitting}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button" className="dk-btn dk-btn-dark"
              style={{ flex: 1, justifyContent: 'center', background: isLast ? '#16a34a' : '#263248', opacity: submitting ? 0.65 : 1 }}
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> {tQ('savingBtn')}</>
                : isLast
                  ? <><Check size={16} /> {tQ('saveExpenseBtn')}</>
                  : <>{tQ('nextBtn')} <ChevronRight size={16} /></>
              }
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
