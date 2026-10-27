'use client';

import React from 'react';
import { User, Users } from 'lucide-react';

export default function WorkspaceSectionHeader({ type = 'personal', name, count, members = [] }) {
  const isPersonal = type === 'personal';

  const chipBg    = isPersonal ? '#eff6ff' : '#dcfce7';
  const iconColor = isPersonal ? '#2563eb' : '#16a34a';
  const hairline  = isPersonal ? '#e2e8f0' : '#cbd5e1';
  const label     = isPersonal ? 'Személyes' : name;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {/* Chip */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isPersonal
          ? <User size={15} color={iconColor} strokeWidth={1.75} aria-hidden="true" />
          : <Users size={15} color={iconColor} strokeWidth={1.75} aria-hidden="true" />}
      </div>

      {/* Label */}
      <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: '22px', whiteSpace: 'nowrap' }}>
        {label}
      </span>

      {/* Count */}
      {count !== undefined && (
        <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
          {count}
        </span>
      )}

      {/* Hairline */}
      <div style={{ flex: 1, height: 1, background: hairline }} />

      {/* Collective avatar stack */}
      {!isPersonal && members.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {members.slice(0, 3).map((m, i) => (
            <div
              key={m.id || i}
              title={m.display_name || m.name}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0f172a, #475569)',
                border: '2px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
                marginLeft: i === 0 ? 0 : -9, zIndex: members.length - i,
              }}
            >
              {(m.display_name || m.name || '?')[0].toUpperCase()}
            </div>
          ))}
          {members.length > 3 && (
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: '#e2e8f0', border: '2px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#475569',
              marginLeft: -9,
            }}>
              +{members.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
