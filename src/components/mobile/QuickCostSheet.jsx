'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { INVOICE_CATEGORIES, formatHUF } from '@/lib/constants';
import {
  Camera, Image as ImageIcon, X, Check, Loader2, AlertCircle,
  Receipt, Hammer, Play, Sparkles,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Anyag': '📦',
  'Szerszám/Eszköz': '🔧',
  'Szállítás': '🚚',
  'Engedély/Hatóság': '📋',
  'Egyéb': '•',
};

const LABOUR_UNITS = ['h', 'nap', 'm²', 'm', 'db'];
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Mobile bottom sheet for quick invoice or labour entry.
 * Stays on the project page — no navigation needed.
 *
 * Props: { isOpen, onClose, projectId, onSuccess }
 */
export default function QuickCostSheet({ isOpen, onClose, projectId, onSuccess }) {
  const { createInvoice, uploadInvoiceImage, createLabourEntry } = useApp();

  const [mode, setMode] = useState('invoice');

  // Invoice state
  const cameraInputRef  = useRef(null);
  const galleryInputRef = useRef(null);
  const [selectedFile,      setSelectedFile]      = useState(null);
  const [previewUrl,        setPreviewUrl]        = useState('');
  const [valueHuf,          setValueHuf]          = useState('');
  const [ocrSuggestedValue, setOcrSuggestedValue] = useState(null);
  const [ocrStatus,         setOcrStatus]         = useState('');
  const [isScanningOcr,     setIsScanningOcr]     = useState(false);
  const [category,          setCategory]          = useState('Anyag');
  const [invoiceDesc,       setInvoiceDesc]       = useState('');

  // Labour state
  const [labourDate, setLabourDate] = useState(today());
  const [labourType, setLabourType] = useState('');
  const [labourHours, setLabourHours] = useState('');
  const [labourUnit,  setLabourUnit]  = useState('h');
  const [labourRate,  setLabourRate]  = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Reset state when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setPreviewUrl('');
    setValueHuf('');
    setOcrSuggestedValue(null);
    setOcrStatus('');
    setIsScanningOcr(false);
    setCategory('Anyag');
    setInvoiceDesc('');
    setLabourDate(today());
    setLabourType('');
    setLabourHours('');
    setLabourUnit('h');
    setLabourRate('');
    setError('');
    setIsSubmitting(false);
  }, [isOpen]);

  const processFile = async (rawFile) => {
    if (!rawFile) return;
    const file = await processMediaFile(rawFile);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrSuggestedValue(null);
    setOcrStatus('Összeg leolvasása...');
    setIsScanningOcr(true);
    setError('');

    // Run OCR in background
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: reader.result }),
        });
        const data = await res.json();
        if (data?.suggestedValue > 0) {
          setOcrSuggestedValue(data.suggestedValue);
          setValueHuf(data.suggestedValue.toString());
          setOcrStatus(`OCR: ${formatHUF(data.suggestedValue)}`);
        } else {
          setOcrStatus('Adja meg az összeget');
        }
      } catch {
        setOcrStatus('Adja meg az összeget');
      } finally {
        setIsScanningOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e) => {
    const raw = e.target.files?.[0];
    if (raw) processFile(raw);
    e.target.value = '';
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setOcrSuggestedValue(null);
    setOcrStatus('');
    setIsScanningOcr(false);
  };

  const handleSubmitInvoice = async () => {
    setError('');
    const numVal = parseInt(valueHuf, 10);
    if (!numVal || numVal <= 0) { setError('Adja meg a számla összegét!'); return; }
    setIsSubmitting(true);
    try {
      let imageUrl = null, storagePath = null;
      if (selectedFile) {
        ({ imageUrl, storagePath } = await uploadInvoiceImage(selectedFile));
      }
      await createInvoice({
        projectId,
        valueHuf: numVal,
        ocrSuggestedValue,
        category,
        description: invoiceDesc.trim(),
        imageUrl,
        storagePath,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labourValue = Math.round((parseFloat(labourHours) || 0) * (parseInt(labourRate, 10) || 0));

  const handleSubmitLabour = async () => {
    setError('');
    if (!labourType.trim()) { setError('Adja meg a munkavégzés típusát!'); return; }
    const hours = parseFloat(labourHours);
    if (!hours || hours <= 0) { setError('Adja meg az elvégzett munkaórák számát!'); return; }
    const rate = parseInt(labourRate, 10);
    if (!rate || rate <= 0) { setError('Adja meg az órabért!'); return; }
    setIsSubmitting(true);
    try {
      await createLabourEntry({
        projectId,
        date: labourDate,
        labourType: labourType.trim(),
        hours,
        hourlyRate: rate,
        unit: labourUnit,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gyors bejegyzés"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          zIndex: 201,
          maxHeight: '92vh',
          overflow: 'auto',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Gyors bejegyzés</span>
          <button type="button" onClick={onClose} disabled={isSubmitting}
            style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Mode toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => setMode('invoice')}
              style={{ height: 48, borderRadius: 12, border: `2px solid ${mode === 'invoice' ? '#0f172a' : '#e2e8f0'}`, background: mode === 'invoice' ? '#0f172a' : '#fff', color: mode === 'invoice' ? '#fff' : '#475569', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Receipt size={17} /> Számla
            </button>
            <button type="button" onClick={() => setMode('labour')}
              style={{ height: 48, borderRadius: 12, border: `2px solid ${mode === 'labour' ? '#0f172a' : '#e2e8f0'}`, background: mode === 'labour' ? '#0f172a' : '#fff', color: mode === 'labour' ? '#fff' : '#475569', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Hammer size={17} /> Munka
            </button>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', display: 'flex', gap: '0.4rem', marginBottom: 12 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /><span>{error}</span>
            </div>
          )}

          {/* ── INVOICE MODE ── */}
          {mode === 'invoice' && (
            <>
              {/* Hidden file inputs */}
              <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

              {!previewUrl ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <button type="button" onClick={() => cameraInputRef.current?.click()}
                    style={{ height: 56, borderRadius: 12, border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Camera size={20} color="#475569" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Kamera</span>
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()}
                    style={{ height: 56, borderRadius: 12, border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <ImageIcon size={20} color="#475569" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Galéria</span>
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', marginBottom: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 160 }}>
                  <img src={previewUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  <button type="button" onClick={clearImage}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <X size={14} />
                  </button>
                  {isScanningOcr && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Loader2 size={13} color="#fff" className="animate-spin" />
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{ocrStatus}</span>
                    </div>
                  )}
                  {!isScanningOcr && ocrStatus && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 10px', background: 'rgba(22,163,74,0.85)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} color="#fff" />
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{ocrStatus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Összeg (Ft) *</label>
                <input
                  inputMode="numeric"
                  type="number" min="1"
                  className="form-control text-mono"
                  placeholder="pl. 45000"
                  value={valueHuf}
                  onChange={e => setValueHuf(e.target.value)}
                  style={{ fontSize: 18, fontWeight: 700 }}
                />
              </div>

              {/* Category chips */}
              <div className="form-group">
                <label className="form-label">Kategória</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {INVOICE_CATEGORIES.map(c => (
                    <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                      style={{ padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: category === c.id ? '#0f172a' : 'var(--bg-subtle)', color: category === c.id ? '#fff' : 'var(--text-secondary)', border: `1px solid ${category === c.id ? '#0f172a' : 'var(--border-subtle)'}` }}>
                      {CATEGORY_ICONS[c.id] || '•'} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Megjegyzés (opcionális)</label>
                <input type="text" className="form-control" placeholder="pl. Csempe, ragasztó" value={invoiceDesc} onChange={e => setInvoiceDesc(e.target.value)} />
              </div>
            </>
          )}

          {/* ── LABOUR MODE ── */}
          {mode === 'labour' && (
            <>
              <div className="form-group">
                <label className="form-label">Munkavégzés típusa *</label>
                <input type="text" className="form-control" autoFocus placeholder="pl. Burkolás, Festés, Glettelés" value={labourType} onChange={e => setLabourType(e.target.value)} />
              </div>

              {/* Unit chips */}
              <div className="form-group">
                <label className="form-label">Egység</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LABOUR_UNITS.map(u => (
                    <button key={u} type="button" onClick={() => setLabourUnit(u)}
                      style={{ padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: labourUnit === u ? '#0f172a' : 'var(--bg-subtle)', color: labourUnit === u ? '#fff' : 'var(--text-secondary)', border: `1px solid ${labourUnit === u ? '#0f172a' : 'var(--border-subtle)'}` }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mennyiség *</label>
                  <input inputMode="decimal" type="number" min="0" step="0.5" className="form-control text-mono" placeholder="0" value={labourHours} onChange={e => setLabourHours(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Egységdíj (Ft) *</label>
                  <input inputMode="numeric" type="number" min="0" className="form-control text-mono" placeholder="0" value={labourRate} onChange={e => setLabourRate(e.target.value)} />
                </div>
              </div>

              {labourValue > 0 && (
                <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Összesen: <span style={{ fontFamily: 'var(--font-mono)' }}>{formatHUF(labourValue)}</span>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                <label className="form-label">Dátum</label>
                <input type="date" className="form-control" value={labourDate} onChange={e => setLabourDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={mode === 'invoice' ? handleSubmitInvoice : handleSubmitLabour}
            disabled={isSubmitting}
            style={{
              width: '100%', height: 56, borderRadius: 999, marginTop: 20,
              background: '#0f172a', border: 'none', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: isSubmitting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting
              ? <><Loader2 size={18} className="animate-spin" /> Mentés...</>
              : <><Check size={18} /> Mentés</>
            }
          </button>
        </div>
      </div>
    </>
  );
}
