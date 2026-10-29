'use client';

/**
 * Standard empty-state block used across list pages and modals.
 * icon  — Lucide icon component (optional)
 * title — main line (required)
 * sub   — secondary line (optional)
 */
export default function EmptyState({ icon: Icon, title, sub, style }) {
  return (
    <div style={{
      textAlign: 'center', padding: '2.5rem 1rem',
      color: 'var(--text-muted)', ...style,
    }}>
      {Icon && (
        <div style={{ marginBottom: '0.75rem', opacity: 0.35 }}>
          <Icon size={36} strokeWidth={1.5} />
        </div>
      )}
      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{title}</div>
      {sub && <div style={{ fontSize: '0.825rem', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );
}
