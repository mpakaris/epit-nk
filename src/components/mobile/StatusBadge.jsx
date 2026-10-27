'use client';

import React from 'react';
import { Check } from 'lucide-react';

const BADGE_MAP = {
  // Survey statuses
  done:     { label: 'Kész',       bg: '#e2e8f0', color: '#0f172a', icon: true },
  reopened: { label: 'Újranyitva', bg: '#fffbeb', color: '#92400e', icon: false },
  active:   { label: 'Aktív',      bg: '#eff6ff', color: '#2563eb', icon: false },
  // Quote statuses
  draft:    { label: 'Piszkozat',  bg: '#f1f5f9', color: '#475569', icon: false },
  sent:     { label: 'Elküldve',   bg: '#f5f3ff', color: '#5b21b6', icon: false },
  accepted: { label: 'Elfogadva',  bg: '#e2e8f0', color: '#0f172a', icon: true },
  rejected: { label: 'Elutasítva', bg: '#fef2f2', color: '#991b1b', icon: false },
  // Project derived
  folyamatban: { label: 'Folyamatban', bg: '#fffbeb', color: '#92400e', icon: false },
  kesz:        { label: 'Kész',        bg: '#e2e8f0', color: '#0f172a', icon: true },
};

export default function StatusBadge({ status }) {
  const cfg = BADGE_MAP[status] || BADGE_MAP.active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      height: 26, padding: '0 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 13, fontWeight: 700, lineHeight: '16px',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {cfg.icon && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
      {cfg.label}
    </span>
  );
}
