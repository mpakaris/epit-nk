'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { INVOICE_CATEGORIES, formatHUF } from '@/lib/constants';
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
  Receipt
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
  const { projects, createInvoice, uploadInvoiceImage, createLabourEntry } = useApp();

  const project = projects.find(p => p.id === id);

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

  // Labour form state
  const [labourDate, setLabourDate] = useState(new Date().toISOString().slice(0, 10));
  const [labourType, setLabourType] = useState('');
  const [labourHours, setLabourHours] = useState('');
  const [labourRate, setLabourRate] = useState('');
  const [labourDesc, setLabourDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const processFile = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setIsScanningOcr(true);
    setOcrStatusText('Összeg automatikus leolvasása (OCR)...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: reader.result })
          });
          const data = await res.json();
          if (data?.suggestedValue > 0) {
            setOcrSuggestedValue(data.suggestedValue);
            setValueHuf(data.suggestedValue.toString());
            setOcrStatusText(`OCR felismerve: ${formatHUF(data.suggestedValue)}`);
          } else {
            setOcrStatusText(data?.message || 'Adja meg az összeget a számláról!');
          }
        } catch {
          setOcrStatusText('Adja meg az összeget kézzel!');
        } finally {
          setIsScanningOcr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanningOcr(false);
      setOcrStatusText('Adja meg az összeget kézzel!');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setOcrSuggestedValue(null);
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
        storagePath
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
        description: labourDesc.trim()
      });
      router.push(`/projektek/${id}`);
    } catch (err) {
      setError(err.message || 'Hiba történt a munkabejegyzés mentése során.');
      setIsSubmitting(false);
    }
  };

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>A projekt nem található</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">
          <ArrowLeft size={16} /> Vissza a projektekhez
        </Link>
      </div>
    );
  }

  const numericInvoiceValue = parseInt(valueHuf, 10) || 0;

  return (
    <div className="container" style={{ maxWidth: '580px', paddingBottom: '90px' }}>
      {/* Top back link */}
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={`/projektek/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> {project.name}
        </Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.45rem' }}>Bejegyzés hozzáadása</h1>
        <p className="page-subtitle">Válasszon típust, majd töltse ki az adatokat</p>
      </div>

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

            {isScanningOcr && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', fontWeight: 600 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>{ocrStatusText}</span>
              </div>
            )}

            {!isScanningOcr && ocrSuggestedValue && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Sparkles size={16} />
                  <span>OCR felismert összeg: <strong>{formatHUF(ocrSuggestedValue)}</strong></span>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setValueHuf(ocrSuggestedValue.toString())} style={{ background: 'var(--success)', color: '#fff', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                  <Check size={13} /> Beírás
                </button>
              </div>
            )}
          </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="labour-hours">Munkaórák *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="labour-hours"
                    type="number"
                    inputMode="decimal"
                    min="0.5"
                    step="0.5"
                    className="form-control text-mono"
                    placeholder="0"
                    value={labourHours}
                    onChange={(e) => setLabourHours(e.target.value)}
                    style={{ paddingRight: '2.75rem', fontWeight: 700 }}
                    required
                  />
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>h</span>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="labour-rate">Órabér *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="labour-rate"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    className="form-control text-mono"
                    placeholder="0"
                    value={labourRate}
                    onChange={(e) => setLabourRate(e.target.value)}
                    style={{ paddingRight: '2.75rem', fontWeight: 700 }}
                    required
                  />
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Ft/h</span>
                </div>
              </div>
            </div>

            {labourValue > 0 && (
              <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} />
                <span style={{ fontSize: '0.875rem' }}>
                  Munkadíj: <strong style={{ fontFamily: 'var(--font-mono)' }}>{labourHours} h × {formatHUF(parseInt(labourRate, 10) || 0)} = {formatHUF(labourValue)}</strong>
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
              <label className="form-label" htmlFor="labour-desc">Megjegyzés (opcionális)</label>
              <input id="labour-desc" type="text" className="form-control" placeholder="pl. Keleti fal, II. emelet" value={labourDesc} onChange={(e) => setLabourDesc(e.target.value)} />
            </div>
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
    </div>
  );
}
