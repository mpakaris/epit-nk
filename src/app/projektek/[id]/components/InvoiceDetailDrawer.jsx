'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, Check, Trash2, Download, User, Calendar, Loader2, Paperclip, FileText } from 'lucide-react';
import { processMediaFile } from '@/lib/mediaGate';
import Modal from '@/components/Modal';
import Lightbox from '@/components/Lightbox';
import ErrorBanner from '@/components/ErrorBanner';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';

export default function InvoiceDetailDrawer({ invoice, isAdmin, rooms, splits = [], onClose, onDelete, onSave, onSaveSplits, onUploadImage, invoiceMedia = [], onMediaAdded, onMediaDeleted }) {
  const [editValue,    setEditValue]    = useState(invoice.value_huf?.toString() ?? '');
  const [editCategory, setEditCategory] = useState(invoice.category ?? '');
  const [editDesc,     setEditDesc]     = useState(invoice.description ?? '');
  const [lineItems,    setLineItems]    = useState(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
  const [editSplits,   setEditSplits]   = useState(splits.map(s => ({ ...s })));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error,        setError]        = useState('');
  const [saveStatus,   setSaveStatus]   = useState('idle');
  const [mediaItems,    setMediaItems]    = useState(() => {
    if (invoiceMedia.length > 0) return invoiceMedia;
    if (invoice.image_url) return [{ id: 'legacy', image_url: invoice.image_url }];
    return [];
  });
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploading,     setUploading]     = useState(false);
  const imageInputRef = useRef(null);

  const savedFieldsRef = useRef(null);
  const savedSplitsRef = useRef(null);
  const fieldsTimer    = useRef(null);
  const splitsTimer    = useRef(null);
  const savedTimer     = useRef(null);

  const snapFields = (v, c, d, li) => JSON.stringify({ v, c, d, li });
  const snapSplits = (s)           => JSON.stringify(s);

  useEffect(() => {
    setEditValue(invoice.value_huf?.toString() ?? '');
    setEditCategory(invoice.category ?? '');
    setEditDesc(invoice.description ?? '');
    setLineItems(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    setEditSplits(splits.map(s => ({ ...s })));
    setError(''); setSaveStatus('idle');
    savedFieldsRef.current = snapFields(invoice.value_huf?.toString() ?? '', invoice.category ?? '', invoice.description ?? '', Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    savedSplitsRef.current = snapSplits(splits.map(s => ({ ...s })));
  }, [invoice.id]);

  // Auto-save fields
  useEffect(() => {
    if (!isAdmin || savedFieldsRef.current === null) return;
    const current = snapFields(editValue, editCategory, editDesc, lineItems);
    if (current === savedFieldsRef.current) return;
    clearTimeout(fieldsTimer.current);
    clearTimeout(savedTimer.current);
    setSaveStatus('pending');
    fieldsTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(invoice.id, {
          value_huf:     Math.round(Number(editValue)),
          category:      editCategory,
          description:   editDesc,
          ai_line_items: lineItems.length > 0 ? lineItems : null,
          ai_total:      lineItems.length > 0 ? Math.round(lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0)) : null,
        });
        savedFieldsRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || 'Hiba a mentésnél');
        setSaveStatus('idle');
      }
    }, 700);
    return () => clearTimeout(fieldsTimer.current);
  }, [editValue, editCategory, editDesc, lineItems]);

  // Auto-save splits
  useEffect(() => {
    if (!isAdmin || !onSaveSplits || savedSplitsRef.current === null) return;
    const current = snapSplits(editSplits);
    if (current === savedSplitsRef.current) return;
    clearTimeout(splitsTimer.current);
    splitsTimer.current = setTimeout(async () => {
      try {
        await onSaveSplits(invoice.id, editSplits);
        savedSplitsRef.current = current;
      } catch { /* parent handles */ }
    }, 700);
    return () => clearTimeout(splitsTimer.current);
  }, [editSplits]);

  const addSplit    = () => setEditSplits(prev => [...prev, { room_id: '', amount_huf: Math.max(0, Number(invoice.value_huf) - prev.reduce((s, x) => s + Number(x.amount_huf || 0), 0)), note: '' }]);
  const removeSplit = (idx) => setEditSplits(prev => prev.filter((_, i) => i !== idx));
  const updateSplit = (idx, field, val) => setEditSplits(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const currency   = lineItems.find(i => i.currency)?.currency || 'HUF';
  const grandTotal = lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const updateItem = (idx, field, val) => setLineItems(prev => prev.map((item, i) => {
    if (i !== idx) return item;
    const updated = { ...item, [field]: val };
    if (field === 'quantity' || field === 'unitPrice') updated.total = Number(field === 'quantity' ? val : item.quantity) * Number(field === 'unitPrice' ? val : item.unitPrice);
    return updated;
  }));
  const removeItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const addItem    = () => setLineItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, total: 0, currency }]);

  const isPdfItem = (item) =>
    (item.image_url || '').toLowerCase().endsWith('.pdf') ||
    (item.storage_path || '').toLowerCase().endsWith('.pdf');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      // PDFs pass through uncompressed; images get compressed
      const processed = file.type === 'application/pdf' ? file : await processMediaFile(file);
      const { imageUrl, storagePath } = await onUploadImage(processed);
      const res = await fetch(`/api/invoices/${invoice.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, storage_path: storagePath, sort_order: mediaItems.length }),
      });
      if (!res.ok) throw new Error('Hiba a mentésnél');
      const { media } = await res.json();
      setMediaItems(prev => [...prev, media]);
      onMediaAdded?.(media);
    } catch (err) {
      setError(err.message || 'Hiba a feltöltéskor');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (item) => {
    if (item.id === 'legacy') return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/media/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Hiba a törléskor');
      setMediaItems(prev => prev.filter(m => m.id !== item.id));
      onMediaDeleted?.(item.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const splitsTotal     = editSplits.reduce((sum, s) => sum + Number(s.amount_huf || 0), 0);
  const splitsRemaining = Number(invoice.value_huf) - splitsTotal;

  const SaveIndicator = () => {
    if (!isAdmin || saveStatus === 'idle') return null;
    if (saveStatus === 'pending' || saveStatus === 'saving') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
        <Loader2 size={12} className="animate-spin" /> Mentés...
      </span>
    );
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><Check size={12} /> Mentve</span>;
  };

  const inputStyle    = { fontSize: '0.82rem', padding: '0.28rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', width: '100%', color: 'var(--text-primary)' };
  const numInputStyle = { ...inputStyle, fontFamily: 'var(--font-mono)', textAlign: 'right' };

  const title = isAdmin ? 'Számla szerkesztése' : 'Számla részletei';

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={title}>
        <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
        <div>
          <div className="form-group">
            <label className="form-label">Kategória</label>
            <select className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)} disabled={!isAdmin}>
              {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Összeg</label>
            <div style={{ position: 'relative' }}>
              <input type="number" min="1" className="form-control text-mono" value={editValue} onChange={e => setEditValue(e.target.value)} disabled={!isAdmin} style={{ fontWeight: 800, fontSize: '1.1rem', paddingRight: '2.5rem' }} />
              <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>Ft</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Leírás</label>
            <input type="text" className="form-control" value={editDesc} onChange={e => setEditDesc(e.target.value)} disabled={!isAdmin} placeholder="Opcionális megjegyzés" />
          </div>

          {/* Szekció felosztás */}
          {rooms.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Szekciók</label>
                {isAdmin && (
                  <button type="button" onClick={addSplit} aria-label="Szekció hozzáadása"
                    style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={14} color="#fff" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {editSplits.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  {isAdmin ? 'Adj hozzá szekciót az összeg felosztásához.' : 'Nincs szekció felosztás.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {editSplits.map((split, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {isAdmin ? (
                        <>
                          <select value={split.room_id} onChange={e => updateSplit(idx, 'room_id', e.target.value)} style={{ flex: 1, ...inputStyle, minWidth: 0 }}>
                            <option value="">Szekció…</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <div style={{ position: 'relative', flexShrink: 0, width: '90px' }}>
                            <input type="number" min="1" value={split.amount_huf} onChange={e => updateSplit(idx, 'amount_huf', e.target.value)} style={{ ...numInputStyle, paddingRight: '1.8rem' }} />
                            <span style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, pointerEvents: 'none' }}>Ft</span>
                          </div>
                          <button type="button" onClick={() => removeSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}><X size={13} /></button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem', padding: '0.1rem 0' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rooms.find(r => r.id === split.room_id)?.name || '?'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(split.amount_huf).toLocaleString('hu-HU')} Ft</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && editSplits.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', background: splitsRemaining < 0 ? 'var(--danger-bg)' : splitsRemaining === 0 ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${splitsRemaining < 0 ? 'var(--danger-border)' : splitsRemaining === 0 ? 'var(--success-border)' : 'var(--border-subtle)'}` }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: splitsRemaining < 0 ? 'var(--danger-text)' : splitsRemaining === 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
                    {splitsRemaining === 0 ? '✓ Teljes összeg felosztva' : splitsRemaining > 0 ? `Maradék: ${splitsRemaining.toLocaleString('hu-HU')} Ft` : `Túllépés: ${Math.abs(splitsRemaining).toLocaleString('hu-HU')} Ft`}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{splitsTotal.toLocaleString('hu-HU')} / {Number(invoice.value_huf).toLocaleString('hu-HU')} Ft</span>
                </div>
              )}
            </div>
          )}

          {/* AI Tételek */}
          {Array.isArray(invoice.ai_line_items) && (
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <Sparkles size={14} color="var(--accent)" />
                <label className="form-label" style={{ margin: 0, flex: 1 }}>Tételek{currency !== 'HUF' && <span style={{ marginLeft: '0.35rem', fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.35rem' }}>{currency}</span>}</label>
                {isAdmin && (
                  <button type="button" onClick={addItem} aria-label="Tétel hozzáadása"
                    style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={14} color="#fff" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {lineItems.length === 0 && !isAdmin && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Az AI nem talált tételeket.</p>}
              {lineItems.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: `1fr 50px 74px 74px${isAdmin ? ' 24px' : ''}`, gap: '0.28rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                    {['Megnevezés', 'Db', 'Egységár', 'Összeg', ...(isAdmin ? [''] : [])].map((h, i) => (
                      <span key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  {lineItems.map((item, idx) => (
                    isAdmin ? (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 74px 74px 24px', gap: '0.28rem', alignItems: 'center', marginBottom: '0.28rem' }}>
                        <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Megnevezés" style={inputStyle} />
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} step="0.01" min="0" style={numInputStyle} />
                        <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} step="any" min="0" style={numInputStyle} />
                        <input type="number" value={item.total} onChange={e => { const v = Number(e.target.value); setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, total: v } : it)); }} step="any" min="0" style={numInputStyle} />
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '0.12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 74px 74px', gap: '0.28rem', alignItems: 'center', marginBottom: '0.28rem', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name || '–'}</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{item.quantity}</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{Number(item.unitPrice).toLocaleString('hu-HU')}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{Number(item.total).toLocaleString('hu-HU')}</span>
                      </div>
                    )
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.45rem', borderTop: '2px solid var(--border-subtle)', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Végösszeg{currency !== 'HUF' ? ` (${currency})` : ''}:</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{grandTotal.toLocaleString('hu-HU', { maximumFractionDigits: 2 })} {currency}</span>
                  </div>
                </>
              )}

            </div>
          )}

          {/* Metadata */}
          <div style={{ marginTop: '1rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={12} color="var(--accent)" /><strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} />{formatDate(invoice.created_at)}</span>
          </div>

          {/* Bizonylat media */}
          <input ref={imageInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleImageUpload} />
          <div style={{ marginTop: '0.85rem' }}>
            {mediaItems.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {mediaItems.map((item, idx) => {
                  const isPdf = isPdfItem(item);
                  return isPdf ? (
                    /* PDF tile — download on click, no lightbox */
                    <a key={item.id} href={item.image_url} download target="_blank" rel="noopener noreferrer"
                      title="PDF letöltése"
                      style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', cursor: 'pointer' }}>
                      <FileText size={28} color="var(--accent)" strokeWidth={1.5} />
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>PDF</span>
                      {isAdmin && item.id !== 'legacy' && (
                        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteMedia(item); }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,23,42,0.72)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} color="#fff" />
                        </button>
                      )}
                    </a>
                  ) : (
                    /* Image tile — zoom into lightbox */
                    <div key={item.id} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'zoom-in' }}
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}>
                      <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isAdmin && item.id !== 'legacy' && (
                        <button type="button" onClick={e => { e.stopPropagation(); handleDeleteMedia(item); }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,23,42,0.72)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} color="#fff" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {isAdmin && onUploadImage && (
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem', border: '1.5px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                {uploading ? <><Loader2 size={14} className="animate-spin" />Feltöltés...</> : <><Paperclip size={14} />Bizonylat hozzáadása</>}
              </button>
            )}
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ marginRight: 'auto' }}><SaveIndicator /></span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {mediaItems.length > 0 && mediaItems[0].id !== 'legacy' && (
                <a href={mediaItems[0].image_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  <Download size={13} /> Letöltés
                </a>
              )}
              {isAdmin && onDelete && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(invoice.id); }}>
                  <Trash2 size={13} /> Törlés
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {lightboxOpen && mediaItems.length > 0 && (() => {
        const imageOnlyItems = mediaItems.filter(m => !isPdfItem(m));
        if (!imageOnlyItems.length) return null;
        return (
          <Lightbox
            media={imageOnlyItems.map(m => ({ url: m.image_url, alt: invoice.description || 'Bizonylat' }))}
            startIndex={Math.min(lightboxIndex, imageOnlyItems.length - 1)}
            onClose={() => setLightboxOpen(false)}
          />
        );
      })()}
    </>
  );
}
