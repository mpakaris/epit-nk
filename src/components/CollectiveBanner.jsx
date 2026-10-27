'use client';

import { useApp } from '@/context/AppContext';
import { Users } from 'lucide-react';

export default function CollectiveBanner({ documentCollectiveId } = {}) {
  const { activeCollectiveId, collectives } = useApp();

  // If the document has an explicit collective_id, only show when it matches.
  // If no prop passed (legacy call sites), fall back to the workspace context check.
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
        <strong>Kollektíva munkaterületen dolgozol{name ? ` — ${name}` : ''}.</strong>{' '}
        Az itt létrehozott tartalom automatikusan megosztódik a kollektíva összes tagjával.
      </span>
    </div>
  );
}
