'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { ReadOnlyUpgradeMobileProvider } from '@/context/ReadOnlyUpgradeContext';
import { useReadOnlyUpgrade } from '@/hooks/useReadOnlyUpgrade';
import AudioRecorder from '@/components/AudioRecorder';
import { UNIT_I18N } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import PageSpinner from '@/components/PageSpinner';

const SURVEY_BG   = '#0A7F72';
const SURVEY_DEEP = '#06302C';
const SURVEY_INK  = '#0A5C53';

const TYPE_ORDER = ['material', 'labour', 'equipment', 'transport', 'other'];

const TRADE_COLORS = {
  'burkoló':        '#6B2D0A',
  'festő':          '#4A1A6B',
  'gipszkartonos':  '#162850',
  'kőműves':        '#6B1A0A',
  'vízszerelő':     '#0A2254',
  'villanyszerelő': '#54380A',
  'ács':            '#0A3C14',
  'általános':      '#1E1E1E',
};

const TYPE_META = {
  material:  { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe', dark: '#1e3a8a' },
  labour:    { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa', dark: '#7c2d12' },
  equipment: { bg: '#f0f9ff', fg: '#0369a1', border: '#bae6fd', dark: '#0f4c5c' },
  transport: { bg: '#fdf4ff', fg: '#a21caf', border: '#f0abfc', dark: '#5c0a44' },
  other:     { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1', dark: '#1e293b' },
};

const UNITS_BY_TYPE = {
  material:  ['m²', 'm', 'fm', 'db', 'kg', 'l', 'zsák', 'csomag', 'm³'],
  labour:    ['m²', 'm', 'fm', 'db', 'nap', 'h'],
  equipment: ['nap', 'db', 'h'],
  transport: ['db', 'km', 'nap'],
  other:     ['db', 'h', 'nap', 'm²'],
};
const DEFAULT_UNIT = { material: 'm²', labour: 'm²', equipment: 'nap', transport: 'db', other: 'db' };

function inferType(item) {
  if (item.entry_type && item.entry_type !== 'material') return item.entry_type;
  const u = (item.unit || '').toLowerCase();
  if (u === 'munkafázis' || u === 'munka') return 'labour';
  return item.entry_type || 'material';
}

// ── Type chip ──────────────────────────────────────────────────────────────────

function TypeChip({ type, label, active, onClick, small }) {
  const m = TYPE_META[type] || TYPE_META.other;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        height: small ? 30 : 36,
        padding: small ? '0 10px' : '0 14px',
        border: `1.5px solid ${active ? m.dark : m.border}`,
        borderRadius: small ? 15 : 18,
        background: active ? m.dark : m.bg,
        color: active ? '#fff' : m.fg,
        fontSize: small ? 12 : 13,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Item row (confirmed list) ──────────────────────────────────────────────────

function ItemRow({ item, onEdit }) {
  const m = TYPE_META[inferType(item)] || TYPE_META.other;
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', borderTop: '1px solid #ECEAE4', borderLeft: 0, borderRight: 0, borderBottom: 0 }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: m.fg, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.description}
        </div>
        {item.notes && <div style={{ fontSize: 12, color: '#5A5F68', fontStyle: 'italic', marginTop: 1 }}>{item.notes}</div>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.quantity != null ? String(Number(item.quantity).toLocaleString('hu-HU')) : ''}
        {item.unit ? ` ${item.unit}` : ''}
      </span>
    </button>
  );
}

// ── Suggestion row ─────────────────────────────────────────────────────────────

function SuggestionRow({ item, selected, onToggle, onReject, tM }) {
  const m = TYPE_META[inferType(item)] || TYPE_META.other;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', boxSizing: 'border-box', border: `1.5px solid ${selected ? m.fg : m.border}`, borderRadius: 18, background: selected ? m.bg : '#fff', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, border: `2px solid ${selected ? m.fg : '#C9C5BA'}`, background: selected ? m.fg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
          <div style={{ fontSize: 12, color: m.fg, fontWeight: 700, marginTop: 1 }}>
            {item.quantity != null ? `${Number(item.quantity).toLocaleString('hu-HU')} ` : ''}
            {item.unit || ''}
          </div>
        </div>
        <span style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 10, background: m.bg, border: `1px solid ${m.border}`, fontSize: 11, fontWeight: 700, color: m.fg, whiteSpace: 'nowrap' }}>
          {inferType(item)}
        </span>
      </button>
      <button type="button" onClick={onReject} aria-label={tM('itemsRejectBtn')} style={{ flexShrink: 0, width: 36, height: 36, border: 0, borderRadius: 18, background: '#F1F1F3', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// ── Add / Edit sheet ───────────────────────────────────────────────────────────

function ItemSheet({ initial, entryId, surveyId, onSave, onDelete, onClose, tS, tM, tc }) {
  const isEdit = !!initial?.id;
  const [type,  setType]  = useState(initial?.entry_type || 'material');
  const [desc,  setDesc]  = useState(initial?.description || '');
  const [qty,   setQty]   = useState(initial?.quantity != null ? initial.quantity : 0);
  const [unit,  setUnit]  = useState(initial?.unit || DEFAULT_UNIT['material']);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const TYPE_LABELS = {
    material:  tS('itemsTypeAnyag'),
    labour:    tS('itemsTypeMunkadij'),
    equipment: tS('itemsTypeEszkozberles'),
    transport: tS('itemsTypeSzallitas'),
    other:     tS('itemsTypeEgyeb'),
  };

  const handleTypeChange = (t) => { setType(t); if (!isEdit) setUnit(DEFAULT_UNIT[t]); };

  const handleSave = async () => {
    if (!desc.trim()) return;
    setSaving(true);
    try {
      await onSave({ description: desc.trim(), entry_type: type, quantity: qty || null, unit: unit || null, notes: notes.trim() || null });
      onClose();
    } catch {}
    setSaving(false);
  };

  const handleSaveAndNext = async () => {
    if (!desc.trim()) return;
    setSaving(true);
    try {
      await onSave({ description: desc.trim(), entry_type: type, quantity: qty || null, unit: unit || null, notes: notes.trim() || null });
      setDesc('');
      setQty(0);
      setNotes('');
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); onClose(); } catch {}
    setDeleting(false);
  };

  const FLD = { height: 56, border: 0, borderRadius: 18, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" };
  const units = UNITS_BY_TYPE[type] || UNITS_BY_TYPE.other;

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
          {isEdit ? tM('itemsEditSheetTitle') : tM('itemsManualSheetTitle')}
        </span>
        <button type="button" onClick={onClose} aria-label={tc('close')} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {/* Type grid — 3 + 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {TYPE_ORDER.map(t => {
          const m = TYPE_META[t] || TYPE_META.other;
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              style={{ height: 44, border: `1.5px solid ${active ? m.dark : m.border}`, borderRadius: 22, background: active ? m.dark : m.bg, color: active ? '#fff' : m.fg, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}
            >
              {TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsDescLabel')}</span>
        <input
          autoFocus={!isEdit}
          style={FLD}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={tS(`itemsPlaceholder${type.charAt(0).toUpperCase() + type.slice(1)}`)}
        />
      </label>

      {/* Qty stepper + unit chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsQtyLabel')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '4fr 8fr', gap: 12, alignItems: 'center' }}>
          {/* Counter — vertical */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button type="button" onClick={() => setQty(q => q + 1)} aria-label="+1" style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: SURVEY_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={qty || 0}
              onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setQty(isNaN(v) ? 0 : v); }}
              onFocus={e => e.target.select()}
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, width: 44, textAlign: 'center', border: 0, background: 'transparent', outline: 'none', color: '#0E1116', padding: '10px 0' }}
            />
            <button type="button" onClick={() => setQty(q => Math.max(0, q - 1))} aria-label="-1" style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F1F1F3', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
            </button>
          </div>
          {/* Unit chips — wrap freely */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {units.map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)} style={{ height: 44, padding: '0 14px', border: `1.5px solid ${unit === u ? '#0A7F72' : '#D5D2C8'}`, borderRadius: 22, background: unit === u ? '#D9F2EE' : '#fff', color: unit === u ? '#0A5C53' : '#4A4F57', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {UNIT_I18N[u] ? tS(UNIT_I18N[u]) : u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0E1116' }}>{tS('itemsNotesLabel')}</span>
        <input style={{ ...FLD, height: 48, fontSize: 15 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder={tS('itemsNotesPlaceholder')} />
      </label>

      {/* Actions */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !desc.trim()}
        style={{ height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', opacity: saving || !desc.trim() ? 0.6 : 1 }}
      >
        {saving ? tS('itemsSavingBtn') : isEdit ? tS('itemsModifyBtn') : tS('itemsAddNewBtn')}
      </button>
      {!isEdit && (
        <button
          type="button"
          onClick={handleSaveAndNext}
          disabled={saving || !desc.trim()}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#F1F1F3', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: saving || !desc.trim() ? 0.5 : 1 }}
        >
          {tS('itemsAddAndNext')}
        </button>
      )}

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{ height: 54, border: 0, borderRadius: 27, background: '#FDECEC', color: '#B71C1C', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
        >
          {deleting ? '…' : tS('itemsDeleteBtn')}
        </button>
      )}
    </>
  );
}

// ── Template Picker Sheet ──────────────────────────────────────────────────────

function TemplateRow({ tmpl, onSelect, border }) {
  const entriesCount = (tmpl.template_entries || []).length;
  return (
    <button
      type="button"
      onClick={() => onSelect(tmpl)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 0',
        background: 'transparent',
        borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent',
        borderTopWidth: border ? 1 : 0, borderTopColor: '#ECEAE4',
        cursor: 'pointer', textAlign: 'left', width: '100%',
      }}
    >
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tmpl.name}
      </span>
      <span style={{ flexShrink: 0, fontSize: 13, color: '#5A5F68' }}>{entriesCount}×</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0BDB8" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  );
}

function TemplatePickerSheet({ onApply, onClose, tM, tc }) {
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [platform,     setPlatform]     = useState([]);
  const [userTmpls,    setUserTmpls]    = useState([]);
  const [tab,          setTab]          = useState('platform');
  const [query,        setQuery]        = useState('');
  const [preview,      setPreview]      = useState(null);
  const [applying,     setApplying]     = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  useEffect(() => {
    fetch('/api/sablonok')
      .then(r => r.json())
      .then(data => { setPlatform(data.platform || []); setUserTmpls(data.user || []); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (template) => {
    const entries = template.template_entries || [];
    if (!entries.length) return;
    setApplying(true);
    try {
      await onApply(entries);
      setAppliedCount(c => c + entries.length);
      setPreview(null);
    } catch {}
    setApplying(false);
  };

  const activeList = tab === 'platform' ? platform : userTmpls;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? activeList.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.trade || '').toLowerCase().includes(q)
      )
    : activeList;

  // ── Preview mode ──
  if (preview) {
    const entries = [...(preview.template_entries || [])].sort((a, b) => a.sort_order - b.sort_order);
    return (
      <>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => setPreview(null)} aria-label={tc('back')} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, border: 0, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview.name}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={tc('close')} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, border: 0, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {entries.map((e, i) => {
            const m = TYPE_META[e.entry_type] || TYPE_META.other;
            return (
              <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #ECEAE4' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: m.fg, flexShrink: 0 }} aria-hidden="true" />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                <span style={{ fontSize: 13, color: '#5A5F68', flexShrink: 0 }}>
                  {e.qty_rate != null ? `${Number(e.qty_rate).toLocaleString('hu-HU')} ` : ''}{e.unit || ''}
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => handleApply(preview)}
          disabled={applying}
          style={{ height: 60, border: 0, borderRadius: 30, background: SURVEY_BG, color: '#fff', fontSize: 17, fontWeight: 700, cursor: applying ? 'not-allowed' : 'pointer', opacity: applying ? 0.6 : 1 }}
        >
          {applying ? tM('itemsTemplateApplying') : tM('itemsTemplateApplyBtn')}
        </button>
      </>
    );
  }

  // ── List mode ──
  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
          {tM('itemsTemplatePickerTitle')}
        </span>
        <button type="button" onClick={onClose} aria-label={tc('close')} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { key: 'platform', label: tM('itemsTabPlatform') },
          { key: 'user',     label: tM('itemsTabMine') },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setQuery(''); }}
            style={{
              height: 36, padding: '0 16px', border: 0, borderRadius: 18, cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: tab === key ? '#0E1116' : '#EFEDE6',
              color:      tab === key ? '#fff'    : '#5A5F68',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8F9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={tM('itemsTemplateSearch')}
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 46, paddingLeft: 40, paddingRight: query ? 42 : 16,
            borderRadius: 14, border: 0,
            background: '#EFEDE6', fontSize: 15, fontWeight: 500,
            color: '#0E1116', outline: 'none',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={tc('close')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#D5D2C8', border: 0, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Applied banner */}
      {appliedCount > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 14, background: '#E7F4EC', border: '1px solid #A7F3D0', fontSize: 14, fontWeight: 700, color: '#14532D', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
          {tM('itemsTemplateApplied', { count: appliedCount })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={SURVEY_BG} strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/>
          </svg>
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#B71C1C' }}>
          {tM('itemsTemplateLoadError')}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#5A5F68' }}>
          {q ? tM('itemsTemplateNoResults') : tM('itemsTemplateEmpty')}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        tab === 'platform' && !q ? (
          // Grouped by trade — section headers only on platform tab without active search
          (() => {
            const TRADE_ORDER_LOCAL = ['burkoló', 'festő', 'gipszkartonos', 'kőműves', 'vízszerelő', 'villanyszerelő', 'ács', 'általános'];
            const groups = {};
            const tradeLabel = {};
            for (const tmpl of filtered) {
              const key = tmpl.trade_key || tmpl.trade;
              if (!groups[key]) groups[key] = [];
              groups[key].push(tmpl);
              tradeLabel[key] = tmpl.trade;
            }
            const orderedKeys = [
              ...TRADE_ORDER_LOCAL.filter(k => groups[k]),
              ...Object.keys(groups).filter(k => !TRADE_ORDER_LOCAL.includes(k)).sort(),
            ];
            return orderedKeys.map(key => (
              <div key={key}>
                <div style={{ paddingTop: 16, paddingBottom: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F97' }}>
                  {tradeLabel[key]}
                </div>
                {groups[key].map((tmpl, i) => (
                  <TemplateRow key={tmpl.id} tmpl={tmpl} onSelect={setPreview} border={i > 0} />
                ))}
              </div>
            ));
          })()
        ) : (
          // Flat list — user tab or active search
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((tmpl, i) => (
              <TemplateRow key={tmpl.id} tmpl={tmpl} onSelect={setPreview} border={i > 0} />
            ))}
          </div>
        )
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function ItemsMobileInner() {
  const { id: surveyId, entryId } = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const tM           = useTranslations('mobilePods');
  const tS           = useTranslations('surveyDetail');
  const tc           = useTranslations('common');

  const {
    loading, dataReady, surveys,
    surveyEntriesBySurvey, surveyItemsBySurvey,
    fetchSurveyMedia,
    createSurveyItem, updateSurveyItem, deleteSurveyItem,
    generateSurveyEntryItems, updateSurveyEntry,
    isDemoMode, currentUser,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [aiStatus,     setAiStatus]     = useState('idle'); // idle|filling|generating|done|error
  const [genError,     setGenError]     = useState('');
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [addSheet,      setAddSheet]      = useState(null); // null | { mode:'add' } | { mode:'edit', item }
  const [delConfirm,    setDelConfirm]    = useState(null); // item to delete
  const [anySheet,      setAnySheet]      = useState(false);
  const [contextMenu,   setContextMenu]   = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [audioTrigger, setAudioTrigger] = useState(0);
  const [comingSoon,   setComingSoon]   = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const autoTriggered = useRef(false);

  // Derive items
  const survey  = surveys?.find(s => s.id === surveyId);
  const isReadOnly = !!survey?.is_read_only;
  const { openUpgrade } = useReadOnlyUpgrade();
  const entries = surveyEntriesBySurvey[surveyId] || [];
  const entry   = entries.find(e => e.id === entryId);
  const allItems = (surveyItemsBySurvey[surveyId] || []).filter(i => i.entry_id === entryId);
  const confirmed   = allItems.filter(i => i.is_confirmed);
  const suggestions = allItems.filter(i => !i.is_confirmed);

  const grouped = TYPE_ORDER
    .map(type => ({ type, items: confirmed.filter(i => inferType(i) === type) }))
    .filter(g => g.items.length > 0);

  const [openPods, setOpenPods] = useState({});
  const togglePod = (type) => setOpenPods(prev => ({ ...prev, [type]: !prev[type] }));

  // Pin body background to dark so the status-bar area never flashes light
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = SURVEY_DEEP;
    return () => { document.body.style.background = prev; };
  }, []);

  // On direct page load, entries/items may not be in cache yet — fetch them
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!dataReady || fetchedRef.current) return;
    if (surveyEntriesBySurvey[surveyId] !== undefined) return; // already loaded
    fetchedRef.current = true;
    setDetailLoading(true);
    fetchSurveyMedia(surveyId).catch(() => {}).finally(() => setDetailLoading(false));
  }, [dataReady, surveyId, surveyEntriesBySurvey, fetchSurveyMedia]);

  // Auto-trigger from ?mode= param
  useEffect(() => {
    if (!dataReady || autoTriggered.current || !entry) return;
    autoTriggered.current = true;
    const mode = searchParams?.get('mode');
    if (mode === 'dictate') setAudioTrigger(1);
    else if (mode === 'ai') handleGenerateDirect();
    else if (mode === 'add') { setAddSheet({ mode: 'add' }); setAnySheet(true); }
  }, [dataReady, entry]);

  const closeSheet = useCallback(() => {
    setAddSheet(null);
    setDelConfirm(null);
    setContextMenu(false);
    setTemplatePicker(false);
    setAnySheet(false);
  }, []);
  const openAdd    = () => { if (isReadOnly) { openUpgrade(); return; } setAddSheet({ mode: 'add' });  setAnySheet(true); };
  const openEdit   = (item) => { if (isReadOnly) { openUpgrade(); return; } setAddSheet({ mode: 'edit', item }); setAnySheet(true); };
  const openContextMenu = () => { setContextMenu(true); setAnySheet(true); };
  const openTemplatePicker = () => { if (isReadOnly) { openUpgrade(); return; } if (!isEffectivePremium(currentUser || {})) { openUpgrade(); return; } setContextMenu(false); setTemplatePicker(true); setAnySheet(true); };

  const handleApplyTemplateEntries = async (entries) => {
    if (isReadOnly) { openUpgrade(); return; }
    await Promise.allSettled(
      entries.map(e => createSurveyItem(surveyId, {
        entry_id: entryId,
        description: e.name,
        entry_type: e.entry_type,
        quantity: e.qty_rate || null,
        unit: e.unit || null,
        source: 'manual',
        is_confirmed: true,
      }).catch(() => {}))
    );
  };

  // AI generate without dictation
  const handleGenerateDirect = async () => {
    if (isReadOnly) { openUpgrade(); return; }
    setAiStatus('generating'); setGenError('');
    try {
      await generateSurveyEntryItems(surveyId, entryId);
      setAiStatus('done');
      setTimeout(() => setAiStatus('idle'), 3000);
    } catch (e) {
      setGenError(e.message || tM('itemsAiError'));
      setAiStatus('error');
    }
  };

  // After AudioRecorder gives us a transcript
  const handleTranscript = async (text) => {
    if (isReadOnly) { openUpgrade(); return; }
    setAiStatus('filling'); setGenError('');
    let description = text;
    const extraFields = {};
    try {
      const res = await fetch(`/api/surveys/${surveyId}/entries/${entryId}/fill-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      if (res.ok) {
        const data = await res.json();
        const f = data.fields || {};
        if (f.width_m      != null) extraFields.width_m      = f.width_m;
        if (f.length_m     != null) extraFields.length_m     = f.length_m;
        if (f.height_m     != null) extraFields.height_m     = f.height_m;
        if (f.window_count != null) extraFields.window_count = f.window_count;
        if (f.door_count   != null) extraFields.door_count   = f.door_count;
        if (f.description)           description              = f.description;
      }
    } catch {}

    setAiStatus('generating');
    try {
      const existing = (entry?.description || '').trim();
      const merged   = existing ? existing + '\n\n' + description : description;
      if (Object.keys(extraFields).length > 0 || description !== text) {
        await updateSurveyEntry(surveyId, entryId, { description: merged, ...extraFields });
      }
      await generateSurveyEntryItems(surveyId, entryId);
      setAiStatus('done');
      setTimeout(() => setAiStatus('idle'), 3000);
    } catch (e) {
      setGenError(e.message || tM('itemsAiError'));
      setAiStatus('error');
    }
  };

  // Accept selected suggestions
  const handleAcceptSelected = async () => {
    if (isReadOnly) { openUpgrade(); return; }
    if (!selectedIds.size) return;
    await Promise.allSettled(
      [...selectedIds].map(id => updateSurveyItem(surveyId, id, { is_confirmed: true }).catch(() => {}))
    );
    setSelectedIds(new Set());
  };

  const handleAcceptAll = async () => {
    if (isReadOnly) { openUpgrade(); return; }
    await Promise.allSettled(
      suggestions.map(i => updateSurveyItem(surveyId, i.id, { is_confirmed: true }).catch(() => {}))
    );
  };

  const handleRejectAll = async () => {
    await Promise.allSettled(
      suggestions.map(i => deleteSurveyItem(surveyId, i.id).catch(() => {}))
    );
  };

  const handleRejectOne = async (id) => {
    await deleteSurveyItem(surveyId, id).catch(() => {});
  };

  const handleSaveItem = async (fields) => {
    if (addSheet?.mode === 'edit') {
      await updateSurveyItem(surveyId, addSheet.item.id, fields);
    } else {
      await createSurveyItem(surveyId, { entry_id: entryId, ...fields, source: 'manual', is_confirmed: true });
    }
  };

  const handleDeleteItem = async () => {
    if (addSheet?.mode === 'edit') {
      await deleteSurveyItem(surveyId, addSheet.item.id);
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (loading || !dataReady || detailLoading) return (
    <div className="pod-screen-dark" style={{ minHeight: '100dvh', background: SURVEY_DEEP }}>
      <div style={{ height: 140, background: SURVEY_BG, borderRadius: '0 0 32px 32px', opacity: 0.7, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[56, 56, 76, 76, 76].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 22, background: 'rgba(255,255,255,0.09)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );

  const TYPE_LABELS = {
    material:  tS('itemsTypeAnyag'),
    labour:    tS('itemsTypeMunkadij'),
    equipment: tS('itemsTypeEszkozberles'),
    transport: tS('itemsTypeSzallitas'),
    other:     tS('itemsTypeEgyeb'),
  };

  const isBusy = aiStatus === 'filling' || aiStatus === 'generating';

  return (
    <div className="pod-screen-dark" style={{ position: 'relative', minHeight: '100dvh', background: SURVEY_DEEP, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* AudioRecorder — hidden trigger only; opens its own Modal */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <AudioRecorder
          size="sm"
          disabled={isBusy}
          externalTrigger={audioTrigger}
          hasContent={!!(entry?.description || '').trim()}
          onTranscript={handleTranscript}
          onError={msg => { setGenError(msg); setAiStatus('error'); }}
          hideTriggerButton={true}
          hint={entry ? `Ez a „${entry.name}" szoba felmérése. Mondd el a méreteket, ablakokat, ajtókat és az elvégzendő munkákat.` : undefined}
        />
      </div>

      {/* Scroll container */}
      <div style={{ overflowY: 'auto', maxHeight: '100dvh', boxSizing: 'border-box', paddingBottom: 120 }}>

        {/* ── Header ── */}
        <header style={{ position: 'relative', overflow: 'hidden', background: SURVEY_BG, borderRadius: '0 0 32px 32px', padding: '18px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

          {/* Top row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => router.push(p(`/felmeres/${surveyId}`))}
              aria-label={tc('back')}
              style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            {survey?.title && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {survey.title}
              </span>
            )}
            <button
              type="button"
              onClick={openContextMenu}
              aria-label={tM('itemsContextMenuTitle')}
              style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          </div>

          {/* Kicker */}
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
            {tM('itemsKicker')}
          </span>

          {/* Room name */}
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {entry?.name || '—'}
          </h1>

          {/* Badge row */}
          <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
            {allItems.length > 0 && (
              <span style={{ height: 28, padding: '0 12px', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', display: 'inline-flex', alignItems: 'center' }}>
                {tM('roomItemsBtn', { count: allItems.length })}
              </span>
            )}
            {suggestions.length > 0 && (
              <span style={{ height: 28, padding: '0 12px', borderRadius: 14, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.14)', color: '#D9F2EE', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>
                {suggestions.length} {tM('itemsSuggestionBadge')}
              </span>
            )}
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* AI status bar */}
          {aiStatus !== 'idle' && (
            <div style={{ padding: '12px 16px', borderRadius: 20, background: aiStatus === 'error' ? '#FDECEC' : aiStatus === 'done' ? '#E7F4EC' : 'rgba(10,127,114,0.2)', border: `1px solid ${aiStatus === 'error' ? '#FECACA' : aiStatus === 'done' ? '#A7F3D0' : 'rgba(10,127,114,0.4)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              {isBusy && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/>
                </svg>
              )}
              {aiStatus === 'done' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={aiStatus === 'done' ? '#14532D' : '#B71C1C'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M5 12l5 5 9-10"/>
                </svg>
              )}
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: aiStatus === 'error' ? '#B71C1C' : aiStatus === 'done' ? '#14532D' : '#D9F2EE' }}>
                {aiStatus === 'filling'    && tM('itemsListening')}
                {aiStatus === 'generating' && tM('itemsAiWorking')}
                {aiStatus === 'done'       && tM('itemsAiDone')}
                {aiStatus === 'error'      && (genError || tM('itemsAiError'))}
              </span>
              {aiStatus === 'error' && (
                <button type="button" onClick={handleGenerateDirect} style={{ height: 36, padding: '0 12px', border: 0, borderRadius: 18, background: '#fff', color: '#B71C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {tM('itemsRetry')}
                </button>
              )}
            </div>
          )}

          {/* AI suggestions checklist */}
          {suggestions.length > 0 && (
            <section style={{ background: '#fff', borderRadius: 26, overflow: 'hidden', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ECEAE4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SURVEY_BG} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{tM('itemsSuggestionBadge')}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={handleRejectAll} style={{ height: 32, padding: '0 12px', border: '1.5px solid #D5D2C8', borderRadius: 16, background: '#fff', color: '#5A5F68', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {tM('itemsRejectAllBtn')}
                  </button>
                  <button type="button" onClick={handleAcceptAll} style={{ height: 32, padding: '0 12px', border: 0, borderRadius: 16, background: SURVEY_BG, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {tM('itemsAcceptAllBtn')}
                  </button>
                </div>
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                {suggestions.map(item => (
                  <SuggestionRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                    onReject={() => handleRejectOne(item.id)}
                    tM={tM}
                  />
                ))}
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleAcceptSelected}
                    style={{ width: '100%', height: 52, border: 0, borderRadius: 26, background: SURVEY_INK, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
                  >
                    {tM('itemsConfirmAddBtn', { count: selectedIds.size })}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Confirmed items grouped by type — collapsible pods */}
          {grouped.map(({ type, items: typeItems }) => {
            const m      = TYPE_META[type] || TYPE_META.other;
            const isOpen = !!openPods[type];
            return (
              <section key={type} style={{ background: m.dark, borderRadius: 26, overflow: 'hidden', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 26px -14px rgba(0,0,0,0.7)` }}>
                <button
                  type="button"
                  onClick={() => togglePod(type)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', minHeight: 68, boxSizing: 'border-box', padding: '12px 16px', border: 0, background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', borderRadius: 14, background: '#fff', color: '#1a1d23', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {TYPE_LABELS[type]}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                    {typeItems.length}×
                  </span>
                  <span style={{ flex: 1 }} />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {isOpen && (
                  <div style={{ margin: '0 10px 10px', borderRadius: 18, background: '#fff', overflow: 'hidden', padding: '0 12px 4px' }}>
                    {typeItems.map(item => (
                      <ItemRow key={item.id} item={item} onEdit={openEdit} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Empty state */}
          {allItems.length === 0 && aiStatus === 'idle' && (
            <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h4m-2-2v4"/></svg>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{tM('itemsEmptyTitle')}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{tM('itemsEmptyHint')}</span>
            </div>
          )}

        </div>
      </div>

      {/* ── Bottom action bar ── */}
      {!anySheet && (
        <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `24px 16px calc(16px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${SURVEY_DEEP} 65%, rgba(0,0,0,0))`, display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setComingSoon(true)}
            aria-label={tM('itemsDictateBtn')}
            style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6a3 3 0 106 0v6a3 3 0 10-6 0zM5 11a7 7 0 0014 0M12 18v3"/></svg>
          </button>
          <button
            type="button"
            onClick={handleGenerateDirect}
            disabled={isBusy}
            style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: SURVEY_INK, color: '#fff', fontSize: 15, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>
            {tM('itemsAiBtn')}
          </button>
          <button
            type="button"
            onClick={openAdd}
            aria-label={tS('itemsAddBtn')}
            style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: SURVEY_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(10,127,114,0.6)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      )}

      {/* ── Scrim ── */}
      {anySheet && (
        <button
          type="button"
          onClick={closeSheet}
          aria-label={tc('close')}
          style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }}
        />
      )}

      {/* ── Add / Edit sheet ── */}
      {addSheet && (
        <div
          role="dialog"
          aria-label={addSheet.mode === 'edit' ? tM('itemsEditSheetTitle') : tM('itemsManualSheetTitle')}
          className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92dvh', overflowY: 'auto' }}
        >
          <ItemSheet
            initial={addSheet.mode === 'edit' ? addSheet.item : null}
            entryId={entryId}
            surveyId={surveyId}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
            onClose={closeSheet}
            tS={tS}
            tM={tM}
            tc={tc}
          />
        </div>
      )}

      {/* ── Context menu sheet ── */}
      {contextMenu && (
        <div
          role="dialog"
          aria-label={tM('itemsContextMenuTitle')}
          className="pod-sheet"
          style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
              {tM('itemsContextMenuTitle')}
            </span>
            <button type="button" onClick={closeSheet} aria-label={tc('close')} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          <button
            type="button"
            onClick={openTemplatePicker}
            style={{ display: 'flex', alignItems: 'center', gap: 14, height: 64, padding: '0 16px', border: 0, borderRadius: 20, background: '#fff', cursor: 'pointer', boxShadow: 'inset 0 1px 0 #fff, 0 10px 20px -10px rgba(0,0,0,0.5)', textAlign: 'left' }}
          >
            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 20, background: '#E8E5DF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#44413B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#0E1116' }}>
              {tM('itemsApplyTemplate')}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0BDB8" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Template picker sheet ── */}
      {templatePicker && (
        <div
          role="dialog"
          aria-label={tM('itemsTemplatePickerTitle')}
          className="pod-sheet"
          style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '88dvh', overflowY: 'auto' }}
        >
          <TemplatePickerSheet
            onApply={handleApplyTemplateEntries}
            onClose={closeSheet}
            tM={tM}
            tc={tc}
          />
        </div>
      )}

      {/* Coming soon sheet */}
      {comingSoon && (
        <>
          <div onClick={() => setComingSoon(false)} style={{ position: 'fixed', inset: 0, zIndex: 44, background: 'rgba(14,17,22,0.5)' }} />
          <div role="dialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `24px 24px calc(28px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 36 }}>🎙️</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#0E1116' }}>{tM('comingSoonTitle')}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.5 }}>{tM('comingSoonDictate')}</span>
            <button onClick={() => setComingSoon(false)} style={{ marginTop: 8, height: 56, width: '100%', border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{tc('ok')}</button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

    </div>
  );
}

export default function ItemsMobile() {
  return <ReadOnlyUpgradeMobileProvider><ItemsMobileInner /></ReadOnlyUpgradeMobileProvider>;
}
