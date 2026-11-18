'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney } from '@/lib/constants';
import AudioRecorder from '@/components/AudioRecorder';

const OFFER_BG   = '#6D3FD1';
const OFFER_DEEP = '#1C1038';
const OFFER_INK  = '#4A2796';

const TYPE_ORDER = ['material', 'labour', 'equipment', 'transport', 'other'];
const TYPE_META  = {
  material:  { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', fg: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' },
};
const UNITS_BY_TYPE = {
  material:  ['m²', 'm', 'fm', 'db', 'kg', 'l', 'zsák', 'csomag', 'm³'],
  labour:    ['m²', 'm', 'fm', 'db', 'nap', 'h'],
  equipment: ['nap', 'db', 'h'],
  transport: ['db', 'km', 'nap'],
  other:     ['db', 'h', 'nap', 'm²'],
};
const DEFAULT_UNIT  = { material: 'm²', labour: 'm²', equipment: 'nap', transport: 'db', other: 'db' };
const UNIT_I18N     = { db: 'itemsUnitDb', nap: 'itemsUnitNap', zsák: 'itemsUnitZsak', csomag: 'itemsUnitCsomag', fm: 'itemsUnitFm', h: 'itemsUnitH' };
const isQtyType     = (type) => type === 'material' || type === 'labour';

// ─── Entry row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, onEdit, t, userCurrency }) {
  const m   = TYPE_META[entry.entry_type] || TYPE_META.other;
  const qty = isQtyType(entry.entry_type);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #ECEAE4' }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: m.fg, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.work_description}
        </div>
        {qty && entry.quantity != null && entry.unit_price != null && (
          <div style={{ fontSize: 12, color: '#5A5F68', marginTop: 2 }}>
            {entry.quantity} {entry.unit} × {formatMoney(entry.unit_price, userCurrency)}
          </div>
        )}
        {entry.notes && <div style={{ fontSize: 12, color: '#5A5F68', fontStyle: 'italic', marginTop: 1 }}>{entry.notes}</div>}
      </div>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: 16, color: '#0E1116', flexShrink: 0 }}>
        {formatMoney(entry.amount_huf || 0, userCurrency)}
      </span>
      <button type="button" onClick={() => onEdit(entry)} aria-label={t('entryModalEdit')}
        style={{ flexShrink: 0, width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>
      </button>
    </div>
  );
}

