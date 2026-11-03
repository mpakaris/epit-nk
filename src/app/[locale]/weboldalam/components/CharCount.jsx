'use client';

export default function CharCount({ value, max }) {
  const len = (value || '').length;
  const pct = len / max;
  return (
    <span style={{ fontSize: '0.62rem', color: pct >= 0.9 ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.1rem', display: 'block', textAlign: 'right' }}>
      {len}/{max}
    </span>
  );
}
