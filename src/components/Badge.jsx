'use client';

/**
 * Generic pill/badge for labels, counts, and status chips.
 *
 * variant: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'
 * size:    'sm' (default) | 'md' | 'lg'
 * icon:    optional Lucide icon component rendered before the text
 */

const VARIANTS = {
  default: { bg: 'var(--bg-subtle)',    color: 'var(--text-secondary)', border: 'var(--border-subtle)'  },
  accent:  { bg: 'var(--accent-light)', color: 'var(--accent)',         border: 'var(--accent-border)'  },
  success: { bg: 'var(--success-bg)',   color: 'var(--success-text)',   border: 'var(--success-border)' },
  warning: { bg: 'var(--warning-bg)',   color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  danger:  { bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)'  },
  muted:   { bg: 'transparent',         color: 'var(--text-muted)',     border: 'var(--border-subtle)'  },
};

const SIZES = {
  sm: { fontSize: '0.72rem', padding: '0.15rem 0.5rem',  iconSize: 10 },
  md: { fontSize: '0.8rem',  padding: '0.2rem 0.65rem',  iconSize: 12 },
  lg: { fontSize: '0.875rem',padding: '0.25rem 0.75rem', iconSize: 14 },
};

export default function Badge({ children, variant = 'default', size = 'sm', icon: Icon, style }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const s = SIZES[size] || SIZES.sm;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontWeight: 700, borderRadius: 'var(--radius-pill)',
      border: `1px solid ${v.border}`,
      background: v.bg, color: v.color,
      fontSize: s.fontSize, padding: s.padding,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {Icon && <Icon size={s.iconSize} />}
      {children}
    </span>
  );
}
