'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

export default function TeamBadge() {
  const t = useTranslations('mobile');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 26, padding: '0 8px', borderRadius: 999,
      background: '#fff7ed', color: '#c2410c',
      fontSize: 12, fontWeight: 700, lineHeight: '14px',
      boxShadow: '0 1px 3px rgba(15,23,42,.12)',
      flexShrink: 0,
    }}>
      <Users size={13} color="#ea580c" strokeWidth={1.75} aria-hidden="true" />
      {t('teamBadge')}
    </span>
  );
}
