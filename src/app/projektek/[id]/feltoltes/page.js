'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { INVOICE_CATEGORIES, formatHUF } from '@/lib/constants';
import { processMediaFile } from '@/lib/mediaGate';
import {
  ArrowLeft, Camera, Image as ImageIcon, AlertCircle,
  Check, Loader2, X, FileText, Package, Wrench, Truck, FileCheck,
  MoreHorizontal, HardHat, PenLine,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Anyag':            Package,
  'Munka':            HardHat,
  'Szerszám/Eszköz':  Wrench,
  'Szállítás':        Truck,
  'Engedély/Hatóság': FileCheck,
  'Egyéb':            MoreHorizontal,
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror   = reject;
    reader.readAsDataURL(file);
  });
}

// ── Invoice item card ────────────────────────────────────────────────────────

function InvoiceItemCard({ item, rooms, onUpdate, onRemove }) {
  const [showItems, setShowItems] = useState(false);
  const hasItems = item.aiLineItems?.length > 0;

  const updateLineItem = (idx, field, val) => {
    const next = item.aiLineItems.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: field === 'name' ? val : (Number(val) || 0) };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Math.round((parseFloat(field === 'quantity' ? val : li.quantity) || 0) * (parseFloat(field === 'unitPrice' ? val : li.unitPrice) || 0));
      }
      return updated;
    });
    const newTotal = Math.round(next.reduce((s, li) => s + (Number(li.total) || 0), 0));
    onUpdate({ aiLineItems: next, aiTotal: newTotal, valueHuf: String(newTotal) });
  };

  const removeLineItem = (idx) => {
    const next = item.aiLineItems.filter((_, i) => i !== idx);
    const newTotal = Math.round(next.reduce((s, li) => s + (Number(li.total) || 0), 0));
    onUpdate({ aiLineItems: next, aiTotal: newTotal, valueHuf: String(newTotal) });
  };

  return (
    <div className="card" style={{ padding: '0.85rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>

        {/* Thumbnail / PDF icon / blank icon */}
        <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.fileType === 'pdf' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: '0.2rem' }}>
              <FileText size={28} color="var(--accent)" strokeWidth={1.5} />
              <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>PDF</span>
            </div>
          ) : item.previewUrl ? (
            <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PenLine size={24} color="var(--text-muted)" strokeWidth={1.5} />
          )}
          {item.status === 'processing' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={20} className="animate-spin" color="var(--accent)" />
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Amount */}
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            <input
              type="number" inputMode="numeric" min="1"
              className="form-control text-mono"
              placeholder="0"
              value={item.valueHuf}
              onChange={e => onUpdate({ valueHuf: e.target.value })}
              style={{ fontWeight: 800, fontSize: '1.05rem', paddingRight: '2.6rem', height: '42px' }}
            />
            <span style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>Ft</span>
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {INVOICE_CATEGORIES.map(c => {
              const selected = item.category === c.id;
              return (
                <button key={c.id} type="button" onClick={() => onUpdate({ category: c.id })}
                  style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`, background: selected ? 'var(--accent)' : 'transparent', color: selected ? '#fff' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Description */}
          <div style={{ position: 'relative', marginBottom: rooms.length > 0 || hasItems ? '0.4rem' : 0 }}>
            <input type="text" className="form-control"
              placeholder={item.descriptionSuggestion || 'Megjegyzés (pl. Tetőcsavarok)'}
              value={item.description}
              onChange={e => onUpdate({ description: e.target.value })}
              style={{ fontSize: '0.82rem', paddingRight: (item.description || item.descriptionSuggestion) ? '3.2rem' : undefined }}
            />
            {item.description ? (
              <button type="button" onClick={() => onUpdate({ description: '' })}
                style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            ) : item.descriptionSuggestion ? (
              <button type="button" onClick={() => onUpdate({ description: item.descriptionSuggestion })}
                style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.45rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Beír
              </button>
            ) : null}
          </div>

          {/* Room */}
          {rooms.length > 0 && (
            <select className="form-control" value={item.roomId} onChange={e => onUpdate({ roomId: e.target.value })} style={{ fontSize: '0.82rem', marginBottom: hasItems ? '0.4rem' : 0 }}>
              <option value="">– Általános –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          )}

          {/* Line items toggle */}
          {hasItems && (
            <button type="button" onClick={() => setShowItems(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
              {showItems ? '▲' : '▼'} {item.aiLineItems.length} tétel
              {item.aiCurrency !== 'HUF' && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0 0.3rem', fontSize: '0.65rem' }}>{item.aiCurrency}</span>}
            </button>
          )}
          {showItems && hasItems && (
            <div style={{ marginTop: '0.35rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 64px 22px', gap: 3, padding: '4px 6px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Megnevezés', 'Db', 'Összeg', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {item.aiLineItems.map((li, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 64px 22px', gap: 3, padding: '4px 6px', borderBottom: i < item.aiLineItems.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: '#fff', alignItems: 'center' }}>
                    <input type="text" value={li.name || ''} onChange={e => updateLineItem(i, 'name', e.target.value)} placeholder="Megnevezés"
                      style={{ fontSize: '0.72rem', padding: '2px 4px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', minWidth: 0 }} />
                    <input type="number" value={li.quantity ?? 1} onChange={e => updateLineItem(i, 'quantity', e.target.value)} min="0" step="0.01"
                      style={{ fontSize: '0.72rem', padding: '2px 3px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
                    <input type="number" value={li.total ?? 0} onChange={e => updateLineItem(i, 'total', e.target.value)} min="0"
                      style={{ fontSize: '0.72rem', padding: '2px 3px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 700 }} />
                    <button type="button" onClick={() => removeLineItem(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-subtle)', borderTop: '2px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Végösszeg</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {Number(item.aiTotal || 0).toLocaleString('hu-HU')} {item.aiCurrency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Remove */}
        <button type="button" onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MobileUploadPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { createInvoice, uploadInvoiceImage, projectRooms, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';
  const rooms     = (projectRooms || []).filter(r => r.project_id === id);

  const [invoiceItems, setInvoiceItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');

  const cameraInputRef  = useRef(null);
  const galleryInputRef = useRef(null);
  const pdfInputRef     = useRef(null);

  // ── Item helpers ─────────────────────────────────────────────────────────

  const removeItem = (localId) => {
    setInvoiceItems(prev => {
      const item = prev.find(i => i.localId === localId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.localId !== localId);
    });
  };

  const processItem = async (localId, file, fileType) => {
    setInvoiceItems(prev => prev.map(i => i.localId === localId ? { ...i, status: 'processing' } : i));
    try {
      let imageDataUrl = null;
      if (fileType === 'pdf') {
        try {
          const { pdfToImageDataUrls } = await import('@/lib/pdfToImage');
          const dataUrls = await pdfToImageDataUrls(file, 1);
          imageDataUrl = dataUrls[0] || null;
        } catch { /* PDF conversion failed — manual entry */ }
      } else {
        imageDataUrl = await readFileAsDataUrl(file);
      }

      if (!imageDataUrl) {
        setInvoiceItems(prev => prev.map(i => i.localId === localId ? { ...i, status: 'ready' } : i));
        return;
      }

      const [ocrData, aiData] = await Promise.all([
        fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: imageDataUrl }) }).then(r => r.json()).catch(() => null),
        fetch('/api/invoice-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageDataUrl }) }).then(r => r.json()).catch(() => null),
      ]);

      const update = { status: 'ready' };
      if (aiData?.lineItems?.length > 0) {
        const currency = aiData.currency || 'HUF';
        update.aiLineItems = aiData.lineItems;
        update.aiTotal     = aiData.grandTotal || 0;
        update.aiCurrency  = currency;
        if (aiData.grandTotal > 0 && currency === 'HUF') update.valueHuf = Math.round(aiData.grandTotal).toString();
        const names = aiData.lineItems.map(i => i.name).filter(Boolean);
        if (names.length) {
          const joined = names.slice(0, 4).join(', ');
          update.descriptionSuggestion = names.length > 4 ? joined + ', …' : joined;
        }
      }
      if (!update.valueHuf && ocrData?.suggestedValue > 0) {
        update.valueHuf = ocrData.suggestedValue.toString();
        update.ocrValue = ocrData.suggestedValue;
      }
      setInvoiceItems(prev => prev.map(i => i.localId === localId ? { ...i, ...update } : i));
    } catch {
      setInvoiceItems(prev => prev.map(i => i.localId === localId ? { ...i, status: 'error' } : i));
    }
  };

  const newItem = (overrides = {}) => ({
    localId:               `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    file:                  null,
    fileType:              null,
    previewUrl:            null,
    status:                'ready',
    ocrValue:              null,
    aiLineItems:           null,
    aiTotal:               null,
    aiCurrency:            'HUF',
    descriptionSuggestion: '',
    valueHuf:              '',
    category:              'Anyag',
    description:           '',
    roomId:                '',
    ...overrides,
  });

  const handleFilesAdded = async (rawFiles) => {
    if (!rawFiles.length) return;
    const items = rawFiles.map(f => newItem({
      file:      f,
      fileType:  f.type === 'application/pdf' ? 'pdf' : 'image',
      previewUrl: f.type === 'application/pdf' ? null : URL.createObjectURL(f),
      status:    'pending',
    }));
    setInvoiceItems(prev => [...prev, ...items]);
    items.forEach(item => processItem(item.localId, item.file, item.fileType));
  };

  const addBlankItem = () => {
    setInvoiceItems(prev => [...prev, newItem()]);
  };

  const onFileInputChange = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    e.target.value = '';
    await handleFilesAdded(rawFiles);
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!invoiceItems.length) return;
    if (invoiceItems.some(i => i.status === 'processing')) {
      setError('Kérjük várjon, a feltöltés még folyamatban van.'); return;
    }
    if (invoiceItems.find(i => !(Number(i.valueHuf) > 0))) {
      setError('Minden kiadásnál meg kell adni az összeget.'); return;
    }
    setIsSubmitting(true);
    setError('');
    const failed = [];

    for (const item of invoiceItems) {
      try {
        let imageUrl = null, storagePath = null;
        if (item.file) {
          const fileToUpload = item.fileType === 'image' ? await processMediaFile(item.file) : item.file;
          ({ imageUrl, storagePath } = await uploadInvoiceImage(fileToUpload));
        }
        const invoice = await createInvoice({
          projectId:         id,
          valueHuf:          Math.round(Number(item.valueHuf)),
          category:          item.category,
          description:       item.description.trim(),
          imageUrl:          imageUrl  || null,
          storagePath:       storagePath || null,
          roomId:            item.roomId || null,
          aiLineItems:       item.aiLineItems?.length > 0 ? item.aiLineItems.map(li => ({ ...li, currency: item.aiCurrency })) : null,
          aiTotal:           item.aiTotal || null,
          ocrSuggestedValue: item.ocrValue,
        });
        if (imageUrl) {
          await fetch(`/api/invoices/${invoice.id}/media`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl, storage_path: storagePath, sort_order: 0 }),
          });
        }
      } catch {
        failed.push(item.file?.name || 'kézi bejegyzés');
      }
    }

    if (failed.length > 0) {
      setError(`${failed.length} kiadás mentése sikertelen.`);
      setIsSubmitting(false);
    } else {
      router.push(`${navPrefix}/projektek/${id}`);
    }
  };

  const hasAnyItem = invoiceItems.length > 0;
  const allReady   = hasAnyItem && invoiceItems.every(i => i.status !== 'processing' && i.status !== 'pending');

  return (
    <div className="container" style={{ maxWidth: '580px', paddingBottom: '90px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href={`${navPrefix}/projektek/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Vissza
        </Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.45rem' }}>Kiadás rögzítése</h1>
        <p className="page-subtitle">Tölts fel bizonylatot, vagy rögzíts manuálisan</p>
      </div>

      <fieldset disabled={isSubmitting} style={{ border: 'none', padding: 0, margin: 0 }}>

        {/* File inputs */}
        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileInputChange} />
        <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFileInputChange} />
        <input ref={pdfInputRef}     type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={onFileInputChange} />

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} /><span>{error}</span>
          </div>
        )}

        {!hasAnyItem ? (
          /* Empty state */
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              Bizonylat hozzáadása
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="btn btn-accent btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                <Camera size={22} /><span>Fotó készítése kamerával</span>
              </button>
              <button type="button" onClick={() => galleryInputRef.current?.click()}
                className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                <ImageIcon size={20} color="var(--text-secondary)" />
                <span>Fájlok kiválasztása (több is)</span>
              </button>
              <button type="button" onClick={() => pdfInputRef.current?.click()}
                className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                <FileText size={20} color="var(--text-secondary)" />
                <span>PDF számla hozzáadása</span>
              </button>
              <button type="button" onClick={addBlankItem}
                className="btn btn-secondary btn-touch" style={{ width: '100%', gap: '0.6rem' }}>
                <PenLine size={20} color="var(--text-secondary)" />
                <span>Manuális rögzítés (bizonylat nélkül)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Add more — compact row */
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn btn-secondary btn-sm">
              <Camera size={14} /> Fotó
            </button>
            <button type="button" onClick={() => galleryInputRef.current?.click()} className="btn btn-secondary btn-sm">
              <ImageIcon size={14} /> Fájl
            </button>
            <button type="button" onClick={() => pdfInputRef.current?.click()} className="btn btn-secondary btn-sm">
              <FileText size={14} /> PDF
            </button>
            <button type="button" onClick={addBlankItem} className="btn btn-secondary btn-sm">
              <PenLine size={14} /> Manuális
            </button>
          </div>
        )}

        {/* Cost cards */}
        {invoiceItems.map(item => (
          <InvoiceItemCard
            key={item.localId}
            item={item}
            rooms={rooms}
            onUpdate={changes => setInvoiceItems(prev => prev.map(i => i.localId === item.localId ? { ...i, ...changes } : i))}
            onRemove={() => removeItem(item.localId)}
          />
        ))}

        {/* Sticky save bar */}
        {hasAnyItem && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', zIndex: 55, boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ maxWidth: '580px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rögzítendő:</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {invoiceItems.length} db kiadás
                </div>
              </div>
              <button
                type="button" onClick={handleSubmit}
                disabled={!allReady || isSubmitting}
                className="btn btn-primary btn-touch"
                style={{ flex: 2, borderRadius: 'var(--radius-md)' }}
              >
                {isSubmitting
                  ? <><Loader2 size={18} className="animate-spin" /><span>Mentés...</span></>
                  : !allReady
                    ? <><Loader2 size={18} className="animate-spin" /><span>Feldolgozás...</span></>
                    : <><Check size={18} /><span>Kiadások mentése ({invoiceItems.length})</span></>}
              </button>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
