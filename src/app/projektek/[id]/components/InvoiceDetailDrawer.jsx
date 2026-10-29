'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, Trash2, Edit3, Download, Eye, User, Calendar, Home, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { useScrollLock } from '@/hooks/useScrollLock';
import useMobile from '@/hooks/useMobile';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';

export default function InvoiceDetailDrawer({ invoice, isAdmin, rooms, splits = [], onClose, onDelete, onSave, onSaveSplits }) {
  const catObj = INVOICE_CATEGORIES.find(c => c.id === invoice.category) || { color: 'egyeb' };
  const room = rooms.find(r => r.id === invoice.room_id) || null;
  const hasAiData = Array.isArray(invoice.ai_line_items);
  const isMobile = useMobile();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(invoice.value_huf?.toString() ?? '');
  const [editCategory, setEditCategory] = useState(invoice.category ?? '');
  const [editDesc, setEditDesc] = useState(invoice.description ?? '');
  const [lineItems, setLineItems] = useState(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
  const [showImage, setShowImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSplits, setEditSplits] = useState(splits.map(s => ({ ...s })));

  useEffect(() => { setEditSplits(splits.map(s => ({ ...s }))); }, [invoice.id]);

  // Lock body scroll while drawer is open
  useScrollLock(true);

  const splitsTotal = editSplits.reduce((sum, s) => sum + Number(s.amount_huf || 0), 0);
  const splitsRemaining = Number(invoice.value_huf) - splitsTotal;

  const addSplit    = () => setEditSplits(prev => [...prev, { room_id: '', amount_huf: Math.max(0, Number(invoice.value_huf) - prev.reduce((s, x) => s + Number(x.amount_huf || 0), 0)), note: '' }]);
  const removeSplit = (idx) => setEditSplits(prev => prev.filter((_, i) => i !== idx));
  const updateSplit = (idx, field, value) => setEditSplits(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const currency   = lineItems.find(i => i.currency)?.currency || 'HUF';
  const grandTotal = lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const updateItem = (idx, field, value) => setLineItems(prev => prev.map((item, i) => {
    if (i !== idx) return item;
    const updated = { ...item, [field]: value };
    if (field === 'quantity' || field === 'unitPrice') updated.total = Number(field === 'quantity' ? value : item.quantity) * Number(field === 'unitPrice' ? value : item.unitPrice);
    return updated;
  }));
  const removeItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const addItem    = () => setLineItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, total: 0, currency }]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(invoice.id, { value_huf: Math.round(Number(editValue)), category: editCategory, description: editDesc, ai_line_items: lineItems.length > 0 ? lineItems : null, ai_total: lineItems.length > 0 ? Math.round(grandTotal) : null });
      if (onSaveSplits) await onSaveSplits(invoice.id, editSplits);
    } catch { /* parent handles */ }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditValue(invoice.value_huf?.toString() ?? '');
    setEditCategory(invoice.category ?? '');
    setEditDesc(invoice.description ?? '');
    setLineItems(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    setEditSplits(splits.map(s => ({ ...s })));
    setIsEditing(false);
  };

  const inputStyle    = { fontSize: '0.78rem', padding: '0.26rem 0.38rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', width: '100%', color: 'var(--text-primary)' };
  const numInputStyle = { ...inputStyle, fontFamily: 'var(--font-mono)', textAlign: 'right' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={isMobile ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 201, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      } : {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 'var(--radius-lg)',
        zIndex: 201, maxHeight: '85vh', width: '100%', maxWidth: '620px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.65rem 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-subtle)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem 1.25rem 0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: '0.75rem' }}>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <select className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', flex: '1 1 140px' }}>
                    {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <div style={{ position: 'relative', flex: '1 1 120px' }}>
                    <input type="number" min="1" required className="form-control text-mono" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ fontWeight: 800, fontSize: '1.1rem', paddingRight: '2.5rem' }} />
                    <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ft</span>
                  </div>
                </div>
                <input type="text" className="form-control" placeholder="Leírás (opcionális)" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ fontSize: '0.875rem' }} />
              </>
            ) : (
              <>
                <span className={`category-badge category-${catObj.color}`} style={{ marginBottom: '0.3rem', display: 'inline-block' }}>{invoice.category}</span>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1 }}>{formatHUF(invoice.value_huf)}</div>
                {invoice.description && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{invoice.description}</div>}
              </>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', padding: '0.5rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><User size={12} color="var(--accent)" /><strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} />{formatDate(invoice.created_at)}</span>
          {room
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.7rem' }}><Home size={10} />{room.name}</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}><Home size={10} />Általános</span>
          }
        </div>

        {/* Szekció felosztás */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Szekciók</span>
            {isEditing && rooms.length > 0 && (
              <button type="button" onClick={addSplit} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.5rem', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 700 }}>
                <Plus size={11} /> Szekció
              </button>
            )}
          </div>
          {rooms.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Még nincsenek szekciók ehhez a projekthez.</p>
          ) : (isEditing ? editSplits : splits).length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{isEditing ? 'Adj hozzá szekciót az összeg felosztásához.' : 'Nincs szekció felosztás.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(isEditing ? editSplits : splits).map((split, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {isEditing ? (
                    <>
                      <select value={split.room_id} onChange={e => updateSplit(idx, 'room_id', e.target.value)} style={{ flex: 1, fontSize: '0.78rem', padding: '0.25rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', minWidth: 0 }}>
                        <option value="">Szekció…</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <div style={{ position: 'relative', flexShrink: 0, width: '90px' }}>
                        <input type="number" min="1" value={split.amount_huf} onChange={e => updateSplit(idx, 'amount_huf', e.target.value)} style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 1.8rem 0.25rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
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
          {isEditing && editSplits.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: splitsRemaining < 0 ? 'var(--danger-bg)' : splitsRemaining === 0 ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${splitsRemaining < 0 ? 'var(--danger-border)' : splitsRemaining === 0 ? 'var(--success-border)' : 'var(--border-subtle)'}` }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: splitsRemaining < 0 ? 'var(--danger-text)' : splitsRemaining === 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
                {splitsRemaining === 0 ? '✓ Teljes összeg felosztva' : splitsRemaining > 0 ? `Maradék: ${splitsRemaining.toLocaleString('hu-HU')} Ft` : `Túllépés: ${Math.abs(splitsRemaining).toLocaleString('hu-HU')} Ft`}
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{splitsTotal.toLocaleString('hu-HU')} / {Number(invoice.value_huf).toLocaleString('hu-HU')} Ft</span>
            </div>
          )}
        </div>

        {/* Line items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.85rem 1.25rem', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
            <Sparkles size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Tételek</span>
            {currency !== 'HUF' && <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.35rem' }}>{currency}</span>}
          </div>
          {!hasAiData ? (
            <div style={{ padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Ez a számla a tételes AI elemzés előtt lett feltöltve — nincs tétellista.
            </div>
          ) : (
            <>
              {lineItems.length === 0 && !isEditing && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Az AI nem talált tételeket.</p>}
              {lineItems.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: `1fr 50px 74px 74px${isEditing ? ' 24px' : ''}`, gap: '0.28rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                    {['Megnevezés', 'Db', 'Egységár', 'Összeg', ...(isEditing ? [''] : [])].map((h, i) => (
                      <span key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  {lineItems.map((item, idx) => (
                    isEditing ? (
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
              {isEditing && (
                <button type="button" onClick={addItem} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                  <Plus size={13} /> Tétel hozzáadása
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.25rem', paddingBottom: isMobile ? 'calc(0.85rem + env(safe-area-inset-bottom, 0px))' : '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEditing ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={saving}>Mégse</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(invoice.id); }}><Trash2 size={13} /> Törlés</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Mentés...</> : <><Check size={14} /> Mentés</>}
              </button>
            </>
          ) : (
            <>
              {invoice.image_url && (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowImage(true)}><Eye size={14} /> Bizonylat</button>
                  <a href={invoice.image_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><Download size={14} /> Letöltés</a>
                </>
              )}
              {isAdmin && <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)} style={{ marginLeft: 'auto' }}><Edit3 size={13} /> Szerkesztés</button>}
            </>
          )}
        </div>
      </div>

      {showImage && (
        <Modal isOpen={true} onClose={() => setShowImage(false)} title="Bizonylat megtekintése">
          <div style={{ textAlign: 'center' }}>
            <img src={invoice.image_url} alt={invoice.description || 'Számla bizonylat'} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '1px solid var(--border-subtle)' }} />
            <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem' }} className="text-mono">{formatHUF(invoice.value_huf)}</span>
              <span className={`category-badge category-${catObj.color}`}>{invoice.category}</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
