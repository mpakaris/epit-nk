'use client';

import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

export default function CollectiveBanner({ documentCollectiveId } = {}) {
  const { activeCollectiveId, collectives } = useApp();
  const tc = useTranslations('common');

  const relevantId = documentCollectiveId !== undefined
    ? documentCollectiveId
    : activeCollectiveId;

  if (!relevantId) return null;

  const name = collectives.find(c => c.collective_id === relevantId)?.name;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
      padding: '0.75rem 0.9rem',
      marginBottom: '1.1rem',
      borderRadius: 'var(--radius-md)',
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      color: '#9a3412',
    }}>
      <Users size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#ea580c' }} />
      <span style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
        <strong>{tc('collectiveBannerTitle', { name: name ? ` — ${name}` : '' })}</strong>{' '}
        {tc('collectiveBannerBody')}
      </span>
    </div>
  );
}
