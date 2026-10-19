'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { INVOICE_CATEGORIES, formatHUF } from '@/lib/constants';
import { processMediaFile } from '@/lib/mediaGate';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  Trash2,
  Package,
  Wrench,
  Truck,
  FileCheck,
  MoreHorizontal,
  Hammer,
  Clock,
  Receipt,
  Plus,
  X,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Anyag': Package,
  'Szerszám/Eszköz': Wrench,
  'Szállítás': Truck,
  'Engedély/Hatóság': FileCheck,
  'Egyéb': MoreHorizontal
};

export default function MobileUploadPage() {
  const { id } = useParams();
  const router = useRouter();
  const { createInvoice, uploadInvoiceImage, createLabourEntry, projectRooms } = useApp();

  const rooms = (projectRooms || []).filter(r => r.project_id === id);

  const [mode, setMode] = useState('invoice');

  // Invoice form state
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [valueHuf, setValueHuf] = useState('');
  const [ocrSuggestedValue, setOcrSuggestedValue] = useState(null);
  const [category, setCategory] = useState('Anyag');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');

  // AI analysis state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiLineItems, setAiLineItems] = useState(null); // null = not yet run, [] = ran but empty
  const [aiTotal, setAiTotal] = useState(null);
  const [aiCurrency, setAiCurrency] = useState('HUF');

  // Labour form state
  const [labourDate, setLabourDate] = useState(new Date().toISOString().slice(0, 10));
  const [labourType, setLabourType] = useState('');
  const [labourHours, setLabourHours] = useState('');
  const [labourUnit, setLabourUnit] = useState('h');
  const [labourRate, setLabourRate] = useState('');
  const [labourDesc, setLabourDesc] = useState('');
  const [invoiceRoomId, setInvoiceRoomId] = useState('');
  const [labourRoomId, setLabourRoomId] = useState('');

  const LABOUR_UNITS = ['h', 'nap', 'm²', 'm³', 'm', 'fm', 'db', 'l', 'kg'];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // --- AI line item helpers ---
  const updateLineItem = (index, field, value) => {
    setAiLineItems(prev => {
      const next = prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Auto-recalculate total when qty or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : Number(item.quantity);
          const price = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
          updated.total = qty * price;
        }
        return updated;
      });
      // Recalculate AI total from rows — round to integer for HUF
      const newTotal = Math.round(next.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
      setAiTotal(newTotal);
      if (newTotal > 0) setValueHuf(newTotal.toString());
      return next;
    });
  };

  const removeLineItem = (index) => {
    setAiLineItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      const newTotal = Math.round(next.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
      setAiTotal(newTotal);
      if (newTotal > 0) setValueHuf(newTotal.toString());
      return next;
    });
  };

  const addLineItem = () => {
    setAiLineItems(prev => [
      ...(prev || []),
      { name: '', quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const processFile = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setAiLineItems(null);
    setAiTotal(null);
    setAiCurrency('HUF');

    // Run OCR and AI analysis in parallel
    setIsScanningOcr(true);
    setIsAnalyzingAi(true);
    setOcrStatusText('Összeg automatikus leolvasása (OCR)...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;

      // OCR (Google Vision) — fast, gets the total amount
      const ocrPromise = fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: dataUrl }),
      })
        .then(r => r.json())
        .catch(() => null);

      // AI analysis (OpenAI) — gets line items
      const aiPromise = fetch('/api/invoice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      })
        .then(r => r.json())
        .catch(() => null);

      const [ocrData, aiData] = await Promise.all([ocrPromise, aiPromise]);

      // Handle OCR result
      if (ocrData?.suggestedValue > 0) {
        setOcrSuggestedValue(ocrData.suggestedValue);
        setOcrStatusText(`OCR felismerve: ${formatHUF(ocrData.suggestedValue)}`);
      } else {
        setOcrStatusText(ocrData?.message || 'Adja meg az összeget a számláról!');
      }
      setIsScanningOcr(false);

      // Handle AI result
      if (aiData?.lineItems) {
        const currency = aiData.currency || 'HUF';
        setAiCurrency(currency);
        setAiLineItems(aiData.lineItems);
        const total = aiData.grandTotal || aiData.lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
        setAiTotal(total);
        // Only auto-fill amount if currency is HUF
        if (total > 0 && currency === 'HUF') setValueHuf(Math.round(total).toString());
      } else {
        setAiLineItems([]);
      }
      setIsAnalyzingAi(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e) => {
    const raw = e.target.files?.[0];
    if (raw) processFile(await processMediaFile(raw));
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setOcrSuggestedValue(null);
    setAiLineItems(null);
    setAiTotal(null);
    setAiCurrency('HUF');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmitInvoice = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const numericValue = parseInt(valueHuf, 10);
    if (!numericValue || numericValue <= 0) {
      setError('Adja meg a számla összegét forintban!');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      let storagePath = null;
      if (selectedFile) {
        ({ imageUrl, storagePath } = await uploadInvoiceImage(selectedFile));
      }

      await createInvoice({
        projectId: id,
        valueHuf: numericValue,
        ocrSuggestedValue,
        category,
        description: invoiceDesc.trim(),
        imageUrl,
        storagePath,
        roomId: invoiceRoomId || null,
        aiLineItems: aiLineItems && aiLineItems.length > 0 ? aiLineItems.map(i => ({ ...i, currency: aiCurrency })) : null,
        aiTotal: aiTotal || null,
      });

      router.push(`/projektek/${id}`);
    } catch (err) {
      setError(err.message || 'Hiba történt a számla mentése során.');
      setIsSubmitting(false);
    }
  };

  const labourValue = Math.round((parseFloat(labourHours) || 0) * (parseInt(labourRate, 10) || 0));

  const handleSubmitLabour = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!labourType.trim()) {
      setError('Adja meg a munkavégzés típusát!');
      return;
    }
    const hours = parseFloat(labourHours);
    if (!hours || hours <= 0) {
      setError('Adja meg az elvégzett munkaórák számát!');
      return;
    }
    const rate = parseInt(labourRate, 10);
    if (!rate || rate <= 0) {
      setError('Adja meg az órabért forintban!');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLabourEntry({
        projectId: id,
        date: labourDate,
        labourType: labourType.trim(),
        hours,
        hourlyRate: rate,
        description: labourDesc.trim(),
        roomId: labourRoomId || null,
        unit: labourUnit,
      });
      router.push(`/projektek/${id}`);
    } catch (err) {
      setError(err.message || 'Hiba történt a munkabejegyzés mentése során.');
      setIsSubmitting(false);
    }
  };

  const numericInvoiceValue = parseInt(valueHuf, 10) || 0;

  return (
    <div className="container" style={{ maxWidth: '580px', paddingBottom: '90px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={`/projektek/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Vissza
        </Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.45rem' }}>Bejegyzés hozzáadása</h1>
        <p className="page-subtitle">Válasszon típust, majd töltse ki az adatokat</p>
      </div>

      <fieldset disabled={isSubmitting} style={{ border: 'none', padding: 0, margin: 0 }}>
      {/* Mode Toggle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          background: 'var(--bg-subtle)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <button
          type="button"
          onClick={() => { setMode('invoice'); setError(''); }}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: mode === 'invoice' ? '#ffffff' : 'transparent',
            boxShadow: mode === 'invoice' ? 'var(--shadow-sm)' : 'none',
            color: mode === 'invoice' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: mode === 'invoice' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.925rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Receipt size={18} color={mode === 'invoice' ? 'var(--accent)' : 'var(--text-muted)'} />
          Számla (költség)
        </button>
        <button
          type="button"
          onClick={() => { setMode('labour'); setError(''); }}
          style={{
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: mode === 'labour' ? '#ffffff' : 'transparent',
            boxShadow: mode === 'labour' ? 'var(--shadow-sm)' : 'none',
            color: mode === 'labour' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: mode === 'labour' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.925rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Hammer size={18} color={mode === 'labour' ? 'var(--success)' : 'var(--text-muted)'} />
          Munka (saját díj)
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)',
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ===== INVOICE FORM ===== */}
      {mode === 'invoice' && (
        <>
          <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" style={{ display: 'none' }} />
          <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

          {/* Photo */}
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              1. Bizonylat Fotó
            </div>

            {previewUrl ? (
              <div>
                <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', maxHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewUrl} alt="Számla fotó" style={{ maxHeight: '240px', width: '100%', objectFit: 'contain' }} />
                  <button type="button" onClick={handleClearImage} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', border: 'none', borderRadius: 'var(--radius-pill)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-sm flex-1" style={{ flex: 1 }}>
                    <Camera size={15} /> Újrafotózás
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()} className="btn btn-secondary btn-sm flex-1" style={{ flex: 1 }}>
                    <ImageIcon size={15} /> Másik kép
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-accent btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                  <Camera size={22} />
                  <span>Fotó készítése kamerával</span>
                </button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                  <ImageIcon size={20} color="var(--text-secondary)" />
                  <span>Kép kiválasztása galériából</span>
                </button>
              </div>
            )}

            {/* OCR status */}
            {isScanningOcr && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', fontWeight: 600 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>{ocrStatusText}</span>
              </div>
            )}

            {!isScanningOcr && ocrSuggestedValue && !aiTotal && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.825rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
                  <Sparkles size={16} style={{ flexShrink: 0 }} />
                  <span>OCR felismert összeg: <strong>{formatHUF(ocrSuggestedValue)}</strong></span>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setValueHuf(ocrSuggestedValue.toString())} style={{ background: 'var(--success)', color: '#fff', padding: '0.25rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}>
                  <Check size={13} /> Beírás
                </button>
              </div>
            )}

            {/* AI scanning indicator */}
            {isAnalyzingAi && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', fontWeight: 600 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>AI elemzés folyamatban...</span>
              </div>
            )}
          </div>

          {/* AI Line Items — shown after analysis */}
          {!isAnalyzingAi && aiLineItems !== null && (
            <div className="card mb-4" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} color="var(--accent)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    AI — Számlatételek
                  </span>
                  {aiCurrency && aiCurrency !== 'HUF' && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.4rem' }}>
                      {aiCurrency}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Szerkeszthető</span>
              </div>

              {aiCurrency && aiCurrency !== 'HUF' && (
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--warning-bg, #fffbeb)', border: '1px solid var(--warning-border, #fcd34d)', color: 'var(--warning-text, #92400e)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  Ez a számla {aiCurrency} pénznemben van — kérjük adja meg a forint összeget kézzel!
                </div>
              )}

              {aiLineItems.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
                  Az AI nem talált tételeket ezen a bizonylaton.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 80px 80px 28px', gap: '0.35rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Megnevezés', 'Db', `Egységár (${aiCurrency})`, `Összeg (${aiCurrency})`, ''].map((h, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</span>
                    ))}
                  </div>

                  {aiLineItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 80px 80px 28px', gap: '0.35rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateLineItem(idx, 'name', e.target.value)}
                        placeholder="Megnevezés"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.4rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit' }}
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.4rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                      />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                        min="0"
                        step="any"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.4rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                      />
                      <input
                        type="number"
                        value={item.total}
                        onChange={e => {
                          const newTotal = Number(e.target.value);
                          setAiLineItems(prev => {
                            const next = prev.map((it, i) => i === idx ? { ...it, total: newTotal } : it);
                            const sum = Math.round(next.reduce((s, it) => s + (Number(it.total) || 0), 0));
                            setAiTotal(sum);
                            if (sum > 0) setValueHuf(sum.toString());
                            return next;
                          });
                        }}
                        min="0"
                        step="any"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.4rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Total row */}
              {aiLineItems.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '2px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AI Végösszeg ({aiCurrency}):</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {formatHUF(Math.round(aiLineItems.reduce((s, i) => s + (Number(i.total) || 0), 0)))}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={addLineItem}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, width: '100%', justifyContent: 'center' }}
              >
                <Plus size={14} /> Tétel hozzáadása
              </button>
            </div>
          )}

          {/* Amount */}
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" htmlFor="invoice-value" style={{ margin: 0 }}>2. Fizetett összeg (HUF) *</label>
              {numericInvoiceValue > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>{formatHUF(numericInvoiceValue)}</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="invoice-value"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                min="1"
                className="form-control text-mono"
                placeholder="0"
                value={valueHuf}
                onChange={(e) => setValueHuf(e.target.value)}
                style={{ fontSize: '1.65rem', fontWeight: 800, paddingRight: '3.5rem', height: '56px', letterSpacing: '-0.02em' }}
              />
              <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Ft</span>
            </div>
          </div>

          {/* Category */}
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              3. Kategória kiválasztása *
            </div>
            <div className="category-chips-grid">
              {INVOICE_CATEGORIES.map(c => {
                const Icon = CATEGORY_ICONS[c.id] || MoreHorizontal;
                const isSelected = category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={`category-chip-btn ${isSelected ? 'active' : ''}`}>
                    <Icon size={20} color={isSelected ? 'var(--accent)' : 'var(--text-secondary)'} />
                    <span className="category-chip-label">{c.label}</span>
                    <span className="category-chip-sub">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <label className="form-label" htmlFor="invoice-desc" style={{ marginBottom: '0.35rem' }}>4. Megjegyzés / Leírás (opcionális)</label>
            <input id="invoice-desc" type="text" className="form-control" placeholder="pl. Tetőcsavarok, gipszkarton" value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} />
          </div>

          {rooms.length > 0 && (
            <div className="card mb-4" style={{ padding: '1rem' }}>
              <label className="form-label" htmlFor="invoice-room" style={{ marginBottom: '0.35rem' }}>5. Helyiség hozzárendelése (opcionális)</label>
              <select id="invoice-room" className="form-control" value={invoiceRoomId} onChange={e => setInvoiceRoomId(e.target.value)}>
                <option value="">– Általános (nincs szobához rendelve) –</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Sticky submit bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', zIndex: 55, boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ maxWidth: '580px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rögzítendő:</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: numericInvoiceValue > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }} className="text-mono">
                  {numericInvoiceValue > 0 ? formatHUF(numericInvoiceValue) : '0 Ft'}
                </div>
              </div>
              <button type="button" onClick={handleSubmitInvoice} disabled={!numericInvoiceValue || isSubmitting} className="btn btn-primary btn-touch" style={{ flex: 2, borderRadius: 'var(--radius-md)' }}>
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /><span>Mentés...</span></> : <><Check size={18} /><span>Számla mentése</span></>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== LABOUR FORM ===== */}
      {mode === 'labour' && (
        <>
          <div className="card mb-4" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Saját munkavégzés adatai
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="labour-date">Dátum *</label>
              <input id="labour-date" type="date" className="form-control" value={labourDate} onChange={(e) => setLabourDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="labour-type">Munkavégzés típusa *</label>
              <input id="labour-type" type="text" className="form-control" placeholder="pl. Gipszkartonozás, Festés, Villanyszerelés" value={labourType} onChange={(e) => setLabourType(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Mértékegység *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {LABOUR_UNITS.map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setLabourUnit(u)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: labourUnit === u ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                      background: labourUnit === u ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: labourUnit === u ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="labour-hours">Mennyiség ({labourUnit}) *</label>
                <input
                  id="labour-hours"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  className="form-control text-mono"
                  placeholder="0"
                  value={labourHours}
                  onChange={(e) => setLabourHours(e.target.value)}
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="labour-rate">Egységár (Ft/{labourUnit}) *</label>
                <input
                  id="labour-rate"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="form-control text-mono"
                  placeholder="0"
                  value={labourRate}
                  onChange={(e) => setLabourRate(e.target.value)}
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {labourValue > 0 && (
              <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span style={{ fontSize: '0.875rem' }}>
                  Munkadíj: <strong style={{ fontFamily: 'var(--font-mono)' }}>{labourHours} {labourUnit} × {formatHUF(parseInt(labourRate, 10) || 0)} = {formatHUF(labourValue)}</strong>
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
              <label className="form-label" htmlFor="labour-desc">Megjegyzés (opcionális)</label>
              <input id="labour-desc" type="text" className="form-control" placeholder="pl. Keleti fal, II. emelet" value={labourDesc} onChange={(e) => setLabourDesc(e.target.value)} />
            </div>

            {rooms.length > 0 && (
              <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                <label className="form-label" htmlFor="labour-room">Helyiség hozzárendelése (opcionális)</label>
                <select id="labour-room" className="form-control" value={labourRoomId} onChange={e => setLabourRoomId(e.target.value)}>
                  <option value="">– Általános (nincs szobához rendelve) –</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Sticky submit bar */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', zIndex: 55, boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)' }}>
            <div style={{ maxWidth: '580px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Munkadíj értéke:</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: labourValue > 0 ? 'var(--success-text)' : 'var(--text-muted)' }} className="text-mono">
                  {labourValue > 0 ? formatHUF(labourValue) : '0 Ft'}
                </div>
              </div>
              <button type="button" onClick={handleSubmitLabour} disabled={!labourValue || isSubmitting} className="btn btn-touch" style={{ flex: 2, borderRadius: 'var(--radius-md)', background: 'var(--success)', color: '#fff', border: 'none' }}>
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /><span>Mentés...</span></> : <><Check size={18} /><span>Munka mentése</span></>}
              </button>
            </div>
          </div>
        </>
      )}
      </fieldset>
    </div>
  );
}
