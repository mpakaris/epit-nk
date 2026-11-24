'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { UNIT_I18N } from '@/lib/constants';

// ─── Constants ───────────────────────────────────────────────────────────────

const ENTRY_TYPE_COLOR = {
  material:  { bg: '#1A4E28', fg: '#D4F0DC' },
  labour:    { bg: '#0D336E', fg: '#D0E6FF' },
  equipment: { bg: '#6E2E0A', fg: '#FFE0C8' },
  transport: { bg: '#50167A', fg: '#EDD8FF' },
  other:     { bg: '#303030', fg: '#E8E8E8' },
};

const ENTRY_TYPE_TKEY = {
  material:  'entryTypeMaterial',
  labour:    'entryTypeLabour',
  equipment: 'entryTypeEquipment',
  transport: 'entryTypeTransport',
  other:     'entryTypeOther',
};

const FORMULA_TKEY = {
  area:      'formulaArea',
  perimeter: 'formulaPerimeter',
  wall_area: 'formulaWallArea',
  fixed:     'formulaFixed',
};

const FORMULA_COLOR = {
  area:      { bg: '#0A4E42', fg: '#C8F0EA' },
  perimeter: { bg: '#52360A', fg: '#FFE8BC' },
  wall_area: { bg: '#330A54', fg: '#EDD8FF' },
  fixed:     { bg: '#252535', fg: '#DCDCF0' },
};

const TRADE_ORDER = [
  'burkoló', 'festő', 'gipszkartonos', 'kőműves',
  'vízszerelő', 'villanyszerelő', 'ács', 'általános',
];

const TRADE_COLOR = {
  'burkoló':       { bg: '#6B2D0A', fg: '#fff' },
  'festő':         { bg: '#4A1A6B', fg: '#fff' },
  'gipszkartonos': { bg: '#162850', fg: '#fff' },
  'kőműves':       { bg: '#6B1A0A', fg: '#fff' },
  'vízszerelő':    { bg: '#0A2254', fg: '#fff' },
  'villanyszerelő':{ bg: '#54380A', fg: '#fff' },
  'ács':           { bg: '#0A3C14', fg: '#fff' },
  'általános':     { bg: '#1E1E1E', fg: '#fff' },
};

const HEADER_BG = '#15181E';

// ─── TemplateDetailSheet ─────────────────────────────────────────────────────

