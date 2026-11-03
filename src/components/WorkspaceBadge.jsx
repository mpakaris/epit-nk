'use client';

import { useApp } from '@/context/AppContext';

export default function WorkspaceBadge() {
  const { activeCollectiveId, effectiveCollectives } = useApp();

  if (!activeCollectiveId) return null;

  const label = (effectiveCollectives || []).find(c => c.collective_id === activeCollectiveId)?.name || 'Kollektíva';

  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: 'var(--accent)',
      background: 'var(--accent-light)',
      border: '1px solid var(--accent-border)',
      borderRadius: 'var(--radius-pill)',
      padding: '0.2rem 0.55rem',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
