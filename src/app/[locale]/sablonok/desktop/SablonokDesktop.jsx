'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { podColor } from '@/lib/podColor';
import { UNIT_I18N } from '@/lib/constants';
import Modal, { ConfirmModal } from '@/components/Modal';
import { Plus, Search, X, Star, Copy } from 'lucide-react';

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

const ENTRY_TYPES = ['labour', 'material', 'other'];
const ENTRY_TYPE_LABEL_KEY = { labour: 'typeLabour', material: 'typeMaterial', other: 'typeFee' };
const ENTRY_TYPE_PILL = {
  labour:   { bg: '#0D336E', fg: '#D0E6FF' },
  material: { bg: '#1A4E28', fg: '#D4F0DC' },
  other:    { bg: '#303030', fg: '#E8E8E8' },
};
const TYPE_META_FORM = {
  labour:   { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa', dark: '#7c2d12' },
  material: { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', dark: '#1e3a8a' },
  other:    { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1', dark: '#1e293b' },
};
const ALL_UNITS = ['m²', 'm', 'fm', 'db', 'kg', 'l', 'zsák', 'h', 'nap', 'm³'];

const FLD = {
  height: 46, border: 0, borderRadius: 14, background: '#fff', padding: '0 14px',
  fontSize: 15, fontWeight: 500, color: '#0E1116',
  boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 6px 12px -8px rgba(14,17,22,0.3)',
  width: '100%', boxSizing: 'border-box', outline: 'none',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

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
        padding: '16px 14px 14px', borderRadius: 20, border: 0,
        background: '#fff', textAlign: 'left', cursor: 'pointer', minHeight: 112, width: '100%',
        boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.5), 0 2px 4px -1px rgba(0,0,0,0.2)',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 #fff, 0 14px 24px -10px rgba(0,0,0,0.6), 0 3px 6px -2px rgba(0,0,0,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.5), 0 2px 4px -1px rgba(0,0,0,0.2)'; }}
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

// ─── TileGrid ─────────────────────────────────────────────────────────────────

function TileGrid({ templates, onSelect, t, showTrade = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {templates.map(tmpl => (
        <TemplateTile key={tmpl.id} template={tmpl} onSelect={onSelect} t={t} showTrade={showTrade} />
      ))}
    </div>
  );
}

// ─── TemplateDetailModal ──────────────────────────────────────────────────────

function TemplateDetailModal({ template, onClose, onDuplicate, isPremium, t }) {
  const [duplicating, setDuplicating] = useState(false);

  if (!template) return null;

  const entries = [...(template.template_entries || [])].sort((a, b) => a.sort_order - b.sort_order);
  const totalMaterial = entries.filter(e => e.entry_type === 'material').length;
  const totalLabour   = entries.filter(e => e.entry_type === 'labour').length;
  const tc = TRADE_COLOR[template.trade_key || template.trade] || TRADE_COLOR['általános'];

  return (
    <Modal isOpen={!!template} onClose={onClose} title={template.name} maxWidth="600px">
      {/* Meta badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: tc.bg, color: tc.fg, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {template.trade}
        </span>
        <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: '#0D336E', color: '#D0E6FF', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {t('labourEntries', { count: totalLabour })}
        </span>
        <span style={{ height: 24, padding: '0 10px', borderRadius: 12, background: '#1A4E28', color: '#D4F0DC', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
          {t('materialEntries', { count: totalMaterial })}
        </span>
      </div>
      {template.description && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#5A5F68', lineHeight: 1.5 }}>{template.description}</p>
      )}

      {/* Entry list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((entry, idx) => {
          const ec = ENTRY_TYPE_COLOR[entry.entry_type] || ENTRY_TYPE_COLOR.other;
          const fc = FORMULA_COLOR[entry.qty_formula] || FORMULA_COLOR.fixed;
          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: idx > 0 ? '1px solid #F1F5F9' : 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: '#F1F5F9', color: '#5A5F68', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', lineHeight: 1.3 }}>{entry.name}</div>
                <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
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
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0E1116', whiteSpace: 'nowrap' }}>
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

      {/* Duplicate */}
      {onDuplicate && isPremium && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={async () => {
              setDuplicating(true);
              try { await onDuplicate(template); } catch {}
              setDuplicating(false);
            }}
            disabled={duplicating}
            className="dk-btn dk-btn-l"
            style={{ width: '100%', opacity: duplicating ? 0.6 : 1 }}
          >
            <Copy size={16} aria-hidden="true" />
            {duplicating ? '…' : t('duplicateBtn')}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── EntryFormModal ───────────────────────────────────────────────────────────

function EntryFormModal({ initial, onSave, onSaveAndNext, onDelete, onClose, t }) {
  const tS = useTranslations('surveyDetail');
  const isEdit = !!initial;
  const [type,      setType]      = useState(initial?.entry_type || 'labour');
  const [desc,      setDesc]      = useState(initial?.name || '');
  const [qty,       setQty]       = useState(initial?.qty_rate != null ? initial.qty_rate : 1);
  const [unit,      setUnit]      = useState(initial?.unit || 'm²');
  const [unitPrice, setUnitPrice] = useState(initial?.suggested_price_huf != null ? String(initial.suggested_price_huf) : '');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const amount  = Math.round((qty || 0) * (parseFloat(unitPrice) || 0));
  const canSave = !saving && desc.trim().length > 0;

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

  const title = isEdit ? t('formEditTitle') : t('formCreateTitle');

  return (
    <Modal isOpen onClose={onClose} title={title} maxWidth="480px">
      {/* Type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {ENTRY_TYPES.map(tp => {
          const m  = TYPE_META_FORM[tp];
          const on = type === tp;
          return (
            <button key={tp} type="button" onClick={() => setType(tp)}
              style={{ height: 40, border: `1.5px solid ${on ? m.dark : m.border}`, borderRadius: 20, background: on ? m.dark : m.bg, color: on ? '#fff' : m.fg, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t(ENTRY_TYPE_LABEL_KEY[tp])}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryNameLabel')}</span>
        <input autoFocus={!isEdit} style={FLD} value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('formEntryNamePlaceholder')} />
      </label>

      {/* Qty + unit */}
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116', display: 'block', marginBottom: 8 }}>{t('formEntryQtyLabel')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F7F5EF', borderRadius: 14, padding: '6px 10px' }}>
            <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))}
              style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: '#fff', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 18, fontWeight: 700 }}>−</button>
            <input type="text" inputMode="decimal" value={qty || 0}
              onChange={e => { const v = parseFloat(e.target.value.replace(/,/g, '.')); setQty(isNaN(v) ? 0 : v); }}
              onFocus={e => e.target.select()}
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, width: 48, textAlign: 'center', border: 0, background: 'transparent', outline: 'none', color: '#0E1116' }} />
            <button type="button" onClick={() => setQty(q => q + 1)}
              style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: '#15181E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 18, fontWeight: 700 }}>+</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_UNITS.map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                style={{ height: 36, padding: '0 12px', border: `1.5px solid ${unit === u ? '#15181E' : '#D5D2C8'}`, borderRadius: 18, background: unit === u ? '#E8E5DF' : '#fff', color: unit === u ? '#15181E' : '#4A4F57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {UNIT_I18N[u] ? tS(UNIT_I18N[u]) : u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Price + Total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryPrice')}</span>
          <div style={{ position: 'relative' }}>
            <input type="number" inputMode="numeric" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0"
              style={{ ...FLD, paddingRight: 36 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#8A8F97', pointerEvents: 'none' }}>Ft</span>
          </div>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formEntryTotal')}</span>
          <div style={{ position: 'relative', height: 46, borderRadius: 14, background: amount > 0 ? '#E8E5DF' : '#F7F5EF', display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 36, boxSizing: 'border-box' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: amount > 0 ? '#15181E' : '#B0ADA6', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {amount > 0 ? amount.toLocaleString('hu-HU') : '0'}
            </span>
            <span style={{ position: 'absolute', right: 12, fontSize: 11, fontWeight: 700, color: amount > 0 ? '#5A5F68' : '#B0ADA6' }}>Ft</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleSave} disabled={!canSave} className="dk-btn dk-btn-dark" style={{ flex: 1, opacity: canSave ? 1 : 0.5 }}>
            {saving ? t('formSaving') : t('formSaveBtn')}
          </button>
          {!isEdit && (
            <button type="button" onClick={handleSaveAndNext} disabled={!canSave} className="dk-btn dk-btn-l" style={{ flex: 1, opacity: canSave ? 1 : 0.5 }}>
              {t('formAddBtn')}
            </button>
          )}
        </div>
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="dk-btn" style={{ background: '#FDECEC', color: '#B71C1C' }}>
            {deleting ? '…' : t('formDeleteEntry')}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ─── TemplateFormModal ────────────────────────────────────────────────────────

function TemplateFormModal({ mode, template, onSave, onDelete, onClose, onDuplicate, t }) {
  const [title,       setTitle]       = useState(template?.name || '');
  const [entries,     setEntries]     = useState(
    (template?.template_entries || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(e => ({ ...e }))
  );
  const [entryModal,  setEntryModal]  = useState(null); // null | 'new' | entry object
  const [saving,      setSaving]      = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [error,       setError]       = useState('');

  const handleSaveEntry = async (fields) => {
    if (entryModal === 'new') {
      setEntries(prev => [...prev, { ...fields, id: `local-${Date.now()}` }]);
    } else {
      setEntries(prev => prev.map(e => e.id === entryModal.id ? { ...e, ...fields } : e));
    }
    setEntryModal(null);
  };

  const handleSaveEntryAndNext = async (fields) => {
    setEntries(prev => [...prev, { ...fields, id: `local-${Date.now()}` }]);
    setEntryModal('new');
  };

  const handleDeleteEntry = async () => {
    setEntries(prev => prev.filter(e => e.id !== entryModal?.id));
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

  const formTitle = mode === 'edit' ? t('formEditTitle') : t('formCreateTitle');

  return (
    <>
      <Modal isOpen onClose={onClose} title={formTitle} maxWidth="540px">
        {error && (
          <div style={{ background: '#FDECEC', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: '#B71C1C', marginBottom: 14 }}>{error}</div>
        )}

        {/* Template name */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{t('formNameLabel')}</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder={t('formNamePlaceholder')} style={FLD} />
        </label>

        {/* Entry list */}
        {entries.length > 0 && (
          <div style={{ background: '#F7F7F9', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
            {entries.map((e, i) => {
              const m = TYPE_META_FORM[e.entry_type] || TYPE_META_FORM.other;
              return (
                <button key={e.id || i} type="button" onClick={() => setEntryModal(e)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i > 0 ? '1px solid #ECEAE4' : 'none', background: 'transparent', border: 'none', borderTopColor: '#ECEAE4', borderTopStyle: i > 0 ? 'solid' : 'none', borderTopWidth: i > 0 ? 1 : 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: m.dark, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  {e.qty_rate && e.unit && <span style={{ fontSize: 13, color: '#5A5F68', flexShrink: 0 }}>{e.qty_rate} {e.unit}</span>}
                  {e.suggested_price_huf != null && (
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: '#0E1116', flexShrink: 0 }}>
                      {Number(e.suggested_price_huf).toLocaleString('hu-HU')} Ft
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Add entry */}
        <button type="button" onClick={() => title.trim() && setEntryModal('new')} disabled={!title.trim()}
          style={{ height: 46, border: `1.5px dashed ${title.trim() ? '#D5D2C8' : '#ECEAE4'}`, borderRadius: 14, background: 'transparent', color: title.trim() ? '#5A5F68' : '#C0BDB8', fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginBottom: 16, boxSizing: 'border-box' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          {t('formEntriesTitle')}
        </button>

        {/* Save + Duplicate + Delete */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={handleSaveTemplate} disabled={saving || !title.trim()} className="dk-btn dk-btn-dark" style={{ width: '100%', opacity: title.trim() ? (saving ? 0.6 : 1) : 0.5 }}>
            {saving ? t('formSaving') : t('formSaveBtn')}
          </button>
          {mode === 'edit' && onDuplicate && (
            <button type="button"
              onClick={async () => {
                setDuplicating(true);
                try { await onDuplicate(template); } catch {}
                setDuplicating(false);
              }}
              disabled={duplicating}
              className="dk-btn dk-btn-l"
              style={{ width: '100%', opacity: duplicating ? 0.6 : 1 }}
            >
              <Copy size={16} aria-hidden="true" />
              {duplicating ? '…' : t('duplicateBtn')}
            </button>
          )}
          {mode === 'edit' && (
            <button type="button" onClick={() => setConfirmDel(true)} className="dk-btn" style={{ background: '#FDECEC', color: '#B71C1C', width: '100%' }}>
              {t('formDeleteTemplateBtn')}
            </button>
          )}
        </div>
      </Modal>

      {/* Nested entry editor modal */}
      {entryModal !== null && (
        <EntryFormModal
          initial={entryModal === 'new' ? null : entryModal}
          onSave={handleSaveEntry}
          onSaveAndNext={handleSaveEntryAndNext}
          onDelete={handleDeleteEntry}
          onClose={() => setEntryModal(null)}
          t={t}
        />
      )}

      {/* Delete template confirm */}
      <ConfirmModal
        isOpen={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={async () => { await onDelete(template.id); onClose(); }}
        title={t('formDeleteTemplateBtn')}
        message={t('formDeleteConfirm')}
        confirmLabel={t('formDeleteEntry')}
      />
    </>
  );
}

// ─── Main desktop component ───────────────────────────────────────────────────

export default function SablonokDesktop() {
  const t = useTranslations('sablonok');
  const { currentUser, activeCollectiveId, contextSwitching, isDemoMode } = useApp();
  const isPremium = isEffectivePremium(currentUser ?? {});

  const [platform, setPlatform]   = useState([]);
  const [userTmpls, setUserTmpls] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab]             = useState('platform');
  const [selected, setSelected]   = useState(null);
  const [query, setQuery]         = useState('');
  const [openTrade, setOpenTrade] = useState(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [formMode,     setFormMode]     = useState('create');
  const [formTemplate, setFormTemplate] = useState(null);

  function openCreate() { setFormTemplate(null); setFormMode('create'); setFormOpen(true); }
  function openEdit(tmpl) { setFormTemplate(tmpl); setFormMode('edit'); setFormOpen(true); }

  function refresh() { setRefreshKey(k => k + 1); }

  async function handleSaveTemplate({ name, trade, entries }, id) {
    if (id) {
      const res = await fetch(`/api/sablonok/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, trade, entries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      refresh();
    } else {
      const res = await fetch('/api/sablonok', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, trade, entries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      refresh();
    }
  }

  async function handleDeleteTemplate(id) {
    const res = await fetch(`/api/sablonok/${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    refresh();
  }

  async function handleDuplicate(template) {
    const entries = (template.template_entries || []).map(e => ({
      name: e.name,
      entry_type: e.entry_type,
      unit: e.unit,
      qty_formula: e.qty_formula || 'area',
      qty_rate: e.qty_rate ?? 1,
      suggested_price_huf: e.suggested_price_huf ?? null,
    }));
    const res = await fetch('/api/sablonok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${template.name}_copy`, trade: template.trade_key || template.trade || 'általános', entries }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Hiba történt'); }
    refresh();
    setTab('user');
    setSelected(null);
    setFormOpen(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch('/api/sablonok');
        const data = await res.json();
        if (!cancelled && res.ok) {
          setPlatform(data.platform || []);
          setUserTmpls(data.user || []);
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Group by trade for platform tab
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

  const q = query.trim().toLowerCase();
  const activeList = tab === 'platform' ? platform : userTmpls;
  const searchResults = q
    ? activeList.filter(tmpl =>
        tmpl.name.toLowerCase().includes(q) ||
        tmpl.trade.toLowerCase().includes(q) ||
        (tmpl.description || '').toLowerCase().includes(q)
      )
    : [];

  const wsStyle = activeCollectiveId
    ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
    : {};

  const tabCount = tab === 'platform' ? platform.length : userTmpls.length;

  return (
    <div className="dk-page dk-mod-templates" style={wsStyle}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('desktop.kicker')}</span>
          <h1 className="dk-h1">{t('title')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ position: 'relative', display: 'block' }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
              <Search size={18} aria-hidden="true" />
            </span>
            <input
              type="search"
              className="dk-input"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: 40, width: 240, borderRadius: 23, height: 44 }}
            />
          </label>
          {tab === 'user' && isPremium && (
            <button className="dk-btn dk-btn-w" onClick={openCreate}>
              <Plus size={18} aria-hidden="true" />
              {t('addTemplateBtn')}
            </button>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="dk-body" style={{ background: 'var(--dk-deep)', padding: '20px 28px 28px' }}>
        {contextSwitching ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div className="dk-ws-spinner" />
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'platform', label: t('tabPlatform') },
                { key: 'user',     label: t('tabMine') },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className="dk-chip"
                  onClick={() => { setTab(key); setQuery(''); }}
                  style={{
                    background: key === tab ? '#fff' : 'rgba(255,255,255,0.1)',
                    color: key === tab ? '#0E1116' : 'rgba(255,255,255,0.65)',
                    border: 'none',
                  }}
                >
                  {label}
                </button>
              ))}
              {!loading && tabCount > 0 && (
                <span style={{ marginLeft: 4, alignSelf: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                  {t('templateCount', { count: tabCount })}
                </span>
              )}
            </div>

            {/* ── Platform tab ── */}
            {tab === 'platform' && (
              loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
              ) : q ? (
                searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(255,255,255,0.4)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ marginBottom: 10 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('searchEmpty')}</p>
                  </div>
                ) : (
                  <TileGrid templates={searchResults} onSelect={setSelected} t={t} showTrade />
                )
              ) : (
                orderedTrades.map((key) => {
                  const tc = TRADE_COLOR[key] || TRADE_COLOR['általános'];
                  const isOpen = openTrade === key;
                  return (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <button
                        onClick={() => setOpenTrade(isOpen ? null : key)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                          padding: '0 20px', height: 60, boxSizing: 'border-box',
                          background: tc.bg, color: tc.fg,
                          border: 0,
                          borderRadius: isOpen ? '20px 20px 0 0' : '20px',
                          cursor: 'pointer', textAlign: 'left',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                        }}
                      >
                        <span style={{ width: 12, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 800, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                          {tradeLabel[key] || key}
                        </span>
                        <span style={{ height: 24, padding: '0 12px', borderRadius: 12, background: 'rgba(255,255,255,0.18)', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {t('templateCount', { count: groups[key].length })}
                        </span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} aria-hidden="true">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div style={{ borderRadius: '0 0 20px 20px', background: '#EDEBE5', padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                          <TileGrid templates={groups[key]} onSelect={setSelected} t={t} showTrade={false} />
                        </div>
                      )}
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
                    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(255,255,255,0.4)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ marginBottom: 10 }}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('searchEmpty')}</p>
                    </div>
                  ) : (
                    <TileGrid templates={searchResults} onSelect={openEdit} t={t} showTrade />
                  )
                ) : userTmpls.length === 0 ? (
                  <div className="dk-card" style={{ padding: '48px 24px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                    <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0E1116', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{t('emptyUserTitle')}</p>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: '#5A5F68' }}>{t('emptyUserSubtitle')}</p>
                    <button onClick={openCreate} className="dk-btn dk-btn-dark" style={{ margin: '0 auto' }}>
                      <Plus size={16} /> {t('newTemplateBtn')}
                    </button>
                  </div>
                ) : (
                  <TileGrid templates={userTmpls} onSelect={openEdit} t={t} />
                )
              ) : (
                <div className="dk-card" style={{ padding: '36px 28px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Star size={24} color="#F59E0B" />
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0E1116', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{t('premiumTitle')}</p>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: '#5A5F68', lineHeight: 1.5 }}>{t('premiumSubtitle')}</p>
                  <a href={isDemoMode ? '/demo/elofizetes' : '/elofizetes'} className="dk-btn dk-btn-dark" style={{ display: 'inline-flex', textDecoration: 'none', margin: '0 auto' }}>
                    {t('premiumCta')}
                  </a>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Template detail modal */}
      {selected && (
        <TemplateDetailModal
          template={selected}
          onClose={() => setSelected(null)}
          onDuplicate={isPremium ? handleDuplicate : null}
          isPremium={isPremium}
          t={t}
        />
      )}

      {/* Template create/edit modal */}
      {formOpen && (
        <TemplateFormModal
          mode={formMode}
          template={formTemplate}
          onSave={handleSaveTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setFormOpen(false)}
          onDuplicate={handleDuplicate}
          t={t}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
