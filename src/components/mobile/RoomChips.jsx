'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import useMobile from '@/hooks/useMobile';

export default function RoomChips({ selected = [], onChange }) {
  const t = useTranslations('surveys');
  const isMobile = useMobile();
  const defaultRooms = t.raw('defaultRooms');

  const fontSize = isMobile ? 16 : 13;
  const height   = isMobile ? 48 : 36;
  const padding  = isMobile ? '0 16px' : '0 12px';

  const toggle = (room) => {
    if (selected.includes(room)) {
      onChange(selected.filter(r => r !== room));
    } else {
      onChange([...selected, room]);
    }
  };

  const [customOpen, setCustomOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');

  const addCustom = () => {
    const v = customValue.trim();
    if (v && !selected.includes(v)) onChange([...selected, v]);
    setCustomValue('');
    setCustomOpen(false);
  };

  const chipStyle = (isSelected) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height, padding, borderRadius: 999,
    fontSize, fontWeight: 600, cursor: 'pointer',
    background: isSelected ? '#0f172a' : '#fff',
    color: isSelected ? '#fff' : '#0f172a',
    border: 'none',
    boxShadow: isSelected ? 'none' : 'var(--shadow-card)',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {defaultRooms.map(room => {
        const isSelected = selected.includes(room);
        return (
          <button
            key={room}
            type="button"
            onClick={() => toggle(room)}
            aria-pressed={isSelected}
            style={chipStyle(isSelected)}
          >
            {isSelected && <Check size={isMobile ? 15 : 12} strokeWidth={2.5} aria-hidden="true" />}
            {room}
          </button>
        );
      })}

      {/* Custom rooms already added */}
      {selected.filter(r => !defaultRooms.includes(r)).map(room => (
        <button
          key={room}
          type="button"
          onClick={() => toggle(room)}
          aria-pressed
          style={{ ...chipStyle(true), boxShadow: 'none' }}
        >
          <Check size={isMobile ? 15 : 12} strokeWidth={2.5} aria-hidden="true" />
          {room}
        </button>
      ))}

      {/* + Other chip */}
      {customOpen ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            autoFocus
            type="text"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder={t('roomChipPlaceholder')}
            style={{
              height, padding: '0 14px', borderRadius: 999,
              border: '1px solid #e2e8f0', fontSize, fontWeight: 600,
              color: '#0f172a', background: '#fff',
              boxShadow: 'var(--shadow-card)', minWidth: 120,
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            style={{
              height, padding, borderRadius: 999,
              background: '#0f172a', color: '#fff', border: 'none',
              fontSize: isMobile ? 15 : 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          style={{
            height, padding, borderRadius: 999,
            background: 'transparent', color: '#475569',
            border: '1px solid #e2e8f0', fontSize, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('roomChipOther')}
        </button>
      )}
    </div>
  );
}
