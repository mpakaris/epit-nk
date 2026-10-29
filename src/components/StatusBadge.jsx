'use client';

/**
 * Quote/document status badge. Uses QUOTE_STATUS_COLORS map derived from
 * the same color tokens as the rest of the design system.
 *
 * status: 'draft' | 'sent' | 'accepted' | 'rejected'
 * size:   'sm' (default) | 'md'
 */

export const QUOTE_STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',  color: 'var(--text-secondary)', border: 'var(--border-subtle)'  },
  sent:     { bg: 'var(--warning-bg)', color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)', color: 'var(--success-text)',   border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',  color: 'var(--danger-text)',    border: 'var(--danger-border)'  },
};

export const QUOTE_STATUS_LABELS = {
  draft:    'Vázlat',
  sent:     'Kiküldve',
  accepted: 'Elfogadva',
  rejected: 'Elutasítva',
};

const SIZE = {
  sm: { fontSize: '0.68rem', padding: '0.12rem 0.45rem' },
  md: { fontSize: '0.8rem',  padding: '0.2rem 0.65rem'  },
};

export default function StatusBadge({ status, size = 'sm', style }) {
  const sc  = QUOTE_STATUS_COLORS[status] || QUOTE_STATUS_COLORS.draft;
  const sz  = SIZE[size] || SIZE.sm;
  const label = QUOTE_STATUS_LABELS[status] || status;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontWeight: 700, borderRadius: 'var(--radius-pill)',
      border: `1px solid ${sc.border}`,
      background: sc.bg, color: sc.color,
      ...sz, ...style,
    }}>
      {label}
    </span>
  );
}
