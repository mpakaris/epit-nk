'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

const BADGE_STYLE = {
  done:        { bg: '#e2e8f0', color: '#0f172a', icon: true  },
  reopened:    { bg: '#fffbeb', color: '#92400e', icon: false },
  active:      { bg: '#dcfce7', color: '#166534', icon: false },
  inactive:    { bg: '#fef2f2', color: '#991b1b', icon: false },
  draft:       { bg: '#f1f5f9', color: '#475569', icon: false },
  sent:        { bg: '#f5f3ff', color: '#5b21b6', icon: false },
  accepted:    { bg: '#e2e8f0', color: '#0f172a', icon: true  },
  rejected:    { bg: '#fef2f2', color: '#991b1b', icon: false },
  folyamatban: { bg: '#fffbeb', color: '#92400e', icon: false },
  kesz:        { bg: '#e2e8f0', color: '#0f172a', icon: true  },
  paused:      { bg: '#eff6ff', color: '#1d4ed8', icon: false },
};

export default function StatusBadge({ status }) {
  const t   = useTranslations('mobile.statusBadge');
  const cfg = BADGE_STYLE[status] || BADGE_STYLE.active;
  const KNOWN = ['done','reopened','active','inactive','draft','sent','accepted','rejected','folyamatban','kesz','paused'];
  const label = KNOWN.includes(status) ? t(status) : (status || '');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      height: 26, padding: '0 8px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 13, fontWeight: 700, lineHeight: '16px',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {cfg.icon && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </span>
  );
}
