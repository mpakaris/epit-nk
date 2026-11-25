'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const WORK_TYPE_KEYS = [
  'alapozas', 'acsmunka', 'ajtocseree', 'ablakcsere', 'bontas',
  'burkolas', 'csempezees', 'festes', 'gipszkarton', 'komuves',
  'padloborkolas', 'szigeteles', 'szallitas', 'takaritas',
  'tetofedes', 'vakolas', 'villany', 'vizvezetek',
];

export const WORK_TYPES = WORK_TYPE_KEYS; // kept for backward compat (stored values use HU labels from DB)

export default function WorkTypeSelector({ selected, onChange }) {
  const t = useTranslations('projectDetail');
  const [custom, setCustom] = useState('');

  const label = (key) => t(`workTypes.${key}`);

  const toggle = (key) => {
    const lbl = label(key);
    onChange(selected.includes(lbl) ? selected.filter(x => x !== lbl) : [...selected, lbl]);
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v || selected.includes(v)) { setCustom(''); return; }
    onChange([...selected, v]);
    setCustom('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Preset chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {WORK_TYPE_KEYS.map(key => {
          const lbl = label(key);
          const active = selected.includes(lbl);
          return (
            <button key={key} type="button" onClick={() => toggle(key)} style={{
              height: 32, padding: '0 12px', borderRadius: 16, border: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              background: active ? '#263248' : '#F0F0F2',
              color: active ? '#fff' : '#5A5F68',
            }}>
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Custom tags */}
      {selected.filter(tag => !WORK_TYPE_KEYS.map(k => label(k)).includes(tag)).map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 16, background: '#263248', color: '#fff', fontSize: 13, fontWeight: 700, marginRight: 4 }}>
          {tag}
          <button type="button" onClick={() => onChange(selected.filter(x => x !== tag))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', alignItems: 'center' }}>
            <X size={12} />
          </button>
        </span>
      ))}

      {/* Custom input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="dk-input"
          placeholder={t('workTypeCustomPh')}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="dk-btn dk-btn-dark"
          onClick={addCustom}
          disabled={!custom.trim()}
          style={{ opacity: custom.trim() ? 1 : 0.4 }}
        >
          {t('workTypeAddBtn')}
        </button>
      </div>
    </div>
  );
}