function TemplateDetailSheet({ template, onClose, t }) {
  if (!template) return null;

  const entries = [...(template.template_entries || [])].sort((a, b) => a.sort_order - b.sort_order);
  const totalMaterial = entries.filter(e => e.entry_type === 'material').length;
  const totalLabour   = entries.filter(e => e.entry_type === 'labour').length;
  const tc = TRADE_COLOR[template.trade_key || template.trade] || TRADE_COLOR['általános'];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.55)', zIndex: 400, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
        background: '#fff', borderRadius: '28px 28px 0 0',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.22)',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E2E8F0' }} />
        </div>

        {/* Sheet header */}
        <div style={{ padding: '8px 20px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', borderRadius: 11, background: tc.bg, color: tc.fg, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                {template.trade}
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: '#0E1116' }}>
                {template.name}
              </h2>
              {template.description && (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#5A5F68', lineHeight: 1.4 }}>{template.description}</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: '#0D336E', color: '#D0E6FF', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                  {t('labourEntries', { count: totalLabour })}
                </span>
                <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: '#1A4E28', color: '#D4F0DC', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                  {t('materialEntries', { count: totalMaterial })}
                </span>
              </div>
            </div>
            <button onClick={onClose} aria-label={t('closeBtn')} style={{ width: 36, height: 36, borderRadius: 18, border: 0, background: '#F1F5F9', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Entry list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 20px' }}>
          {entries.map((entry, idx) => {
            const ec = ENTRY_TYPE_COLOR[entry.entry_type] || ENTRY_TYPE_COLOR.other;
            const fc = FORMULA_COLOR[entry.qty_formula] || FORMULA_COLOR.fixed;
            return (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: idx < entries.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <span style={{ width: 24, height: 24, borderRadius: 12, background: '#F1F5F9', color: '#5A5F68', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', lineHeight: 1.3 }}>{entry.name}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <span style={{ height: 20, padding: '0 8px', borderRadius: 10, background: ec.bg, color: ec.fg, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      {t(ENTRY_TYPE_TKEY[entry.entry_type] || 'entryTypeOther')}
                    </span>
                    <span style={{ height: 20, padding: '0 8px', borderRadius: 10, background: fc.bg, color: fc.fg, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                      {entry.qty_formula === 'fixed'
                        ? `${entry.qty_rate} ${entry.unit}`
                        : `${entry.qty_rate} ${entry.unit}/${t(FORMULA_TKEY[entry.qty_formula] || 'formulaArea')}`}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {entry.suggested_price_huf != null ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0E1116', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {entry.suggested_price_huf.toLocaleString('hu-HU')} Ft
                      </div>
                      <div style={{ fontSize: 11, color: '#5A5F68', marginTop: 1 }}>/ {entry.unit}</div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>{t('ownPrice')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── TemplateTile ─────────────────────────────────────────────────────────────

function TemplateTile({ template, onSelect, t, showTrade = false }) {
  const tc = TRADE_COLOR[template.trade_key || template.trade] || TRADE_COLOR['általános'];
  const entries  = template.template_entries || [];
  const nLabour  = entries.filter(e => e.entry_type === 'labour').length;
  const nMat     = entries.filter(e => e.entry_type === 'material').length;

  return (
    <button
      onClick={() => onSelect(template)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '14px 12px 12px', borderRadius: 20, border: 0, background: '#fff',
        textAlign: 'left', cursor: 'pointer', minHeight: 108, width: '100%',
        boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.5), 0 2px 4px -1px rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, color: '#0E1116', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {template.name}
      </span>
      <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {showTrade && (
          <span style={{ height: 20, padding: '0 8px', borderRadius: 10, background: tc.bg, color: tc.fg, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.trade}
          </span>
        )}
        <span style={{ height: 20, padding: '0 7px', borderRadius: 10, background: '#0D336E', color: '#D0E6FF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {t('labourCount', { count: nLabour })}
        </span>
        <span style={{ height: 20, padding: '0 7px', borderRadius: 10, background: '#1A4E28', color: '#D4F0DC', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {t('materialCount', { count: nMat })}
        </span>
      </div>
    </button>
  );
}

// ─── TemplateFormSheet ───────────────────────────────────────────────────────

const ENTRY_TYPES = ['labour', 'material', 'other'];
const ENTRY_TYPE_LABEL_KEY = { labour: 'typeLabour', material: 'typeMaterial', other: 'typeFee' };
const ENTRY_TYPE_PILL = {
  labour:   { bg: '#0D336E', fg: '#D0E6FF' },
  material: { bg: '#1A4E28', fg: '#D4F0DC' },
  other:    { bg: '#303030', fg: '#E8E8E8' },
};

// Shared FLD and type meta — same as OfferItemsMobile
const FLD = {
  height: 56, border: 0, borderRadius: 18, background: '#fff', padding: '0 16px',
  fontSize: 17, fontWeight: 500, color: '#0E1116',
  boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.4)',
  width: '100%', boxSizing: 'border-box', outline: 'none',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const TYPE_META_FORM = {
  labour:   { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa', dark: '#7c2d12' },
  material: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', dark: '#1e3a8a' },
  other:    { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1', dark: '#1e293b' },
};
const ALL_UNITS = ['m²', 'm', 'fm', 'db', 'kg', 'l', 'zsák', 'h', 'nap', 'm³'];

// ─── EntrySheet — identical structure to OfferItemSheet ───────────────────────
function EntrySheet({ initial, onSave, onSaveAndNext, onDelete, onClose, t }) {
  const tS = useTranslations('surveyDetail');
  const isEdit = !!initial;
  const [type,      setType]      = useState(initial?.entry_type || 'labour');
  const [desc,      setDesc]      = useState(initial?.name || '');
  const [qty,       setQty]       = useState(initial?.qty_rate != null ? initial.qty_rate : 1);
  const [unit,      setUnit]      = useState(initial?.unit || 'm²');
  const [unitPrice, setUnitPrice] = useState(initial?.suggested_price_huf != null ? String(initial.suggested_price_huf) : '');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const amount   = Math.round((qty || 0) * (parseFloat(unitPrice) || 0));
  const canSave  = !saving && desc.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: desc.trim(), entry_type: type, qty_rate: qty || 1, unit, suggested_price_huf: parseFloat(unitPrice) || null });
      onClose();
    } catch {}
    setSaving(false);
  };

  const handleSaveAndNext = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSaveAndNext({ name: desc.trim(), entry_type: type, qty_rate: qty || 1, unit, suggested_price_huf: parseFloat(unitPrice) || null });
      setDesc(''); setQty(1); setUnitPrice('');
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); onClose(); } catch {}
    setDeleting(false);
  };

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
          {isEdit ? t('formEditTitle') : t('formCreateTitle')}
        </span>
        <button type="button" onClick={onClose} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {/* Type grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {ENTRY_TYPES.map(tp => {
          const m  = TYPE_META_FORM[tp];
          const on = type === tp;
          return (
            <button key={tp} type="button" onClick={() => setType(tp)}
              style={{ height: 44, border: `1.5px solid ${on ? m.dark : m.border}`, borderRadius: 22, background: on ? m.dark : m.bg, color: on ? '#fff' : m.fg, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t(ENTRY_TYPE_LABEL_KEY[tp])}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryNameLabel')}</span>
        <input autoFocus={!isEdit} style={FLD} value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('formEntryNamePlaceholder')} />
      </label>

      {/* Qty stepper + unit chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryQtyLabel')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => setQty(q => q + 1)} aria-label="+1"
              style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: HEADER_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <input type="text" inputMode="decimal" value={qty || 0}
              onChange={e => { const v = parseFloat(e.target.value.replace(/,/g, '.')); setQty(isNaN(v) ? 0 : v); }}
              onFocus={e => e.target.select()}
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, width: 72, textAlign: 'center', border: 0, background: 'transparent', outline: 'none', color: '#0E1116', padding: '10px 0' }} />
            <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))} aria-label="-1"
              style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F1F1F3', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_UNITS.map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                style={{ height: 44, padding: '0 14px', border: `1.5px solid ${unit === u ? HEADER_BG : '#D5D2C8'}`, borderRadius: 22, background: unit === u ? '#E8E5DF' : '#fff', color: unit === u ? HEADER_BG : '#4A4F57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {UNIT_I18N[u] ? tS(UNIT_I18N[u]) : u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unit price + Total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryPrice')}</span>
          <div style={{ position: 'relative' }}>
            <input type="number" inputMode="numeric" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0"
              style={{ ...FLD, paddingRight: 42 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#8A8F97', pointerEvents: 'none' }}>Ft</span>
          </div>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryTotal')}</span>
          <div style={{ position: 'relative', height: 56, borderRadius: 18, background: amount > 0 ? '#E8E5DF' : '#F7F5EF', display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 42, boxSizing: 'border-box' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: amount > 0 ? 18 : 15, fontWeight: 700, letterSpacing: '-0.02em', color: amount > 0 ? HEADER_BG : '#B0ADA6', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {amount > 0 ? amount.toLocaleString('hu-HU') : '0'}
            </span>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: amount > 0 ? '#5A5F68' : '#B0ADA6', pointerEvents: 'none' }}>Ft</span>
          </div>
        </div>
      </div>

      {/* Save buttons */}
      <button type="button" onClick={handleSave} disabled={!canSave}
        style={{ height: 60, border: 0, borderRadius: 30, background: canSave ? HEADER_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}>
        {saving ? t('formSaving') : isEdit ? t('formSaveBtn') : t('formSaveBtn')}
      </button>
      {!isEdit && (
        <button type="button" onClick={handleSaveAndNext} disabled={!canSave}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#F1F1F3', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5 }}>
          {t('formAddBtn')}
        </button>
      )}
      {isEdit && (
        <button type="button" onClick={handleDelete} disabled={deleting}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#FDECEC', color: '#B71C1C', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          {deleting ? '…' : t('formDeleteEntry')}
        </button>
      )}
    </>
  );
}

// ─── TemplateFormSheet — template name + entry list + EntrySheet ─────────────
function TemplateFormSheet({ mode, template, onSave, onDelete, onClose, t }) {
  const [title,     setTitle]     = useState(template?.name || '');
  const [entries,   setEntries]   = useState(
    (template?.template_entries || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(e => ({ ...e }))
  );
  const [entrySheet, setEntrySheet] = useState(null); // null | 'new' | entry object
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error,      setError]      = useState('');

  const handleSaveEntry = async (fields) => {
    if (entrySheet === 'new') {
      setEntries(prev => [...prev, { ...fields, id: `local-${Date.now()}` }]);
    } else {
      setEntries(prev => prev.map(e => e.id === entrySheet.id ? { ...e, ...fields } : e));
    }
    setEntrySheet(null);
  };

  const handleSaveEntryAndNext = async (fields) => {
    setEntries(prev => [...prev, { ...fields, id: `local-${Date.now()}` }]);
    // keep entrySheet open (set to 'new' so the next save also appends)
    setEntrySheet('new');
  };

  const handleDeleteEntry = async () => {
    setEntries(prev => prev.filter(e => e.id !== entrySheet?.id));
  };

  async function handleSaveTemplate() {
    if (!title.trim()) { setError(t('formNameRequired')); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: title.trim(), trade: 'általános', entries }, template?.id);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteTemplate() {
    setSaving(true);
    try { await onDelete(template.id); onClose(); }
    catch (e) { setError(e.message); setSaving(false); }
  }

  // Show entry sheet on top when editing/adding an entry
  if (entrySheet !== null) {
    return (
      <>
        <div onClick={() => setEntrySheet(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.5)', zIndex: 410 }} aria-hidden="true" />
        <div role="dialog" style={{ position: 'fixed', zIndex: 411, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92dvh', overflowY: 'auto' }}>
          <EntrySheet
            initial={entrySheet === 'new' ? null : entrySheet}
            onSave={handleSaveEntry}
            onSaveAndNext={handleSaveEntryAndNext}
            onDelete={handleDeleteEntry}
            onClose={() => setEntrySheet(null)}
            t={t}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,17,22,0.45)', zIndex: 400 }} aria-hidden="true" />
      <div role="dialog" style={{ position: 'fixed', zIndex: 401, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92dvh', overflowY: 'auto' }}>

        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
            {mode === 'edit' ? t('formEditTitle') : t('formCreateTitle')}
          </span>
          <button type="button" onClick={onClose} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>

        {error && (
          <div style={{ background: '#FDECEC', borderRadius: 14, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#B71C1C' }}>{error}</div>
        )}

        {/* Template name */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formNameLabel')}</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={t('formNamePlaceholder')} style={FLD} />
        </label>

        {/* Entry list */}
        {entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {entries.map((e, i) => {
              const m = TYPE_META_FORM[e.entry_type] || TYPE_META_FORM.other;
              return (
                <button key={e.id || i} type="button" onClick={() => setEntrySheet(e)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: i > 0 ? '1px solid #ECEAE4' : 'none', background: 'transparent', border: 'none', borderTopColor: '#ECEAE4', borderTopStyle: i > 0 ? 'solid' : 'none', borderTopWidth: i > 0 ? 1 : 0, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: m.fg, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  {e.qty_rate && e.unit && <span style={{ fontSize: 13, color: '#5A5F68', flexShrink: 0 }}>{e.qty_rate} {e.unit}</span>}
                  {e.suggested_price_huf != null && (
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: '#0E1116', flexShrink: 0 }}>
                      {Number(e.suggested_price_huf).toLocaleString('hu-HU')} Ft
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Add entry — only once a name is set */}
        <button type="button" onClick={() => title.trim() && setEntrySheet('new')} disabled={!title.trim()}
          style={{ height: 56, border: `1.5px dashed ${title.trim() ? '#D5D2C8' : '#ECEAE4'}`, borderRadius: 18, background: 'transparent', color: title.trim() ? '#5A5F68' : '#C0BDB8', fontSize: 15, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          {t('formEntriesTitle')}
        </button>

        {/* Save template */}
        <button type="button" onClick={handleSaveTemplate} disabled={saving || !title.trim()}
          style={{ height: 60, border: 0, borderRadius: 30, background: title.trim() ? HEADER_BG : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
          {saving ? t('formSaving') : t('formSaveBtn')}
        </button>

        {/* Delete */}
        {mode === 'edit' && !confirmDel && (
          <button type="button" onClick={() => setConfirmDel(true)}
            style={{ height: 54, border: 0, borderRadius: 27, background: '#FDECEC', color: '#B71C1C', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {t('formDeleteEntry')}
          </button>
        )}
        {mode === 'edit' && confirmDel && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FDECEC', borderRadius: 16, padding: '12px 14px' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#B71C1C' }}>{t('formDeleteConfirm')}</span>
            <button type="button" onClick={() => setConfirmDel(false)} style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: '#fff', color: '#0E1116', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('closeBtn')}</button>
            <button type="button" onClick={handleDeleteTemplate} disabled={saving} style={{ height: 36, padding: '0 14px', border: 0, borderRadius: 18, background: '#B71C1C', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '…' : t('formDeleteEntry')}
            </button>
          </div>
        )}

      </div>
    </>
  );
}

// ─── TileGrid ─────────────────────────────────────────────────────────────────

function TileGrid({ templates, onSelect, t, showTrade = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {templates.map(tmpl => (
        <TemplateTile key={tmpl.id} template={tmpl} onSelect={onSelect} t={t} showTrade={showTrade} />
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SablonokMobile() {
  const t      = useTranslations('sablonok');
  const router = useRouter();
  const { currentUser, isDemoMode } = useApp();
  const isPremium = isEffectivePremium(currentUser ?? {});

  const [platform, setPlatform]   = useState([]);
  const [userTmpls, setUserTmpls] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('platform');
  const [selected, setSelected]   = useState(null);
  const [query, setQuery]         = useState('');
  const [compactBar, setCompactBar] = useState(false);
  const [formOpen,       setFormOpen]       = useState(false);
  const [formMode,       setFormMode]       = useState('create');
  const [formTemplate,   setFormTemplate]   = useState(null);

  function openCreate() { setFormTemplate(null); setFormMode('create'); setFormOpen(true); }
  function openEdit(tmpl) { setFormTemplate(tmpl); setFormMode('edit'); setFormOpen(true); }

  async function handleSaveTemplate({ name, trade, entries }, id) {
    if (id) {
      const res = await fetch(`/api/sablonok/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, trade, entries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchTemplates();
    } else {
      const res = await fetch('/api/sablonok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, trade, entries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchTemplates();
    }
  }

  async function handleDeleteTemplate(id) {
    const res = await fetch(`/api/sablonok/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    await fetchTemplates();
  }

  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCompactBar(el.scrollTop > 100);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/sablonok');
      const data = await res.json();
      if (res.ok) {
        setPlatform(data.platform || []);
        setUserTmpls(data.user || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Group by trade_key for ordered sections
  const groups     = {};
  const tradeLabel = {};
  for (const tmpl of platform) {
    const key = tmpl.trade_key || tmpl.trade;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tmpl);
    tradeLabel[key] = tmpl.trade;
  }
  const orderedTrades = [
    ...TRADE_ORDER.filter(k => groups[k]),
    ...Object.keys(groups).filter(k => !TRADE_ORDER.includes(k)).sort(),
  ];

  // Search
  const q = query.trim().toLowerCase();
  const activeList = tab === 'platform' ? platform : userTmpls;
  const searchResults = q
    ? activeList.filter(tmpl =>
        tmpl.name.toLowerCase().includes(q) ||
        tmpl.trade.toLowerCase().includes(q) ||
        (tmpl.description || '').toLowerCase().includes(q)
      )
    : [];

  const BTN = { width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

  return (
    <div style={{ maxHeight: '100dvh', overflow: 'hidden' }}>

      {/* ── Compact sticky bar (slides in on scroll) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 28,
        background: HEADER_BG,
        padding: '10px 16px', paddingTop: 'max(10px, env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: '0 0 22px 22px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        transform: compactBar ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: compactBar ? 'auto' : 'none',
      }}>
        <button aria-label={t('backBtn')} onClick={() => router.back()} style={{ ...BTN, width: 40, height: 40, borderRadius: 20 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#fff' }}>{t('title')}</span>
        {tab === 'user' && isPremium && (
          <button onClick={openCreate} aria-label={t('addTemplateBtn')} style={{ width: 36, height: 36, borderRadius: 18, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        )}
        {[
          { key: 'platform', label: t('tabPlatform') },
          { key: 'user',     label: t('tabMine')     },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key); setQuery(''); }}
            style={{ height: 32, padding: '0 14px', borderRadius: 16, border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === key ? '#fff' : 'rgba(255,255,255,0.14)', color: tab === key ? '#0E1116' : 'rgba(255,255,255,0.7)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Scroll container ── */}
      <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '100dvh', paddingBottom: 40 }}>

        {/* ── Full header (scrolls away) ── */}
        <header style={{
          position: 'relative', overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '18px 16px 0',
          paddingTop: 'max(18px, env(safe-area-inset-top))',
          borderRadius: '0 0 32px 32px',
          background: HEADER_BG,
          color: '#fff',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Decorative circle */}
          <span aria-hidden="true" style={{ position: 'absolute', right: -80, top: -100, width: 280, height: 280, borderRadius: 140, background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

          {/* Back · · · */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button aria-label={t('backBtn')} onClick={() => router.back()} style={BTN}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.14)', display: 'inline-flex', alignItems: 'center', color: '#fff' }}>
              {tab === 'user'
                ? t('templateCount', { count: userTmpls.length })
                : platform.length > 0 ? t('templateCount', { count: platform.length }) : ''}
            </span>
            {tab === 'user' && isPremium ? (
              <button onClick={openCreate} aria-label={t('addTemplateBtn')} style={{ ...BTN, background: 'rgba(255,255,255,0.18)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            ) : (
              <div style={{ width: 48 }} />
            )}
          </div>

          {/* Kicker + H1 */}
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C4860A' }}>
            {t('kicker')}
          </span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {t('title')}
          </h1>

          {/* Underline tabs — flush to header bottom */}
          <div style={{ position: 'relative', display: 'flex', marginTop: 6, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
            {[
              { key: 'platform', label: t('tabPlatform') },
              { key: 'user',     label: t('tabMine')     },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setQuery(''); }}
                style={{
                  flex: 1, height: 46, background: 'transparent', border: 0,
                  borderBottom: tab === key ? '2.5px solid #C4860A' : '2.5px solid transparent',
                  marginBottom: -1,
                  color: tab === key ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Content ── */}
        <div style={{ padding: '0 14px' }}>

          {/* Search bar */}
          <div style={{ position: 'relative', padding: '14px 0 4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              style={{
                width: '100%', boxSizing: 'border-box',
                height: 46, paddingLeft: 40, paddingRight: query ? 42 : 16,
                borderRadius: 14, border: 0,
                background: '#fff', fontSize: 15, fontWeight: 500,
                color: '#0E1116', outline: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                WebkitAppearance: 'none', appearance: 'none',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label={t('closeBtn')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#E8E5DF', border: 0, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* ── Platform tab ── */}
          {tab === 'platform' && (
            loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
            ) : q ? (
              searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8A8F9A' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ marginBottom: 10 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('searchEmpty')}</p>
                </div>
              ) : <TileGrid templates={searchResults} onSelect={setSelected} t={t} showTrade={true} />
            ) : (
              orderedTrades.map((key, i) => {
                const tc = TRADE_COLOR[key] || TRADE_COLOR['általános'];
                return (
                  <div key={key} style={{ marginBottom: 24, marginTop: i === 0 ? 10 : 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, paddingLeft: 6, borderLeft: `3px solid ${tc.bg}` }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0E1116', textTransform: 'capitalize' }}>
                        {tradeLabel[key] || key}
                      </span>
                      <span style={{ fontSize: 12, color: '#8A8F9A', fontWeight: 600 }}>
                        {t('templateCount', { count: groups[key].length })}
                      </span>
                    </div>
                    <TileGrid templates={groups[key]} onSelect={setSelected} t={t} showTrade={false} />
                  </div>
                );
              })
            )
          )}

          {/* ── My templates tab ── */}
          {tab === 'user' && (
            isPremium ? (
              q ? (
                searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8A8F9A' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ marginBottom: 10 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('searchEmpty')}</p>
                  </div>
                ) : <TileGrid templates={searchResults} onSelect={openEdit} t={t} showTrade={true} />
              ) : userTmpls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 20, marginTop: 10, boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.4)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0E1116' }}>{t('emptyUserTitle')}</p>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: '#5A5F68' }}>{t('emptyUserSubtitle')}</p>
                  <button onClick={openCreate} style={{ height: 44, padding: '0 24px', borderRadius: 22, border: 0, background: '#0E1116', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t('newTemplateBtn')}
                  </button>
                </div>
              ) : <TileGrid templates={userTmpls} onSelect={openEdit} t={t} />
            ) : (
              <div style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', marginTop: 10, boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0E1116' }}>{t('premiumTitle')}</p>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#5A5F68', lineHeight: 1.5 }}>{t('premiumSubtitle')}</p>
                <a href={isDemoMode ? '/demo/elofizetes' : '/elofizetes'} style={{ display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 24px', borderRadius: 22, background: '#0E1116', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  {t('premiumCta')}
                </a>
              </div>
            )
          )}
        </div>
      </div>

      {/* Template detail sheet (platform templates) */}
      {selected && <TemplateDetailSheet template={selected} onClose={() => setSelected(null)} t={t} />}

      {/* Template form (create / edit user templates) */}
      {formOpen && (
        <TemplateFormSheet
          mode={formMode}
          template={formTemplate}
          onSave={handleSaveTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setFormOpen(false)}
          t={t}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=search]::-webkit-search-cancel-button { display: none; }
      `}</style>
    </div>
  );
}