// ─── Item sheet ─────────────────────────────────────────────────────────────────
function OfferItemSheet({ initial, onSave, onDelete, onClose, t, tS, tc, userCurrency }) {
  const isEdit = !!initial?.id;
  const [type,       setType]       = useState(() => initial?.entry_type || 'material');
  const [desc,       setDesc]       = useState(() => initial?.work_description || '');
  const [qty,        setQty]        = useState(() => initial?.quantity != null ? initial.quantity : 1);
  const [unit,       setUnit]       = useState(() => initial?.unit || DEFAULT_UNIT['material']);
  const [unitPrice,  setUnitPrice]  = useState(() => initial?.unit_price != null ? String(initial.unit_price) : '');
  const [flatAmt,    setFlatAmt]    = useState(() => !isQtyType(initial?.entry_type || 'material') && initial?.amount_huf != null ? String(initial.amount_huf) : '');
  const [notes,      setNotes]      = useState(() => initial?.notes || '');
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const iqt    = isQtyType(type);
  const amount = iqt ? Math.round((qty || 0) * (parseFloat(unitPrice) || 0)) : (parseInt(flatAmt) || 0);

  const handleTypeChange = (tp) => {
    setType(tp);
    if (!isEdit) setUnit(DEFAULT_UNIT[tp]);
  };

  const buildFields = () => ({
    entry_type:       type,
    work_description: desc.trim(),
    quantity:         iqt ? (qty || null) : null,
    unit:             iqt ? (unit || null) : null,
    unit_price:       iqt ? (parseFloat(unitPrice) || null) : null,
    amount_huf:       amount,
    notes:            notes.trim() || null,
  });

  const handleSave = async () => {
    if (!desc.trim() || amount <= 0) return;
    setSaving(true);
    try {
      await onSave(buildFields());
      onClose();
    } catch {}
    setSaving(false);
  };

  const handleSaveAndNext = async () => {
    if (!desc.trim() || amount <= 0) return;
    setSaving(true);
    try {
      await onSave(buildFields());
      setDesc('');
      setQty(1);
      setUnitPrice('');
      setFlatAmt('');
      setNotes('');
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); onClose(); } catch {}
    setDeleting(false);
  };

  const FLD = {
    height: 56, border: 0, borderRadius: 18, background: '#fff', padding: '0 16px',
    fontSize: 17, fontWeight: 500, color: '#0E1116',
    boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.4)',
    width: '100%', boxSizing: 'border-box', outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };
  const units = UNITS_BY_TYPE[type] || UNITS_BY_TYPE.other;
  const TYPE_LABELS = {
    material: tS('itemsTypeAnyag'), labour: tS('itemsTypeMunkadij'),
    equipment: tS('itemsTypeEszkozberles'), transport: tS('itemsTypeSzallitas'), other: tS('itemsTypeEgyeb'),
  };
  const canSave = !saving && desc.trim() && amount > 0;

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
          {isEdit ? t('entryModalEdit') : t('entryModalAdd')}
        </span>
        <button type="button" onClick={onClose} aria-label={tc('close')} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {/* Type grid 3+2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {TYPE_ORDER.map(tp => {
          const m = TYPE_META[tp] || TYPE_META.other;
          const on = type === tp;
          return (
            <button key={tp} type="button" onClick={() => handleTypeChange(tp)}
              style={{ height: 44, border: `1.5px solid ${on ? m.fg : m.border}`, borderRadius: 22, background: on ? m.fg : m.bg, color: on ? '#fff' : m.fg, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {TYPE_LABELS[tp]}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsDescLabel')}</span>
        <input autoFocus={!isEdit} style={FLD} value={desc} onChange={e => setDesc(e.target.value)}
          placeholder={tS(`itemsPlaceholder${type.charAt(0).toUpperCase() + type.slice(1)}`)} />
      </label>

      {iqt ? (
        <>
          {/* Qty stepper + unit chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsQtyLabel')}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <button type="button" onClick={() => setQty(q => q + 1)} aria-label="+1"
                  style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: OFFER_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <input type="text" inputMode="decimal" value={qty || 0}
                  onChange={e => { const v = parseFloat(e.target.value.replace(/,/g, '.')); setQty(isNaN(v) ? 0 : v); }}
                  onFocus={e => e.target.select()}
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, width: 44, textAlign: 'center', border: 0, background: 'transparent', outline: 'none', color: '#0E1116', padding: '10px 0' }} />
                <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))} aria-label="-1"
                  style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F1F1F3', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {units.map(u => (
                  <button key={u} type="button" onClick={() => setUnit(u)}
                    style={{ height: 44, padding: '0 14px', border: `1.5px solid ${unit === u ? OFFER_BG : '#D5D2C8'}`, borderRadius: 22, background: unit === u ? '#EDE7FB' : '#fff', color: unit === u ? OFFER_INK : '#4A4F57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {UNIT_I18N[u] ? tS(UNIT_I18N[u]) : u}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Unit price + Total — 2-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('entryUnitPrice')}</span>
              <div style={{ position: 'relative' }}>
                <input type="number" inputMode="numeric" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0"
                  style={{ ...FLD, paddingRight: 42 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#8A8F97', pointerEvents: 'none' }}>
                  {userCurrency}
                </span>
              </div>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('entryTotal')}</span>
              <div style={{ position: 'relative', height: 56, borderRadius: 18, background: amount > 0 ? '#EDE7FB' : '#F7F5EF', display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 42, boxSizing: 'border-box' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: amount > 0 ? 18 : 15, fontWeight: 700, letterSpacing: '-0.02em', color: amount > 0 ? OFFER_BG : '#B0ADA6', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {amount > 0 ? amount.toLocaleString('hu-HU') : '0'}
                </span>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: amount > 0 ? OFFER_INK : '#B0ADA6', pointerEvents: 'none' }}>
                  {userCurrency}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('entryFlatAmount')}</span>
            <input type="number" inputMode="numeric" min="0" style={FLD} value={flatAmt} onChange={e => setFlatAmt(e.target.value)} placeholder="0" />
          </label>
          {amount > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 16, background: '#EDE7FB', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: OFFER_BG }}>{formatMoney(amount, userCurrency)}</span>
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsNotesLabel')}</span>
        <input style={{ ...FLD, height: 48, fontSize: 15 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder={tS('itemsNotesPlaceholder')} />
      </label>

      <button type="button" onClick={handleSave} disabled={!canSave}
        style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? OFFER_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
        {saving ? tS('itemsSavingBtn') : isEdit ? tS('itemsModifyBtn') : tS('itemsAddNewBtn')}
      </button>
      {!isEdit && (
        <button type="button" onClick={handleSaveAndNext} disabled={!canSave}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#F1F1F3', color: 'var(--m-ink, #0E1116)', fontSize: 16, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5 }}>
          {tS('itemsAddAndNext')}
        </button>
      )}
      {isEdit && (
        <button type="button" onClick={handleDelete} disabled={deleting}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#FDECEC', color: '#B71C1C', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          {deleting ? '…' : tS('itemsDeleteBtn')}
        </button>
      )}
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function OfferItemsMobile() {
  const { id: quoteId, sectionId } = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const autoTriggered = useRef(false);
  const t  = useTranslations('quotes');
  const tS = useTranslations('surveyDetail');
  const tM = useTranslations('mobilePods');
  const tc = useTranslations('common');
  const { currentUser, isDemoMode, userCurrency, quotes = [] } = useApp();
  const quoteTitle = quotes.find(q => q.id === quoteId)?.title || '';

  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [sectionName,  setSectionName]  = useState('');
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [addSheet,     setAddSheet]     = useState(null);
  const [anySheet,     setAnySheet]     = useState(false);
  const [alertMsg,     setAlertMsg]     = useState('');
  const [audioTrigger, setAudioTrigger] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/sections`);
      if (res.ok) {
        const data = await res.json();
        const sec  = (data.sections || []).find(s => s.id === sectionId);
        if (sec) { setSectionName(sec.name || ''); setEntries(sec.entries || []); }
      }
    } catch {}
  }, [quoteId, sectionId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Open add sheet immediately on mount if ?mode=add — data loads in background
  useEffect(() => {
    if (searchParams?.get('mode') === 'add' && !autoTriggered.current) {
      autoTriggered.current = true;
      setAddSheet({ mode: 'add' });
      setAnySheet(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSheet = useCallback(() => { setAddSheet(null); setAnySheet(false); }, []);
  const openAdd    = ()      => { setAddSheet({ mode: 'add' });                           setAnySheet(true); };
  const openEdit   = (entry) => { setAddSheet({ mode: 'edit', entry });                   setAnySheet(true); };
  const handleTranscript = useCallback((text) => {
    setAddSheet({ mode: 'add', prefill: { work_description: text } });
    setAnySheet(true);
  }, []);

  const handleSaveEntry = async (fields) => {
    try {
      if (addSheet?.mode === 'edit') {
        const res = await fetch(`/api/quotes/${quoteId}/entries/${addSheet.entry.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || t('errorUnknown')); }
      } else {
        const res = await fetch(`/api/quotes/${quoteId}/entries`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, quote_id: quoteId, section_id: sectionId, user_id: currentUser?.id }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || t('errorUnknown')); }
      }
      await refresh();
    } catch (err) {
      setAlertMsg(err.message || t('errorUnknown'));
      throw err;
    }
  };

  const handleDeleteEntry = async () => {
    if (!addSheet?.entry?.id) return;
    const res = await fetch(`/api/quotes/${quoteId}/entries/${addSheet.entry.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAlertMsg(d.error || t('errorUnknown'));
      throw new Error(d.error || t('errorUnknown'));
    }
    await refresh();
  };

  const grouped = TYPE_ORDER
    .map(type => ({ type, items: entries.filter(e => e.entry_type === type) }))
    .filter(g => g.items.length > 0);

  const [openPods, setOpenPods] = useState({});
  const togglePod = (type) => setOpenPods(prev => ({ ...prev, [type]: !prev[type] }));

  const total = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);

  const TYPE_LABELS = {
    material: tS('itemsTypeAnyag'), labour: tS('itemsTypeMunkadij'),
    equipment: tS('itemsTypeEszkozberles'), transport: tS('itemsTypeSzallitas'), other: tS('itemsTypeEgyeb'),
  };

  return (
    <div className="pod-screen-dark" style={{ position: 'relative', minHeight: '100dvh', background: OFFER_DEEP, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* Hidden AudioRecorder — triggered by the mic button */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <AudioRecorder
          size="sm"
          externalTrigger={audioTrigger}
          onTranscript={handleTranscript}
          onError={msg => setAlertMsg(msg)}
          hideTriggerButton={true}
          hint={sectionName ? `Ez a „${sectionName}" szakasz tételeinek felvétele.` : undefined}
        />
      </div>

      <div style={{ overflowY: 'auto', maxHeight: '100dvh', boxSizing: 'border-box', paddingBottom: 120 }}>

        {alertMsg && (
          <div style={{ position: 'sticky', top: 0, zIndex: 15, padding: '10px 16px', background: '#FDECEC', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>{alertMsg}</span>
            <button type="button" onClick={() => setAlertMsg('')} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: 'rgba(183,28,28,0.1)', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        )}

        {/* Header */}
        <header style={{ position: 'relative', overflow: 'hidden', background: OFFER_BG, borderRadius: '0 0 32px 32px', padding: '18px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => router.push(p(`/ajanlatok/${quoteId}`))} aria-label={t('back')}
              style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            {quoteTitle && (
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {quoteTitle}
              </span>
            )}
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
            {t('items')}
          </span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {loading
              ? <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'block', height: 32, width: 180, animation: 'pulse 1.4s infinite' }} />
              : sectionName || '—'}
          </h1>
          {entries.length > 0 && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ height: 28, padding: '0 12px', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', display: 'inline-flex', alignItems: 'center' }}>
                {tM('roomItemsBtn', { count: entries.length })}
              </span>
              {total > 0 && (
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  {formatMoney(total, userCurrency)}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Body */}
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grouped.map(({ type, items }) => {
            const m       = TYPE_META[type] || TYPE_META.other;
            const isOpen  = !!openPods[type];
            const subTotal = items.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            return (
              <section key={type} style={{ background: m.bg, borderRadius: 26, overflow: 'hidden', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 16px 26px -14px rgba(0,0,0,0.7)` }}>
                <button
                  type="button"
                  onClick={() => togglePod(type)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', minHeight: 68, boxSizing: 'border-box', padding: '12px 16px', border: 0, background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 14, background: m.bg, color: m.fg, border: `1px solid ${m.border}`, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {TYPE_LABELS[type]}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', flexShrink: 0 }}>
                    {items.length}×
                  </span>
                  <span style={{ flex: 1 }} />
                  {subTotal > 0 && (
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: 17, color: 'var(--m-ink, #0E1116)', flexShrink: 0 }}>
                      {formatMoney(subTotal, userCurrency)}
                    </span>
                  )}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid #ECEAE4', padding: '0 16px 8px' }}>
                    {items.map(entry => (
                      <EntryRow key={entry.id} entry={entry} onEdit={openEdit} t={t} userCurrency={userCurrency} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {entries.length === 0 && !loading && (
            <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{t('noItems')}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{t('entryItem')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      {!anySheet && (
        <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `24px 16px calc(16px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${OFFER_DEEP} 65%, rgba(0,0,0,0))`, display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => setAudioTrigger(n => n + 1)} aria-label={tM('itemsDictateBtn')}
            style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6a3 3 0 106 0v6a3 3 0 10-6 0zM5 11a7 7 0 0014 0M12 18v3"/></svg>
          </button>
          <button type="button" onClick={openAdd} aria-label={tS('itemsAddBtn')}
            style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: OFFER_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(109,63,209,0.6)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      )}

      {/* Scrim */}
      {anySheet && (
        <button type="button" onClick={closeSheet} aria-label={tc('close')}
          style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
      )}

      {/* Add / Edit sheet */}
      {addSheet && (
        <div role="dialog"
          aria-label={addSheet.mode === 'edit' ? t('entryModalEdit') : t('entryModalAdd')}
          className="pod-sheet"
          style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92dvh', overflowY: 'auto' }}
        >
          <OfferItemSheet
            initial={addSheet.mode === 'edit' ? addSheet.entry : (addSheet.prefill || null)}
            onSave={handleSaveEntry}
            onDelete={handleDeleteEntry}
            onClose={closeSheet}
            t={t} tS={tS} tc={tc}
            userCurrency={userCurrency}
          />
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
