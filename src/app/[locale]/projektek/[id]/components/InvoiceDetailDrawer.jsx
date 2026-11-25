'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, Check, Trash2, Loader2, Paperclip, FileText, User, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { processMediaFile } from '@/lib/mediaGate';
import Modal from '@/components/Modal';
import Lightbox from '@/components/Lightbox';
import { formatDate, INVOICE_CATEGORIES } from '@/lib/constants';

const LABEL = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  textTransform: 'uppercase', color: '#5A5F68', marginBottom: 6,
};

const CAT_LABEL_KEYS = {
  material:  'catMaterial',
  labour:    'catLabour',
  equipment: 'catTools',
  delivery:  'catDelivery',
  parking:   'catParking',
  other:     'catOther',
};

export default function InvoiceDetailDrawer({ invoice, isAdmin, rooms, splits = [], onClose, onDelete, onSave, onSaveSplits, onUploadImage, invoiceMedia = [], onMediaAdded, onMediaDeleted }) {
  const t  = useTranslations('projectDetail');
  const tP = useTranslations('projects');

  const [editValue,    setEditValue]    = useState(invoice.value_huf?.toString() ?? '');
  const [editCategory, setEditCategory] = useState(invoice.category ?? '');
  const [editDesc,     setEditDesc]     = useState(invoice.description ?? '');
  const [editRoomId,   setEditRoomId]   = useState(invoice.room_id ?? '');
  const [lineItems,    setLineItems]    = useState(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
  const [editSplits,   setEditSplits]   = useState(splits.map(s => ({ ...s })));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error,        setError]        = useState('');
  const [saveStatus,   setSaveStatus]   = useState('idle');
  const [mediaItems,   setMediaItems]   = useState(() => {
    if (invoiceMedia.length > 0) return invoiceMedia;
    if (invoice.image_url) return [{ id: 'legacy', image_url: invoice.image_url }];
    return [];
  });
  const hadMediaInitially = useRef(invoiceMedia.length > 0 || !!invoice.image_url);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [uploading,     setUploading]     = useState(false);
  const imageInputRef = useRef(null);

  const savedFieldsRef = useRef(null);
  const savedSplitsRef = useRef(null);
  const fieldsTimer    = useRef(null);
  const splitsTimer    = useRef(null);
  const savedTimer     = useRef(null);

  const snapFields = (v, c, d, r, li) => JSON.stringify({ v, c, d, r, li });
  const snapSplits = (s)           => JSON.stringify(s);

  useEffect(() => {
    setEditValue(invoice.value_huf?.toString() ?? '');
    setEditCategory(invoice.category ?? '');
    setEditDesc(invoice.description ?? '');
    setEditRoomId(invoice.room_id ?? '');
    setLineItems(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    setEditSplits(splits.map(s => ({ ...s })));
    setError(''); setSaveStatus('idle');
    savedFieldsRef.current = snapFields(invoice.value_huf?.toString() ?? '', invoice.category ?? '', invoice.description ?? '', invoice.room_id ?? '', Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    savedSplitsRef.current = snapSplits(splits.map(s => ({ ...s })));
  }, [invoice.id]);

  useEffect(() => {
    if (!isAdmin || savedFieldsRef.current === null) return;
    const current = snapFields(editValue, editCategory, editDesc, editRoomId, lineItems);
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
          room_id:       editRoomId || null,
          ai_line_items: lineItems.length > 0 ? lineItems : null,
          ai_total:      lineItems.length > 0 ? Math.round(lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0)) : null,
        });
        savedFieldsRef.current = current;
        setSaveStatus('saved');
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setError(err.message || t('saveError'));
        setSaveStatus('idle');
      }
    }, 700);
    return () => clearTimeout(fieldsTimer.current);
  }, [editValue, editCategory, editDesc, editRoomId, lineItems]);

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
      const processed = file.type === 'application/pdf' ? file : await processMediaFile(file);
      const { imageUrl, storagePath } = await onUploadImage(processed);
      const res = await fetch(`/api/invoices/${invoice.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, storage_path: storagePath, sort_order: mediaItems.length }),
      });
      if (!res.ok) throw new Error(t('saveError'));
      const { media } = await res.json();
      setMediaItems(prev => [...prev, media]);
      onMediaAdded?.(media);
    } catch (err) {
      setError(err.message || t('uploadError'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = async (item) => {
    if (item.id === 'legacy') return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/media/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('deleteError'));
      setMediaItems(prev => prev.filter(m => m.id !== item.id));
      onMediaDeleted?.(item.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const splitsTotal     = editSplits.reduce((sum, s) => sum + Number(s.amount_huf || 0), 0);
  const splitsRemaining = Number(invoice.value_huf) - splitsTotal;

  const title = isAdmin ? t('invoiceEditTitle') : t('invoiceViewTitle');

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={title}>
        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Category chips */}
          <div>
            <label style={LABEL}>{t('categoryLabel')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {INVOICE_CATEGORIES.map(c => {
                const active = editCategory === c.id;
                const label  = CAT_LABEL_KEYS[c.id] ? tP(CAT_LABEL_KEYS[c.id]) : c.label;
                return (
                  <button key={c.id} type="button" onClick={() => isAdmin && setEditCategory(c.id)}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 16, border: 0,
                      cursor: isAdmin ? 'pointer' : 'default',
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                      background: active ? '#263248' : '#F0F0F2',
                      color: active ? '#fff' : '#5A5F68',
                      opacity: !isAdmin && !active ? 0.5 : 1,
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label style={LABEL}>{t('amountLabel')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="1"
                className="dk-input"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                disabled={!isAdmin}
                style={{ fontWeight: 800, fontSize: 22, height: 60, paddingRight: 48, letterSpacing: '-0.02em' }}
              />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#5A5F68', fontSize: 15, pointerEvents: 'none' }}>Ft</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={LABEL}>{t('descriptionLabel')}</label>
            <input
              type="text"
              className="dk-input"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              disabled={!isAdmin}
              placeholder={t('invoiceDescPh')}
            />
          </div>

          {/* Section assignment — always visible */}
          <div>
            <label style={LABEL}>{t('thSection')}</label>
            <select
              className="dk-input"
              value={editRoomId}
              onChange={e => setEditRoomId(e.target.value)}
              disabled={!isAdmin}
            >
              <option value="">{t('general')}</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Section splits */}
          {rooms.length > 0 && (
            <div style={{ background: '#F4F5F8', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={LABEL}>{t('sectionLabel')}</span>
                {isAdmin && (
                  <button type="button" onClick={addSplit}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: '#263248', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={14} color="#fff" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {editSplits.length === 0 ? (
                <span style={{ fontSize: 13, color: '#5A5F68', fontStyle: 'italic' }}>
                  {isAdmin ? t('addSectionHint') : t('noSectionSplit')}
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {editSplits.map((split, idx) => (
                    isAdmin ? (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          value={split.room_id}
                          onChange={e => updateSplit(idx, 'room_id', e.target.value)}
                          className="dk-input"
                          style={{ flex: 1, height: 40, fontSize: 13 }}
                        >
                          <option value="">{t('sectionPlaceholder')}</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <div style={{ position: 'relative', width: 100, flexShrink: 0 }}>
                          <input
                            type="number" min="1"
                            value={split.amount_huf}
                            onChange={e => updateSplit(idx, 'amount_huf', e.target.value)}
                            className="dk-input"
                            style={{ height: 40, fontSize: 13, fontWeight: 700, paddingRight: 28 }}
                          />
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#5A5F68', fontWeight: 700, pointerEvents: 'none' }}>Ft</span>
                        </div>
                        <button type="button" onClick={() => removeSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', display: 'flex', flexShrink: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                        <span style={{ fontWeight: 600, color: '#0E1116' }}>{rooms.find(r => r.id === split.room_id)?.name || '?'}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{Number(split.amount_huf).toLocaleString('hu-HU')} Ft</span>
                      </div>
                    )
                  ))}
                  {isAdmin && editSplits.length > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 10,
                      background: splitsRemaining < 0 ? '#FEF2F2' : splitsRemaining === 0 ? '#F0FDF4' : '#fff',
                      border: `1px solid ${splitsRemaining < 0 ? '#FECACA' : splitsRemaining === 0 ? '#BBF7D0' : '#EDEBE5'}`,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: splitsRemaining < 0 ? '#B91C1C' : splitsRemaining === 0 ? '#15803D' : '#5A5F68' }}>
                        {splitsRemaining === 0 ? t('splitFullyAllocated') : splitsRemaining > 0 ? t('splitRemaining', { amount: splitsRemaining.toLocaleString('hu-HU') }) : t('splitOver', { amount: Math.abs(splitsRemaining).toLocaleString('hu-HU') })}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#5A5F68' }}>{splitsTotal.toLocaleString('hu-HU')} / {Number(invoice.value_huf).toLocaleString('hu-HU')} Ft</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI line items */}
          {Array.isArray(invoice.ai_line_items) && (
            <div style={{ background: '#F4F5F8', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="#263248" />
                <span style={LABEL}>{t('aiItemsLabel')}{currency !== 'HUF' && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: '#263248', color: '#fff', borderRadius: 6, padding: '1px 6px' }}>{currency}</span>}</span>
                {isAdmin && (
                  <button type="button" onClick={addItem}
                    style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: '50%', background: '#263248', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={13} color="#fff" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              {lineItems.length === 0 && !isAdmin && <span style={{ fontSize: 13, color: '#5A5F68' }}>{t('aiNoItems')}</span>}
              {lineItems.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: `1fr 50px 70px 70px${isAdmin ? ' 24px' : ''}`, gap: 4 }}>
                    {[t('colName'), t('colQty'), t('colUnitPrice'), t('colTotal'), ...(isAdmin ? [''] : [])].map((h, i) => (
                      <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#5A5F68', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                    ))}
                  </div>
                  {lineItems.map((item, idx) => (
                    isAdmin ? (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 70px 24px', gap: 4, alignItems: 'center' }}>
                        <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder={t('colName')} className="dk-input" style={{ height: 36, fontSize: 12 }} />
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} step="0.01" min="0" className="dk-input" style={{ height: 36, fontSize: 12, textAlign: 'right' }} />
                        <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} step="any" min="0" className="dk-input" style={{ height: 36, fontSize: 12, textAlign: 'right' }} />
                        <input type="number" value={item.total} onChange={e => { const v = Number(e.target.value); setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, total: v } : it)); }} step="any" min="0" className="dk-input" style={{ height: 36, fontSize: 12, textAlign: 'right', fontWeight: 700 }} />
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 70px', gap: 4, alignItems: 'center', fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: '#0E1116' }}>{item.name || '–'}</span>
                        <span style={{ textAlign: 'right', color: '#5A5F68', fontFamily: 'var(--font-mono)' }}>{item.quantity}</span>
                        <span style={{ textAlign: 'right', color: '#5A5F68', fontFamily: 'var(--font-mono)' }}>{Number(item.unitPrice).toLocaleString('hu-HU')}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: '#0E1116', fontFamily: 'var(--font-mono)' }}>{Number(item.total).toLocaleString('hu-HU')}</span>
                      </div>
                    )
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #EDEBE5' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5A5F68' }}>{t('grandTotal')}{currency !== 'HUF' ? ` (${currency})` : ''}:</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#263248', fontFamily: 'var(--font-mono)' }}>{grandTotal.toLocaleString('hu-HU', { maximumFractionDigits: 2 })} {currency}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Receipt media — max 1 file */}
          <input ref={imageInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleImageUpload} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Conversion warnings */}
            {isAdmin && !mediaItems.length && hadMediaInitially.current && editValue && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#9A3412' }}>
                {t('convertToManualWarning')}
              </div>
            )}
            {isAdmin && mediaItems.length > 0 && !hadMediaInitially.current && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#15803D' }}>
                {t('convertToInvoicedInfo')}
              </div>
            )}

            {/* Thumbnail */}
            {mediaItems.length > 0 && mediaItems.map((item, idx) => {
              const isPdf = isPdfItem(item);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: '#F4F5F8', border: '1px solid #EDEBE5' }}>
                  {isPdf ? (
                    <a href={item.image_url} download target="_blank" rel="noopener noreferrer"
                      style={{ width: 56, height: 56, borderRadius: 10, background: '#fff', border: '1px solid #EDEBE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textDecoration: 'none', flexShrink: 0 }}>
                      <FileText size={22} color="#263248" strokeWidth={1.5} />
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#263248', letterSpacing: '0.05em' }}>PDF</span>
                    </a>
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0 }}
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}>
                      <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                    {isPdf ? 'PDF' : t('receiptAlt')}
                  </span>
                  {isAdmin && (
                    <button type="button"
                      onClick={() => item.id === 'legacy'
                        ? setMediaItems([])
                        : handleDeleteMedia(item)
                      }
                      style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px', borderRadius: 10, border: 0, background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                      <Trash2 size={14} /> {t('deleteLabel')}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add receipt button — only when no receipt attached */}
            {isAdmin && onUploadImage && mediaItems.length === 0 && (
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
                className="dk-btn dk-btn-l" style={{ justifyContent: 'center' }}>
                {uploading ? <><Loader2 size={15} className="animate-spin" />{t('uploadingBtn')}</> : <><Paperclip size={15} />{t('addReceiptBtn')}</>}
              </button>
            )}
          </div>

          {/* Metadata */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, color: '#5A5F68', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} />{invoice.uploader_name || t('unknownAuthor')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{formatDate(invoice.created_at)}</span>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: saveStatus === 'saved' ? '#16a34a' : '#5A5F68', display: 'flex', alignItems: 'center', gap: 5, minHeight: 20 }}>
              {isAdmin && (saveStatus === 'pending' || saveStatus === 'saving')
                ? <><Loader2 size={12} className="animate-spin" /> {t('savingText')}</>
                : isAdmin && saveStatus === 'saved'
                  ? <><Check size={12} /> {t('savedText')}</>
                  : null
              }
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && onDelete && (
                <button type="button" className="dk-btn" style={{ background: '#DC2626', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { onClose(); onDelete(invoice.id); }}>
                  <Trash2 size={15} /> {t('deleteLabel')}
                </button>
              )}
              <button type="button" className="dk-btn dk-btn-dark" onClick={onClose}>
                {isAdmin ? t('saveAndCloseBtn') : t('closeBtn')}
              </button>
            </div>
          </div>

        </div>
      </Modal>

      {lightboxOpen && mediaItems.length > 0 && (() => {
        const imageOnlyItems = mediaItems.filter(m => !isPdfItem(m));
        if (!imageOnlyItems.length) return null;
        return (
          <Lightbox
            media={imageOnlyItems.map(m => ({ url: m.image_url, alt: invoice.description || t('receiptAlt') }))}
            startIndex={Math.min(lightboxIndex, imageOnlyItems.length - 1)}
            onClose={() => setLightboxOpen(false)}
          />
        );
      })()}
    </>
  );
}
