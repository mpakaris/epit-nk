'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

export default function SharingBanner({ collectiveName }) {
  const t = useTranslations('mobile.workspace');
  return (
    <div style={{
      background: '#fff7ed', borderRadius: 16, padding: 16,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <Info size={18} color="#9a3412" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#9a3412', lineHeight: '22px' }}>
          {t('shareTitle')}
        </div>
        <div style={{ fontSize: 15, color: '#9a3412', lineHeight: '20px', marginTop: 2 }}>
          {collectiveName
            ? t('shareBodyWithName', { collectiveName })
            : t('shareBodyNoName')}
        </div>
      </div>
    </div>
  );
}
