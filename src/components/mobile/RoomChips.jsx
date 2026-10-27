'use client';

import React from 'react';
import { Check } from 'lucide-react';

const DEFAULT_ROOMS = [
  'Nappali', 'Fürdő', 'Konyha', 'Hálószoba', 'Kert', 'Folyosó',
];

export default function RoomChips({ selected = [], onChange, extraLabel = '+ Egyéb' }) {
  const allRooms = DEFAULT_ROOMS;

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

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {allRooms.map(room => {
        const isSelected = selected.includes(room);
        return (
          <button
            key={room}
            type="button"
            onClick={() => toggle(room)}
            aria-pressed={isSelected}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 48, padding: '0 16px', borderRadius: 999,
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              background: isSelected ? '#0f172a' : '#fff',
              color: isSelected ? '#fff' : '#0f172a',
              border: isSelected ? 'none' : 'none',
              boxShadow: isSelected ? 'none' : 'var(--shadow-card)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {isSelected && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
            {room}
          </button>
        );
      })}

      {/* Custom rooms already added */}
      {selected.filter(r => !allRooms.includes(r)).map(room => (
        <button
          key={room}
          type="button"
          onClick={() => toggle(room)}
          aria-pressed
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 48, padding: '0 16px', borderRadius: 999,
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            background: '#0f172a', color: '#fff', border: 'none',
          }}
        >
          <Check size={15} strokeWidth={2.5} aria-hidden="true" />
          {room}
        </button>
      ))}

      {/* + Egyéb chip */}
      {customOpen ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            autoFocus
            type="text"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="pl. Garázs"
            style={{
              height: 48, padding: '0 14px', borderRadius: 999,
              border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600,
              color: '#0f172a', background: '#fff',
              boxShadow: 'var(--shadow-card)', minWidth: 120,
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            style={{
              height: 48, padding: '0 16px', borderRadius: 999,
              background: '#0f172a', color: '#fff', border: 'none',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
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
            height: 48, padding: '0 16px', borderRadius: 999,
            background: 'transparent', color: '#475569',
            border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {extraLabel}
        </button>
      )}
    </div>
  );
}
