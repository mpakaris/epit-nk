'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Inline feedback banner — replaces 67+ copy-pasted danger/success divs.
 * variant: 'error' (default) | 'success' | 'warning'
 */
export default function ErrorBanner({ message, variant = 'error', style }) {
  if (!message) return null;

  const cfg = {
    error:   { bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  color: 'var(--danger-text)',  Icon: AlertCircle },
    success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success-text)', Icon: CheckCircle2 },
    warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning-text)', Icon: AlertCircle },
  }[variant] ?? { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger-text)', Icon: AlertCircle };

  const { bg, border, color, Icon } = cfg;

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, color,
      padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
      fontSize: '0.825rem', display: 'flex', alignItems: 'flex-start',
      gap: '0.45rem', ...style,
    }}>
      <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}
