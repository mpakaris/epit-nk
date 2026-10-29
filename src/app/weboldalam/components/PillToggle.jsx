'use client';

export default function PillToggle({ on, onChange, disabled = false, size = 'md' }) {
  const w = size === 'lg' ? 44 : 36;
  const h = size === 'lg' ? 24 : 20;
  const knob = h - 6;
  const travel = w - h + 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={disabled ? undefined : onChange}
      style={{
        width: w, height: h, borderRadius: h,
        background: on ? 'var(--primary)' : 'var(--border-subtle)',
        border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: 3, display: 'flex', alignItems: 'center',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        width: knob, height: knob, borderRadius: '50%',
        background: 'white',
        transform: on ? `translateX(${travel}px)` : 'translateX(0)',
        transition: 'transform 0.2s',
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }} />
    </button>
  );
}
