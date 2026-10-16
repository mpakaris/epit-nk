'use client';

import { useApp } from '@/context/AppContext';

export default function WorkspaceBadge() {
  const { activeCollectiveId, effectiveCollectives } = useApp();

  const label = activeCollectiveId
    ? ((effectiveCollectives || []).find(c => c.collective_id === activeCollectiveId)?.name || 'Kollektíva')
    : 'Személyes munkaterület';

  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: activeCollectiveId ? 'var(--accent)' : 'var(--text-muted)',
      background: activeCollectiveId ? 'var(--accent-light)' : 'var(--bg-subtle)',
      border: `1px solid ${activeCollectiveId ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-pill)',
      padding: '0.2rem 0.55rem',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
